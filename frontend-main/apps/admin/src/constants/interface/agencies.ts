interface Timestamps {
    createdAt: string;
    updatedAt: string;
}

export interface AgenciesSliceType {
    agenciesList: Agenciees[];
    isFetchingAgencies: boolean;
}

export interface NewAgency {
    agencyName: string;
    agencyEmail: string;
    agencyPhone: string;
    agencyAddress: string;
    description: string;
    totalAgents: number;
    agencyStatus: string;
    password?: string;
    countryCode?: string;
}

export interface Agenciees {
    _id: string;
    agencyName: string;
    agencyEmail: string;
    agencyPhone: string;
    agencyAddress: string;
    description: string;
    totalAgents: number;
    agencyStatus: string;
    password?: string;
    agencyId?: string;
    countryCode?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AddAgencies extends Timestamps {
    _id: string;
    agencyName: string;
    agencyEmail: string;
    agencyPhone: string;
    countryCode?: string;
    agencyAddress: string;
    description: string;
    totalAgents: number;
    agencyStatus: string;
    password?: string;
}

export interface EditAgencies {
    _id: string;
    agencyName: string;
    agencyEmail: string;
    agencyPhone: string;
    countryCode?: string;
    agencyAddress: string;
    description: string;
    totalAgents: number;
    agencyStatus: string;
}