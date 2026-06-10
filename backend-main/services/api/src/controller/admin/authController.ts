import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import AdminUser from '../../model/admin/adminuser.model';
import AgencyModel from '../../model/admin/agencies.model';
import { RequestWithUser } from '../../types';
import { createSendToken, verifyTokenAsync } from '../../utils/authUtils';
import { Email } from '../../utils/email';

const uisAdminUrl = process.env.ADMIN;
// Admin Authentication Functions
export const AdminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password!',
      });
    }

    const user = await AdminUser.findOne({ email }).select('+password');
    const correct = await user?.correctPassword(password, user.password);

    if (!user || !correct) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password',
      });
    }

    // Create a new object without the password field
    const userWithoutPassword = {
      _id: user._id,
      email: user.email,
      name: user.name,
      photo: user.photo,
      role: user.role,
      passwordChangedAt: user.passwordChangedAt,
      active: user.active,
      bookings: user.bookings,
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    console.log(userWithoutPassword);
    createSendToken(userWithoutPassword, 200, res);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const AdminProtect = async (
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
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    const decoded = await verifyTokenAsync(token, process.env.JWT_SECRET!);
    const currentUser = await AdminUser.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token does not exist.'
      });
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'fail',
        message: 'User recently changed password! Please log in again.'
      });
    }

    if (currentUser.active === false) {
      return res.status(401).json({
        status: 'fail',
        message: 'User is disabled.'
      });
    }

    req.userId = currentUser._id;
    next();
  } catch (error: any) {
    res.status(401).json({ status: 'fail', message: error.message });
  }
};

export const RestrictTo = (...roles: string[]) => {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const user = await AdminUser.findById(req.userId);
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({
          status: 'fail',
          message: 'You do not have permission to perform this action.'
        });
      }
      next();
    } catch (error: any) {
      res.status(500).json({ status: 'fail', message: error.message });
    }
  };
};

export const AdminForgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Step 1: Find the admin user by email
    const user = await AdminUser.findOne({ email });

    if (user) {
      // Step 2: Generate a password reset token
      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      // Step 3: Generate the reset URL
      const resetURL = `${uisAdminUrl}/resetpassword/${resetToken}`;
      const message = `Forgot your password? Click the link below to reset your password:\n${resetURL}\nIf you didn't request this, please ignore this email.`;

      try {
        await new Email(user, resetURL).sendPasswordReset();

        // Step 4: Send a generic success response
        return res.status(200).json({
          status: 'success',
          message:
            'If there is an account with that email, a reset link has been sent.'
        });
      } catch (emailError) {
        // Reset token fields on email failure
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return res.status(500).json({
          status: 'fail',
          message:
            'There was an error sending the email. Please try again later.'
        });
      }
    }

    // Always return success message to prevent email enumeration
    res.status(200).json({
      status: 'success',
      message:
        'If there is an account with that email, a reset link has been sent.'
    });
  } catch (error: any) {
    // Log the error and return a generic failure message
    console.error(`Error in AdminForgotPassword: ${error.message}`);

    res.status(500).json({
      status: 'fail',
      message: 'An error occurred. Please try again later.'
    });
  }
};

export const AdminResetPassword = async (req: Request, res: Response) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    const user = await AdminUser.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'Token is invalid or has expired.'
      });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    createSendToken(user, 200, res);
  } catch (error: any) {
    res.status(500).json({ status: 'fail', message: error.message });
    console.log(error);
  }
};

export const AdminUpdatePassword = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const user = await AdminUser.findById(req.body.userId).select('+password');
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    if (!(await user.correctPassword(req.body.oldPassword, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Your current password is wrong.'
      });
    }

    user.password = req.body.password;
    await user.save();

    createSendToken(user, 200, res);
  } catch (error: any) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// Agency Authentication Functions
export const AgencyLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password!'
      });
    }

    const user = await AgencyModel.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    if (user.agencyStatus !== 'Active') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied. Only active agents are allowed to log in.'
      });
    }

    createSendToken(user, 200, res);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
