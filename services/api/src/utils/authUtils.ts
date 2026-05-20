import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Response } from 'express';

// Helper functions
const signToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN!
  });
};

export const createSendToken = (
  user: any,
  statusCode: number,
  res: Response
) => {
  const token = signToken(user._id);
  const JWT_COOKIE_EXPIRES_IN: number = parseInt(
    process.env.JWT_COOKIE_EXPIRES_IN!
  );
  const cookieOptions = {
    expires: new Date(Date.now() + JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  };

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    user,
    token
  });
};

export const verifyTokenAsync = (
  token: string,
  secret: string
): Promise<any> => {
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

export const createPasswordResetToken = (user: any) => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};
