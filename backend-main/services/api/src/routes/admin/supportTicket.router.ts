import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  addConversation,
  assignTicket,
  closeTicket,
  createTicket,
  getAllTickets,
  getTicket,
  reopenTicket,
  updateTicketStatus,
} from '../../controller/admin/supportTicket.controller';
import { AdminProtect } from '../../controller/admin/authController';

const replyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many support replies. Please slow down.',
  },
});

const supportTicketRouter = express.Router();

supportTicketRouter.use(AdminProtect);

supportTicketRouter.get('/', getAllTickets);
supportTicketRouter.post('/', createTicket);
supportTicketRouter.get('/:id', getTicket);
supportTicketRouter.patch('/:id/status', updateTicketStatus);
supportTicketRouter.patch('/:id/assign', assignTicket);
supportTicketRouter.post('/:id/conversations', replyLimiter, addConversation);
supportTicketRouter.patch('/:id/close', closeTicket);
supportTicketRouter.patch('/:id/reopen', reopenTicket);

export default supportTicketRouter;
