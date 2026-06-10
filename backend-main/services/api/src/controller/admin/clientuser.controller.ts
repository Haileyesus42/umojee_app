import { NextFunction, Request, Response } from 'express';
import ClientUser from '../../model/client/clientuser.model';
import mongoose from 'mongoose';
import { RequestWithUser } from '../../types';

const AdmingetAllClientUsers = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await ClientUser.find({});
    res.status(200).json({ status: 'success', count: users.length, data: { users } });
  } catch (error: any) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};
const AdmindeleteClientUser = async (req: Request, res: Response) => {
  const id = req.query.id;
  try {
    // Check if ID exists
    if (!id) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'ID parameter is required' });
    }
    const flight = await ClientUser.findByIdAndDelete(id);
    if (!flight) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'User not found' });
    }
    res.json({ status: 'success', message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting User:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

const AdmindeleteManyClientUsers = async (req: Request, res: Response) => {
  const ids = req.body.ids;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Check if IDs exist and are an array
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Ids are required and must be an array',
      });
    }

    // Use for...of loop for sequential execution of deletions within the transaction
    for (const id of ids) {
      const user = await ClientUser.findByIdAndDelete(id).session(session);
      if (!user) {
        // If flight not found, rollback the transaction and return error response
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ status: 'fail', message: `User not found for Id ${id}` });
      }
    }

    // If all deletions are successful, commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Respond with success message
    res.json({ status: 'success', message: 'Users deleted successfully' });
  } catch (error) {
    console.error('Error deleting users:', error);
    // If any error occurs, rollback the transaction
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};
export {
  AdmindeleteClientUser,
  AdmingetAllClientUsers,
  AdmindeleteManyClientUsers,
};
