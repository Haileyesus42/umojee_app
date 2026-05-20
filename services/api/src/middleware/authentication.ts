import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import AdminUser from '../model/admin/adminuser.model';
import { RequestWithUser, Role } from '../types';
import ClientUser from '../model/client/clientuser.model';

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

export const verifyIfTokenExistMiddleWare = async (
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
    const currentTimestamp = Math.floor(new Date().getTime() / 1000);
    if (!decoded?.id || !decoded?.exp) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token! Please Login Again'
      });
    }
    console.log(currentTimestamp, decoded);
    if (currentTimestamp >= decoded.exp) {
      return res.status(401).json({
        status: 'fail',
        message: 'Token expired! Please Login Again'
      });
    }
    req.userId = decoded.id;
    next();
  } catch (error: any) {
    res.status(401).json({ status: 'fail', message: error.message });
  }
};

export const restrictToMiddleWare = (...roles: Role[]) => {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const userAdmin = await AdminUser.findById(req.body.userId);
    const userClient = await ClientUser.findById(req.body.userId);
    console.log("user", userAdmin)
    console.log("user", userClient)
    if (userAdmin) {
      if (!roles.includes(userAdmin.role as Role)) {
        return res.status(403).json({
          status: 'fail',
          message: 'You do not have permission to perform this action'
        });
      }
      if (userAdmin?.active === false) {
        return res.status(401).json({
          status: 'fail',
          message: 'User is disabled'
        });
      }
    } else if (userClient) {
      // return;
    }
    else {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    next();
  };
};
