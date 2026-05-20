import mongoose, { Document } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Define an interface for the admin user schema
interface AgencyUserDocument extends Document {
    email: string;
    name: string;
    photo?: string | null | undefined;
    password: string;
    passwordChangedAt?: Date;
    role: string;
    phone: string;
    description: string;
    address: string;
    agency: mongoose.Schema.Types.ObjectId;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    find: (arg0: { active: boolean }) => any;
    correctPassword: (
        candidatePassword: string,
        userPassword: string
    ) => Promise<boolean>;
    changedPasswordAfter: (JWTTimestamp: any) => boolean;
    createPasswordResetToken: () => string;
    active: boolean;
    bookings: mongoose.Schema.Types.ObjectId[];
}

// Define the admin user schema
const AgencyUserSchema = new mongoose.Schema<AgencyUserDocument>(
    {
        email: {
            type: String,
            unique: true, // Ensure email is unique
            required: [true, 'Please tell us your email'],
            lowercase: true,
            validate: [validator.isEmail, 'Please provide a valid email']
        },
        name: { type: String, required: [true, 'Please provide a user name'] },
        photo: { type: String },
        phone: { type: String },
        address: { type: String },
        description: { type: String },
        role: {
            required: [
                true,
                'Please provide a role, Admin, Supervisor, Agent'
            ],
            type: String,
            enum: ['Supervisor', 'Agent', 'Admin'],
            default: 'User'
        },
        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: 8,
            select: false
        },
        passwordChangedAt: Date,
        passwordResetToken: String,
        passwordResetExpires: Date,
        active: {
            type: Boolean,
            default: true
        },
        agency: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NewAgency'

        },
        bookings: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Booking'
            }
        ]
    },
    { timestamps: true }
);

// Ensure unique index on email
AgencyUserSchema.index({ email: 1 }, { unique: true });

// Pre-save middleware
AgencyUserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

AgencyUserSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = new Date(Date.now() - 1000);
    next();
});

// Query middleware to hide inactive users
// AdminuserSchema.pre(/^find/, function (next) {
//   this.find({ active: true });
//   next();
// });

// Instance methods
AgencyUserSchema.methods.correctPassword = async function (
    candidatePassword: string,
    userPassword: string
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

AgencyUserSchema.methods.changedPasswordAfter = function (JWTTimestamp: any) {
    if (this.passwordChangedAt) {
        const changedTimestamp = Math.floor(
            this.passwordChangedAt.getTime() / 1000
        );
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

AgencyUserSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    return resetToken;
};

// Create and export the AdminUser model
const AgencyUser = mongoose.model<AgencyUserDocument>(
    'AgencyUser',
    AgencyUserSchema
);

export default AgencyUser;
