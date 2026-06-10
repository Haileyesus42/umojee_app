import mongoose, { Document } from "mongoose";

interface AnnouncementTemplateDocument extends Document {
    templateName: string;
    templateTitle: string;
    templateBody: string;
    // templateUpdatedAt: Date;
}

const AnnouncementTemplateSchema = new mongoose.Schema<AnnouncementTemplateDocument>({
    templateName: {
        type: String,
        unique: true,
        required: [true, "Please give a unique name to the template"]
    },
    templateTitle: {
        type: String,
        required: [true, "Please provide a title to the template"],
    },
    templateBody: {
        type: String,
        required: [true, "Please provide a message"],
    }
},
    { timestamps: true }
);

AnnouncementTemplateSchema.index({ templateName: 1 }, { unique: true });

// AnnouncementTemplateSchema.pre('save', function (next) {
//     if (this.isModified('templateName') || this.isModified('templateTitle') || this.isModified('templateBody')) {
//         this.updatedAt = new Date(Date.now() - 1000);
//     }
//     next();
// });

const AnnouncementTemplateModel = mongoose.model<AnnouncementTemplateDocument>('AnnouncementTemplates', AnnouncementTemplateSchema);

export default AnnouncementTemplateModel;
