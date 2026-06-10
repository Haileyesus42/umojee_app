import { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import { RequestWithReference } from '../../types';
import AmadeusBookingModel from '../../model/amadeus/amadeus.model';
import ClientUser from '../../model/client/clientuser.model';
import { APIFeatures } from '../../utils/ApiFeatures';
import { createFlightOrder, getSeatMap, getSeatMapByOrderId } from '../../services/amadeus.flight.service';
import { createDuffelFlightOrder } from '../../services/duffel.flight.service';
import { getTravelProvider, isDuffelProvider } from '../../config/travelProvider';
import { decryptSensitiveTravelDocuments } from '../../utils/travelDocumentEncryption';

const pickOrderPayload = (body: any) => {
    if (!body || typeof body !== 'object') return null;
    if (body.data && typeof body.data === 'object') return body.data;
    if (body.flightOrder && typeof body.flightOrder === 'object') return body.flightOrder;
    if (body.order && typeof body.order === 'object') return body.order;
    return body;
};

const mapContacts = (orderData: any) => {
    const contactsArray = Array.isArray(orderData?.contacts)
        ? orderData.contacts
        : orderData?.contact
            ? [orderData.contact]
            : [];

    const emails: string[] = [];
    const phones: string[] = [];

    contactsArray.forEach((contact: any) => {
        if (contact?.emailAddress) emails.push(contact.emailAddress);
        if (Array.isArray(contact?.phones)) {
            contact.phones.forEach((phone: any) => {
                const callingCode = phone?.countryCallingCode ? `+${phone.countryCallingCode}` : '';
                const number = phone?.number || '';
                const formatted = `${callingCode}${callingCode && number ? ' ' : ''}${number}`.trim();
                if (formatted) phones.push(formatted);
            });
        }
    });

    return { emails, phones };
};

const mapTravelers = (orderData: any) =>
    Array.isArray(orderData?.travelers)
        ? orderData.travelers.map((traveler: any) => ({
              travelerId: traveler?.id,
              firstName: traveler?.name?.firstName,
              lastName: traveler?.name?.lastName,
              dateOfBirth: traveler?.dateOfBirth,
              gender: traveler?.gender,
              documents: Array.isArray(traveler?.documents)
                  ? traveler.documents.map((doc: any) => ({
                        documentType: doc?.documentType || doc?.type,
                        number: doc?.number,
                        expiryDate: doc?.expiryDate,
                        issuanceCountry: doc?.issuanceCountry,
                        nationality: doc?.nationality,
                        holder: doc?.holder,
                    }))
                  : [],
          }))
        : [];

const mapItineraries = (orderData: any) => {
    const itineraries: any[] = [];
    (orderData?.flightOffers || []).forEach((offer: any) => {
        (offer?.itineraries || []).forEach((itinerary: any) => {
            itineraries.push({
                duration: itinerary?.duration,
                segments: Array.isArray(itinerary?.segments)
                    ? itinerary.segments.map((segment: any) => ({
                          departure: {
                              iataCode: segment?.departure?.iataCode,
                              at: segment?.departure?.at,
                              terminal: segment?.departure?.terminal,
                          },
                          arrival: {
                              iataCode: segment?.arrival?.iataCode,
                              at: segment?.arrival?.at,
                              terminal: segment?.arrival?.terminal,
                          },
                          carrierCode: segment?.carrierCode,
                          flightNumber: segment?.number,
                          aircraftCode: segment?.aircraft?.code,
                          duration: segment?.duration,
                          id: segment?.id,
                          numberOfStops: segment?.numberOfStops,
                          cabin: segment?.cabin || segment?.bookingClass,
                          class: segment?.class,
                          fareBasis: segment?.fareBasis,
                      }))
                    : [],
            });
        });
    });
    return itineraries;
};

const mapPrice = (orderData: any) => {
    const primaryOffer = orderData?.flightOffers?.[0];
    const price = primaryOffer?.price;
    if (!price) return undefined;
    return {
        currency: price?.currency,
        total: price?.total,
        grandTotal: price?.grandTotal,
    };
};

const mapDuffelContacts = (orderData: any) => {
    const passengers = Array.isArray(orderData?.passengers) ? orderData.passengers : [];
    const emails = passengers
        .map((passenger: any) => passenger?.email)
        .filter((value: any): value is string => !!value);
    const phones = passengers
        .map((passenger: any) => passenger?.phone_number)
        .filter((value: any): value is string => !!value);

    return { emails, phones };
};

const mapDuffelTravelers = (orderData: any) =>
    Array.isArray(orderData?.passengers)
        ? orderData.passengers.map((traveler: any) => ({
              travelerId: traveler?.id,
              firstName: traveler?.given_name,
              lastName: traveler?.family_name,
              dateOfBirth: traveler?.born_on,
              gender: traveler?.gender,
              documents: [],
          }))
        : [];

const mapDuffelItineraries = (orderData: any) =>
    Array.isArray(orderData?.slices)
        ? orderData.slices.map((slice: any) => ({
              duration: slice?.duration,
              segments: Array.isArray(slice?.segments)
                  ? slice.segments.map((segment: any) => ({
                        departure: {
                            iataCode: segment?.origin?.iata_code,
                            at: segment?.departing_at,
                            terminal: segment?.origin_terminal,
                        },
                        arrival: {
                            iataCode: segment?.destination?.iata_code,
                            at: segment?.arriving_at,
                            terminal: segment?.destination_terminal,
                        },
                        carrierCode: segment?.marketing_carrier?.iata_code || segment?.operating_carrier?.iata_code,
                        flightNumber: segment?.marketing_carrier_flight_number,
                        aircraftCode: segment?.aircraft?.iata_code,
                        duration: segment?.duration,
                        id: segment?.id,
                        numberOfStops: Array.isArray(segment?.stops) ? segment.stops.length : 0,
                        cabin: segment?.passengers?.[0]?.cabin_class_marketing_name || segment?.passengers?.[0]?.cabin_class,
                        class: segment?.passengers?.[0]?.cabin_class,
                        fareBasis: segment?.passengers?.[0]?.fare_basis_code,
                    }))
                  : [],
          }))
        : [];

const mapDuffelPrice = (orderData: any) => {
    if (!orderData?.total_amount && !orderData?.total_currency) return undefined;

    return {
        currency: orderData?.total_currency,
        total: orderData?.total_amount,
        grandTotal: orderData?.total_amount,
    };
};

const isMaskedSensitiveValue = (value?: string) => !!value && value.includes('*');

const hydratePassengersWithSavedTravelDocs = async (passengers: any[], userId: string) => {
    const clientUser = await ClientUser.findById(userId);
    if (!clientUser) {
        throw new Error('Client user not found for provided userId.');
    }

    const travelDocuments = decryptSensitiveTravelDocuments(clientUser.travelDocuments);
    const savedPassportNumber = travelDocuments?.passportNumber || '';
    const savedNationality = travelDocuments?.nationality || clientUser.country || '';

    return passengers.map((passenger, index) => {
        if (index !== 0) return passenger;

        const shouldHydratePassport = !passenger?.passport || isMaskedSensitiveValue(passenger.passport);
        console.log('[createAmadeusFlightOrder] Requested passport number:', passenger?.passport || '');
        console.log('[createAmadeusFlightOrder] Decrypted stored passport number:', savedPassportNumber);
        if (!shouldHydratePassport) return passenger;

        return {
            ...passenger,
            passport: savedPassportNumber,
            nationality: passenger?.nationality || savedNationality,
        };
    });
};

export const saveAmadeusFlightBooking = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        console.log('amadeus controller', req.body);

        const pickedPayload = pickOrderPayload(req.body);
        if (!pickedPayload || typeof pickedPayload !== 'object') {
            return res.status(400).json({
                message: 'A valid Amadeus flight order payload is required under `data`, `flightOrder`, or as the root body.',
            });
        }

        // Handle the Amadeus response shape { data: { ...flight order... }, dictionaries: { ... } }
        const orderData =
            pickedPayload?.data && typeof pickedPayload.data === 'object'
                ? pickedPayload.data
                : pickedPayload;

        const amadeusOrderId: string | undefined = orderData?.id;
        const bookingReference: string | undefined = orderData?.associatedRecords?.[0]?.reference;
        const userId: string | undefined = (req.body as any)?.userId || (req.body as any)?.clientUserId;
        const conversationId: string | undefined = (req.body as any)?.conversationId || (req.body as any)?.threadId;

        if (!amadeusOrderId && !bookingReference) {
            return res.status(400).json({
                message: 'Amadeus order id or booking reference is required to save the reservation.',
            });
        }

        if (!userId) {
            return res.status(400).json({ message: 'userId is required to save the reservation.' });
        }

        const clientUser = await ClientUser.findById(userId);
        if (!clientUser) {
            return res.status(404).json({ message: 'Client user not found for provided userId.' });
        }

        if (!conversationId) {
            return res.status(400).json({ message: 'conversationId is required to save the reservation.' });
        }

        const contacts = mapContacts(orderData);
        const travelers = mapTravelers(orderData);
        const itineraries = mapItineraries(orderData);
        const price = mapPrice(orderData);

        const payload = {
            provider: 'amadeus',
            amadeusOrderId: amadeusOrderId || bookingReference!,
            bookingReference,
            userId,
            conversationId,
            contacts,
            travelers,
            itineraries,
            price,
            rawOrder: pickedPayload,
            orderCreationDate: orderData?.associatedRecords?.[0]?.creationDate,
        };

        const filter = amadeusOrderId ? { amadeusOrderId } : { bookingReference };
        const savedBooking = await AmadeusBookingModel.findOneAndUpdate(filter, payload, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        });

        // Link booking to client user
        if (!clientUser.amadeusBookings) clientUser.amadeusBookings = [];
        if (!clientUser.amadeusBookings.find((id: any) => id.toString() === savedBooking._id.toString())) {
            clientUser.amadeusBookings.push(savedBooking._id);
            await clientUser.save();
        }

        res.status(200).json({
            status: 'success',
            data: savedBooking,
        });
        console.log(res.statusCode, "Successfuly saved an amadeus flight order", savedBooking)
    } catch (error) {
        console.error('Error saving Amadeus booking:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/* ------------------------------------------------------------------ */
/*  Reusable DB persistence for Amadeus order responses                */
/* ------------------------------------------------------------------ */

async function persistAmadeusOrder(
    orderData: any,
    rawPayload: any,
    userId: string,
    conversationId: string,
) {
    const amadeusOrderId: string | undefined = orderData?.id;
    const bookingReference: string | undefined = orderData?.associatedRecords?.[0]?.reference;

    if (!amadeusOrderId && !bookingReference) {
        throw new Error('Amadeus order response missing order id and booking reference.');
    }

    const clientUser = await ClientUser.findById(userId);
    if (!clientUser) {
        throw new Error('Client user not found for provided userId.');
    }

    const contacts = mapContacts(orderData);
    const travelers = mapTravelers(orderData);
    const itineraries = mapItineraries(orderData);
    const price = mapPrice(orderData);

    const payload = {
        provider: 'amadeus',
        amadeusOrderId: amadeusOrderId || bookingReference!,
        bookingReference,
        userId,
        conversationId,
        contacts,
        travelers,
        itineraries,
        price,
        rawOrder: rawPayload,
        orderCreationDate: orderData?.associatedRecords?.[0]?.creationDate,
    };

    const filter = amadeusOrderId ? { amadeusOrderId } : { bookingReference };
    const savedBooking = await AmadeusBookingModel.findOneAndUpdate(filter, payload, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
    });

    // Link booking to client user
    if (!clientUser.amadeusBookings) clientUser.amadeusBookings = [];
    if (!clientUser.amadeusBookings.find((id: any) => id.toString() === savedBooking._id.toString())) {
        clientUser.amadeusBookings.push(savedBooking._id);
        await clientUser.save();
    }

    return savedBooking;
}

async function persistDuffelOrder(
    orderData: any,
    rawPayload: any,
    userId: string,
    conversationId: string,
) {
    const duffelOrderId: string | undefined = orderData?.id;
    const bookingReference: string | undefined = orderData?.booking_reference;

    if (!duffelOrderId && !bookingReference) {
        throw new Error('Duffel order response missing order id and booking reference.');
    }

    const clientUser = await ClientUser.findById(userId);
    if (!clientUser) {
        throw new Error('Client user not found for provided userId.');
    }

    const payload = {
        provider: 'duffel',
        amadeusOrderId: duffelOrderId || bookingReference!,
        bookingReference,
        userId,
        conversationId,
        contacts: mapDuffelContacts(orderData),
        travelers: mapDuffelTravelers(orderData),
        itineraries: mapDuffelItineraries(orderData),
        price: mapDuffelPrice(orderData),
        rawOrder: rawPayload,
        orderCreationDate: orderData?.created_at,
    };

    const filter = duffelOrderId ? { amadeusOrderId: duffelOrderId } : { bookingReference };
    const savedBooking = await AmadeusBookingModel.findOneAndUpdate(filter, payload, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
    });

    if (!clientUser.amadeusBookings) clientUser.amadeusBookings = [];
    if (!clientUser.amadeusBookings.find((id: any) => id.toString() === savedBooking._id.toString())) {
        clientUser.amadeusBookings.push(savedBooking._id);
        await clientUser.save();
    }

    return savedBooking;
}

/* ------------------------------------------------------------------ */
/*  Client-facing: search → price → book → save                       */
/* ------------------------------------------------------------------ */

export const createAmadeusFlightOrder = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { flight, passengers, seats, luggage, userId, conversationId, journeyId } = req.body;
        const provider = getTravelProvider();
        const useDuffel = isDuffelProvider();

        if (!flight || !passengers?.length) {
            return res.status(400).json({
                status: 'fail',
                message: 'flight and passengers are required.',
            });
        }
        if (!userId) {
            return res.status(400).json({
                status: 'fail',
                message: 'userId is required.',
            });
        }
        if (!conversationId) {
            return res.status(400).json({
                status: 'fail',
                message: 'conversationId is required.',
            });
        }

        console.log('[createAmadeusFlightOrder] Starting order creation:', {
            provider,
            route: `${flight.from} -> ${flight.to}`,
            passengers: passengers.length,
            userId,
        });

        // Search → match → price → book via Amadeus
        const hydratedPassengers = await hydratePassengersWithSavedTravelDocs(passengers, userId);

        const orderResponse = useDuffel
            ? await createDuffelFlightOrder({
                  flight,
                  passengers: hydratedPassengers,
              })
            : await createFlightOrder({
                  flight,
                  passengers: hydratedPassengers,
                  seats,
                  luggage,
              });

        // Persist to MongoDB
        const orderData = orderResponse?.data || orderResponse;
        const savedBooking = useDuffel
            ? await persistDuffelOrder(orderData, orderResponse, userId, conversationId)
            : await persistAmadeusOrder(orderData, orderResponse, userId, conversationId);

        console.log('[createAmadeusFlightOrder] Order saved:', savedBooking._id);

        // Notify AI server to create a journey (awaited with timeout, non-fatal)
        let journey: any = null;
        try {
            const AI_BASE = process.env.AI_BACKEND_URL || 'http://localhost:8000';
            const webhookResp = await axios.post(
                `${AI_BASE}/api/ai/hooks/booking-confirmed`,
                {
                    provider,
                    userId,
                    conversationId,
                    journeyId: journeyId || null,
                    bookingReference: savedBooking.bookingReference || null,
                    amadeusOrderId: useDuffel ? null : savedBooking.amadeusOrderId || null,
                    duffelOrderId: useDuffel ? savedBooking.amadeusOrderId || null : null,
                    providerOrderId: savedBooking.amadeusOrderId || null,
                    flight: {
                        fromCode: flight.from,
                        toCode: flight.to,
                        departure: flight.departure,
                        arrival: flight.arrival || null,
                        flightNo: flight.flightNo,
                        airline: flight.airline,
                        price: flight.price,
                    },
                    itineraries: savedBooking.itineraries || [],
                    travelers: savedBooking.travelers || [],
                    price: savedBooking.price || null,
                },
                { timeout: 10000 },
            );
            journey = webhookResp.data;
            console.log('[createAmadeusFlightOrder] Journey created:', journey?.journey_id);
        } catch (err: any) {
            console.error('[createAmadeusFlightOrder] Journey webhook failed (non-fatal):', err?.message);
        }

        res.status(201).json({
            status: 'success',
            data: {
                provider,
                booking: savedBooking,
                providerOrder: orderResponse,
                amadeusOrder: orderResponse,
                seatSelectionAvailable: !useDuffel,
                journey,
            },
            message: 'Flight order created and saved successfully.',
        });
    } catch (error: any) {
        console.error('[createAmadeusFlightOrder] Error:', error?.message || error);

        if (axios.isAxiosError(error)) {
            const provider = getTravelProvider();
            const providerStatus = error.response?.status || 502;
            const providerPayload = error.response?.data;
            const providerErrors = providerPayload?.errors;
            const submittedPayload = (error as any).duffelSubmittedPayload;
            const matchedOffer = (error as any).duffelMatchedOffer;
            const pricedOffer = (error as any).duffelPricedOffer;

            console.error(
                '[createAmadeusFlightOrder] Provider error payload:',
                JSON.stringify(providerPayload || {}, null, 2),
            );
            if (submittedPayload) {
                console.error(
                    '[createAmadeusFlightOrder] Duffel submitted payload:',
                    JSON.stringify(submittedPayload, null, 2),
                );
            }
            if (matchedOffer) {
                console.error(
                    '[createAmadeusFlightOrder] Duffel matched offer:',
                    JSON.stringify(matchedOffer, null, 2),
                );
            }
            if (pricedOffer) {
                console.error(
                    '[createAmadeusFlightOrder] Duffel priced offer:',
                    JSON.stringify(pricedOffer, null, 2),
                );
            }

            return res.status(providerStatus >= 400 && providerStatus < 600 ? providerStatus : 502).json({
                status: 'fail',
                provider,
                message:
                    providerErrors?.[0]?.title ||
                    providerPayload?.message ||
                    `${provider} API error while creating flight order.`,
                errors: Array.isArray(providerErrors) ? providerErrors : undefined,
                details: providerPayload,
                submittedPayload,
                matchedOffer,
                pricedOffer,
            });
        }

        res.status(500).json({
            status: 'fail',
            message: error?.message || 'Internal server error creating flight order.',
        });
    }
};

export const getAmadeusBookingByOrderId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderId } = req.params;
        if (!orderId) {
            return res.status(400).json({ message: 'orderId parameter is required' });
        }

        const booking = await AmadeusBookingModel.findOne({ amadeusOrderId: orderId });
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.status(200).json({
            status: 'success',
            data: booking,
        });
    } catch (error) {
        console.error('Error fetching booking by order id:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAmadeusBookingByReference = async (
    req: RequestWithReference,
    res: Response,
    next: NextFunction,
) => {
    try {
        const referenceNumber = req.params?.referenceNumber || req.body?.referenceNumber;
        if (!referenceNumber) {
            return res.status(400).json({ message: 'referenceNumber is required' });
        }

        const booking = await AmadeusBookingModel.findOne({
            $or: [
                { bookingReference: referenceNumber },
                { referenceNumber: referenceNumber },
            ],
        });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.status(200).json({
            status: 'success',
            data: booking,
        });
    } catch (error) {
        console.error('Error fetching booking by reference number:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAllAmadeusBookings = async (req: Request, res: Response) => {
  try {
    let query = AmadeusBookingModel.find();

    const features = new APIFeatures(query, req.query)
      .sort()
      .paginate()
      .limitFields();

    const bookings = await features.query;
    res
      .status(200)
      .json({ status: 'success', count: bookings.length, bookings });
    console.log(res.statusCode, "Successfully fetched all amadeus bookings.")
  } catch (error: any) {
    res.status(500).json({ status: 'fail', message: error.message });
    console.log('no booking');
  }
};

export const getAmadeusBookingsByUserAndConversation = async (req: Request, res: Response) => {
    try {
        const { userId, conversationId } = req.query;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ message: 'userId query parameter is required' });
        }

        const filter: Record<string, any> = { userId };
        if (conversationId && typeof conversationId === 'string') {
            filter.conversationId = conversationId;
        }
        const bookings = await AmadeusBookingModel.find(filter).sort({ createdAt: -1 });

        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: 'No bookings found for the provided criteria.' });
        }

        res.status(200).json({
            status: 'success',
            count: bookings.length,
            data: bookings,
        });
        console.log(res.statusCode, 'Successfully fetched bookings by user/conversation.', filter);
    } catch (error) {
        console.error('Error fetching bookings by user/conversation:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteAmadeusBookingById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Booking id parameter is required' });
        }

        const booking = await AmadeusBookingModel.findById(id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        await AmadeusBookingModel.findByIdAndDelete(id);

        // Clean up reference on the client user, if present
        if (booking.userId) {
            await ClientUser.findByIdAndUpdate(
                booking.userId,
                { $pull: { amadeusBookings: booking._id } },
                { new: true },
            );
        }

        res.status(200).json({ status: 'success', message: 'Booking deleted successfully' });
        console.log(res.statusCode, 'Deleted Amadeus booking', { id });
    } catch (error) {
        console.error('Error deleting Amadeus booking:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/* ------------------------------------------------------------------ */
/*  Seat-map endpoint                                                  */
/* ------------------------------------------------------------------ */

export const getFlightSeatMap = async (req: Request, res: Response) => {
    try {
        if (isDuffelProvider()) {
            return res.status(409).json({
                status: 'fail',
                message: 'Seat map selection is not available for Duffel bookings in this flow.',
            });
        }

        const { flight, passengers } = req.body;
        console.log(req.body)
        if (!flight?.from || !flight?.to || !flight?.departure) {
            return res.status(400).json({
                status: 'fail',
                message: 'flight (with from, to, departure) is required.',
            });
        }

        const passengerCount = typeof passengers === 'number' ? passengers : 1;

        const seatmapResult = await getSeatMap({ flight, passengers: passengerCount });

        res.status(200).json({
            status: 'success',
            data: seatmapResult?.data || [],
        });
    } catch (error: any) {
        console.error('[getFlightSeatMap] Error:', error?.message || error);

        // Check for Amadeus-specific "seatmap not available" errors
        const amadeusErrors = error?.response?.data?.errors;
        if (Array.isArray(amadeusErrors) && amadeusErrors.some((e: any) => e.code === 14498)) {
            return res.status(404).json({
                status: 'fail',
                message: 'Seat map is not available for this flight. You can skip seat selection or choose seats at check-in.',
            });
        }

        res.status(500).json({
            status: 'fail',
            message: error?.message || 'Failed to retrieve seat map.',
        });
    }
};

export const getFlightSeatMapByOrderId = async (req: Request, res: Response) => {
    try {
        if (isDuffelProvider()) {
            return res.status(409).json({
                status: 'fail',
                message: 'Seat map selection is not available for Duffel bookings in this flow.',
            });
        }

        const { orderId } = req.params;
        if (!orderId) {
            return res.status(400).json({
                status: 'fail',
                message: 'orderId parameter is required.',
            });
        }

        const seatmapResult = await getSeatMapByOrderId(orderId);

        res.status(200).json({
            status: 'success',
            data: seatmapResult?.data || [],
        });
    } catch (error: any) {
        console.error('[getFlightSeatMapByOrderId] Error:', error?.message || error);

        const amadeusErrors = error?.response?.data?.errors;
        if (Array.isArray(amadeusErrors) && amadeusErrors.some((e: any) => e.code === 14498)) {
            return res.status(404).json({
                status: 'fail',
                message: 'Seat map is not available for this flight. You can choose seats at check-in.',
            });
        }

        res.status(500).json({
            status: 'fail',
            message: error?.message || 'Failed to retrieve seat map.',
        });
    }
};

/* ------------------------------------------------------------------ */
/*  Update booking with selected seats                                 */
/* ------------------------------------------------------------------ */

export const updateBookingSeats = async (req: Request, res: Response) => {
    try {
        const { bookingId } = req.params;
        const { seats } = req.body;

        if (!bookingId) {
            return res.status(400).json({ status: 'fail', message: 'bookingId parameter is required.' });
        }
        if (!Array.isArray(seats)) {
            return res.status(400).json({ status: 'fail', message: 'seats array is required.' });
        }

        const booking = await AmadeusBookingModel.findByIdAndUpdate(
            bookingId,
            { selectedSeats: seats },
            { new: true },
        );

        if (!booking) {
            return res.status(404).json({ status: 'fail', message: 'Booking not found.' });
        }

        console.log('[updateBookingSeats] Updated seats for booking:', bookingId, seats.length, 'seats');

        res.status(200).json({
            status: 'success',
            data: booking,
        });
    } catch (error: any) {
        console.error('[updateBookingSeats] Error:', error?.message || error);
        res.status(500).json({ status: 'fail', message: 'Failed to update seats.' });
    }
};
