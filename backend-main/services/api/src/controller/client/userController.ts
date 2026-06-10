import mongoose from 'mongoose';
import { NextFunction, Request, Response } from 'express';
import ClientUser from '../../model/client/clientuser.model';
import { RequestWithUser } from '../../types';
import { APIFeatures } from "../../utils/ApiFeatures";
import {
  encryptSensitiveTravelDocuments,
  isRevealProtectedTravelDocumentField,
  revealTravelDocumentFieldValue,
  sanitizeClientUserResponse
} from '../../utils/travelDocumentEncryption';
import {
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  generateOtpAuthUrl,
  generateQrCodeDataUrl,
  generateTwoFactorSecret,
  verifyTotpToken,
} from '../../utils/twoFactorAuth';
import { sanitizeBiometricData } from '../../utils/biometricEncryption';

export const UpdateUser = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract userId and updates from the request
    const userId = req.userId;
    const existingUser = await ClientUser.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      country, countryCode, phone, firstName, lastName, dob,
      homeLocation, budgetPreference, themePreference,
      gender, travelDocuments, journeyMonitoringPreference,
    } = req.body;

    const updates: Record<string, any> = {};
    if (country !== undefined) updates.country = country;
    if (countryCode !== undefined) updates.countryCode = countryCode;
    if (phone !== undefined) updates.phone = phone;
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (dob !== undefined) updates.dob = dob;
    if (homeLocation !== undefined) updates.homeLocation = homeLocation;
    if (budgetPreference !== undefined) updates.budgetPreference = budgetPreference;
    if (themePreference !== undefined) updates.themePreference = themePreference;
    if (gender !== undefined) updates.gender = gender;
    if (travelDocuments !== undefined) {
      const mergedTravelDocuments = {
        ...(existingUser.travelDocuments ? { ...existingUser.travelDocuments } : {}),
        ...travelDocuments,
      };
      updates.travelDocuments = encryptSensitiveTravelDocuments(mergedTravelDocuments);
    }
    if (journeyMonitoringPreference !== undefined) updates.journeyMonitoringPreference = journeyMonitoringPreference;
    const user = await ClientUser.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });
    if (user) {
      res.status(200).json({
        status: 'success',
        message: 'User updated successfully',
        data: sanitizeClientUserResponse(user),
      });
    }
  } catch (error: any) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

export const GetUser = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId; // Assuming the user ID is provided as a URL parameter

    const user = await ClientUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create a plain user object
    const plainUser = sanitizeClientUserResponse(user);
    
    // Add sanitized biometric data to the response
    if (user.biometricData) {
      plainUser.biometricData = sanitizeBiometricData(user.biometricData);
    }
    
    // Add emergency contacts to the response
    if (user.emergencyContacts) {
      plainUser.emergencyContacts = user.emergencyContacts;
    }

    res.status(200).json({
      status: 'success',
      message: 'User retrieved successfully',
      data: plainUser,
    });
  } catch (error) {
    next(error); // Pass any errors to the error handling middleware
  }
};

// Update profile picture with file upload
export const updateClientProfilePhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Ensure valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Find the user by ID
    const clientUser = await ClientUser.findById(id);
    if (!clientUser) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Update photo field with the file path
    clientUser.photo = `/api/client/uploads/${req.file.filename}`;

    // Save the updated user
    await clientUser.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile picture updated successfully',
      data: { clientUser: sanitizeClientUserResponse(clientUser) },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err });
  }
};

export const deleteAllClients = async (req: Request, res: Response) => {
  try {
    const result = await ClientUser.deleteMany({})
    res.status(204).json({ message: 'Successfully deleted all the client user data from DB' })
    console.log(res.statusCode, `Successfully deleted all, ${result.deletedCount}, the client user data from DB`)
  } catch (error) {

  }
}

export const getAllClients = async (req: Request, res: Response) => {
  try {
    let query = ClientUser.find();

    const features = new APIFeatures(query, req.query)
      .sort()
      .paginate()
      .limitFields();

    const clients = await features.query;
    res.status(200).json({
      status: 'success',
      count: clients.length,
      clients: clients.map((client: typeof clients[number]) => {
        const sanitizedClient = sanitizeClientUserResponse(client);
        // Add sanitized biometric data and emergency contacts to the response
        if (client.biometricData) {
          sanitizedClient.biometricData = sanitizeBiometricData(client.biometricData);
        }
        if (client.emergencyContacts) {
          sanitizedClient.emergencyContacts = client.emergencyContacts;
        }
        return sanitizedClient;
      }),
    });
  } catch (error) {
    console.error('Error getting all announcements:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

export const RevealSensitiveTravelDocument = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const { field, password, twoFactorCode } = req.body as {
      field?: string;
      password?: string;
      twoFactorCode?: string;
    };

    if (!field || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Field and password are required',
      });
    }

    if (!isRevealProtectedTravelDocumentField(field)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Unsupported travel document field',
      });
    }

    const user = await ClientUser.findById(req.userId).select('+password +twoFactorSecret');
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const isPasswordCorrect = await user.correctPassword(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect password',
      });
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(400).json({
          status: 'fail',
          message: 'Authenticator code is required',
        });
      }

      const secret = decryptTwoFactorSecret(user.twoFactorSecret);
      if (!secret || !verifyTotpToken(secret, twoFactorCode)) {
        return res.status(401).json({
          status: 'fail',
          message: 'Invalid authenticator code',
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      data: {
        field,
        value: revealTravelDocumentFieldValue(user.travelDocuments, field),
      },
    });
  } catch (error: any) {
    return res.status(400).json({ status: 'fail', message: error.message });
  }
};

export const BeginTwoFactorSetup = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const user = await ClientUser.findById(req.userId).select('+twoFactorSecret +twoFactorTempSecret');
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const plainSecret = generateTwoFactorSecret();
    const otpauthUrl = generateOtpAuthUrl(user.email, plainSecret);
    const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUrl);

    user.twoFactorTempSecret = encryptTwoFactorSecret(plainSecret);
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      status: 'success',
      message: 'Two-factor setup initialized',
      data: sanitizeClientUserResponse(user),
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const ConfirmTwoFactorSetup = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) {
      return res.status(400).json({ status: 'fail', message: 'Authenticator code is required' });
    }

    const user = await ClientUser.findById(req.userId).select('+twoFactorSecret +twoFactorTempSecret');
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const tempSecret = decryptTwoFactorSecret(user.twoFactorTempSecret);
    if (!tempSecret) {
      return res.status(400).json({
        status: 'fail',
        message: 'No pending two-factor setup found',
      });
    }

    if (!verifyTotpToken(tempSecret, token)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid authenticator code' });
    }

    user.twoFactorSecret = encryptTwoFactorSecret(tempSecret);
    user.twoFactorTempSecret = undefined;
    user.twoFactorEnabled = true;
    user.twoFactorEnabledAt = new Date();
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      status: 'success',
      message: 'Two-factor authentication enabled',
      data: sanitizeClientUserResponse(user),
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const DisableTwoFactor = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) {
      return res.status(400).json({ status: 'fail', message: 'Authenticator code is required' });
    }

    const user = await ClientUser.findById(req.userId).select('+twoFactorSecret +twoFactorTempSecret');
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ status: 'fail', message: 'Two-factor authentication is not enabled' });
    }

    const secret = decryptTwoFactorSecret(user.twoFactorSecret);
    if (!secret || !verifyTotpToken(secret, token)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid authenticator code' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorTempSecret = undefined;
    user.twoFactorEnabledAt = null;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      status: 'success',
      message: 'Two-factor authentication disabled',
      data: sanitizeClientUserResponse(user),
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};