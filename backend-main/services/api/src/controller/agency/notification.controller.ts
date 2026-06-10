import { NextFunction, Request, Response } from "express";
import Notification from "../../model/agency/notification.model";
import { APIFeatures } from "../../utils/ApiFeatures";
import { RequestWithUser } from "../../types";
import mongoose from "mongoose";

export interface NotificationP {
    _id: string;
    message: string;
    route: string;
    seen: boolean;
    createdAt: string;
}

export const getAllNotificationsn = async (req: Request, res: Response) => {
    try {
        let query = Notification.find();

        const features = new APIFeatures(query, req.query)
            .sort()
            .paginate()
            .limitFields();

        const notifications = await features.query;
        res.status(200).json({ status: 'success', count: notifications.length, notifications });
    } catch (error) {
        console.error('Error getting all announcements:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

export const getAllNotifications = async (req: RequestWithUser, res: Response) => {
    try {
        const userId = req.userId.toString(); // Convert userId to a string

        // Fetch notifications where the user is in the `notifiedTo.user` array
        let query = Notification.find({ "notifiedTo.user": userId })
            .select("_id message route notifiedTo createdAt"); // Include `createdAt`

        // Apply sorting, pagination, and other features
        const features = new APIFeatures(query, req.query).sort().paginate();

        // Execute query
        const notifications = await features.query;

        // Safely format notifications
        const formattedNotifications: NotificationP[] = notifications.map((notification: any) => {
            const notifiedToEntry = notification.notifiedTo?.find(
                (entry: any) => entry.user?.toString() === userId // Ensure both are strings
            );

            return {
                _id: notification._id?.toString() || '', // Convert ObjectId to string, default to empty string
                message: notification.message || '', // Default to empty string if undefined
                route: notification.route || '', // Default to empty string if undefined
                seen: notifiedToEntry ? notifiedToEntry.seen : false, // Default to false if not found
                createdAt: notification.createdAt
                    ? new Date(notification.createdAt).toISOString() // Ensure it's properly formatted
                    : new Date().toISOString(), // Default to current time if undefined
            };
        });

        // Respond with formatted data
        res.status(200).json({
            status: 'success',
            count: formattedNotifications.length,
            notifications: formattedNotifications,
        });
        console.log(res.statusCode, "Success!!!");
    } catch (error) {
        console.error('Error getting all notifications:', error);
        res.status(500).json({
            status: 'fail',
            message: 'Internal Server Error',
        });
    }
};



export const deleteAllNotifications = async (req: Request, res: Response) => {
    try {
        const result = await Notification.deleteMany({})
        res.status(204).json({ message: 'Successfully deleted all the notification data from DB' })
        console.log(res.statusCode, `Successfully deleted all, ${result.deletedCount}, the notification data from DB`)
    } catch (error) {

    }
}

// Update notification seen status from false to true
export const updateNotificationSeen = async (req: RequestWithUser, res: Response) => {
    try {
        const notificationId = req.params.id;
        const notificationObjectId = new mongoose.Types.ObjectId(notificationId);
        const userId = req.userId;

        console.log("User ID:", userId);

        console.log("Notification ID:", notificationId);

        // Find and update the `seen` field in the correct `notifiedTo` entry
        const updatedNotification = await Notification.findOneAndUpdate(
            {
                _id: notificationId, // Match the notification by ID
                "notifiedTo.user": userId, // Match the specific user in the `notifiedTo` array
            },
            {
                $set: { "notifiedTo.$.seen": true }, // Update the `seen` field for the matching user
            },
            { new: true } // Return the updated document
        );

        if (!updatedNotification) {
            console.error(
                "Notification not found or not associated with the user:",
                { notificationId, userId }
            );
            return res
                .status(404)
                .json({ status: "fail", message: "Notification not found or not owned by user" });
        }

        res.status(200).json({
            status: "success",
            message: "Notification marked as seen",
            data: updatedNotification,
        });
        console.log(res.statusCode, "Success!!!");

    } catch (error) {
        console.error("Error updating notification seen status:", error);
        res
            .status(500)
            .json({ status: "fail", message: "Internal Server Error" });
    }
};