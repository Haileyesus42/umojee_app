import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import ClientUser from '../../model/client/clientuser.model';
import jwt from 'jsonwebtoken';
import { Email } from '../../utils/email';
import { generateOTP } from '../../utils/GenerateOTP';
import { RequestWithUser } from '../../types';
import { sanitizeClientUserResponse } from '../../utils/travelDocumentEncryption';
import { decryptTwoFactorSecret, verifyTotpToken } from '../../utils/twoFactorAuth';
import { resolveInviteAfterSignup } from './journeyShare.controller';

type GoogleTokenExchangeResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfoResponse = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  picture?: string;
  name?: string;
};
// // export const signup = catchAsync(
const signToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN!,
  });
};

const createSendToken = async(user: any, statusCode: number, res: Response) => {
  const token = signToken(user._id);
  const safeUser = sanitizeClientUserResponse(user);

  // Send token in response body so frontend can store it in localStorage
  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user: safeUser },
  });

  // Optionally set cookie for server-side access if needed
  if (process.env.JWT_COOKIE_EXPIRES_IN) {
    const JWT_COOKIE_EXPIRES_IN: number = parseInt(
      process.env.JWT_COOKIE_EXPIRES_IN
    );

    const cookieOptions = {
      expires: new Date(
        Date.now() + JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      // only send cookie on https in production
      secure: process.env.NODE_ENV === 'production',
      // allow frontend to potentially read the cookie
      httpOnly: false,
    };

    res.cookie('jwt', token, cookieOptions);
  }
};
//
const verifyTokenAsync = (token: string, secret: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
};

const buildGoogleGeneratedPassword = () =>
  `GoogleAuth!${crypto.randomBytes(16).toString('hex')}Aa1`;

const fetchGoogleUserProfile = async (code: string) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google authentication is not configured on the server');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: 'postmessage',
      grant_type: 'authorization_code',
    }).toString(),
  });

  const tokenData = (await tokenResponse.json().catch(() => ({}))) as GoogleTokenExchangeResponse;

  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange Google authorization code');
  }

  const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/json',
    },
  });

  const profile = (await userInfoResponse.json().catch(() => ({}))) as GoogleUserInfoResponse;

  if (!userInfoResponse.ok || !profile.email) {
    throw new Error('Failed to fetch Google profile');
  }

  if (profile.email_verified === false) {
    throw new Error('Google account email is not verified');
  }

  return profile;
};

const buildClientResetUrl = (req: Request, resetToken: string) => {
  const clientBase = process.env.CLIENT || `${req.protocol}://${req.get('host')}`;
  const base = clientBase.endsWith('/') ? clientBase.slice(0, -1) : clientBase;
  return `${base}/reset-password/${resetToken}`;
};

export const Clientsignup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Step 1: Prepare user data
    const firstName = req.body.firstName;
    const email = req.body.email;
    const newUserData: any = {
      firstName,
      lastName: req.body.lastName,
      email,
      phone: req.body.phone,
      dob: req.body.dob,
      password: req.body.password,
      pendingInviteToken: req.body.inviteToken || null,
    };

    // Step 2: Handle OTP based on bypass setting
    if (process.env.NODE_ENV !== 'production' && process.env.BYPASS_OTP === 'true') {
      // Bypass OTP entirely in development
      newUserData.verified = true; // Mark as verified immediately
    } else {
      // Normal OTP flow
      const OTP = generateOTP();
      newUserData.OTP = OTP;
      newUserData.OTPCreatedTime = new Date();
      newUserData.verified = false; // User needs to verify via OTP

      const emailPayload = {
        email,
        firstName,
      };

      const url = 'url:';

      // Only send OTP email if not bypassed
      if (process.env.NODE_ENV === 'production' || process.env.BYPASS_OTP !== 'true') {
        await new Email(emailPayload, url).sendOTP(OTP);
      }
    }

    // Step 3: Save user to DB
    const user = await ClientUser.create(newUserData);

    // Step 4: Respond after all is successful
    res.status(201).json({
      status: "success",
      data: user,
    });

    console.log("Successfully registered new client:", user.email);
  } catch (error: any) {
    console.error("Signup error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({
        status: "fail",
        message: error.message || "Internal Server Error",
      });
    }
  }
};

export const verifyClientUser = async (req: Request, res: Response) => {
  const { email, OTP } = req.body;

  if (!email) {
    return res.status(400).json({
      status: 'fail',
      message: 'Email is required',
    });
  }

  try {
    const user = await ClientUser.findOne({ email }).select('+pendingInviteToken');

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    // Bypass OTP verification in development when BYPASS_OTP is enabled
    if (process.env.NODE_ENV !== 'production' && process.env.BYPASS_OTP === 'true') {
      // Skip OTP check and directly verify the user
      user.verified = true;
      user.OTP = undefined;
      user.OTPCreatedTime = undefined;
      user.OTPAttempts = 0;
      const pendingInviteToken = user.pendingInviteToken;
      user.pendingInviteToken = undefined;

      await user.save();
      if (pendingInviteToken) {
        await resolveInviteAfterSignup(String(user._id), pendingInviteToken);
      }
      const url = '';
      await new Email(user, url).sendWelcome();
      await createSendToken(user, 201, res);
      console.log('User verified successfully (bypassed OTP):', user.email);
      return;
    }

    // Original OTP verification logic only runs when bypass is disabled
    if (!OTP) {
      return res.status(400).json({
        status: 'fail',
        message: 'OTP is required',
      });
    }

    if (user.isBlocked) {
      const currentTime = new Date();
      if (user.blockUntil && currentTime < user.blockUntil) {
        return res.status(403).json({
          status: 'fail',
          message: 'Account blocked. Try again later.',
        });
      } else {
        user.isBlocked = false;
        user.OTPAttempts = 0;
      }
    }

    if (!user.OTP || user.OTP !== OTP) {
      user.OTPAttempts += 1;

      if (user.OTPAttempts >= 5) {
        user.isBlocked = true;
        const blockUntil = new Date();
        blockUntil.setHours(blockUntil.getHours() + 1);
        user.blockUntil = blockUntil;
      }

      await user.save();
      return res.status(403).json({
        status: 'fail',
        message: 'Invalid OTP',
      });
    }

    // Check if OTP expired (5 minutes)
    const now = new Date();
    const timeDiff = now.getTime() - new Date(user.OTPCreatedTime!).getTime();
    if (timeDiff > 5 * 60 * 1000) {
      return res.status(403).json({
        status: 'fail',
        message: 'OTP expired',
      });
    }

    // OTP valid — update verification state
    user.verified = true;
    user.OTP = undefined;
    user.OTPCreatedTime = undefined;
    user.OTPAttempts = 0;
    const pendingInviteToken = user.pendingInviteToken;
    user.pendingInviteToken = undefined;

    await user.save();
    if (pendingInviteToken) {
      await resolveInviteAfterSignup(String(user._id), pendingInviteToken);
    }
    const url = '';
    await new Email(user, url).sendWelcome();
    await createSendToken(user, 201, res);
    console.log('User verified successfully:', user.email);
    // res.status(200).json({
    //   status: 'success',
    //   message: 'User verified successfully',
    // });
  } catch (err: any) {
    console.error('Verification error:', err.message);
    res.status(500).json({
      status: 'fail',
      message: 'Internal server error',
    });
  }
};

export const LoginWithPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log('=== LOGIN WITH PASSWORD DEBUG ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('BYPASS_OTP:', process.env.BYPASS_OTP);
  console.log('BYPASS_OTP === true:', process.env.BYPASS_OTP === 'true');
  console.log('Should bypass verification:', process.env.NODE_ENV !== 'production' && process.env.BYPASS_OTP === 'true');
  console.log('Email:', req.body.email);
  console.log('Password provided:', !!req.body.password);
  console.log('==================');

  try {
    const { email, password, inviteToken } = req.body;

    // 1) Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide email and password!",
      });
    }

    // 2) Find user and explicitly select password
    const user = await ClientUser.findOne({ email }).select("+password +twoFactorSecret");

    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "Incorrect email or password",
      });
    }

    // 3) Check if password matches
    const isCorrect = await user.correctPassword(password, user.password);

    if (!isCorrect) {
      return res.status(401).json({
        status: "fail",
        message: "Incorrect email or password",
      });
    }

    // 4) Check if user is verified; if not, (re)send verification OTP (throttled)
    // Bypass verification check in development when BYPASS_OTP is enabled
    if (!user.verified && !(process.env.NODE_ENV !== 'production' && process.env.BYPASS_OTP === 'true')) {
      return res.status(403).json({
        status: "fail",
        message: "Account not verified. Please verify with OTP first.",
      });
    }

    // Auto-verify the user if bypass is enabled
    if (process.env.NODE_ENV !== 'production' && process.env.BYPASS_OTP === 'true' && !user.verified) {
      user.verified = true;
      await user.save();
    }

    if (user.twoFactorEnabled) {
      const twoFactorCode = String(req.body.twoFactorCode || '').trim();
      if (!twoFactorCode) {
        return res.status(401).json({
          status: "fail",
          code: "TWO_FACTOR_REQUIRED",
          message: "Two-factor code required",
        });
      }

      const twoFactorSecret = decryptTwoFactorSecret(user.twoFactorSecret);
      if (!twoFactorSecret || !verifyTotpToken(twoFactorSecret, twoFactorCode)) {
        return res.status(401).json({
          status: "fail",
          code: "INVALID_TWO_FACTOR_CODE",
          message: "Invalid authenticator code",
        });
      }
    }

    // 5) All good - generate and send token
    await createSendToken(user, 200, res);
    console.log('User logged in successfully:', user.email);
  } catch (error: any) {
    console.error("LoginWithPassword error:", error.message);
    res.status(500).json({ status: "fail", message: error.message });
  }
};

export const LoginWithGoogle = async (req: Request, res: Response) => {
  try {
    const code = String(req.body.code || '').trim();
    const inviteToken = String(req.body.inviteToken || '').trim();

    if (!code) {
      return res.status(400).json({
        status: 'fail',
        message: 'Google authorization code is required',
      });
    }

    const profile = await fetchGoogleUserProfile(code);
    const email = String(profile.email || '').toLowerCase().trim();

    if (!email) {
      return res.status(400).json({
        status: 'fail',
        message: 'Google account did not provide an email address',
      });
    }

    const firstName = String(profile.given_name || '').trim() || String(profile.name || '').trim() || 'Google';
    const lastName = String(profile.family_name || '').trim() || 'User';
    const photo = String(profile.picture || '').trim() || undefined;

    let user = await ClientUser.findOne({ email });
    let generatedPassword: string | null = null;

    if (!user) {
      generatedPassword = buildGoogleGeneratedPassword();
      user = await ClientUser.create({
        email,
        firstName,
        lastName,
        verified: true,
        active: true,
        photo,
        password: generatedPassword,
      });

      try {
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });
        const resetURL = buildClientResetUrl(req, resetToken);
        await new Email(
          { email: user.email, firstName: user.firstName },
          resetURL
        ).sendGooglePasswordSetup(generatedPassword);
      } catch (emailError: any) {
        console.error('LoginWithGoogle onboarding email error:', emailError.message);
      }
    } else {
      let shouldSave = false;

      if (!user.verified) {
        user.verified = true;
        shouldSave = true;
      }

      if ((!user.firstName || user.firstName === 'Guest') && firstName) {
        user.firstName = firstName;
        shouldSave = true;
      }

      if ((!user.lastName || user.lastName === 'User') && lastName) {
        user.lastName = lastName;
        shouldSave = true;
      }

      if (photo && !user.photo) {
        user.photo = photo;
        shouldSave = true;
      }

      if (shouldSave) {
        await user.save();
      }
    }

    if (inviteToken) {
      await resolveInviteAfterSignup(String(user._id), String(inviteToken));
    }
    await createSendToken(user, 200, res);
    console.log('User authenticated with Google:', user.email);
  } catch (error: any) {
    console.error('LoginWithGoogle error:', error.message);
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Google sign-in failed',
    });
  }
};


export const Clientprotect = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in! Please log in to get access.',
      });
    }
    try {
      const decoded = await verifyTokenAsync(token, process.env.JWT_SECRET!);
      const currentUser = await ClientUser.findById(decoded.id);
      if (!currentUser) {
        return res.status(401).json({
          status: 'fail',
          message: 'The user belonging to this token does no longer exist.',
        });
      }
      if (!currentUser.verified) {
        return res.status(401).json({
          status: 'fail',
          message: 'User Not verified! Please Login Again',
        });
      }
      // Grant access to protected route
      req.userId = currentUser._id;
      next();
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          status: 'fail',
          message: 'Invalid token! Please Login Again',
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'fail',
          message: 'Token expired! Please Login Again',
        });
      }
    }
  } catch (error: any) {
    res.status(401).json({ status: 'fail', message: error.message });
  }
};
//
// // export const restrictTo = (...roles: string[]) => {
// //   return (req: RequestWithUser, res: Response, next: NextFunction) => {
// //     if (!roles.includes(req.user.role)) {
// //       return res.status(403).json({
// //         status: "fail",
// //         message: "You do not have permission to perform this action",
// //       });
// //     }
// //     next();
// //   };
// // };
// //
// export const ClientforgotPassword = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   const user = await ClientUser.findOne({ email: req.body.email });
//   try {
//     if (!user) {
//       return res.status(404).json({
//         status: "fail",
//         message: "There is no user with email address",
//       });
//     }
//     const resetToken = user.createPasswordResetToken();
//     // console.log(resetToken);
//     await user.save({ validateBeforeSave: false });
//
//     const resetURL = `${req.protocol}://${req.get(
//       'host'
//     )}/api/v1/users/resetPassword/${resetToken}`;
//     await new Email(user, resetURL).sendPasswordReset();
//
//     res
//       .status(200)
//       .json({ status: "success", message: "Token sent to email!" });
//   } catch (error: any) {
//     if (user) {
//       user.passwordResetToken = undefined;
//       user.passwordResetExpires = undefined;
//       await user.save({ validateBeforeSave: false });
//     }
//     return res.status(500).json({
//       status: "fail",
//       message: error.message,
//     });
//   }
// };
// export const ClientresetPassword = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//     const hashedToken = crypto
//       .createHash("sha256")
//       .update(req.params.token)
//       .digest("hex");
//     const user = await ClientUser.findOne({
//       passwordResetToken: hashedToken,
//       passwordResetExpires: { $gt: Date.now() },
//     });
//     if (!user) {
//       return res.status(400).json({
//         status: "fail",
//         message: "Token is invalid or has expired",
//       });
//     }
//     const { password } = req.body;
//     user.password = password;
//     user.passwordResetToken = undefined;
//     user.passwordResetExpires = undefined;
//     await user.save();
//
//     createSendToken(user, 200, res);
//   } catch (error: any) {
//     res.status(500).json({ status: "fail", message: error.message });
//   }
// };
export const ClientupdatePassword = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await ClientUser.findById(req.userId).select("+password");
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    // Check if POSTed current password is correct
    if (
      !(await user.correctPassword(req.body.passwordCurrent, user.password))
    ) {
      return res.status(401).json({
        status: "fail",
        message: "Your current password is wrong",
      });
    }

    // Update password (pre-save middleware will hash it)
    user.password = req.body.password;
    await user.save();

    // Log user in, send JWT
    createSendToken(user, 200, res);
  } catch (error: any) {
    res.status(500).json({ status: "fail", message: error.message });
  }
};


export const generateSendOTP = async (req: Request, res: Response) => {
  const email = req.body.email;

  try {
    let user = await ClientUser.findOne({ email: email });

    // If user does not exist, create a new user
    if (!user) {
      user = new ClientUser({ email: email });
    }

    // If user is blocked, return an error
    if (user.isBlocked) {
      const currentTime = new Date();
      if (user.blockUntil && currentTime < user.blockUntil) {
        return res.status(403).send('Account blocked. Try after some time.');
      } else {
        user.isBlocked = false;
        user.OTPAttempts = 0;
      }
    }

    // Check for minimum 1-minute gap between OTP requests
    const lastOTPTime =
      user.OTPCreatedTime !== undefined
        ? user.OTPCreatedTime instanceof Date
          ? user.OTPCreatedTime.getTime()
          : new Date(user.OTPCreatedTime).getTime()
        : null;

    const currentTime = Date.now(); // Get current time in milliseconds

    // Check if the difference between current time and last OTP time is less than 60,000 milliseconds (1 minute)
    if (lastOTPTime !== null && currentTime - lastOTPTime < 60000) {
      return res
        .status(403)
        .send('Minimum 1-minute gap required between OTP requests');
    }

    // Generate a new OTP and update the user record
    const OTP = generateOTP();
    user.OTP = OTP;
    user.OTPCreatedTime = new Date(); // Save the current time as a Date object
    await user.save();

    const newUser = { email: email, name: 'Guest User' };
    const url = 'url:';

    await new Email(newUser, url).sendOTP(OTP);
    res.status(200).json({msg:'success'});
  } catch (err) {
    console.log(err);
    res.status(500).send('Server error');
  }
};

export const login = async (req: Request, res: Response) => {
  const email = req.body.email;
  const OTP = req.body.OTP;

  // Debug logging
  console.log('=== LOGIN DEBUG ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('BYPASS_OTP:', process.env.BYPASS_OTP);
  console.log('BYPASS_OTP === true:', process.env.BYPASS_OTP === 'true');
  console.log('Should bypass:', process.env.NODE_ENV !== 'production' && process.env.BYPASS_OTP === 'true');
  console.log('Email:', email);
  console.log('OTP provided:', !!OTP);
  console.log('==================');

  try {
    const user = await ClientUser.findOne({ email: email });

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    // Bypass OTP verification entirely in development when BYPASS_OTP is enabled
    if (process.env.NODE_ENV !== 'production' && process.env.BYPASS_OTP === 'true') {
      console.log('BYPASS TRIGGERED - SKIPPING OTP CHECK');
      // Skip all OTP checks and directly verify the user
      user.verified = true;
      user.OTP = undefined;
      user.OTPCreatedTime = undefined;
      user.OTPAttempts = 0;
      
      const newUser = await user.save();
      
      // Generate JWT token and send response
      createSendToken(user, 201, res);
      return;
    }

    // Check if user account is blocked
    if (user.isBlocked) {
      const currentTime = new Date();
      if (user.blockUntil && currentTime < user.blockUntil) {
        return res.status(403).json({
          status: 'fail',
          message: 'Account blocked. Try after some time.',
        });
      } else {
        user.isBlocked = false;
        user.OTPAttempts = 0;
      }
    }

    // Check OTP
    if (!user.OTP || user.OTP !== OTP) {
      // Incorrect OTP provided
      user.OTPAttempts++;

      // If OTP attempts >= 5, block user for 1 hour
      if (user.OTPAttempts >= 5) {
        user.isBlocked = true;
        let blockUntil = new Date();
        blockUntil.setHours(blockUntil.getHours() + 1);
        user.blockUntil = blockUntil;
      }

      await user.save();

      return res.status(403).json({ status: 'fail', message: 'Invalid OTP' });
    }

    // Check if OTP is within 5 minutes
    const OTPCreatedTime = user.OTPCreatedTime;
    const currentTime = new Date();

    if (OTPCreatedTime) {
      // Calculate the difference in milliseconds
      const timeDifference = currentTime.getTime() - OTPCreatedTime.getTime();

      // Check if the time difference is greater than 5 minutes (300,000 milliseconds)
      if (timeDifference > 5 * 60 * 1000) {
        return res.status(403).json({ status: 'fail', message: 'OTP expired' });
      }
    } else {
      // If OTPCreatedTime is undefined, the OTP cannot be validated
      return res
        .status(400)
        .json({ status: 'fail', message: 'OTPCreatedTime is undefined' });
    }

    if (user.twoFactorEnabled) {
      const twoFactorCode = String(req.body.twoFactorCode || '').trim();
      if (!twoFactorCode) {
        return res.status(401).json({
          status: 'fail',
          code: 'TWO_FACTOR_REQUIRED',
          message: 'Two-factor code required',
        });
      }

      const twoFactorSecretUser = await ClientUser.findById(user._id).select('+twoFactorSecret');
      const twoFactorSecret = decryptTwoFactorSecret(twoFactorSecretUser?.twoFactorSecret);
      if (!twoFactorSecret || !verifyTotpToken(twoFactorSecret, twoFactorCode)) {
        return res.status(401).json({
          status: 'fail',
          code: 'INVALID_TWO_FACTOR_CODE',
          message: 'Invalid authenticator code',
        });
      }
    }

    // Clear OTP and update verification status
    user.OTP = undefined;
    user.OTPCreatedTime = undefined;
    user.OTPAttempts = 0;
    user.verified = true;

    const newUser = await user.save();

    // Generate JWT token and send response
    createSendToken(user, 201, res);

    const url = '';
    await new Email(newUser, url).sendWelcome();
  } catch (err) {
    console.log(err);
    res.status(500).send('Server error');
  }
};

export const ClientForgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: 'fail', message: 'Email is required' });
    }

    const user = await ClientUser.findOne({ email });
    // For security, respond with success even if user not found
    if (!user) {
      return res.status(200).json({ status: 'success', message: 'If an account exists, a reset link has been sent.' });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = buildClientResetUrl(req, resetToken);

    try {
      await new Email({ email: user.email, firstName: user.firstName }, resetURL).sendPasswordReset();
      res.status(200).json({ status: 'success', message: 'Token sent to email!' });
    } catch (err: any) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      res.status(500).json({ status: 'fail', message: 'There was an error sending the email. Try again later.' });
    }
  } catch (error: any) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const ClientResetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params as { token: string };
    const { password } = req.body as { password: string };
    if (!token || !password) {
      return res.status(400).json({ status: 'fail', message: 'Token and new password are required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await ClientUser.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({ status: 'fail', message: 'Token is invalid or has expired' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.verified = true; // Mark user as verified upon password reset
    // Clear any pending OTP info
    user.OTP = undefined as any;
    user.OTPCreatedTime = undefined as any;
    user.OTPAttempts = 0;
    await user.save();

    return res.status(200).json({
      status: 'success',
      message: 'Password updated. You can now sign in.',
    });
  } catch (error: any) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
