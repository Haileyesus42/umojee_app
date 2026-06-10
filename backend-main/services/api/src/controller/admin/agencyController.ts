import { NextFunction, Request, Response } from "express";

import AgencyModel from "../../model/admin/agencies.model";
import mongoose from "mongoose";
// import AgentsModel from "../../model/admin/agent.model";
import { RequestWithUser } from "../../types";
import { APIFeatures } from "../../utils/ApiFeatures";
// import { CountryCodes } from "validator/lib/isISO31661Alpha2";
import AgencyUser from "../../model/agency/agencyUser.model";

export const AdminAddAgency = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
) => {
    console.log("AGENCIES INFO FROM DASHBOARD", req.body)
    const {
        agencyName,
        agencyEmail,
        agencyPhone,
        agencyAddress,
        description,
        totalAgents,
        agencyStatus,
        password,
        // countryCode
    } = req.body;

    // Add check for all required fields
    if (
        !agencyName ||
        !agencyEmail ||
        !agencyPhone ||
        !agencyAddress ||
        !description ||
        !totalAgents ||
        !agencyStatus ||
        !password
    ) {
        console.log("info error")
        return res
            .status(400)
            .json({ status: 'fail', message: 'Please fill in all required fields' });
    }
    try {
        const newAgency = await AgencyModel.create({
            _id: new mongoose.Types.ObjectId(),
            agencyName: req.body.agencyName,
            agencyEmail: req.body.agencyEmail,
            agencyPhone: req.body.agencyPhone,
            agencyAddress: req.body.agencyAddress,
            description: req.body.description,
            totalAgents: req.body.totalAgents,
            agencyStatus: req.body.agencyStatus,
            // countryCode: req.body.countryCode,
            password: req.body.password,
        });
        const supervisor = await AgencyUser.create({ name: agencyName, email: agencyEmail, role: "Supervisor", agency: newAgency._id, password: "12345678", active: true })
        console.log("Supervisor", supervisor)
        res.status(201).json({ status: "success", data: newAgency });
    } catch (error: any) {
        // if (error.code === 11000) {
        //     return res.status(400).json({
        //         status: "fail",
        //         message: "Agency Email already exists",
        //     });
        // }
        console.error("Error creating agency:", error);
        res.status(500).json({
            status: "fail",
            message: error.message,
        });
    }
};


export const getAllAgencies = async (req: Request, res: Response) => {
    try {
        let query = AgencyModel.find();

        const features = new APIFeatures(query, req.query)
            .sort()
            .paginate()
            .limitFields();

        const agencies = await features.query;
        res.status(200).json({ status: 'success', count: agencies.length, agencies });
    } catch (error) {
        console.error('Error getting all agencies:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

const deleteAgency = async (req: Request, res: Response) => {
    const id = req.params._id as string;
    console.log("ID", req.params._id)
    try {
        // Check if ID exists
        if (!id) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'ID parameter is required' });
        }
        const agency = await AgencyModel.findByIdAndDelete(id);
        if (!agency) {
            console.log("no id")
            return res
                .status(404)
                .json({ status: 'fail', message: 'Agency not found' });
        }
        console.log("successfully deleted the agency")
        res
            .status(200)
            .json({ status: 'success', message: 'Agency deleted successfully' });
    } catch (error) {
        console.error('Error deleting agency:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

const deleteManyAgencies = async (req: Request, res: Response) => {
    const ids = req.body;
    try {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'IDs parameter is required and should be an array' });
        }

        const deleteResult = await AgencyModel.deleteMany({ _id: { $in: ids } });

        if (deleteResult.deletedCount === 0) {
            return res
                .status(404)
                .json({ status: 'fail', message: 'No agencies found to delete' });
        }
        console.log("successfully deleted the agencies:", ids)
        res
            .status(200)
            .json({ status: 'success', message: 'Agencies deleted successfully', count: deleteResult.deletedCount });
    } catch (error) {
        console.error('Error deleting agencies:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

const getAgency = async (req: Request, res: Response) => {
    const id = req.query.id;
    try {
        // Check if ID exists
        if (!id) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'ID parameter is required' });
        }
        const agency = await AgencyModel.findById(id);
        if (!agency) {
            return res
                .status(404)
                .json({ status: 'fail', message: 'Agency not found' });
        }
        res.json({ status: 'success', agency });
    } catch (error) {
        console.error('Error getting agency:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

const updateAgency = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.body._id;
        // console.log(req.body)
        const agency = await AgencyModel.findByIdAndUpdate(id, req.body);
        if (!agency) {
            return res
                .status(404)
                .json({ status: "fail", message: "Agency not found" });
        }
        res.status(204).json({ status: "success", data: agency });
    } catch (error: any) {
        res.status(500).json({ status: "fail", message: error.message });
    }
};

const disableAgency = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.query.id;
        //   console.log("id", id);
        const agency = await AgencyModel.findByIdAndUpdate(
            id,
            { agencyStatus: "Suspended" },
            { new: true },
        );
        if (!agency) {
            return res
                .status(404)
                .json({ status: "fail", message: "Agency not found" });
        }
        res.status(200).json({ status: "success", data: agency });
    } catch (error: any) {
        res.status(500).json({ status: "fail", message: error.message });
    }
};

const enableAgency = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.query.id;
        //   console.log("id", id);
        const agency = await AgencyModel.findByIdAndUpdate(
            id,
            { agencyStatus: "Active" },
            { new: true },
        );
        if (!agency) {
            return res
                .status(404)
                .json({ status: "fail", message: "Agency not found" });
        }
        res.status(200).json({ status: "success", data: agency });
    } catch (error: any) {
        res.status(500).json({ status: "fail", message: error.message });
    }
};

export { deleteManyAgencies, deleteAgency, getAgency, updateAgency, disableAgency, enableAgency };
