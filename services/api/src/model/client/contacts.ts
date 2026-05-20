import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
    fullName: string;
    email: string;
    message: string;
}

const contactSchema: Schema = new Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
});

export default mongoose.model<IContact>('Contact', contactSchema);