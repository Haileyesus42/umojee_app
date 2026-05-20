import { Request } from 'express';

export enum Role {
  User = 'User',
  Supervisor = 'Supervisor',
  Manager = 'Manager',
  SuperAdmin = 'SuperAdmin',
  Admin = 'Admin',
  Agent = 'Agent',
}

export interface RequestWithUser extends Request {
  userId?: any;
}

export interface RequestWithReference extends Request {
  body: {
    referenceNumber?: string; // Ensure referenceNumber is expected in req.body
  };
}

export interface UserDocument {
  _id: string;
  email: string;
  phone: string;
  // Add other fields as necessary
}
export interface SuperAdminDocument {
  _id: string;
  email: string;
  phone: string;
  // Add other fields as necessary
}
export interface AgentsAdminDocument { //Agency Adminstrator
  _id: string;
  agencyName: string;
  agencyEmail: string;
  agencyPhone: string;
  agencyAddress: string;
  description: string;
  totalAgents: number;
  agencyStatus: string;
}
export interface AgentsDocument {
  _id: string;
  agentsName: string;
  agentsEmail: string;
  agentsPhone: string;
  agentsAddress: string;
  description: string;
  agentsRole: string;
  agentsStatus: string;
  agentsAgency: string;
  password: string;
}