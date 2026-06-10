import FlightModel, { FlightDocument } from '../model/flight.model';
import BookingModel from '../model/booking.model';
import ClientNotificationModel from '../model/client/notification.model';
import axios from 'axios';
import mongoose from 'mongoose';
import AmadeusBookingModel from '../model/amadeus/amadeus.model'

const AI_BACKEND_URL = process.env.AI_BACKEND_URL

interface FlightStatusUpdate {
  status: string; 
  newDepartureTime?: Date;
  newArrivalTime?: Date;
  gate?: string;
}

export const handleFlightDisruption = async (
  flightId: string,
  oldStatus: string,
  updateData: FlightStatusUpdate, 
  providerName: string = "Amadeus" 
) => {
  try {
    const flight = await FlightModel.findById(flightId);
    if (!flight) return;

    if (providerName !== 'Umoja') {
        flight.flightStatus = updateData.status;
        if (updateData.newDepartureTime) flight.departureTime = updateData.newDepartureTime;
        if (updateData.newArrivalTime) flight.arrivalTime = updateData.newArrivalTime;
        if (updateData.gate) flight.gate = updateData.gate;
        
        await flight.save();
        console.log(`[DisruptionHandler] Updated Amadeus Flight ${flight.flightNumber} to ${updateData.status}`);
    } else {
        console.log(`[DisruptionHandler] Umoja Flight ${flight.flightNumber} update detected (DB already updated by Admin)`);
    }

    let affectedBookings: any[] = [];

    if (providerName === 'Umoja') {
        affectedBookings = await BookingModel.find({ flightId: flight._id }).populate('userId');
    } else {
        const match = flight.flightNumber.match(/^([A-Z0-9]+?)(\d+)$/);
        
        if (match) {
            const carrier = match[1]; 
            const number = match[2];  
            
            affectedBookings = await AmadeusBookingModel.find({
                'itineraries.segments': {
                    $elemMatch: {
                        carrierCode: carrier,
                        flightNumber: number
                    }
                }
            }).populate('userId');
        }
    }

    if (!affectedBookings || affectedBookings.length === 0) {
      console.log(`[DisruptionHandler] No bookings found for flight ${flight.flightNumber}`);
      return;
    }

    console.log(`[DisruptionHandler] Found ${affectedBookings.length} affected bookings for flight ${flight.flightNumber}`);
    for (const booking of affectedBookings) {
      const user = booking.userId;
      if (!user) continue;

      const notifyClient = new ClientNotificationModel({
              _id: new mongoose.Types.ObjectId(),
              message: `Status Update: Flight ${flight.flightNumber} is now ${updateData.status}. Tap for options.`,
              route: `/chat/mobile/${booking.conversationId || ''}`,
              notifier: user._id.toString(),          
              notifiedTo: [{ user: user._id.toString(), seen: false }],
            });
            
      await notifyClient.save();
      
      if (booking.conversationId) {
        await triggerAIWebhook(booking, flight, oldStatus, updateData, providerName);
      }
    }

  } catch (error) {
    console.error('[DisruptionHandler] Error processing disruption:', error);
  }
};


async function triggerAIWebhook(
    booking: any, 
    flight: FlightDocument, 
    oldStatus: string, 
    newData: FlightStatusUpdate,
    provider: string
) {
  try {
    let delayMinutes = 0;
    
    
    if (newData.newDepartureTime && flight.departureTime) {
      const oldTime = new Date(flight.departureTime).getTime();
      const newTime = new Date(newData.newDepartureTime).getTime();
      const diffMs = newTime - oldTime;
      if (diffMs > 0) {
        delayMinutes = Math.floor(diffMs / 60000);
      }
    }

    const payload = {
      userId: booking.userId._id,
      threadId: booking.conversationId, 
      eventType: 'FLIGHT_STATUS_CHANGE',
      data: {
        bookingId: booking._id,
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        provider: provider, 
        departureCity: flight.departureAirport,
        oldStatus: oldStatus,
        newStatus: newData.status,
        newDepartureTime: newData.newDepartureTime ? newData.newDepartureTime.toISOString() : null,
        gate: newData.gate,
        delayDuration: delayMinutes 
      }
    };

    await axios.post(`${AI_BACKEND_URL}/api/ai/hooks/flight-update`, payload);
    console.log(`[DisruptionHandler] AI Triggered for user ${booking.userId.email} (Provider: ${provider}, Delay: ${delayMinutes}m)`);

  } catch (error) {
    console.error(`[DisruptionHandler] Failed to reach AI Server for user ${booking.userId.email}`, error);
  }
}