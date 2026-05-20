import axios from 'axios';
import dotenv from 'dotenv';
import FlightModel from '../model/flight.model';
import { handleFlightDisruption } from '../Handler/flightDisruption.handler';
import { getAmadeusToken, getAmadeusBaseUrl } from './amadeus.token.service';

dotenv.config();

const AMADEUS_BASE_URL = getAmadeusBaseUrl();

// Polling interval (ms). Default to 60 minutes; override with POLLING_INTERVAL_MINUTES env var.
const POLLING_INTERVAL_MS = (parseInt(process.env.POLLING_INTERVAL_MINUTES || "60", 10)) * 60 * 1000;

export const pollFlightStatuses = async () => {
  console.log('[PollingService] Starting status check...');
  const now = new Date();

  const activeFlights = await FlightModel.find({
    departureTime: { $gte: now},
    archived: false,
  });

  for (const flight of activeFlights) {
    const isUmoja = flight.airline === 'Umoja Airways' || flight.flightNumber.startsWith('UA');
    const isAmadeus = !isUmoja;

    if (isAmadeus) {
      const amadeusData = await checkRealAmadeusStatus(flight.flightNumber, flight.departureTime);
      
      if (amadeusData.status === 'Error' || amadeusData.status === 'Unknown') continue;

      if (amadeusData.status !== flight.flightStatus) {
        console.log(`[Polling] Amadeus Update detected for ${flight.flightNumber}`);
        await handleFlightDisruption(
          flight._id as string, 
          flight.flightStatus, 
          {
            status: amadeusData.status,
            gate: amadeusData.gate,
            newDepartureTime: amadeusData.newDepartureTime
          },
          "Amadeus"
        );
      }
    } 

    else if (isUmoja) {
      const lastUpdate = new Date(flight.updatedAt).getTime();
      const isFreshUpdate = (now.getTime() - lastUpdate) <= POLLING_INTERVAL_MS;
      
      const isDisrupted = ['Cancelled', 'Delayed'].includes(flight.flightStatus);

      if (isFreshUpdate && isDisrupted) {
        console.log(`[Polling] Fresh Umoja admin update detected for ${flight.flightNumber}`);
        
        await handleFlightDisruption(
          flight._id as string, 
          "On-Time", 
          { 
             status: flight.flightStatus,
             gate: flight.gate,
             newDepartureTime: flight.departureTime ,
             newArrivalTime: flight.arrivalTime
          },
          "Umoja"
        );
      }
    }
  }
};


export const checkRealAmadeusStatus = async (flightCode: string, departureDate: Date) => {
  try {
    const token = await getAmadeusToken();
    const match = flightCode.match(/^([A-Z0-9]+?)(\d+)$/);
    
    if (!match) return { status: 'Unknown' };
    
    const carrierCode = match[1];
    // Amadeus API often fails if flight number has leading zeros (e.g. use "487" not "0487")
    const flightNumber = match[2].replace(/^0+/, ''); 
    const dateStr = departureDate.toISOString().split('T')[0];

    const response = await axios.get(`${AMADEUS_BASE_URL}/v2/schedule/flights`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        carrierCode,
        flightNumber,
        scheduledDepartureDate: dateStr
      }
    });

    const flightData = response.data.data?.[0];

    // If data array is empty, the flight is not in the schedule (likely removed/cancelled)
    if (!flightData) return { status: 'Cancelled' };

    const segmentStatus = flightData.segments?.[0]?.serviceStatus;
    if (['NO', 'DX', 'CANCELLED'].includes(segmentStatus)) {
        return { status: 'Cancelled', newDepartureTime: departureDate };
    }

    const departurePoint = flightData.flightPoints?.find((pt: any) => pt.departure);
    if (!departurePoint) return { status: 'Unknown' };

    const depDetails = departurePoint.departure;
    const timings = depDetails.timings || [];

    const scheduled = timings.find((t: any) => t.qualifier === 'STD');
    const estimated = timings.find((t: any) => t.qualifier === 'ETD');

    let currentStatus = 'On Time';
    let activeTime = scheduled ? new Date(scheduled.value) : departureDate;

    if (scheduled && estimated) {
        const std = new Date(scheduled.value);
        const etd = new Date(estimated.value);
        const diffMinutes = (etd.getTime() - std.getTime()) / 60000;
        
        if (diffMinutes > 15) {
            currentStatus = 'Delayed';
            activeTime = etd;
        }
    }

    return {
      status: currentStatus,
      newDepartureTime: activeTime,
      gate: depDetails.gate?.mainGate || depDetails.gate, 
      terminal: depDetails.terminal?.code 
    };

  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
        return { status: 'Cancelled' }; 
    }
    return { status: 'Error' };
  }
};