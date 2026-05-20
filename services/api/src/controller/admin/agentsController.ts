import { NextFunction, Request, Response } from "express";

// import AdminAgency from "../../model/admin/agencies.model";
import mongoose from "mongoose";
import AgentsModel from "../../model/admin/agent.model";
import { RequestWithUser } from "../../types";
import { APIFeatures } from "../../utils/ApiFeatures";
import AgencyModel from "../../model/admin/agencies.model";

const createAgent = async (req: Request, res: Response) => {
    const body = req.body;
    console.log("THE AGENT FROM DASHBOARD", body)
    const {
        agentsName,
        agentsEmail,
        agentsPhone,
        agentsAddress,
        description,
        agentsRole,
        agentsStatus,
        agentsAgency
    } = body;

    // Add check for all required fields
    if (
        !agentsName ||
        !agentsEmail ||
        !agentsPhone ||
        !agentsAddress ||
        !description ||
        !agentsRole ||
        !agentsStatus ||
        !agentsAgency
    ) {
        console.log("info error")
        return res
            .status(400)
            .json({ status: 'fail', message: 'Please fill in all required fields' });
    }
    try {
        // Find the agency ID by agencyName
        const agency = await AgencyModel.findOne({ agencyName: agentsAgency });

        if (!agency) {
            return res
                .status(404)
                .json({ status: 'fail', message: 'Agency not found' });
        }
        const Agent = new AgentsModel({
            _id: new mongoose.Types.ObjectId(),
            agentsName,
            agentsEmail,
            agentsPhone,
            agentsAddress,
            description,
            agentsRole,
            agentsStatus,
            agentsAgency: agency._id, // Assign the agency ID
        });

        await Agent.save();

        res.status(201).json({
            status: 'success',
            message: 'Agent created successfully',
            Agent,
        });
    } catch (error: any) {
        console.error('Error creating Agent:', error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};
export {
    createAgent
}

export const AgentAdminAddAgent = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
) => {
    // const user = await AgentsModel.findById(userId);
    // if (!user) {
    //   throw new Error('User not found');
    // }
    try {
        const newAgent = await AgentsModel.create({
            _id: new mongoose.Types.ObjectId(),
            agentsName: req.body.agentsName,
            agentsEmail: req.body.agentsEmail,
            agentsPhone: req.body.agentsPhone,
            agentsAddress: req.body.agentsAddress,
            description: req.body.description,
            agentsRole: req.body.agentsRole,
            agentsStatus: req.body.agentsStatus,
            agentsAgency: req.body.agentsAgency,
        });

        res.status(201).json({ status: "success", data: newAgent });
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: "fail",
                message: "Agency Email already exists",
            });
        }
        console.error("Error creating user:", error);
        res.status(500).json({
            status: "fail",
            message: error.message,
        });
    }
};

export const getAllAgents = async (req: Request, res: Response) => {
    try {
        let query = AgentsModel.find();

        const features = new APIFeatures(query, req.query)
            .sort()
            .paginate()
            .limitFields();

        const agents = await features.query;
        res.status(200).json({ status: 'success', count: agents.length, agents });
    } catch (error) {
        console.error('Error getting all agents:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

const deleteAgent = async (req: Request, res: Response) => {
    const id = req.params._id as string;
    console.log("ID", req.params._id)
    try {
        // Check if ID exists
        if (!id) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'ID parameter is required' });
        }
        const agency = await AgentsModel.findByIdAndDelete(id);
        if (!agency) {
            console.log("no id")
            return res
                .status(404)
                .json({ status: 'fail', message: 'Agent not found' });
        }
        console.log("successfully deleted the agent")
        res
            .status(200)
            .json({ status: 'success', message: 'Agent deleted successfully' });
    } catch (error) {
        console.error('Error deleting agent:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

const deleteManyAgents = async (req: Request, res: Response) => {
    const ids = req.body;
    console.log("ID", ids)
    try {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'IDs parameter is required and should be an array' });
        }

        const deleteResult = await AgentsModel.deleteMany({ _id: { $in: ids } });

        if (deleteResult.deletedCount === 0) {
            return res
                .status(404)
                .json({ status: 'fail', message: 'No Agents found to delete' });
        }
        console.log("successfully deleted the agents:", ids)
        res
            .status(200)
            .json({ status: 'success', message: 'Agents deleted successfully', count: deleteResult.deletedCount });
    } catch (error) {
        console.error('Error deleting agents:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

const getAgent = async (req: Request, res: Response) => {
    const id = req.query.id;
    try {
        // Check if ID exists
        if (!id) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'ID parameter is required' });
        }
        const agent = await AgentsModel.findById(id);
        if (!agent) {
            return res
                .status(404)
                .json({ status: 'fail', message: 'Agent not found' });
        }
        res.json({ status: 'success', agent });
    } catch (error) {
        console.error('Error getting agent:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

const getAgentsById = async (req: Request, res: Response) => {
    const id = req.query.id as string;
    console.log(`Received ID: ${id}`);

    try {
        if (!id) {
            return res.status(400).json({ status: 'fail', message: 'ID parameter is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ status: 'fail', message: 'Invalid ID format' });
        }

        const agents = await AgentsModel.find();
        // const agents = await AgentsModel.find({ agentsAgency: id });
        console.log(`Found agents: ${agents.length}`);

        if (agents.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'Agent not found' });
        }

        res.json({ status: 'success', count: agents.length, agents });
    } catch (error) {
        console.error('Error getting agents:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};



const updateAgent = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.query.id;

        const agent = await AgentsModel.findByIdAndUpdate(id, req.body);
        if (!agent) {
            return res
                .status(404)
                .json({ status: "fail", message: "Agent not found" });
        }
        res.status(200).json({ status: "success", data: agent });
    } catch (error: any) {
        res.status(500).json({ status: "fail", message: error.message });
    }
};

const disableAgent = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.query.id;
        //   console.log("id", id);
        const agent = await AgentsModel.findByIdAndUpdate(
            id,
            { agentsStatus: "Suspended" },
            { new: true },
        );
        if (!agent) {
            return res
                .status(404)
                .json({ status: "fail", message: "Agent not found" });
        }
        res.status(200).json({ status: "success", data: agent });
    } catch (error: any) {
        res.status(500).json({ status: "fail", message: error.message });
    }
};

const enableAgent = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.query.id;
        console.log("id", id);
        const agent = await AgentsModel.findByIdAndUpdate(
            id,
            { agentsStatus: "Active" },
            { new: true },
        );
        if (!agent) {
            return res
                .status(404)
                .json({ status: "fail", message: "Agent not found" });
        }
        res.status(200).json({ status: "success", data: agent });
    } catch (error: any) {
        res.status(500).json({ status: "fail", message: error.message });
    }
};

export { deleteManyAgents, deleteAgent, getAgent, updateAgent, disableAgent, enableAgent, getAgentsById };
