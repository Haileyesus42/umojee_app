import FlightModel from "../../model/flight.model";
import SeatsModel from "../../model/seats.model";
import SeatsFlightModel from "../../model/seatsFlight.model";

export const createSeatsForFlight = async (flight: any) => {
    try {
      // Fetch the existing seat data
      const existingSeatData = await SeatsModel.find({});
      console.log(`Found ${existingSeatData.length} existing seat data`);
  
      if (existingSeatData.length === 0) {
        console.error('No existing seat data found!');
        return { error: 'No existing seat data found!' };
      }
  
      const rows = existingSeatData.map(row => ({
        rowNumber: row.rowNumber,
        seats: row.seats,
        flightId: flight._id, // Reference to the flight document
      }));
  
      // Save each row as a separate seat document
      for (const row of rows) {
        const newRow = new SeatsFlightModel(row);
        await newRow.save();
        console.log(`Created row ${row.rowNumber} for flight ${flight.flightNumber}`);
      }
  
      return { success: true };
    } catch (error: any) {
      console.error('Error creating seats for flight:', error);
      return { error: error.message };
    }
  };
  