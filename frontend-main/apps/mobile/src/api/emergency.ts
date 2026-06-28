// frontend-main/apps/mobile/src/api/emergency/emergency.ts
import { API_BASE_URL, PYTHON_AI_BASE_URL } from '../constants/Config';

export type EmergencyContact = {
  id: string;
  _id?: string;
  name: string;
  phone: string;
  relationship?: string;
  priority?: number;
};

export type EmergencyWebhookResponse = {
  status: string;
  message: string;
  user_found: boolean;
  user_info?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    current_location: string;
    address: string;
    hotel: string;
  };
  contact_info?: {
    primary?: { name: string; relationship: string; phone: string; whatsapp?: string };
    secondary?: { name: string; relationship: string; phone: string; whatsapp?: string };
  };
  emergency_details?: {
    signal_type: string;
    timestamp: string;
  };
};

export async function fetchEmergencyContacts(token: string): Promise<EmergencyContact[]> {
  const res = await fetch(`${API_BASE_URL}/api/client/emergency/contacts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch contacts');
  
  const json = await res.json();
  
  if (json?.data?.contacts && Array.isArray(json.data.contacts)) {
    return json.data.contacts;
  }
  if (json?.contacts && Array.isArray(json.contacts)) return json.contacts;
  if (json?.data && Array.isArray(json.data)) return json.data;
  if (Array.isArray(json)) return json;
  
  return [];
}

export async function createEmergencyContact(token: string, contact: Omit<EmergencyContact, 'id' | '_id'>) {
  const res = await fetch(`${API_BASE_URL}/api/client/emergency/contacts`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(contact),
  });
  if (!res.ok) throw new Error('Failed to create contact');
  return res.json();
}

export async function updateEmergencyContact(token: string, id: string, contact: Partial<EmergencyContact>) {
  const res = await fetch(`${API_BASE_URL}/api/client/emergency/contacts/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json', 
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(contact),
  });
  if (!res.ok) throw new Error('Failed to update contact');
  return res.json();
}

export async function deleteEmergencyContact(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/client/emergency/contacts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete contact');
  return res.json();
}

export async function triggerEmergencyWebhook(token: string, type: string = 'sos'): Promise<EmergencyWebhookResponse> {
  const res = await fetch(`${PYTHON_AI_BASE_URL}/api/v1/emergency/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type }),
  });
  
  const json = await res.json();
  
  if (!res.ok || json.status === 'fail') {
    throw new Error(json.message || 'Failed to trigger emergency signal');
  }
  
  return json;
}