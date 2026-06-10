import express from "express";
import { AgencyForgotPassword, AgencyLogin, AgencyResetPassword, AgencyUpdatePassword } from "../../controller/agency/auth.controller";
export const agencyAuthRouter = express.Router();

agencyAuthRouter.post("/login", AgencyLogin);
agencyAuthRouter.post("/forgotPassword", AgencyForgotPassword);
agencyAuthRouter.patch("/resetPassword/:token", AgencyResetPassword);
agencyAuthRouter.patch("/updateMyPassword/", AgencyUpdatePassword);
