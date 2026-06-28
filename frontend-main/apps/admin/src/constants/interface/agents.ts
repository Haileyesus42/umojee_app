interface Timestamps {
    createdAt: string;
    updatedAt: string;
}

export interface AgentsSliceType {
    agentsList: Agents[];
    isFetchingAgents: boolean;
}

export interface NewAgent {
    agentsName: string;
    agentsEmail: string;
    agentsPhone: string;
    agentsAddress: string;
    description: string;
    agentsRole: string;
    agentsStatus: string;
    agentsAgency: string;
    password?: string;
    countryCode?: string;
}

export interface Agents extends Timestamps {
    _id: string;
    agentsName: string;
    agentsEmail: string;
    agentsPhone: string;
    agentsAddress: string;
    description: string;
    agentsRole: string;
    agentsStatus: string;
    agentsAgency: string;
    password?: string;
    countryCode?: string;
}
