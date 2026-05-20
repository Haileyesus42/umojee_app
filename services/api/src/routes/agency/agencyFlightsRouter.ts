import express from "express";
import { Agency_archiveFlight, Agency_cancelFlight, Agency_createFlight, Agency_deleteFlight, Agency_deleteManyFlights, Agency_getAllFlight, Agency_updateFlight } from "../../controller/agency/flights.controller";
export const agencyFlightsRouter = express.Router();

agencyFlightsRouter.post("/create", Agency_createFlight);
agencyFlightsRouter.get("/getall", Agency_getAllFlight);
// agencyFlightsRouter.get("/get/by-agency", GetAgencyUsersByAgencyId);
// agencyFlightsRouter.get("/get", AgencyGetUser);
agencyFlightsRouter.patch("/update", Agency_updateFlight);
agencyFlightsRouter.patch("/archive", Agency_archiveFlight );
agencyFlightsRouter.patch("/cancel", Agency_cancelFlight);
agencyFlightsRouter.delete("/delete", Agency_deleteFlight);
agencyFlightsRouter.delete("/deleteMany", Agency_deleteManyFlights);