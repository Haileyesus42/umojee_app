import express from "express";
import {
  AdminForgotPassword,
  AdminResetPassword,
  AdminUpdatePassword,
  AdminLogin,
  // AgencyLogin
} from "../../controller/admin/authController";
export const authRouter = express.Router();

authRouter.post("/login", AdminLogin);
// authRouter.post("/agency/login", AgencyLogin);
authRouter.post("/forgotPassword", AdminForgotPassword);
authRouter.patch("/resetPassword/:token", AdminResetPassword);
authRouter.patch("/updateMyPassword/", AdminUpdatePassword);
