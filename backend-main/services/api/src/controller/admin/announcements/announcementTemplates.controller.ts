import { NextFunction, Request, Response } from "express";
import AnnouncementTemplateModel from "../../../model/admin/announcementTemplates.model";
import mongoose from "mongoose";
import { APIFeatures } from "../../../utils/ApiFeatures";

export const CreateAnnouncementTemplate = async (req: Request, res: Response) => {
    console.log(req.body)
    try {
        const newAnnouncementTemplate = await AnnouncementTemplateModel.create({
            _id: new mongoose.Types.ObjectId(),
            templateName: req.body.templateName,
            templateTitle: req.body.templateTitle,
            templateBody: req.body.templateBody,
        });

        res.status(201).json({ status: "success", data: newAnnouncementTemplate });
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: "fail",
                message: "Template name is required",
            });
        }
        console.error("Error creating announcement template:", error);
        res.status(500).json({
            status: "fail",
            message: error.message,
        });
    }
};

export const getAllAnnouncementTemplates = async (req: Request, res: Response) => {
    try {
        let query = AnnouncementTemplateModel.find();

        const features = new APIFeatures(query, req.query)
            .sort()
            .paginate()
            .limitFields();

        const templates = await features.query;
        res.status(200).json({ status: 'success', count: templates.length, templates });
    } catch (error) {
        console.error('Error getting all announcement templates:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

export const deleteTemplate = async (req: Request, res: Response) => {
    const id = req.query.id as string;
    console.log("ID", req.params._id)
    try {
        // Check if ID exists
        if (!id) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'ID parameter is required' });
        }
        const template = await AnnouncementTemplateModel.findByIdAndDelete(id);
        if (!template) {
            console.log("no id")
            return res
                .status(404)
                .json({ status: 'fail', message: 'Template not found' });
        }
        console.log("successfully deleted the Template")
        res
            .status(200)
            .json({ status: 'success', message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting the template:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

export const updateTemplate = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.query.id;
        console.log(id)
        const template = await AnnouncementTemplateModel.findByIdAndUpdate(id, req.body);
        if (!template) {
            return res
                .status(404)
                .json({ status: "fail", message: "Template not found" });
        }
        res.status(200).json({ status: "success", data: template });
    } catch (error: any) {
        res.status(500).json({ status: "fail", message: error.message });
    }
};

export const deleteManyAnnouncemenTemplates = async (req: Request, res: Response) => {
    const { ids } = req.body;
    console.log("ID", ids)
    try {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'IDs parameter is required and should be an array' });
        }

        const deleteResult = await AnnouncementTemplateModel.deleteMany({ _id: { $in: ids } });

        if (deleteResult.deletedCount === 0) {
            return res
                .status(404)
                .json({ status: 'fail', message: 'No Announcement Template found to delete' });
        }
        console.log("successfully deleted the announcement templates:", ids)
        res
            .status(200)
            .json({ status: 'success', message: 'Announcement Templatess deleted successfully', count: deleteResult.deletedCount });
    } catch (error) {
        console.error('Error deleting announcement templates:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};