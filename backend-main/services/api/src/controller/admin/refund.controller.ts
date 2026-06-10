import { Request, Response } from 'express';
import Refund from '../../model/admin/refund.model';
import { stripe } from '../../app';
import mongoose from 'mongoose';
import { APIFeatures } from '../../utils/ApiFeatures';
import Booking from '../../model/booking.model';
import FlightModel from '../../model/flight.model';
import { BOOKING_STATUS, REFUND } from '../../constant';
import ClientUser from '../../model/client/clientuser.model';
import AdminUser from '../../model/admin/adminuser.model';
import AgencyUser from '../../model/agency/agencyUser.model';

const requestRefund = async (req: Request, res: Response) => {
  const { bookingId, userId, reason } = req.body;
  // console.log(userId)
  const user = JSON.parse(userId)
  const userObject = user._id
  // console.log(userObject)
  if (!bookingId || !userId) {
    return res
      .status(400)
      .json({ status: 'fail', message: 'Please fill in all required fields' });
  }

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    // console.log(user)


    const refund = new Refund({
      _id: new mongoose.Types.ObjectId(),
      bookingId,
      bookingData: {
        price: booking.price,
        passengers: booking.passengers,
        additionalInfo: booking.additionalInfo,
        totalBaggages: booking.totalBaggages,
        tripType: booking.tripType,
        airline: booking.flightData.airline,
        departureAirportAcronym: booking.departureAirportAcronym,
        departureTime: booking.departureTime,
        departureAirport: booking.flightData.departureAirport,
        arrivalAirportAcronym: booking.arrivalAirportAcronym,
        arrivalTime: booking.arrivalTime,
        arrivalAirport: booking.flightData.arrivalAirport,
        duration: booking.duration,
        gate: booking.gate,
        terminal: booking.terminal,
        runway: booking.runway,
        TotalSeatsCapacity: booking.TotalSeatsCapacity,
        seatsLeft: booking.seatsLeft,
        stoppageCount: booking.stoppageCount,
        userId: userObject,
      },
      userId: userObject,
      reason,
      status: REFUND.REQUEST_REFUND
    });
    // Find the requester based on userId
    const client = await ClientUser.findById(userObject);
    const admin = await AdminUser.findById(userObject);
    const agency = await AgencyUser.findById(userObject);

    // Find the booker based on bookingId.userId
    const clientBooker = await ClientUser.findById(booking.userId);
    const adminBooker = await AdminUser.findById(booking.userId);
    const agencyBooker = await AgencyUser.findById(booking.userId);

    if (client) {
      refund.userType.name = "Client"
      refund.userType.requesterName = `${client.firstName} ${client.lastName}`;
      refund.userType.requesterEmail = client.email;
      refund.userType.requestComesFrom = "CLIENT SIDE";
    } else if (admin) {
      refund.userType.name = "Admin"
      refund.userType.requesterName = admin.name;
      refund.userType.requesterEmail = admin.email;
      refund.userType.requestComesFrom = "UIS DASHBOARD";
    } else if (agency) {
      refund.userType.name = "Agency"
      refund.userType.requesterName = agency.name;
      refund.userType.requesterEmail = agency.email;
      refund.userType.requestComesFrom = "UXS DASHBOARD";
    }
    if (clientBooker) {
      refund.bookerType.name = "Client Booker"
      refund.bookerType.bookerName = `${clientBooker.firstName} ${clientBooker.lastName}`;
      refund.bookerType.bookerEmail = clientBooker.email
      refund.bookerType.bookerComesFrom = "CLIENT SIDE";
    } else if (adminBooker) {
      refund.bookerType.name = "Admin Booker"
      refund.bookerType.bookerName = adminBooker.name;
      refund.bookerType.bookerEmail = adminBooker.email
      refund.bookerType.bookerComesFrom = "UIS DASHBOARD";
    } else if (agencyBooker) {
      refund.bookerType.name = "Agency Booker"
      refund.bookerType.bookerName = agencyBooker.name;
      refund.bookerType.bookerEmail = agencyBooker.email
      refund.bookerType.bookerComesFrom = "UXS DASHBOARD";
    }
    await refund.save();
    await Booking.updateOne(
      { _id: bookingId },
      { $set: { status: BOOKING_STATUS.REQUEST_REFUND } },
      { runValidators: true }
    );
    return res.status(201).json(refund);
  } catch (error) {
    console.error('Error processing refund:', error);
    return res.status(500).json({ message: 'Error processing refund', error });
  }
};

const approveRefund = async (req: Request, res: Response) => {
  const { refundId, status } = req.body;
  // console.log("req", req.body)
  if (!refundId || !status) {
    return res
      .status(400)
      .json({ status: 'fail', message: 'Please fill in all required fields' });
  }

  try {
    const refund = await Refund.findById(refundId);
    if (!refund) {
      return res.status(400).json({
        status: 'fail',
        message: `Refund with id ${refundId} request not found.`
      });
    }

    const booking = await Booking.findById(refund.bookingId);
    if (!booking) {
      console.log('Booking not found for refund ID:', refundId);

      return res.status(400).json({
        status: 'fail',
        message: `Booking with id ${booking} not found.`
      });
    }

    const flight = await FlightModel.findById(booking.flightId);
    if (!flight) {
      console.log('No flight id found')

      return res.status(400).json({
        status: 'fail',
        message: `Flight with id ${booking.flightId} not found.`
      });
    }

    let nextStatus = REFUND.REFUND_APPROVED;
    if (status === 'Approve') {
      const stripeResponse = await stripe.refunds.create({
        payment_intent: booking.payment_intent
      });

      if (stripeResponse.status !== 'succeeded') {
        return res
          .status(500)
          .json({ message: 'Error processing refund with Stripe' });
      }
      booking.status = BOOKING_STATUS.REFUND_APPROVED;
      flight.seatsLeft += booking.passengers.length;
      await Promise.all([booking.save(), flight.save()]);
    } else {
      nextStatus = REFUND.REFUND_CANCELLED;
    }

    await Promise.all([
      booking.save(),
      Refund.updateOne(
        { _id: refundId },
        { $set: { status: nextStatus } },
        { runValidators: true }
      )
    ]);

    return res.status(204).json({
      status: 'success',
      message: 'Booking Refunded successfully',
      refund: { ...refund, status: nextStatus }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error processing refund', error });
  }
};
const cancelRefund = async (req: Request, res: Response) => {
  // Extract refundId properly
  const refundId = req.body.refundId.refundId;
 console.log(refundId)
  if (!refundId || typeof refundId !== 'string') {
    return res
      .status(400)
      .json({ status: 'fail', message: 'Invalid or missing Refund ID' });
  }

  try {
    console.log('Fetching refund with ID:', refundId);

    // Ensure refundId is passed as a string
    const refund = await Refund.findById(refundId);
    if (!refund) {
      return res.status(404).json({
        status: 'fail',
        message: `Refund with ID ${refundId} not found.`
      });
    }

    console.log('Fetching booking with ID:', refund.bookingId);
    const booking = await Booking.findById(refund.bookingId);
    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: `Booking associated with refund ID ${refundId} not found.`
      });
    }

    refund.status = REFUND.REFUND_CANCELLED;
    booking.status = BOOKING_STATUS.REFUND_CANCELLED;
    await booking.save(),

    console.log('Updating refund status to CANCELLED...');
    await refund.save();

    console.log('Refund cancellation successful.');
    return res.status(204).json({
      status: 'success',
      message: 'Refund Cancelled Successfully'
    });
  } catch (error) {
    console.error('Error in cancelRefund:', error);
    return res.status(500).json({ message: 'Error canceling refund', error });
  }
};


const getRefunds = async (req: Request, res: Response) => {
  try {
    const query = Refund.find();
    const features = new APIFeatures(query, req.query)
      .sort()
      .paginate()
      .limitFields();
    const refunds = await features.query;

    // Map over refunds and process them
    const updatedRefunds = await Promise.all(
      refunds.map(async (refund: any) => {
        const { _id, bookingData, status, createdAt, reason, updatedAt, userType, bookerType } = refund;

        // Combine all passenger names
        const passengers = bookingData?.passengers
          .map((passenger: any) => `${passenger?.firstName} ${passenger?.lastName}`)
          .join(', ');



        return {
          _id,
          requestComesFrom: userType.requestComesFrom,
          requesterName: userType.requesterName,
          requesterEmail: userType.requesterEmail,
          bookingComesFrom: bookerType.bookerComesFrom,
          bookerName: bookerType.bookerName,
          bookerEmail: bookerType.bookerEmail,
          passengerName: passengers,
          price: bookingData?.price,
          bookingDate: bookingData?.createdAt,
          status,
          reason,
          createdAt,
          updatedAt,
        };
      })
    );
    return res.status(200).json({
      status: 'success',
      count: updatedRefunds.length,
      refunds: updatedRefunds,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message, error });
  }
};

const deleteRefund = async (req: Request, res: Response) => {
  const id = req.query.id;
  // console.log("ID", req.params._id)
  try {
    // Check if ID exists
    if (!id) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'ID parameter is required' });
    }
    const refund = await Refund.findByIdAndDelete(id);
    if (!refund) {
      console.log("no id")
      return res
        .status(404)
        .json({ status: 'fail', message: 'Agency not found' });
    }
    console.log("successfully deleted the refund data")
    res
      .status(200)
      .json({ status: 'success', message: 'Refund deleted successfully' });
  } catch (error) {
    console.error('Error deleting refund:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};
const deleteManyRefunds = async (req: Request, res: Response) => {
  const ids = req.body;
  console.log("ID", ids)
  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'IDs parameter is required and should be an array' });
    }

    const deleteResult = await Refund.deleteMany({ _id: { $in: ids } });

    if (deleteResult.deletedCount === 0) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'No Refunds found to delete' });
    }
    console.log("successfully deleted the refunds:", ids)
    res
      .status(200)
      .json({ status: 'success', message: 'Refunds deleted successfully', count: deleteResult.deletedCount });
  } catch (error) {
    console.error('Error deleting refunds:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

const deleteAllRefunds = async (req: Request, res: Response) => {
  try {
    const result = await Refund.deleteMany({})
    console.log(`${result.deletedCount} refund documents are successfully deleted from Refunds model`)
    res.status(200).json({ message: 'Successfully deleted all refund documents', deletedCoutned: result.deletedCount })
  } catch (error: any) {
    res.status(500).json({ status: 'fail', message: 'Something went wrong!' })
  }
}

export { requestRefund, approveRefund,cancelRefund, getRefunds, deleteRefund, deleteManyRefunds, deleteAllRefunds };
