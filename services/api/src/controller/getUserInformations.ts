import ClientUser from '../model/client/clientuser.model';
import AdminUser from '../model/admin/adminuser.model';
import AgencyUser from '../model/agency/agencyUser.model';
import mongoose from 'mongoose';

interface UserDetails {
    name: string;
    email: string;
    source: string;
}

// Helper function to validate if a string is a valid ObjectId
const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// Function to get details of the user requesting the refund
export const getRequesterDetails = async (userId: string): Promise<{ requesterName: string, requesterEmail: string, requestComesFrom: string }> => {
    if (!isValidObjectId(userId)) throw new Error('Invalid user ID format');

    const userObjectId = new mongoose.Types.ObjectId(userId); // Convert to ObjectId
    const client = await ClientUser.findById(userObjectId);
    if (client) {
        return {
            requesterName: `${client.firstName} ${client.lastName}`,
            requesterEmail: client.email,
            requestComesFrom: 'CLIENT SIDE'
        };
    }

    const admin = await AdminUser.findById(userObjectId);
    if (admin) {
        return {
            requesterName: admin.name,
            requesterEmail: admin.email,
            requestComesFrom: 'UIS DASHBOARD'
        };
    }

    const agency = await AgencyUser.findById(userObjectId);
    if (agency) {
        return {
            requesterName: agency.name,
            requesterEmail: agency.email,
            requestComesFrom: 'UXS DASHBOARD'
        };
    }

    throw new Error('Requester not found');
};

// Function to get details of the user who made the booking
export const getBookerDetails = async (userId: string): Promise<{ bookerName: string, bookerEmail: string, bookingComesFrom: string }> => {
    if (!isValidObjectId(userId)) throw new Error('Invalid user ID format');

    const userObjectId = new mongoose.Types.ObjectId(userId); // Convert to ObjectId
    const clientBooker = await ClientUser.findById(userObjectId);
    if (clientBooker) {
        return {
            bookerName: `${clientBooker.firstName} ${clientBooker.lastName}`,
            bookerEmail: clientBooker.email,
            bookingComesFrom: 'CLIENT SIDE'
        };
    }

    const adminBooker = await AdminUser.findById(userObjectId);
    if (adminBooker) {
        return {
            bookerName: adminBooker.name,
            bookerEmail: adminBooker.email,
            bookingComesFrom: 'UIS DASHBOARD'
        };
    }

    const agencyBooker = await AgencyUser.findById(userObjectId);
    if (agencyBooker) {
        return {
            bookerName: agencyBooker.name,
            bookerEmail: agencyBooker.email,
            bookingComesFrom: 'UXS DASHBOARD'
        };
    }

    throw new Error('Booker not found');
};


