import Booking, { BookingDocument } from "../model/booking.model";
import { ObjectId } from "mongodb";
import { FlattenMaps } from "mongoose";
import { BookingStatus } from "../enums/booking.enum";

export default class BookingRepository {
    // Fetches bookings for a specific user and includes flight data
    async getUserBookings(userId: string): Promise<FlattenMaps<BookingDocument[]>> {
        try {
            const pipeline = [
                {
                    $match: {
                        userId: new ObjectId(userId)
                    }
                },
                {
                    $lookup: {
                        from: 'flights', // Ensure the collection name is correct
                        localField: 'flightId',
                        foreignField: '_id',
                        as: 'flight'
                    }
                }
            ];

            const bookings = await Booking.aggregate(pipeline);
            if (!bookings) {
                console.error(`No bookings found for user: ${userId}`);
                throw new Error('No bookings found');
            }
            return bookings;
        } catch (error) {
            console.error(`Error in getUserBookings for user ${userId}:`, error);
            throw new Error('Failed to fetch user bookings');
        }
    }

    // Finds a specific booking for a user based on booking ID
    async findBookingUser(userId: string, bookingId: string): Promise<BookingDocument | null> {
        try {
            const booking = await Booking.findOne({
                userId: new ObjectId(userId),
                _id: new ObjectId(bookingId)
            }).exec();

            if (!booking) {
                console.error(`Booking not found for user ${userId} with booking ID ${bookingId}`);
                return null;
            }

            return booking;
        } catch (error) {
            console.error(`Error in findBookingUser for user ${userId} and booking ${bookingId}:`, error);
            throw new Error('Failed to find booking');
        }
    }

    // Sets the booking status to canceled for a specific booking of a user
    async setBookingCanceled(userId: string, bookingId: string): Promise<BookingDocument | null> {
        try {
            const update = {
                status: BookingStatus.CANCELED
            };

            const booking = await Booking.findOneAndUpdate(
                {
                    userId: new ObjectId(userId),
                    _id: new ObjectId(bookingId)
                },
                update,
                {
                    new: true // Use 'new' to return the updated document
                }
            );

            if (!booking) {
                console.error(`Failed to cancel booking for user ${userId} with booking ID ${bookingId}`);
                return null;
            }

            return booking;
        } catch (error) {
            console.error(`Error in setBookingCanceled for user ${userId} and booking ${bookingId}:`, error);
            throw new Error('Failed to cancel booking');
        }
    }
}
