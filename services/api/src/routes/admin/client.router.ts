import express from "express";

import {
  AdmindeleteClientUser,
  AdmindeleteManyClientUsers,
  AdmingetAllClientUsers
} from "../../controller/admin/clientuser.controller";

export const clientuserRouter = express.Router(); // Define a separate router for flight routes
// Client User
//get all, delete many, delete one for sdmin
clientuserRouter.get("/getall", AdmingetAllClientUsers);
clientuserRouter.delete("/delete", AdmindeleteClientUser);
clientuserRouter.delete("/deleteMany", AdmindeleteManyClientUsers);
