import { Request, Response, NextFunction } from 'express';
import ClientUser from "../../model/client/clientuser.model";
import { RequestWithUser } from '../../types';

export const AIgetAllUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const users = await ClientUser.find();
      res.status(200).json({ status: 'success', data: { users } });
    } catch (error: any) {
      res.status(400).json({ status: 'fail', message: error.message });
    }
  };

  export const AIGetUserById = async (req: RequestWithUser, res: Response) => {
    const {id } = req.params;
    console.log(id)

    try {
      // Check if ID exists
      if (!id) {
        return res
          .status(400)
          .json({ status: 'fail', message: 'ID parameter is required' });
      }
      const user = await ClientUser.findById(id).populate('bookings');
      console.log(user)
      if (!user) {
        return res
          .status(404)
          .json({ status: 'fail', message: 'User not found' });
      }
      res.json({ status: 'success', data: { user } });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
  };

// Helper function to validate a seat string.
// Valid seat format: Row number between 1 and 25 and a letter A-F.
const isValidSeat = (seat: string): boolean => {
  const regex = /^([1-9]|1[0-9]|2[0-5])[A-F]$/;
  return regex.test(seat);
};

export const AIUpdateUserPreferences = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'User ID is required.' });
    }

    // Destructure preferences from the request body.
    // They are optional, but if provided they should be arrays of strings.
    const { seat, meal, destinations } = req.body;

    // Validate that each provided preference is an array.
    if (seat && !Array.isArray(seat)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Seat must be an array of strings.',
      });
    }
    if (meal && !Array.isArray(meal)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Meal must be an array of strings.',
      });
    }
    if (destinations && !Array.isArray(destinations)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Destinations must be an array of strings.',
      });
    }

    // If seat array is provided, validate each seat.
    if (seat) {
      for (const s of seat) {
        if (!isValidSeat(s)) {
          return res.status(400).json({
            status: 'fail',
            message: `Invalid seat format: ${s}. Seat must be between 1A and 25F.`,
          });
        }
      }
    }

    const user = await ClientUser.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'User not found.' });
    }

    // Update the user's preferences if provided.
    if (seat) {
      user.preferences.seat.push(...seat);
    }
    if (meal) {
      user.preferences.meal.push(...meal);
    }
    if (destinations) {
      user.preferences.destinations.push(...destinations);
    }

    await user.save();

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error: any) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const AIGetUserBookingHistory = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    console.log(userId)
    if (!userId) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'User ID is required.' });
    }

    // Find the user and only select the bookings field, then populate the bookings
    const user = await ClientUser.findById(userId)
      .select('bookings')
      .populate('bookings');

    if (!user) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'User not found.' });
    }

    res.status(200).json({ status: 'success', data: { bookings: user.bookings } });
  } catch (error: any) {
    console.error('Error getting user bookings:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const UpdateUserThreadId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract userId and updates from the request
    const { userId } = req.params;
    const { threadId } =
      req.body;

      console.log(req.body)
      console.log(req.params)
    const updates = {
      threadId
    };
    const user = await ClientUser.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });
    if (user) {
      res.status(200).json({
        status: 'success',
        message: 'User updated successfully',
        data: user,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};