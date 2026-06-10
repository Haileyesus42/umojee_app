import mongoose from "mongoose";

export interface AnnouncementDocument extends mongoose.Document {
    announcerId: mongoose.Schema.Types.ObjectId;
    announcedTo: Array<mongoose.Schema.Types.ObjectId>;
    selectedMessage: mongoose.Schema.Types.ObjectId;
    selectedMessageData: {
        templateName: string;
        templateTitle: string;
        templateBody: string;
    }
}

const AnnouncementSchema = new mongoose.Schema<AnnouncementDocument>(
    {
        announcerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AgencyUser", // Assuming announcerId refers to a User, change accordingly
            required: [true, "Announcement must have an announcer!"],
        },
        selectedMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AnnouncementTemplates", // Assuming announcerId refers to a User, change accordingly
            required: [true, "Announcement must have a message!"],
        },
        selectedMessageData: {
            templateName: {
                type: String,
            },
            templateTitle: {
                type: String,
            },
            templateBody: {
                type: String,
            }
        },
        announcedTo: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "AgencyUser", // Assuming announcedTo refers to Users, change accordingly
            },
        ],
    },
    { timestamps: true },
);

AnnouncementSchema.pre<AnnouncementDocument>("find", function (next) {
    // this.populate("announcerId");
    // this.populate("announcedTo");
    // this.populate("selectedMessage");
    next();
});

const Announcement = mongoose.model<AnnouncementDocument>("AgencyAnnouncement", AnnouncementSchema);

export default Announcement;
