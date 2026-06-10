import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { AppError } from '../../utils/appError';
import {
  addClientReply,
  createClientTicket,
  getTicketDetailForClient,
  listClientTickets,
  reopenTicketByClient,
} from '../../services/supportTicket.service';
import { RequestWithUser } from '../../types';

const getUploadedAttachmentPaths = (req: RequestWithUser) => {
  const files = ((req as RequestWithUser & { files?: Express.Multer.File[] }).files ||
    []) as Express.Multer.File[];

  return files.map((file) => `/api/client/uploads/${file.filename}`);
};

const paramsSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

const createTicketSchema = Joi.object({
  title: Joi.string().trim().min(3).max(120).required(),
  description: Joi.string().trim().min(10).max(3000).required(),
  category: Joi.string()
    .valid(
      'bug',
      'feature',
      'feature_request',
      'support',
      'feedback',
      'other',
      'account',
      'booking',
      'payment',
      'general',
    )
    .required(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
});

const listTicketsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string()
    .valid('open', 'in-progress', 'in_progress', 'resolved', 'closed')
    .optional(),
  category: Joi.string().optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  search: Joi.string().trim().max(120).optional(),
  sort: Joi.string()
    .valid('createdAt', '-createdAt', 'lastMessageAt', '-lastMessageAt')
    .optional(),
});

const replySchema = Joi.object({
  message: Joi.string().trim().min(1).max(4000).required(),
});

export const createTicket = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { error, value } = createTicketSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    if (!req.userId) {
      return next(new AppError('You are not logged in', 401));
    }

    const ticket = await createClientTicket(req.userId.toString(), {
      ...value,
      attachments: getUploadedAttachmentPaths(req),
    });

    res.status(201).json({
      status: 'success',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserTickets = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { error, value } = listTicketsSchema.validate(req.query, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    if (!req.userId) {
      return next(new AppError('You are not logged in', 401));
    }

    const data = await listClientTickets(req.userId.toString(), value);

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getTicket = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { error } = paramsSchema.validate(req.params);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    if (!req.userId) {
      return next(new AppError('You are not logged in', 401));
    }

    const ticket = await getTicketDetailForClient(
      req.params.id,
      req.userId.toString(),
    );

    res.status(200).json({
      status: 'success',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const addConversation = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  try {
    const paramsValidation = paramsSchema.validate(req.params);
    if (paramsValidation.error) {
      return next(new AppError(paramsValidation.error.details[0].message, 400));
    }

    const bodyValidation = replySchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });
    if (bodyValidation.error) {
      return next(new AppError(bodyValidation.error.details[0].message, 400));
    }

    if (!req.userId) {
      return next(new AppError('You are not logged in', 401));
    }

    const ticket = await addClientReply(req.params.id, req.userId.toString(), bodyValidation.value.message, getUploadedAttachmentPaths(req));

    res.status(201).json({
      status: 'success',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const reopenTicket = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { error } = paramsSchema.validate(req.params);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    if (!req.userId) {
      return next(new AppError('You are not logged in', 401));
    }

    const ticket = await reopenTicketByClient(
      req.params.id,
      req.userId.toString(),
    );

    res.status(200).json({
      status: 'success',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};
