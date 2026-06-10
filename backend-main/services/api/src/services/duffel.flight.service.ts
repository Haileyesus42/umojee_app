import axios from 'axios';

export interface DuffelPassengerInput {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    passport?: string;
    nationality?: string;
    title?: string;
    gender?: string;
}

export interface DuffelFlightInput {
    id?: string;
    provider_offer_id?: string;
    metadata?: Record<string, any>;
    from: string;
    to: string;
    departure: string;
    arrival?: string;
    flightNo: string;
    airline: string;
    price: number;
}

export interface CreateDuffelFlightOrderParams {
    flight: DuffelFlightInput;
    passengers: DuffelPassengerInput[];
}

type DuffelOffer = Record<string, any>;

function getDuffelBaseUrl(): string {
    return (process.env.DUFFEL_API_URL || 'https://api.duffel.com').replace(/\/+$/, '');
}

function getDuffelToken(): string {
    const token = process.env.DUFFEL_ACCESS_TOKEN || '';
    if (!token) {
        throw new Error('DUFFEL_ACCESS_TOKEN is not configured.');
    }
    return token;
}

async function duffelRequest(
    method: 'GET' | 'POST',
    endpoint: string,
    options?: { params?: any; data?: any },
): Promise<any> {
    const response = await axios({
        method,
        url: `${getDuffelBaseUrl()}${endpoint}`,
        headers: {
            Authorization: `Bearer ${getDuffelToken()}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Duffel-Version': process.env.DUFFEL_VERSION || 'v2',
        },
        params: options?.params,
        data: options?.data,
        timeout: 30000,
    });
    return response.data;
}

function resolveOfferId(flight: DuffelFlightInput): string {
    const metadata = flight?.metadata && typeof flight.metadata === 'object' ? flight.metadata : {};
    const candidates = [
        flight?.provider_offer_id,
        metadata.selected_offer_id,
        metadata.offer_id,
        metadata.provider_offer_id,
        metadata.id,
        metadata.offer?.id,
        metadata.selected_offer?.id,
        flight?.id,
    ];

    for (const candidate of candidates) {
        if (!candidate || typeof candidate !== 'string') continue;
        if (candidate.startsWith('off_')) return candidate;
        if (candidate.startsWith('flight_off_')) return candidate.replace('flight_', '');
    }

    throw new Error('Duffel booking requires a valid offer id on the selected flight.');
}

function getDepartureDate(value?: string): string {
    return value?.split(/[T\s]/)[0] || new Date().toISOString().split('T')[0];
}

function buildDuffelOfferRequestPayload(
    originLocationCode: string,
    destinationLocationCode: string,
    departureDate: string,
    adults: number,
) {
    return {
        data: {
            slices: [
                {
                    origin: originLocationCode.toUpperCase(),
                    destination: destinationLocationCode.toUpperCase(),
                    departure_date: departureDate,
                },
            ],
            passengers: Array.from({ length: Math.max(1, adults || 1) }, () => ({ type: 'adult' })),
        },
    };
}

function normalizeFlightNumber(value?: string): string {
    return (value || '').replace(/\s+/g, '').trim().toUpperCase();
}

function extractDuffelOfferSummary(offer: DuffelOffer) {
    const firstSlice = Array.isArray(offer?.slices) ? offer.slices[0] : undefined;
    const firstSegment = Array.isArray(firstSlice?.segments) ? firstSlice.segments[0] : undefined;
    const lastSegment = Array.isArray(firstSlice?.segments)
        ? firstSlice.segments[firstSlice.segments.length - 1]
        : undefined;

    const carrier = firstSegment?.operating_carrier || firstSegment?.marketing_carrier || {};
    const carrierCode = carrier?.iata_code || '';
    const flightNumber = normalizeFlightNumber(
        `${carrierCode}${firstSegment?.marketing_carrier_flight_number || firstSegment?.operating_carrier_flight_number || ''}`,
    );

    return {
        offerId: offer?.id,
        origin: firstSegment?.origin?.iata_code || '',
        destination: lastSegment?.destination?.iata_code || '',
        departure: firstSegment?.departing_at || '',
        carrierCode,
        flightNumber,
    };
}

function matchDuffelOfferToFlight(offers: DuffelOffer[], flight: DuffelFlightInput): DuffelOffer | null {
    if (!offers.length) return null;

    const explicitOfferId = resolveOfferId(flight);
    const byId = offers.find((offer) => offer?.id === explicitOfferId);
    if (byId) return byId;

    const targetFlightNumber = normalizeFlightNumber(flight.flightNo);
    const targetOrigin = (flight.from || '').trim().toUpperCase();
    const targetDestination = (flight.to || '').trim().toUpperCase();
    const targetDepartureDate = getDepartureDate(flight.departure);

    return (
        offers.find((offer) => {
            const summary = extractDuffelOfferSummary(offer);
            const offerDepartureDate = getDepartureDate(summary.departure);

            return (
                summary.origin === targetOrigin &&
                summary.destination === targetDestination &&
                offerDepartureDate === targetDepartureDate &&
                (!targetFlightNumber || summary.flightNumber === targetFlightNumber)
            );
        }) || null
    );
}

function normalizeGender(value?: string): 'm' | 'f' | 'x' {
    const raw = (value || '').trim().toLowerCase();
    if (raw === 'f' || raw === 'female') return 'f';
    if (raw === 'x' || raw === 'other') return 'x';
    return 'm';
}

function normalizeTitle(value?: string): string {
    const raw = (value || '').trim().toLowerCase();
    if (raw === 'mr' || raw === 'mrs' || raw === 'miss' || raw === 'ms') return raw;
    return 'mr';
}

function normalizePhoneNumber(value?: string): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.replace(/\s+/g, '');
}

function buildDuffelPassengers(passengers: DuffelPassengerInput[], offerPassengers: Record<string, any>[] = []) {
    return passengers.map((passenger, index) => {
        const linkedOfferPassenger = offerPassengers[index];
        const normalizedPassenger: Record<string, any> = {
            title: normalizeTitle(passenger.title),
            given_name: passenger.firstName,
            family_name: passenger.lastName,
            gender: normalizeGender(passenger.gender),
            born_on: passenger.dateOfBirth,
        };

        if (linkedOfferPassenger?.id) {
            normalizedPassenger.id = linkedOfferPassenger.id;
        }

        if (passenger.email?.trim()) {
            normalizedPassenger.email = passenger.email.trim();
        }

        const phoneNumber = normalizePhoneNumber(passenger.phone);
        if (phoneNumber) {
            normalizedPassenger.phone_number = phoneNumber;
        }

        return normalizedPassenger;
    });
}

export async function createDuffelFlightOrder(params: CreateDuffelFlightOrderParams): Promise<any> {
    const { flight, passengers } = params;
    const departureDate = getDepartureDate(flight.departure);

    console.log('[DuffelFlightService] Step 1 - Searching offers:', {
        from: flight.from,
        to: flight.to,
        rawDeparture: flight.departure,
        parsedDate: departureDate,
        adults: passengers.length,
    });

    const searchResult = await duffelRequest('POST', '/air/offer_requests', {
        params: { return_offers: 'true' },
        data: buildDuffelOfferRequestPayload(flight.from, flight.to, departureDate, passengers.length),
    });
    const offers = searchResult?.data?.offers || [];
    if (!Array.isArray(offers) || offers.length === 0) {
        throw new Error('No Duffel flight offers found for the specified route and date.');
    }

    const matchedOffer = matchDuffelOfferToFlight(offers, flight);
    if (!matchedOffer) {
        throw new Error('Could not match selected flight to available Duffel offers.');
    }

    console.log('[DuffelFlightService] Step 2 - Matched offer:', matchedOffer?.id);

    const offerId = matchedOffer.id;
    const pricedOfferResponse = await duffelRequest('GET', `/air/offers/${offerId}`, {
        params: { return_available_services: 'true' },
    });
    const pricedOffer = pricedOfferResponse?.data || pricedOfferResponse;
    if (!pricedOffer?.id) {
        throw new Error('Duffel offer pricing failed. The fare may no longer be available.');
    }

    console.log('[DuffelFlightService] Step 3 - Refreshed offer:', pricedOffer?.id);

    const offerPassengers = Array.isArray(pricedOffer?.passengers) ? pricedOffer.passengers : [];

    const payload = {
        data: {
            type: 'hold',
            selected_offers: [offerId],
            passengers: buildDuffelPassengers(passengers, offerPassengers),
        },
    };

    try {
        console.log('[DuffelFlightService] Step 4 - Creating order...');
        return await duffelRequest('POST', '/air/orders', { data: payload });
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            (error as any).duffelSubmittedPayload = payload;
            (error as any).duffelOfferId = offerId;
            (error as any).duffelMatchedOffer = matchedOffer;
            (error as any).duffelPricedOffer = pricedOffer;
        }
        throw error;
    }
}
