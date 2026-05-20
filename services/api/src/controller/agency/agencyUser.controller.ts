import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import AgencyUser from "../../model/agency/agencyUser.model";
import { APIFeatures } from "../../utils/ApiFeatures";

export const AgencyAddUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    console.log("req", req.body)
    try {
        const newUser = await AgencyUser.create({
            _id: new mongoose.Types.ObjectId(),
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            role: req.body.role,
            active: req.body.active,
            phone: req.body.phone,
            agency: req.body.agency,
            address: req.body.address,
            description: req.body.description,
        });

        res.status(201).json({ status: "success", data: newUser });
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: "fail",
                message: "Email already exists",
            });
        }
        console.error("Error creating user:", error);
        res.status(500).json({
            status: "fail",
            message: error.message,
        });
    }
};

export const AgencyGetAllUsers = async (req: Request, res: Response) => {
    console.log("req", req.body)
    try {
        let query = AgencyUser.find();

        const features = new APIFeatures(query, req.query)
            .sort()
            .paginate()
            .limitFields();

        const agencyStaff = await features.query;
        console.log("Agency staff", agencyStaff.length)
        res.status(200).json({ status: 'success', count: agencyStaff.length, agencyStaff });
    } catch (error) {
        console.error('Error getting all agencies:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

export const GetAgencyUsersByAgencyId = async (req: Request, res: Response) => {
    try {
        const id = (req.query.id as string) || '';
        if (!id) {
            return res.status(400).json({ status: 'fail', message: 'Agency ID is required' });
        }
        console.log("Fetching users for agency ID:", id);
        // Fetch all users, then filter by agency id
        // (Explicitly following requested behavior)
        const allUsers = await AgencyUser.find().lean();
        console.log(`Total users fetched: ${allUsers}`);
        const agencyStaff = allUsers.filter((u: any) => {
            const agencyVal = u?.agency;
            if (!agencyVal) return false;
            try {
                // agency can be an ObjectId or string
                const str = typeof agencyVal === 'string' ? agencyVal : agencyVal.toString();
                return str === id;
            } catch {
                return false;
            }
        });

        console.log(res.statusCode, "Agency staff", agencyStaff)
        return res.status(200).json({ status: 'success', count: agencyStaff.length, data: agencyStaff });
        
    } catch (error) {
        console.error('Error getting agency users by agency id:', error);
        return res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

export const AgencyUpdateUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.query.id;
        // console.log(req.query)
        const user = await AgencyUser.findByIdAndUpdate(id, req.body);
        if (!user) {
            return res
                .status(404)
                .json({ status: "fail", message: "User not found" });
        }
        res.status(200).json({ status: "success", data: user });
    } catch (error: any) {
        res.status(500).json({ status: "fail", message: error.message });
    }
};

export const AgencyDeleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.params.id as string;
        // console.log(id)

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ status: "fail", message: "Invalid ID format" });
        }

        console.log("Attempting to delete user with ID:", id);
        const user = await AgencyUser.findByIdAndDelete(id);
        // console.log("Result from findByIdAndDelete:", user);

        console.log("Successfully deleted user with ID:", id);
        if (!user) {
            return res.status(404).json({ status: "fail", message: "User not found" });
        }

        res.status(200).json({ status: "success", message: "User deleted" });
    } catch (error: any) {
        console.error("Error deleting user:", error.message);
        res.status(500).json({ status: "fail", message: error.message });
    }
};

export const AgencyDeleteManyUsers = async (req: Request, res: Response) => {
    const ids = req.body;
    try {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'IDs parameter is required and should be an array' });
        }

        const deleteResult = await AgencyUser.deleteMany({ _id: { $in: ids } });

        if (deleteResult.deletedCount === 0) {
            return res
                .status(404)
                .json({ status: 'fail', message: 'No bookings found to delete' });
        }
        console.log("successfully deleted staffs:", ids)
        res
            .status(200)
            .json({ status: 'success', message: 'Staffs deleted successfully', count: deleteResult.deletedCount });
    } catch (error) {
        console.error('Error deleting staffs:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};


export const AgencyDisableuser = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.query.id;
        console.log("id", id);
        const user = await AgencyUser.findByIdAndUpdate(
            id,
            { active: false },
            { new: true },
        );
        console.log("user", user);
        if (!user) {
            return res
                .status(404)
                .json({ status: "fail", message: "User not found" });
        }
        res.status(200).json({ status: "success", data: user });
    } catch (error: any) {
        res.status(500).json({ status: "fail", message: error.message });
    }
};

export const AgencyEnableuser = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.query.id;
        console.log("id", id);
        const user = await AgencyUser.findByIdAndUpdate(
            id,
            { active: true },
            { new: true },
        );
        console.log("user", user);
        if (!user) {
            return res
                .status(404)
                .json({ status: "fail", message: "User not found" });
        }
        res.status(200).json({ status: "success", data: user });
    } catch (error: any) {
        res.status(500).json({ status: "fail", message: error.message });
    }
};

export const AgencyGetUser = async (req: Request, res: Response) => {
    const id = req.query.id;
    console.log(id)
    try {
        // Check if ID exists
        if (!id) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'ID parameter is required' });
        }
        const user = await AgencyUser.findById(id);
        console.log(user)

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
