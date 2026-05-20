import { RestrictTo } from '../../controller/admin/authController';
import {
    AdminAddAgency,
    getAllAgencies
} from '../../controller/admin/agencyController';
import express from 'express';
import { Role } from '../../types';
import { AgentAdminAddAgent, getAllAgents } from '../../controller/admin/agentsController';

export const agencyRouter = express.Router(); // Define a separate router for flight routes
agencyRouter.post('/create', AdminAddAgency);
agencyRouter.get('/getAllAgencies', getAllAgencies);

export const agentRouter = express.Router(); // Define a separate router for flight routes
agentRouter.post('/create', AgentAdminAddAgent);
agentRouter.get('/getAllAgents', getAllAgents);