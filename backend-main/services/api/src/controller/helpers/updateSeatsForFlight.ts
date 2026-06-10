import SeatsFlightModel from "../../model/seatsFlight.model";

export const updateSeatsForFlight = async (flightId: string) => {
    // Fetch all rows for the current flight
    const rows = await SeatsFlightModel.find({ flightId });
    if (rows.length === 0) {
      console.log(`No seat rows found for flight with ID ${flightId}`);
      return 0;
    }
  
    // Update all occupied seats to available and count available seats
    let availableSeatsCount = 0;
    for (const row of rows) {
      let hasUpdated = false;
      for (const seat of row.seats) {
        if (seat.status === 'occupied') {
          seat.status = 'available';
          hasUpdated = true;
        }
        if (seat.status === 'available') {
          availableSeatsCount++;
        }
      }
      if (hasUpdated) {
        await row.save();
      }
    }
  
    return availableSeatsCount;
  };
  