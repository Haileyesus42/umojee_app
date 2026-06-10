import express from 'express';
import rateLimit from 'express-rate-limit';
import { supportClientUpload } from '../../middleware/multerSetupSupportClient';
import {
  addConversation,
  createTicket,
  getTicket,
  getUserTickets,
  reopenTicket,
} from '../../controller/client/supportTicket.controller';

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many support tickets created. Please try again shortly.',
  },
});

const replyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many replies sent. Please try again shortly.',
  },
});

const supportTicketRouter = express.Router();

supportTicketRouter.post('/', createLimiter, supportClientUpload.array('attachments', 5), createTicket);
supportTicketRouter.get('/', getUserTickets);
supportTicketRouter.get('/:id', getTicket);
supportTicketRouter.post(
  '/:id/conversations',
  replyLimiter,
  supportClientUpload.array('attachments', 5),
  addConversation,
);
supportTicketRouter.patch('/:id/reopen', reopenTicket);

export default supportTicketRouter;
