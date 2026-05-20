import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { RequestWithUser } from '../../types';
import { AppError } from '../../utils/appError';
import {
  addAdminReply,
  assignTicketToAdmin,
  closeTicketByAdmin,
  createClientTicket,
  getTicketDetailForAdmin,
  listAdminTickets,
  reopenTicketByAdmin,
  updateAdminTicketStatus,
} from '../../services/supportTicket.service';

const paramsSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

const listTicketsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid('open', 'in-progress', 'in_progress', 'resolved', 'closed')
    .optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  category: Joi.string().optional(),
  assignedTo: Joi.string().allow('unassigned').optional(),
  search: Joi.string().trim().max(120).optional(),
  sort: Joi.string()
    .valid(
      'createdAt',
      '-createdAt',
      'lastMessageAt',
      '-lastMessageAt',
      'priority',
      '-priority',
      'status',
      '-status',
    )
    .optional(),
});

const createTicketSchema = Joi.object({
  createdBy: Joi.string().hex().length(24).required(),
  title: Joi.string().trim().min(3).max(120).required(),
  description: Joi.string().trim().min(10).max(3000).required(),
  category: Joi.string().required(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
});

const statusSchema = Joi.object({
  status: Joi.string()
    .valid('open', 'in-progress', 'in_progress', 'resolved', 'closed')
    .required(),
});

const assignSchema = Joi.object({
  assignedTo: Joi.string().hex().length(24).allow(null, '').optional(),
});

const replySchema = Joi.object({
  message: Joi.string().trim().min(1).max(4000).required(),
});

export const getAllTickets = async (
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

    const data = await listAdminTickets(value);

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

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

    const ticket = await createClientTicket(value.createdBy, value);

    res.status(201).json({
      status: 'success',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const getTicket = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { error } = paramsSchema.validate(req.params);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const ticket = await getTicketDetailForAdmin(req.params.id);

    res.status(200).json({
      status: 'success',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTicketStatus = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  try {
    const paramsValidation = paramsSchema.validate(req.params);
    if (paramsValidation.error) {
      return next(new AppError(paramsValidation.error.details[0].message, 400));
    }

    const bodyValidation = statusSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });
    if (bodyValidation.error) {
      return next(new AppError(bodyValidation.error.details[0].message, 400));
    }

    if (!req.userId) {
      return next(new AppError('You are not logged in', 401));
    }

    const ticket = await updateAdminTicketStatus(
      req.params.id,
      bodyValidation.value.status,
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

export const assignTicket = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  try {
    const paramsValidation = paramsSchema.validate(req.params);
    if (paramsValidation.error) {
      return next(new AppError(paramsValidation.error.details[0].message, 400));
    }

    const bodyValidation = assignSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });
    if (bodyValidation.error) {
      return next(new AppError(bodyValidation.error.details[0].message, 400));
    }

    if (!req.userId) {
      return next(new AppError('You are not logged in', 401));
    }

    const ticket = await assignTicketToAdmin(
      req.params.id,
      bodyValidation.value.assignedTo || null,
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

    const ticket = await addAdminReply(
      req.params.id,
      req.userId.toString(),
      bodyValidation.value.message,
    );

    res.status(201).json({
      status: 'success',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const closeTicket = async (
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

    const ticket = await closeTicketByAdmin(req.params.id, req.userId.toString());

    res.status(200).json({
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

    const ticket = await reopenTicketByAdmin(
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
