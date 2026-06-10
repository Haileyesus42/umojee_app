import express from 'express';
import { login, Clientsignup } from "../../controller/client/authController";





export const authRouter = express.Router();

authRouter.post('/login', login);
authRouter.post('/signup', Clientsignup);