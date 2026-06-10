import mongoose from "mongoose";
import validator from "validator";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

interface AgentsTypesDocument extends Document {
    agentsName: string;
    agentsEmail: string;
    agentsPhone: string;
    agentsAddress: string;
    description: string;
    agentsRole: string;
    agentsStatus: string;
    agentsAgency: mongoose.Types.ObjectId;
    password: string;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    passwordChangedAt?: Date;
    find: (arg0: { active: boolean }) => any;
    correctPassword: (
        candidatePassword: string,
        userPassword: string
    ) => Promise<boolean>;
    changedPasswordAfter: (JWTTimestamp: any) => boolean;
    createPasswordResetToken: () => string;
}

const AgentsSchema = new mongoose.Schema<AgentsTypesDocument>({
    agentsName: {
        type: String,
        required: [true, "Pleaes provide agents Name"]
    },
    agentsEmail: {
        type: String,
        unique: true,
        required: [true, "Please provide agent's your email"],
        lowercase: true,
        validate: [validator.isEmail, "Please provide a valid email"],
    },
    agentsPhone: {
        type: String,
        // unique: true,
        required: [true, "Pleaes provide agents phone"],
    },
    agentsAddress: {
        type: String,
        // unique: true,
        required: [true, "Pleaes provide agents address"],
    },
    description: {
        type: String,
        // unique: true,
        required: [true, "Pleaes provide description"],
    },
    agentsRole: {
        required: [true, 'Please provide a role, AgentsManager, Agent'],
        type: String,
        enum: ['Agents Supervisor', 'Agent'],
        default: 'Agent',
    },
    agentsStatus: {
        type: String,
        enum: ['Active', 'Suspended'],
        required: [true, "Pleaes provide agents's status"],
        default: 'Active',
    },
    agentsAgency: {
        type: mongoose.Schema.Types.ObjectId, // Use ObjectId type
        ref: "Agency", // Reference the Agency model
        required: [true, "Please provide the agency the agent belongs to"],
    },
    password: {
        type: String,
        required: [false, 'Please provide a password'],
        minlength: 8,
        select: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
},
    { timestamps: true }
);

// Pre-save middleware
AgentsSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

AgentsSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = new Date(Date.now() - 1000);
    next();
});

// Instance methods
AgentsSchema.methods.correctPassword = async function (
    candidatePassword: string,
    userPassword: string
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

AgentsSchema.methods.changedPasswordAfter = function (JWTTimestamp: any) {
    if (this.passwordChangedAt) {
        const changedTimestamp = Math.floor(
            this.passwordChangedAt.getTime() / 1000
        );
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

AgentsSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    return resetToken;
};

const AgentsModel = mongoose.model<AgentsTypesDocument>('UISAgents', AgentsSchema);

export default AgentsModel;