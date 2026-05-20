import { NextFunction, Request, Response } from 'express';

import PassengerUser from '../../model/client/clientuser.model';
import mongoose from 'mongoose';

export const Agency_clientGetAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await PassengerUser.find();
    res.status(200).json({ status: 'success', data: { users } });
  } catch (error: any) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

export const Agency_DeletePassengers = async (req: Request, res: Response) => {
  try {
    const { id, ids } = req.body;
    console.log(id, ids);
    // Case 1: Delete a single passenger
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
          .status(400)
          .json({ status: 'fail', message: 'Invalid ID format' });
      }

      const user = await PassengerUser.findByIdAndDelete(id);
      if (!user) {
        return res
          .status(404)
          .json({ status: 'fail', message: 'User not found' });
      }

      return res
        .status(200)
        .json({ status: 'success', message: 'User deleted' });
    }

    // Case 2: Delete multiple passengers
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const deleteResult = await PassengerUser.deleteMany({
        _id: { $in: ids }
      });

      if (deleteResult.deletedCount === 0) {
        return res
          .status(404)
          .json({ status: 'fail', message: 'No users found to delete' });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Users deleted successfully',
        count: deleteResult.deletedCount
      });
    }

    // If neither 'id' nor 'ids' is provided, return a bad request response
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide a valid "id" or "ids" parameter'
    });
  } catch (error: any) {
    console.error('Error deleting users:', error.message);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

export const Agency_TogglePassengerStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, id } = req.body;

    // Determine the update based on the status
    const updateData =
      status === 'activate'
        ? { active: true, isBlocked: false }
        : { active: false, isBlocked: true };

    // Ensure correct data types are being passed
    const user = await PassengerUser.findByIdAndUpdate(id, updateData, {
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
