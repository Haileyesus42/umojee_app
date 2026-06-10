import ClientUser from '../model/client/clientuser.model';
import { Email } from '../utils/email';

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

// Mock SMS service - in a real implementation, this would interface with 
// actual SMS provider like Twilio, AWS SNS, etc.
class SMSService {
  async sendSMS(phone: string, message: string): Promise<boolean> {
    console.log(`SMS sent to ${phone}: ${message}`);
    // In a real implementation, this would actually send the SMS
    // Example with Twilio:
    // const client = twilio(accountSid, authToken);
    // await client.messages.create({
    //   body: message,
    //   from: TWILIO_PHONE_NUMBER,
    //   to: phone
    // });
    return true; // Simulate successful send
  }
}

// Mock Email service - using existing email utility
class EmailService {
  async sendEmail(email: string, subject: string, message: string): Promise<boolean> {
    console.log(`Email sent to ${email}: ${subject} - ${message}`);
    // In a real implementation, this would actually send the email
    // We can use the existing Email utility in the project
    try {
      // Using the existing Email utility with a mock user
      const emailPayload = {
        email,
        firstName: 'Emergency Contact'
      };
      // The actual email sending would happen here
      // await new Email(emailPayload, '').sendGeneric(subject, message);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }
}

const smsService = new SMSService();
const emailService = new EmailService();

export class EmergencyNotificationService {
  /**
   * Sends emergency notifications to all contacts for a user
   */
  async notifyEmergencyContacts(
    userId: string, 
    eventType: 'sos' | 'medical' | 'security' | 'other', 
    customMessage?: string,
    location?: {
      latitude?: number;
      longitude?: number;
      address?: string;
    }
  ): Promise<{ success: boolean; notifiedContacts: number; message: string }> {
    try {
      // Fetch the user with their emergency contacts
      const user = await ClientUser.findById(userId).select('firstName lastName emergencyContacts');
      
      if (!user) {
        return { 
          success: false, 
          notifiedContacts: 0, 
          message: 'User not found' 
        };
      }

      if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
        return { 
          success: false, 
          notifiedContacts: 0, 
          message: 'No emergency contacts found for this user' 
        };
      }

      // Prepare the emergency message
      let message = `EMERGENCY ALERT: ${user.firstName} ${user.lastName} needs assistance.`;
      
      if (customMessage) {
        message += ` Message: "${customMessage}".`;
      }
      
      if (location && (location.latitude || location.longitude || location.address)) {
        message += ` Location: `;
        if (location.address) {
          message += `${location.address}.`;
        } else if (location.latitude && location.longitude) {
          message += `Lat: ${location.latitude}, Lng: ${location.longitude}.`;
        }
      }
      
      message += ` Type: ${eventType.toUpperCase()}.`;

      // Send notifications to all emergency contacts
      let notifiedCount = 0;
      const notificationPromises = user.emergencyContacts.map(async (contact) => {
        const notificationResults = [];

        // Send SMS if phone number exists
        if (contact.phone) {
          try {
            const smsResult = await smsService.sendSMS(contact.phone, message);
            notificationResults.push({ type: 'sms', success: smsResult });
            if (smsResult) notifiedCount++;
          } catch (smsError) {
            console.error(`Failed to send SMS to ${contact.phone}:`, smsError);
            notificationResults.push({ type: 'sms', success: false, error: smsError });
          }
        }

        // Send email if email exists
        if (contact.email) {
          try {
            const emailSubject = `URGENT: Emergency Alert for ${user.firstName} ${user.lastName}`;
            const emailResult = await emailService.sendEmail(contact.email, emailSubject, message);
            notificationResults.push({ type: 'email', success: emailResult });
            if (emailResult) notifiedCount++;
          } catch (emailError) {
            console.error(`Failed to send email to ${contact.email}:`, emailError);
            notificationResults.push({ type: 'email', success: false, error: emailError });
          }
        }

        return {
          contactId: contact.id,
          contactName: contact.name,
          results: notificationResults
        };
      });

      // Wait for all notifications to be sent
      const notificationResults = await Promise.all(notificationPromises);

      return {
        success: notifiedCount > 0,
        notifiedContacts: notifiedCount,
        message: `Emergency notifications sent to ${notifiedCount} contacts`
      };
    } catch (error) {
      console.error('Error in notifyEmergencyContacts:', error);
      return {
        success: false,
        notifiedContacts: 0,
        message: `Error sending emergency notifications: ${(error as Error).message}`
      };
    }
  }

  /**
   * Gets emergency contacts for a user
   */
  async getEmergencyContacts(userId: string): Promise<{ success: boolean; contacts: EmergencyContact[]; message?: string }> {
    try {
      const user = await ClientUser.findById(userId).select('emergencyContacts');
      
      if (!user) {
        return { 
          success: false, 
          contacts: [], 
          message: 'User not found' 
        };
      }

      const contacts = user.emergencyContacts || [];
      
      return {
        success: true,
        contacts
      };
    } catch (error) {
      console.error('Error in getEmergencyContacts:', error);
      return {
        success: false,
        contacts: [],
        message: `Error retrieving emergency contacts: ${(error as Error).message}`
      };
    }
  }

  /**
   * Adds an emergency contact for a user
   */
  async addEmergencyContact(
    userId: string,
    contactData: Omit<EmergencyContact, 'id'>
  ): Promise<{ success: boolean; contact?: EmergencyContact; message?: string }> {
    try {
      const user = await ClientUser.findById(userId);
      
      if (!user) {
        return { 
          success: false, 
          message: 'User not found' 
        };
      }

      // Initialize emergency contacts array if it doesn't exist
      if (!user.emergencyContacts) {
        user.emergencyContacts = [];
      }

      // Create new emergency contact
      const newContact: EmergencyContact = {
        id: `${userId}_contact_${Date.now()}`,
        ...contactData
      };

      // Add the new contact to the user's emergency contacts
      user.emergencyContacts.push(newContact);

      // Sort contacts by priority (lower number = higher priority)
      user.emergencyContacts.sort((a, b) => a.priority - b.priority);

      await user.save();

      return {
        success: true,
        contact: newContact
      };
    } catch (error) {
      console.error('Error in addEmergencyContact:', error);
      return {
        success: false,
        message: `Error adding emergency contact: ${(error as Error).message}`
      };
    }
  }

  /**
   * Updates an emergency contact for a user
   */
  async updateEmergencyContact(
    userId: string,
    contactId: string,
    contactData: Partial<Omit<EmergencyContact, 'id' | 'userId'>>
  ): Promise<{ success: boolean; contact?: EmergencyContact; message?: string }> {
    try {
      const user = await ClientUser.findById(userId);
      
      if (!user) {
        return { 
          success: false, 
          message: 'User not found' 
        };
      }

      if (!user.emergencyContacts) {
        return { 
          success: false, 
          message: 'No emergency contacts found' 
        };
      }

      const contactIndex = user.emergencyContacts.findIndex(contact => contact.id === contactId);
      if (contactIndex === -1) {
        return { 
          success: false, 
          message: 'Emergency contact not found' 
        };
      }

      // Update contact fields
      Object.assign(user.emergencyContacts[contactIndex], contactData);

      await user.save();

      return {
        success: true,
        contact: user.emergencyContacts[contactIndex]
      };
    } catch (error) {
      console.error('Error in updateEmergencyContact:', error);
      return {
        success: false,
        message: `Error updating emergency contact: ${(error as Error).message}`
      };
    }
  }

  /**
   * Deletes an emergency contact for a user
   */
  async deleteEmergencyContact(
    userId: string,
    contactId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const user = await ClientUser.findById(userId);
      
      if (!user) {
        return { 
          success: false, 
          message: 'User not found' 
        };
      }

      if (!user.emergencyContacts) {
        return { 
          success: false, 
          message: 'No emergency contacts found' 
        };
      }

      const initialLength = user.emergencyContacts.length;
      user.emergencyContacts = user.emergencyContacts.filter(contact => contact.id !== contactId);

      if (user.emergencyContacts.length === initialLength) {
        return { 
          success: false, 
          message: 'Emergency contact not found' 
        };
      }

      await user.save();

      return {
        success: true,
        message: 'Emergency contact deleted successfully'
      };
    } catch (error) {
      console.error('Error in deleteEmergencyContact:', error);
      return {
        success: false,
        message: `Error deleting emergency contact: ${(error as Error).message}`
      };
    }
  }
}

// Export singleton instance
export const emergencyNotificationService = new EmergencyNotificationService();