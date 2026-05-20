import { NextFunction, Request, Response } from "express";
import Announcement from "../../../model/admin/announcement.model";
import mongoose from "mongoose";
import { APIFeatures } from "../../../utils/ApiFeatures";
import AnnouncementTemplateModel from "../../../model/admin/announcementTemplates.model";
import Notification from "../../../model/admin/notification.model";
import { Email } from "../../../utils/email";

export const NewAnnouncement = async (req: Request, res: Response) => {
    const data = {
        email: req.body.announcedTo.map((user: any) => user.anncUserEmail),
        firstName: req.body.announcedTo.map((user: any) => user.anncUserName),
        body: req.body.message.templateBody,
        name: req.body.message.templateName,
        title: req.body.message.templateTitle,
        announcer: req.body.announcer.email,
    };

    try {
        const selectedMessageTemplate = await AnnouncementTemplateModel.findById(req.body.message.id);
        if (!selectedMessageTemplate) {
            return res.status(404).json({
                status: "fail",
                message: "Selected message template not found",
            });
        }

        const newAnnouncement = await Announcement.create({
            _id: new mongoose.Types.ObjectId(),
            announcerId: req.body.announcer._id,
            selectedMessage: req.body.message.id,
            selectedMessageData: {
                templateName: selectedMessageTemplate.templateName,
                templateTitle: selectedMessageTemplate.templateTitle,
                templateBody: selectedMessageTemplate.templateBody,
            },
        });

        const user = {
            email: data.email,
            firstName: data.firstName,
            url: 'url:'
        };

        await new Email(user, 'url:').announcementEmail(data);

        res.status(201).json({ status: "success", data: newAnnouncement });
        console.log(res.statusCode, "Successfully created a new announcement!");
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: "fail",
                message: "Announcement name is required",
            });
        }
        console.error("Error creating announcement:", error);
        res.status(500).json({
            status: "fail",
            message: error.message,
        });
    }
};

export const getAllAnnouncementsByUserId = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;

        // Validate userId
        if (!userId || !mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ status: 'fail', message: 'Invalid or missing User ID' });
        }

        const userObject = new mongoose.Types.ObjectId(userId.toString());

        // Query announcements for the user
        let query = Announcement.find({ announcedTo: { $in: [userObject] } });

        // Apply API features
        const features = new APIFeatures(query, req.query)
            .sort()
            .paginate()
            .limitFields();

        const announcements = await features.query;

        res.status(200).json({
            status: 'success',
            count: announcements.length,
            announcements
        });

        console.log(res.statusCode, `Announcements fetched successfully for user: ${userId}`);
    } catch (error) {
        console.error('Error getting all announcements:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

export const getAllAnnouncements = async (req: Request, res: Response) => {
    try {
        let query = Announcement.find();

        const features = new APIFeatures(query, req.query)
            .sort()
            .paginate()
            .limitFields();

        const announcements = await features.query;
        res.status(200).json({ status: 'success', count: announcements.length, announcements });
    } catch (error) {
        console.error('Error getting all announcements:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
    const id = req.query.id as string;
    try {
        if (!id) {
            return res.status(400).json({ status: 'fail', message: 'ID parameter is required' });
        }
        const announcement = await Announcement.findByIdAndDelete(id);
        if (!announcement) {
            console.log("No announcement with that ID found");
            return res.status(404).json({ status: 'fail', message: 'Announcement not found' });
        }
        console.log("Successfully deleted the announcement");
        res.status(200).json({ status: 'success', message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Error deleting the announcement:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

export const updateAnnouncement = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = req.query.id;
        console.log(id)
        console.log(req.body)
        const announcement = await Announcement.findByIdAndUpdate(id, req.body);
        if (!announcement) {
            return res
                .status(404)
                .json({ status: "fail", message: "Announcement not found" });
        }
        res.status(200).json({ status: "success", data: announcement });
    } catch (error: any) {
        res.status(500).json({ status: "fail", message: error.message });
    }
};

export const deleteManyAnnouncements = async (req: Request, res: Response) => {
    const { ids } = req.body;
    console.log("ID", ids)
    try {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'IDs parameter is required and should be an array' });
        }

        const deleteResult = await Announcement.deleteMany({ _id: { $in: ids } });

        if (deleteResult.deletedCount === 0) {
            return res
                .status(404)
                .json({ status: 'fail', message: 'No Announcement found to delete' });
        }
        console.log("successfully deleted the announcements:", ids)
        res
            .status(200)
            .json({ status: 'success', message: 'Announcements deleted successfully', count: deleteResult.deletedCount });
    } catch (error) {
        console.error('Error deleting announcements:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

export const deleteAllAnnouncements = async (req: Request, res: Response) => {
    try {
        const result = await Announcement.deleteMany({})
        res.status(204).json({ message: 'Successfully deleted all the announcement data from DB' })
        console.log(res.statusCode, `Successfully deleted all, ${result.deletedCount}, the announcement data from DB`)
    } catch (error) {

    }
}