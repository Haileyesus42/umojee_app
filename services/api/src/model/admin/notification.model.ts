import mongoose from "mongoose";

export interface NotificationDocument extends mongoose.Document {
    message: string;
    route: string;
    // seen: boolean;
    notifier: mongoose.Schema.Types.ObjectId; // Add user field
    notifiedTo: Array<mongoose.Schema.Types.ObjectId>;
}

// const NotificationSchema = new mongoose.Schema<NotificationDocument>(
//     {
//         message: {
//             type: String,
//             required: [true, "Notification must have a message!"],
//         },
//         route: {
//             type: String,
//             required: [true, "Notification must have a route!"],
//         },
//         seen: {
//             type: Boolean,
//             default: false,
//             required: [true, "Notification must have a flag!"],
//         },
//         notifier: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "AdminUser",
//             required: [true, "Notification must be associated with a user!"], // Reference the user
//         },
//         notifiedTo: [
//             {
//                 type: mongoose.Schema.Types.ObjectId,
//                 // ref: "AdminUser",
//                 required: [true, "Notification must be associated with a user!"], // Reference the user
//             },
//         ]
//     },
//     { timestamps: true },
// );

const NotificationSchema = new mongoose.Schema<NotificationDocument>(
    {
        message: {
            type: String,
            required: [true, "Notification must have a message!"],
        },
        route: {
            type: String,
            required: [true, "Notification must have a route!"],
        },
        notifier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminUser",
            required: [true, "Notification must have a notifier!"],
        },
        notifiedTo: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "AdminUser",
                    required: true,
                },
                seen: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
    },
    { timestamps: true }
);

const Notification = mongoose.model<NotificationDocument>("Notification", NotificationSchema);

export default Notification;
