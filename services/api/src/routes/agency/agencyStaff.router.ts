import express from "express";
import { AgencyAddUser, AgencyDeleteManyUsers, AgencyDeleteUser, AgencyDisableuser, AgencyEnableuser, AgencyGetAllUsers, AgencyGetUser, AgencyUpdateUser, GetAgencyUsersByAgencyId } from "../../controller/agency/agencyUser.controller";
export const agencyStaffRouter = express.Router();

agencyStaffRouter.post("/create", AgencyAddUser);
agencyStaffRouter.get("/getall", AgencyGetAllUsers);
agencyStaffRouter.get("/get/by-agency", GetAgencyUsersByAgencyId);
agencyStaffRouter.get("/get", AgencyGetUser);
agencyStaffRouter.patch("/update", AgencyUpdateUser);
agencyStaffRouter.patch("/enable", AgencyEnableuser );
agencyStaffRouter.patch("/disable", AgencyDisableuser);
agencyStaffRouter.delete("/delete/:id", AgencyDeleteUser);
agencyStaffRouter.delete("/deleteMany", AgencyDeleteManyUsers);