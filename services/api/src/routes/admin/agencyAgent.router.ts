import { RestrictTo } from '../../controller/admin/authController';
import {
    AdminAddAgency,
    deleteAgency,
    deleteManyAgencies,
    disableAgency,
    enableAgency,
    getAgency,
    getAllAgencies,
    updateAgency
} from '../../controller/admin/agencyController';
import express from 'express';
import { Role } from '../../types';
import { createAgent, deleteAgent, deleteManyAgents, disableAgent, enableAgent, getAgent, getAgentsById, getAllAgents, updateAgent } from '../../controller/admin/agentsController';

export const agencyRouter = express.Router(); //
agencyRouter.post('/create', AdminAddAgency);
agencyRouter.get('/getAllAgencies', getAllAgencies);
agencyRouter.get('/get', getAgency);
agencyRouter.patch('/update', updateAgency);
agencyRouter.patch('/disable', disableAgency);
agencyRouter.patch('/enable', enableAgency);
agencyRouter.delete('/delete/:_id', deleteAgency);
agencyRouter.delete('/deleteMany', deleteManyAgencies);

export const agentRouter = express.Router(); //
agentRouter.post('/create', createAgent);
agentRouter.get('/getAllAgents', getAllAgents);
agentRouter.get('/getallbyid', getAgentsById);
agentRouter.get('/get', getAgent);
agentRouter.patch('/update', updateAgent);
agentRouter.patch('/disable', disableAgent);
agentRouter.patch('/enable', enableAgent);
agentRouter.delete('/delete/:_id', deleteAgent);
agentRouter.delete('/deleteMany', deleteManyAgents);