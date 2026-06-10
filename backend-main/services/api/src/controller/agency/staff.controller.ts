import mongoose from "mongoose";
import AgencyUser from "../../model/agency/agencyUser.model";
import { Request, Response } from "express";

export const AgencyGetStaff = async (req: Request, res: Response) => {
    const id = req.query.id as string;
    console.log(id);

    try {
        if (!id) {
            return res.status(400).json({ status: 'fail', message: 'ID parameter is required' });
        }

        // Convert id to ObjectId if necessary
        const objectId = new mongoose.Types.ObjectId(id);

        const user = await AgencyUser.findOne({ agency: objectId });
        console.log(user);

        if (!user) {
            return res.status(404).json({ status: 'fail', message: 'User not found' });
        }
        res.json({ status: 'success', user });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};
