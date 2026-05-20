import { Request, Response, NextFunction } from "express";

export const validateSeatCreation = (req: Request, res: Response, next: NextFunction) => {
    const { rowNumber, seats } = req.body;
    console.log(rowNumber, seats)
    // Check if rowNumber is present
    if (!rowNumber) {
        return res.status(400).json({
            status: "fail",
            message: "rowNumber is required.",
        });
    }

    // Check if seats is an array and not empty
    if (!Array.isArray(seats) || seats.length === 0) {
        return res.status(400).json({
            status: "fail",
            message: "Seats array is required and cannot be empty.",
        });
    }

    // Validate each seat object
    for (const seat of seats) {
        if (!seat.seatId || !seat.status) {
            return res.status(400).json({
                status: "fail",
                message: "Each seat must have a seatId and status.",
            });
        }
        // Add more validations as needed
    }

    // If all validations pass, proceed to the controller
    next();
};
