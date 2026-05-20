
import { Request, Response } from "express";
import Booking from '../../model/booking.model';

export const AddReferenceNumber = async (req: Request, res: Response) => {
    try {
        // Find all bookings without a reference number
        const bookingsWithoutRef = await Booking.find({ referenceNumber: { $exists: false } });

        for (const booking of bookingsWithoutRef) {
            let reference = "";
            let isUnique = false;

            // Generate a unique reference number for each booking
            while (!isUnique) {
                reference = generateReferenceNumber();
                const existingBooking = await Booking.findOne({ referenceNumber: reference });
                if (!existingBooking) isUnique = true;
            }

            // Assign the unique reference number and save
            booking.referenceNumber = reference;
            await booking.save();
        }

        res.status(200).send("All existing bookings have been updated with a reference number.");
    } catch (error) {
        console.error("Error updating bookings:", error);
        res.status(500).send("Error updating bookings: " + error);
    }
};

// Helper function to generate an 8-character alphanumeric string
function generateReferenceNumber(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

