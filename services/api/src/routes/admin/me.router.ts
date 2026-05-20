import express from "express";
import {
  AdmindeleteMe,
  AdminupdateMe,
  AdminUpdateProfile,
  updateProfilePhoto
} from "../../controller/admin/adminuser.controller";
import { AdminProtect } from "../../controller/admin/authController";
import { upload } from "../../middleware/multerSetup";

export const meRouter = express.Router(); // Define a separate router for flight routes
// Self AdminUser routes
meRouter.patch("/update", AdminProtect, AdminupdateMe);
meRouter.put('/avatar/:id/photo', upload.single('photo'), updateProfilePhoto);
meRouter.patch("/edit", AdminProtect, AdminUpdateProfile);
meRouter.delete("/delete", AdminProtect, AdmindeleteMe);
