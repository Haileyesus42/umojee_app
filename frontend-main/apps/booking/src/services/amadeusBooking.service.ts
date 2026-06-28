import axios from 'axios';

const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4001';

export interface CreateFlightOrderRequest {
    flight: {
        id: string;
        provider_offer_id?: string;
        metadata?: Record<string, any>;
        airline: string;
        flightNo: string;
        from: string;
        to: string;
        stops: string;
        travelTime: string;
        departure: string;
        arrival: string;
        price: number;
        basePrice: number;
        baggage: string;
        fareNotes: string;
    };
    passengers: Array<{
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        dateOfBirth: string;
        passport: string;
        nationality: string;
    }>;
    seats: Array<{ row: number; seat: string }>;
    luggage: Array<{ label: string; weight: string; price: number }>;
    userId: string;
    conversationId: string;
    journeyId?: string;
}

export interface CreateFlightOrderResponse {
    status: 'success' | 'fail';
    data?: {
        provider?: 'amadeus' | 'duffel';
        booking: any;
        amadeusOrder: any;
        providerOrder?: any;
        seatSelectionAvailable?: boolean;
        journey?: {
            ok: boolean;
            journey_id?: string;
            status?: string;
            current_segment?: string;
            message?: string;
        };
    };
    message?: string;
    errors?: any[];
}

export async function fetchSeatMap(params: {
    flight: { from: string; to: string; departure: string; flightNo: string; airline: string };
    passengers: number;
}): Promise<any> {
    const response = await axios.post(
        `${backendUrl}/api/ai/amadeus/booking/seatmap`,
        params,
        { headers: { 'Content-Type': 'application/json' } },
    );
    return response.data;
}

export async function fetchSeatMapByOrderId(orderId: string): Promise<any> {
    const response = await axios.get(
        `${backendUrl}/api/ai/amadeus/booking/seatmap/${orderId}`,
    );
    return response.data;
}

export async function updateBookingSeats(
    bookingId: string,
    seats: Array<{
        seatNumber: string;
        row: number;
        column: string;
        price?: string;
        currency?: string;
        passengerName?: string;
    }>,
): Promise<any> {
    const response = await axios.patch(
        `${backendUrl}/api/ai/amadeus/booking/${bookingId}/seats`,
        { seats },
        { headers: { 'Content-Type': 'application/json' } },
    );
    return response.data;
}

export async function createFlightOrder(
    request: CreateFlightOrderRequest,
): Promise<CreateFlightOrderResponse> {
    const response = await axios.post<CreateFlightOrderResponse>(
        `${backendUrl}/api/ai/amadeus/booking/create`,
        request,
        {
            headers: {
                'Content-Type': 'application/json',
            },
        },
    );
    return response.data;
}
