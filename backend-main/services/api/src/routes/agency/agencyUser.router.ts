import express, { NextFunction, Request, Response } from "express";
import { agencyAuthRouter } from "./agencyAuth.router";
import { agencyStaffRouter } from "./agencyStaff.router";
import { agencyFlightsRouter } from "./agencyFlightsRouter";
import { agencyBookingRouter } from "./agency.booking.routes";
import { agencyPassengersRouter } from "./agency.passengers.routes";
import { announcementRouter, announcementTemplateRouter } from "./agency.announcement.routes";
import { CardsRouter } from "./agency.dashboard.routes";

const AgencyUserRouter = express.Router();

// Admin routes
AgencyUserRouter.get("/agency", (_req: Request, res: Response) => {
    console.log("GET request received");
    res.send("Agency panel");
});

AgencyUserRouter.use("/auth", agencyAuthRouter);
AgencyUserRouter.use("/user", agencyStaffRouter);
AgencyUserRouter.use("/flight", agencyFlightsRouter);
AgencyUserRouter.use("/booking", agencyBookingRouter);
AgencyUserRouter.use("/passenger", agencyPassengersRouter);
AgencyUserRouter.use("/announcement", announcementRouter);
AgencyUserRouter.use("/announcement/templates", announcementTemplateRouter);
AgencyUserRouter.use("/notification", agencyPassengersRouter);
AgencyUserRouter.use("/cards", CardsRouter);

export default AgencyUserRouter;
