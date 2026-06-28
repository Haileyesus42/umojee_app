import { Timestamps } from './';

export interface Agent extends Timestamps {
  id: string;
  agentsName: string;
  agentsEmail: string;
  agentsPhone: string;
  agentsAddress: string;
  description: string;
  agentsRole?: string;
  agentsStatus: string;
  agentsAgency?: string;
}

export interface AgentsStateType {
  agentsList: Agent[];
  isFetchingAgents: boolean;
  isCreatingAgent: boolean;
  showAddAgentModal: boolean;
}
