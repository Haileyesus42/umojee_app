import { Request, Response } from 'express';
import FlightModel from '../../../model/flight.model';
import cron from 'node-cron';
import FlightStatusModel from '../../../model/admin/dashboardCards/flightstatus.model';
import { APIFeatures } from '../../../utils/ApiFeatures';
import SeatsFlightModel from '../../../model/seatsFlight.model';
import BookingModel from '../../../model/booking.model';
import { Email } from '../../../utils/email';

// Define an interface for the populated user data
interface IUser {
    email: string;
    firstName: string;
    lastName: string;
  }
  
// Function to update flight statuses, times, and seats
async function updateFlightTimesAndStatus() {
    const now = new Date();

    // Step 1: Calculate and save flight status counts before updating times
    const flights = await FlightModel.find();

    // Counters for flight statuses
    let onTimeCount = 0;
    let delayedCount = 0;
    let cancelledCount = 0;

    flights.forEach((flight) => {
        // Update the status counts based on the flight status
        if (flight.flightStatus === 'ON-TIME') {
            onTimeCount++;
        } else if (flight.flightStatus === 'DELAYED') {
            delayedCount++;
        } else if (flight.flightStatus === 'Cancelled') {
            cancelledCount++;
        }
    });

    // Create a new flight status document in the FlightStatusModel
    const flightStatus = new FlightStatusModel({
        onTime: onTimeCount,
        delayed: delayedCount,
        cancelled: cancelledCount,
    });

    // Save the flight status to the database
    await flightStatus.save();

    // Step 2: Find flights where the arrival time has passed and update them
    const flightsToUpdate = await FlightModel.find(
        {
            arrivalTime: { $lt: now }
        }
    );

    for (const flight of flightsToUpdate) {
        // Calculate the next departure time (e.g., next day at 8:00 AM)
        let nextDepartureTime = new Date();
        nextDepartureTime.setDate(nextDepartureTime.getDate() + 1); // Move to the next day
        nextDepartureTime.setHours(8, 0, 0, 0); // Set to 8:00 AM

        // Calculate the next arrival time by adding the duration to the departure time
        let nextArrivalTime = new Date(nextDepartureTime);
        nextArrivalTime.setMinutes(nextArrivalTime.getMinutes() + parseInt(flight.duration));

        // Update flight times and status
        flight.departureTime = nextDepartureTime;
        flight.arrivalTime = nextArrivalTime;
        flight.flightStatus = 'ON-TIME'; // Set status to ON-TIME

        // Step 3: Update all occupied seats to available and adjust seatsLeft
        const rows = await SeatsFlightModel.find({ flightId: flight._id });
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

        // Update the seatsLeft field for the flight
        flight.seatsLeft = availableSeatsCount;
        await flight.save();

        console.log(`Updated flight ${flight.flightNumber} with ${availableSeatsCount} available seats`);
    }

    if (flightsToUpdate.length === 0) {
        console.log('No flights to update');
    } else {
        console.log('Flight statuses, times, and seats updated successfully.');
    }
    // Step 4: Identify ticketed bookings departing within the next 2 hours
    // (Assuming each booking document has a "status", "departureTime", and "userId" field.)
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const imminentTicketedBookings = await BookingModel.find({
        status: 'TICKETED',
        departureTime: { $gte: now, $lte: twoHoursLater }
    }).populate('userId');
    const url = 'url:';
    if (imminentTicketedBookings.length > 0) {
        for (const booking of imminentTicketedBookings) {
          // Type assert that the populated user is of type IUser
          const user = booking.userId as unknown as IUser;
          const newUser = { email: user.email, name: `${user.firstName} ${user.lastName}` };
    
          if (user && newUser) {
            console.log(`Sending check-in reminder to ${user.email}`);
            // Type-cast to any if TypeScript complains about checkInReminder not being defined
            await (new Email(newUser, url) as any).checkInReminder();
          }
        }
      } else {
        console.log('No ticketed bookings departing within 2 hours.');
      }
}

// Schedule the cron job to run every hour
cron.schedule('* * * * *', updateFlightTimesAndStatus);



export const getFlightsStatus = async (req: Request, res: Response) => {
    try {
        let query = FlightStatusModel.find();

        const features = new APIFeatures(query, req.query)
            .sort()
            .paginate()
            .limitFields();

        const flightsStatus = await features.query;
        res.status(200).json({ status: 'success', count: flightsStatus.length, flightsStatus });
    } catch (error) {
        console.error('Error getting all statuses of the flights:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

// Utility function to format date to "YYYY-MM-DD"
const formatDateToDay = (date: Date) => {
    return date.getDate();
};

// API to get monthly aggregated flight statuses
export const getYearlyFlightStatus = async (req: Request, res: Response) => {
    try {
        const year = parseInt(req.params.year, 10);
        if (!year) {
            return res
                .status(400)
                .json({ status: 'fail', message: 'Year is required' });
        }

        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59);

        // Aggregate data by day and month
        const monthlyStatus = await FlightStatusModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            {
                $project: {
                    day: { $dayOfMonth: '$createdAt' },
                    month: { $month: '$createdAt' },
                    year: { $year: '$createdAt' },
                    onTime: 1,
                    delayed: 1,
                    cancelled: 1
                }
            },
            {
                $group: {
                    _id: { day: '$day', month: '$month', year: '$year' },
                    onTime: { $avg: '$onTime' },
                    delayed: { $avg: '$delayed' },
                    cancelled: { $avg: '$cancelled' }
                }
            },
            {
                $sort: { '_id.month': 1, '_id.day': 1 }
            }
        ]);

        // Define the type for the data object
        type MonthNames =
            | 'january'
            | 'february'
            | 'march'
            | 'april'
            | 'may'
            | 'june'
            | 'july'
            | 'august'
            | 'september'
            | 'october'
            | 'november'
            | 'december';

        // Initialize an object to hold data for each month
        const data: Record<MonthNames, { name: number; onTime: number; delay: number; cancelled: number }[]> = {
            january: [],
            february: [],
            march: [],
            april: [],
            may: [],
            june: [],
            july: [],
            august: [],
            september: [],
            october: [],
            november: [],
            december: []
        };

        // Map data to each month's array
        monthlyStatus.forEach(day => {
            const monthNames: MonthNames[] = [
                'january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december'
            ];
            const monthName = monthNames[day._id.month - 1];

            data[monthName].push({
                name: day._id.day,
                onTime: Math.round(day.onTime),
                delay: Math.round(day.delayed),
                cancelled: Math.round(day.cancelled)
            });
        });

        res
            .status(200)
            .json({ status: 'success', data });
    } catch (error) {
        console.error('Error fetching yearly flight statuses:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};


// API to delete a flight status by ID
export const deleteFlightStatusById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // Get the ID from URL parameters
        // Validate ID format if needed
        if (!id) {
            return res.status(400).json({ status: 'fail', message: 'ID is required' });
        }

        // Find and delete the flight status document
        const result = await FlightStatusModel.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({ status: 'fail', message: 'Flight status not found' });
        }

        res.status(200).json({ status: 'success', message: 'Flight status deleted successfully' });
    } catch (error) {
        console.error('Error deleting flight status:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

export const getFlightStatusPiechart = async (req: Request, res: Response) => {
    try {
        const today = new Date();

        // Set start and end dates for "Today"
        const startToday = new Date(today.setHours(0, 0, 0, 0));
        const endToday = new Date(today.setHours(23, 59, 59, 999));

        // Set start and end dates for "This Week"
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Aggregate data for "Today" (still calculating averages)
        const todayData = await FlightStatusModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: startToday, $lte: endToday }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOnTime: { $sum: '$onTime' },
                    totalDelayed: { $sum: '$delayed' },
                    totalCancelled: { $sum: '$cancelled' },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalOnTime: { $divide: ['$totalOnTime', '$count'] },
                    totalDelayed: { $divide: ['$totalDelayed', '$count'] },
                    totalCancelled: { $divide: ['$totalCancelled', '$count'] }
                }
            }
        ]);

        // Aggregate data for "This Week" (summing values)
        const weekData = await FlightStatusModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfWeek, $lte: endOfWeek }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOnTime: { $sum: '$onTime' },
                    totalDelayed: { $sum: '$delayed' },
                    totalCancelled: { $sum: '$cancelled' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalOnTime: 1,
                    totalDelayed: 1,
                    totalCancelled: 1
                }
            }
        ]);

        // Calculate total sums across all records in the database
        const totalData = await FlightStatusModel.aggregate([
            {
                $group: {
                    _id: null,
                    totalOnTime: { $sum: '$onTime' },
                    totalDelayed: { $sum: '$delayed' },
                    totalCancelled: { $sum: '$cancelled' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalOnTime: 1,
                    totalDelayed: 1,
                    totalCancelled: 1
                }
            }
        ]);

        res.status(200).json({
            status: 'success',
            todayData: todayData[0],
            weekData: weekData[0],
            totalData: totalData[0]
        });
    } catch (error) {
        console.error('Error fetching flight statuses:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};