import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import AdminUser from "../../model/admin/adminuser.model";
import jwt from "jsonwebtoken";
import { RequestWithUser } from "../../types";
import AgencyUser from "../../model/agency/agencyUser.model";

const signToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRES_IN!
    });
};

const createSendToken = (user: any, statusCode: number, res: Response) => {
    const token = signToken(user._id);

    if (process.env.JWT_COOKIE_EXPIRES_IN) {
        const JWT_COOKIE_EXPIRES_IN: number = parseInt(
            process.env.JWT_COOKIE_EXPIRES_IN
        );

        const cookieOptions = {
            expires: new Date(
                Date.now() + JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
            ),
            // ony send cookie on https
            secure: false,
            // can't modify the cookie in any way
            httpOnly: true
        };

        if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

        //res.cookie("jwt", token, cookieOptions);

        res.status(statusCode).json({
            status: 200,
            data: { user, token }
        });
    }
    // cookie
};

const verifyTokenAsync = (token: string, secret: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
};

export const AgencyLogin = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { email, password } = req.body;
        // 1) Check if email and password exist
        if (!email || !password) {
            return res.status(400).json({
                status: "fail",
                message: "Please provide email and password!"
            });
        }
        // 2) Check if user exists && password is correct
        const user = await AgencyUser.findOne({ email }).select("+password");
        const correct = await user?.correctPassword(password, user.password);
        console.log("Agency User", user)
        if (!user || !correct) {
            return res.status(401).json({
                status: "fail",
                message: "Incorrect email or password"
            });
        }

        // 3) If everything is ok, send token to client
        const token = signToken(user._id);
        res.status(200).json({ status: "success", user, token });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const AgencyProtect = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }
        if (!token) {
            return res.status(401).json({
                status: "fail",
                message: "You are not logged in! Please log in to get access."
            });
        }
        try {
            const decoded = await verifyTokenAsync(token, process.env.JWT_SECRET!);
            const currentUser = await AgencyUser.findById(decoded.id);
            if (!currentUser) {
                return res.status(401).json({
                    status: "fail",
                    message: "The user belonging to this token does no admin privilege."
                });
            }
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return res.status(401).json({
                    status: "fail",
                    message: "User recently changed password! Please Login Again"
                });
            }
            if (currentUser.active === false) {
                return res.status(401).json({
                    status: "fail",
                    message: "User is disabled"
                });
            }
            // Grant access to protected route
            req.userId = currentUser._id;
            next();
        } catch (error: any) {
            if (error.name === "JsonWebTokenError") {
                return res.status(401).json({
                    status: "fail",
                    message: "Invalid token! Please Login Again"
                });
            } else if (error.name === "TokenExpiredError") {
                return res.status(401).json({
                    status: "fail",
                    message: "Token expired! Please Login Again"
                });
            }
        }
    } catch (error: any) {
        res.status(401).json({ status: "fail", message: error.message });
    }
};

export const restrictTo = (...roles: string[]) => {
    return async (req: RequestWithUser, res: Response, next: NextFunction) => {
        const user = await AgencyUser.findById(req.userId);
        if (user) {
            if (!roles.includes(user.role)) {
                return res.status(403).json({
                    status: "fail",
                    message: "You do not have permission to perform this action"
                });
            }
        } else {
            return res.status(404).json({
                status: "fail",
                message: "User not found"
            });
        }
        next();
    };
};

export const AgencyForgotPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const user = await AgencyUser.findOne({ email: req.body.email });
    try {
        if (!user) {
            return res.status(404).json({
                status: "fail",
                message: "There is no user with email address"
            });
        }
        const resetToken = user.createPasswordResetToken();
        console.log(resetToken);
        await user.save({ validateBeforeSave: false });

        const resetURL = `${req.protocol}://${req.get(
            "host"
        )}/api/agency/user/resetPassword/${resetToken}`;
        const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;
        // await sendEmail({
        //   email: user.email,
        //   subject: "Your password reset token (valid for 10 min)",
        //   message,
        // });

        res
            .status(200)
            .json({ status: "success", message: "Token sent to email!" });
    } catch (error: any) {
        if (user) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
        }
        return res.status(500).json({
            status: "fail",
            message: error.message
        });
    }
};
export const AgencyResetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const hashedToken = crypto
            .createHash("sha256")
            .update(req.params.token)
            .digest("hex");
        const user = await AdminUser.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({
                status: "fail",
                message: "Token is invalid or has expired"
            });
        }
        const { password } = req.body;
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        createSendToken(user, 200, res);
    } catch (error: any) {
        res.status(500).json({ status: "fail", message: error.message });
    }
};
export const AgencyUpdatePassword = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
) => {
    // Get user from collection
    try {
        const user = await AgencyUser.findById(req.userId).select("+password");
        if (!user) {
            return res.status(404).json({
                status: "fail",
                message: "User not found"
            });
        }

        // Check if POSTed current password is correct
        if (
            !(await user.correctPassword(req.body.passwordCurrent, user.password))
        ) {
            return res.status(401).json({
                status: "fail",
                message: "Your current password is wrong"
            });
        }

        // If so, update password
        user.password = req.body.password;
        await user.save();
        // we can't use findByIdAndUpdate because we need to run the pre-save middleware
        // Log user in, send JWT

        createSendToken(user, 200, res);
    } catch (error: any) {
        res.status(500).json({ status: "fail", message: error.message });
    }
};