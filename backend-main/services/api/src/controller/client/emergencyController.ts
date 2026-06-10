import { Request, Response } from 'express';
import { RequestWithUser } from '../../types';
import { emergencyNotificationService } from '../../services/emergencyNotificationService';
import axios from 'axios';

// Interface for emergency contact
interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  priority: number; // Lower number means higher priority
}

// Interface for emergency event
interface EmergencyEvent {
  id: string;
  userId: string;
  type: 'sos' | 'medical' | 'security' | 'other';
  timestamp: Date;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  message?: string;
  resolved: boolean;
  resolvedAt?: Date;
}

export const addEmergencyContact = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.userId;
    const { name, phone, email, relationship, priority } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        status: 'fail',
        message: 'Name and phone are required for emergency contact'
      });
    }

    const result = await emergencyNotificationService.addEmergencyContact(userId, {
      name,
      phone,
      email,
      relationship: relationship || 'Other',
      priority: priority !== undefined ? Math.max(1, Math.min(10, parseInt(priority.toString()) || 1)) : 1
    });

    if (!result.success) {
      return res.status(400).json({
        status: 'fail',
        message: result.message
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'Emergency contact added successfully',
      data: result.contact
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Failed to add emergency contact'
    });
  }
};

export const getEmergencyContacts = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.userId;

    const result = await emergencyNotificationService.getEmergencyContacts(userId);

    if (!result.success) {
      return res.status(400).json({
        status: 'fail',
        message: result.message
      });
    }

    res.status(200).json({
      status: 'success',
      count: result.contacts.length,
      data: {
        contacts: result.contacts
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Failed to retrieve emergency contacts'
    });
  }
};

export const updateEmergencyContact = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.userId;
    const contactId = req.params.contactId;
    const { name, phone, email, relationship, priority } = req.body;

    const result = await emergencyNotificationService.updateEmergencyContact(userId, contactId, {
      name,
      phone,
      email,
      relationship,
      priority: priority !== undefined ? Math.max(1, Math.min(10, parseInt(priority.toString()) || 1)) : undefined
    });

    if (!result.success) {
      return res.status(400).json({
        status: 'fail',
        message: result.message
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Emergency contact updated successfully',
      data: result.contact
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Failed to update emergency contact'
    });
  }
};

export const deleteEmergencyContact = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.userId;
    const contactId = req.params.contactId;

    const result = await emergencyNotificationService.deleteEmergencyContact(userId, contactId);

    if (!result.success) {
      return res.status(400).json({
        status: 'fail',
        message: result.message
      });
    }

    res.status(200).json({
      status: 'success',
      message: result.message
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Failed to delete emergency contact'
    });
  }
};

export const triggerEmergencySignal = async (req: Request, res: Response) => {
  try {
    console.log('Emergency signal triggered:', req.body);
    const { userId, type, location, gps, timestamp } = req.body;

    // Call the unified Python AI service running on port 8000
    const response = await axios.post(`${process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:3001'}/api/v1/emergency/webhook`, {
      type: type || 'sos',
      location: location,
      gps: gps,
      timestamp: timestamp
    }, {
      headers: {
        'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`,
        'Content-Type': 'application/json'
      }
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Error triggering emergency signal:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to trigger emergency signal',
      details: error.message
    });
  }
};

export const triggerSOSAlert = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.userId;
    const { type, location, message, gps, timestamp } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'User not authenticated'
      });
    }

    // Optional: call your emergency notification service to alert contacts
    // For example:
    // const contactsResult = await emergencyNotificationService.getEmergencyContacts(userId);
    // Then send SMS/email to each contact...

    // Call the unified Python AI service (if you want AI analysis)
    const pythonServiceUrl = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000';
    const response = await axios.post(
      `${pythonServiceUrl}/api/v1/emergency/webhook`,
      {
        userId,
        type: type || 'sos',
        location: location || null,
        gps: gps || null,
        message: message || 'SOS alert triggered',
        timestamp: timestamp || new Date().toISOString()
      },
      {
        headers: {
          'Authorization': req.headers.authorization || '',
          'Content-Type': 'application/json'
        }
      }
    );

    // Optional: Save emergency event to database (if you have an EmergencyEvent model)
    // await EmergencyEvent.create({ userId, type: 'sos', ... });

    res.status(200).json({
      status: 'success',
      message: 'SOS alert triggered successfully',
      data: response.data
    });
  } catch (error: any) {
    console.error('SOS alert error:', error);
    res.status(error.response?.status || 500).json({
      status: 'fail',
      message: error.response?.data?.message || error.message || 'Failed to trigger SOS alert'
    });
  }
};

export const emergencyHealthCheck = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:3001'}/health-emergency`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Emergency health check failed:', error);
    res.status(500).json({ error: 'Emergency service unavailable' });
  }
};