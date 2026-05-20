import { NextFunction, Request, Response } from "express";
import SeatsModel from "../model/seats.model";
import { APIFeatures } from "../utils/ApiFeatures";

export const createSeat = async (req: Request, res: Response) => {
    try {
        const { rowNumber, seats } = req.body;
        // console.log(req.body)
        const newSeat = await SeatsModel.create({
            rowNumber,
            seats: seats.map((seat: any) => ({
                seatId: seat.id,
                status: seat.status,
                unsuitableForHandicap: seat.unsuitableForHandicap,
                armTrayLeft: seat.armTrayLeft,
                armTrayRight: seat.armTrayRight,
                babyHammock: seat.babyHammock,
                handicapArmRest: seat.handicapArmRest,
                noBreakOver: seat.noBreakOver,
                limitedRecline: seat.limitedRecline,
                noRecline: seat.noRecline,
                hideSeat: seat.hideSeat
            }))
        });

        // console.log("New Seat", newSeat);
        res.status(201).json({ status: "success", data: newSeat });
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: "fail",
                message: "Required field of the seat isn't provided.",
            });
        }
        console.error("Error creating seat:", error);
        res.status(500).json({
            status: "fail",
            message: error.message,
        });
    }
};

export const getAllSeats = async (req: Request, res: Response) => {
    try {
        let query = SeatsModel.find();

        const features = new APIFeatures(query, req.query)
            .sort()
            .paginate()
            .limitFields();

        const allSeats = await features.query;
        res.status(200).json({ status: 'success', count: allSeats.length, allSeats });
    } catch (error) {
        console.error('Error getting all seats:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

export const deleteSeat = async (req: Request, res: Response) => {
    const id = req.query.id as string;
    console.log("ID", id);
    try {
        if (!id) {
            return res.status(400).json({ status: 'fail', message: 'ID parameter is required' });
        }
        const seat = await SeatsModel.findByIdAndDelete(id);
        if (!seat) {
            console.log("No seat with that ID found");
            return res.status(404).json({ status: 'fail', message: 'Seat not found' });
        }
        console.log("Successfully deleted the seat");
        res.status(200).json({ status: 'success', message: 'Seat deleted successfully' });
    } catch (error) {
        console.error('Error deleting the seat:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

export const updateSeats = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { rowId, seatId, status } = req.body;

        const row = await SeatsModel.findById(rowId);
        if (!row) {
            return res.status(404).json({ status: 'fail', message: 'Row not found' });
        }

        const seat = row.seats.find(seat => seat._id.toString() === seatId);
        if (!seat) {
            return res.status(404).json({ status: 'fail', message: 'Seat not found' });
        }

        seat.status = status;

        await row.save();

        res.status(200).json({ status: 'success', data: seat });
    } catch (error: any) {
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

