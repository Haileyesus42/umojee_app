import { NextFunction, Request, Response } from 'express';

import AdminUser from '../../model/admin/adminuser.model';
import mongoose from 'mongoose';
// export const AdminAdduser = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//     const newUser = await AdminUser.create({
//       name: req.body.name,
//       email: req.body.email,
//       password: req.body.password,
//       role: req.body.role,
//     });

//     // createSendToken(newUser, 201, res);
//     res.status(201).json({ status: "success", data: newUser });
//   } catch (error: any) {
//     res.status(500).json({
//       status: "fail",
//       message: error.message,
//     });
//   }
// };

export const AdminAdduser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const newUser = await AdminUser.create({
      _id: new mongoose.Types.ObjectId(),
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role
    });

    res.status(201).json({ status: 'success', data: newUser });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email already exists'
      });
    }
    console.error('Error creating user:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

export const AdminUpdateuser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.query.id;
    console.log('hello', req.query);
    const user = await AdminUser.findByIdAndUpdate(id, req.body);
    if (!user) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'User not found' });
    }
    res.status(200).json({ status: 'success', data: user });
  } catch (error: any) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const AdminDeleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    // console.log(id)

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Invalid ID format' });
    }

    console.log('Attempting to delete user with ID:', id);
    const user = await AdminUser.findByIdAndDelete(id);
    // console.log("Result from findByIdAndDelete:", user);

    console.log('Successfully deleted user with ID:', id);
    if (!user) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'User not found' });
    }

    res.status(200).json({ status: 'success', message: 'User deleted' });
  } catch (error: any) {
    console.error('Error deleting user:', error.message);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const DeleteManyUsers = async (req: Request, res: Response) => {
  const ids = req.body;
  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'IDs parameter is required and should be an array'
      });
    }

    const deleteResult = await AdminUser.deleteMany({ _id: { $in: ids } });

    if (deleteResult.deletedCount === 0) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'No bookings found to delete' });
    }
    console.log('successfully deleted staffs:', ids);
    res.status(200).json({
      status: 'success',
      message: 'Staffs deleted successfully',
      count: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Error deleting staffs:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

export const AdminGetUser = async (req: Request, res: Response) => {
  const id = req.query.id;
  try {
    // Check if ID exists
    if (!id) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'ID parameter is required' });
    }
    const user = await AdminUser.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'User not found' });
    }
    res.json({ status: 'success', user });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

export const ToggleUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, id } = req.body;
    console.log(status, id);
    // Determine the update based on the status
    const updateData =
      status === 'activate' ? { active: true } : { active: false };

    // Ensure correct data types are being passed
    const user = await AdminUser.findByIdAndUpdate(id, updateData, {
      new: true
    });

    if (!user) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'User not found' });
    }

    res.status(200).json({ status: 'success', data: user });
  } catch (error: any) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
