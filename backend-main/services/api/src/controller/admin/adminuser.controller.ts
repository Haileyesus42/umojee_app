import { Request, Response, NextFunction } from 'express';
import AdminUser from '../../model/admin/adminuser.model';
// import PassengerUser from '../../model/client/clientuser.model';
import { RequestWithUser } from '../../types';
import validator from 'validator';
import mongoose from 'mongoose';

const FilterObj = (obj: any, ...allowedFields: string[]) => {
  const newObj: any = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

export const AdminupdateMe = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  if (req.body.password) {
    return res.status(400).json({
      status: 'fail',
      message:
        'This route is not for password updates. Please use auth/updateMypassword.',
    });
  }
  // we are using findByIdAndUpdate because we dont want to provide the required required fieds
  try {
    const filteredBody = FilterObj(req.body, 'name', 'email', 'photo');
    const updatedUser = await AdminUser.findByIdAndUpdate(
      req.userId,
      // req.body,
      filteredBody,
      // validate like required, min, max
      { new: true, runValidators: true }
    );

    res.status(200).json({ data: { user: updatedUser } });
  } catch (error: any) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

export const AdmindeleteMe = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    await AdminUser.findByIdAndUpdate(req.userId, { active: false });
    res.status(204).json({ status: 'success' });
    // res.send("Delete me");
  } catch (error: any) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

export const AdmingetAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await AdminUser.find();
    res.status(200).json({ status: 'success', data: { users } });
  } catch (error: any) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

export const AdminUpdateProfile = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {

    // 1. Extract fields from request body
    const { name, email, bio } = req.body;

    // 2. Validate email and phone number
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid email format' });
    }

    // 3. Check if user ID exists (depending on your authentication middleware)
    const userId = req.userId  // Adjust based on your implementation
    if (!userId) {
      return res.status(401).json({ status: 'fail', message: 'User not authenticated' });
    }
    console.log("user id", userId)

    // 4. Find the user by their ID
    const user = await AdminUser.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    // 5. Update only fields that are provided in the request
    if (name) user.name = name;
    if (email) user.email = email;
    if (bio) user.bio = bio;

    // 6. Save the updated user
    const updatedUser = await user.save();

    // 7. Send response with updated user data
    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
    console.log(200, "Successfully updated admin profile!")
  } catch (err: any) {
    // Handle specific errors like duplicate key error (11000)
    if (err.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Duplicate field value: Email or Username already in use'
      });
    }

    // Generic error handling
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
      error: err.message
    });
  }
};

// Update profile picture with file upload
export const updateProfilePhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Ensure valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Find the user by ID
    const adminUser = await AdminUser.findById(id);
    if (!adminUser) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Update photo field with the file path
    adminUser.photo = `/uploads/${req.file.filename}`;

    // Save the updated user
    await adminUser.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile picture updated successfully',
      data: { adminUser },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err });
  }
};
