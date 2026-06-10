import axios from 'axios';
import { getAmadeusToken, getAmadeusBaseUrl } from './amadeus.token.service';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PassengerInput {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    passport: string;
    nationality: string;
}

export interface FlightInput {
    from: string;
    to: string;
    departure: string;
    arrival?: string;
    flightNo: string;
    airline: string;
    price: number;
}

export interface CreateFlightOrderParams {
    flight: FlightInput;
    passengers: PassengerInput[];
    seats?: Array<{ row: number; seat: string }>;
    luggage?: Array<{ label: string; weight: string; price: number }>;
}

/* ------------------------------------------------------------------ */
/*  Authenticated Amadeus request with retries                         */
/* ------------------------------------------------------------------ */

async function amadeusRequest(
    method: 'GET' | 'POST',
    endpoint: string,
    options?: { params?: any; data?: any },
    retries = 3,
    backoff = 1000,
): Promise<any> {
    let lastError: any;
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const token = await getAmadeusToken();
            const baseUrl = getAmadeusBaseUrl();
            const response = await axios({
                method,
                url: `${baseUrl}${endpoint}`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                params: options?.params,
                data: options?.data,
                timeout: 30000,
            });
            return response.data;
        } catch (err: any) {
            lastError = err;
            const status = err?.response?.status;
            console.error(`[AmadeusFlightService] Request attempt ${attempt + 1} failed:`,
                status, err?.response?.data || err?.message);
            // Don't retry on client errors (4xx) — they won't succeed on retry
            if (status && status >= 400 && status < 500) {
                break;
            }
            if (attempt < retries - 1) {
                await new Promise((res) => setTimeout(res, backoff * Math.pow(2, attempt)));
            }
        }
    }
    throw lastError;
}

/* ------------------------------------------------------------------ */
/*  Step 1 – Search for flight offers                                  */
/* ------------------------------------------------------------------ */

async function searchFlightOffers(
    origin: string,
    destination: string,
    departureDate: string,
    adults: number,
) {
    return amadeusRequest('GET', '/v2/shopping/flight-offers', {
        params: {
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDate,
            adults,
            currencyCode: 'USD',
            max: 10,
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Step 2 – Price a selected offer                                    */
/* ------------------------------------------------------------------ */

async function priceFlightOffer(flightOffer: any) {
    return amadeusRequest('POST', '/v1/shopping/flight-offers/pricing', {
        data: {
            data: {
                type: 'flight-offers-pricing',
                flightOffers: [flightOffer],
            },
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Helpers – match offer & build traveler payload                     */
/* ------------------------------------------------------------------ */

function matchOfferToFlight(offers: any[], flight: FlightInput): any | null {
    // Parse "EY 728" or "EY728" → carrier="EY", number="728"
    const fnMatch = flight.flightNo?.match(/^([A-Z]{2})\s*(\d+)$/i);
    const carrierCode = fnMatch ? fnMatch[1].toUpperCase() : flight.flightNo?.split(/\s/)[0]?.toUpperCase() || '';
    const flightNumber = fnMatch ? fnMatch[2] : '';

    let bestMatch: any = null;
    let bestScore = -1; // higher is better

    for (const offer of offers) {
        for (const itin of offer?.itineraries || []) {
            const segments = itin?.segments || [];
            if (segments.length === 0) continue;

            const firstSeg = segments[0];
            const lastSeg = segments[segments.length - 1];
            const offerOrigin = firstSeg?.departure?.iataCode;
            const offerDest = lastSeg?.arrival?.iataCode;

            if (offerOrigin !== flight.from || offerDest !== flight.to) continue;

            // Check carrier match on any segment
            const carrierMatches = !carrierCode || segments.some((s: any) => s.carrierCode === carrierCode);
            if (!carrierMatches) continue;

            // Score: prefer exact flight-number match + fewer segments (direct)
            let score = 0;
            if (flightNumber) {
                const hasExactFlightNo = segments.some(
                    (s: any) => s.carrierCode === carrierCode && s.number === flightNumber,
                );
                if (hasExactFlightNo) score += 100;
            }
            // Prefer fewer segments (direct over connecting)
            score += 10 / segments.length;

            if (score > bestScore) {
                bestScore = score;
                bestMatch = offer;
            }
        }
    }

    // Fallback: return first offer if any exist
    return bestMatch || offers[0] || null;
}

/* ------------------------------------------------------------------ */
/*  Country name / demonym → ISO 3166-1 alpha-2 lookup                 */
/* ------------------------------------------------------------------ */

const COUNTRY_MAP: Record<string, string> = {
    // Common names & demonyms
    'afghanistan': 'AF', 'afghan': 'AF', 'albania': 'AL', 'albanian': 'AL',
    'algeria': 'DZ', 'algerian': 'DZ', 'argentina': 'AR', 'argentine': 'AR', 'argentinian': 'AR',
    'australia': 'AU', 'australian': 'AU', 'austria': 'AT', 'austrian': 'AT',
    'bangladesh': 'BD', 'bangladeshi': 'BD', 'belgium': 'BE', 'belgian': 'BE',
    'brazil': 'BR', 'brazilian': 'BR', 'canada': 'CA', 'canadian': 'CA',
    'chile': 'CL', 'chilean': 'CL', 'china': 'CN', 'chinese': 'CN',
    'colombia': 'CO', 'colombian': 'CO', 'congo': 'CD', 'congolese': 'CD',
    'cuba': 'CU', 'cuban': 'CU', 'czech republic': 'CZ', 'czech': 'CZ', 'czechia': 'CZ',
    'denmark': 'DK', 'danish': 'DK', 'djibouti': 'DJ', 'djiboutian': 'DJ',
    'egypt': 'EG', 'egyptian': 'EG', 'eritrea': 'ER', 'eritrean': 'ER',
    'ethiopia': 'ET', 'ethiopian': 'ET', 'finland': 'FI', 'finnish': 'FI',
    'france': 'FR', 'french': 'FR', 'germany': 'DE', 'german': 'DE',
    'ghana': 'GH', 'ghanaian': 'GH', 'greece': 'GR', 'greek': 'GR',
    'india': 'IN', 'indian': 'IN', 'indonesia': 'ID', 'indonesian': 'ID',
    'iran': 'IR', 'iranian': 'IR', 'iraq': 'IQ', 'iraqi': 'IQ',
    'ireland': 'IE', 'irish': 'IE', 'israel': 'IL', 'israeli': 'IL',
    'italy': 'IT', 'italian': 'IT', 'jamaica': 'JM', 'jamaican': 'JM',
    'japan': 'JP', 'japanese': 'JP', 'jordan': 'JO', 'jordanian': 'JO',
    'kenya': 'KE', 'kenyan': 'KE', 'korea': 'KR', 'korean': 'KR', 'south korea': 'KR',
    'kuwait': 'KW', 'kuwaiti': 'KW', 'lebanon': 'LB', 'lebanese': 'LB',
    'libya': 'LY', 'libyan': 'LY', 'malaysia': 'MY', 'malaysian': 'MY',
    'maldives': 'MV', 'maldivian': 'MV', 'mexico': 'MX', 'mexican': 'MX',
    'morocco': 'MA', 'moroccan': 'MA', 'mozambique': 'MZ', 'mozambican': 'MZ',
    'nepal': 'NP', 'nepalese': 'NP', 'nepali': 'NP',
    'netherlands': 'NL', 'dutch': 'NL', 'new zealand': 'NZ',
    'nigeria': 'NG', 'nigerian': 'NG', 'norway': 'NO', 'norwegian': 'NO',
    'pakistan': 'PK', 'pakistani': 'PK', 'palestine': 'PS', 'palestinian': 'PS',
    'peru': 'PE', 'peruvian': 'PE', 'philippines': 'PH', 'filipino': 'PH',
    'poland': 'PL', 'polish': 'PL', 'portugal': 'PT', 'portuguese': 'PT',
    'qatar': 'QA', 'qatari': 'QA', 'romania': 'RO', 'romanian': 'RO',
    'russia': 'RU', 'russian': 'RU', 'rwanda': 'RW', 'rwandan': 'RW',
    'saudi arabia': 'SA', 'saudi': 'SA', 'senegal': 'SN', 'senegalese': 'SN',
    'singapore': 'SG', 'singaporean': 'SG', 'somalia': 'SO', 'somali': 'SO',
    'south africa': 'ZA', 'south african': 'ZA', 'spain': 'ES', 'spanish': 'ES',
    'sri lanka': 'LK', 'sri lankan': 'LK', 'sudan': 'SD', 'sudanese': 'SD',
    'sweden': 'SE', 'swedish': 'SE', 'switzerland': 'CH', 'swiss': 'CH',
    'syria': 'SY', 'syrian': 'SY', 'tanzania': 'TZ', 'tanzanian': 'TZ',
    'thailand': 'TH', 'thai': 'TH', 'tunisia': 'TN', 'tunisian': 'TN',
    'turkey': 'TR', 'turkish': 'TR', 'turkiye': 'TR',
    'uganda': 'UG', 'ugandan': 'UG', 'ukraine': 'UA', 'ukrainian': 'UA',
    'united arab emirates': 'AE', 'uae': 'AE', 'emirati': 'AE',
    'united kingdom': 'GB', 'uk': 'GB', 'british': 'GB', 'england': 'GB',
    'united states': 'US', 'usa': 'US', 'us': 'US', 'american': 'US',
    'vietnam': 'VN', 'vietnamese': 'VN', 'yemen': 'YE', 'yemeni': 'YE',
    'zambia': 'ZM', 'zambian': 'ZM', 'zimbabwe': 'ZW', 'zimbabwean': 'ZW',
};

function resolveCountryISO(input: string): string {
    if (!input) return 'US';
    const trimmed = input.trim();
    // Already a 2-letter code
    if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
    if (/^[a-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
    // Lookup by name/demonym
    const found = COUNTRY_MAP[trimmed.toLowerCase()];
    if (found) return found;
    // Fallback: return first 2 chars uppercased as a guess
    console.warn(`[AmadeusFlightService] Unknown nationality "${input}", falling back`);
    return trimmed.slice(0, 2).toUpperCase();
}

function extractCountryCode(phone: string): string {
    const match = phone.match(/^\+?(\d{1,3})/);
    return match ? match[1] : '1';
}

function extractPhoneNumber(phone: string): string {
    return phone.replace(/^\+?\d{1,3}\s?/, '').replace(/\D/g, '');
}

function buildTravelers(passengers: PassengerInput[]) {
    return passengers.map((p, idx) => {
        const countryISO = resolveCountryISO(p.nationality);
        return {
            id: String(idx + 1),
            dateOfBirth: p.dateOfBirth,
            name: {
                firstName: p.firstName.toUpperCase(),
                lastName: p.lastName.toUpperCase(),
            },
            gender: 'MALE',
            contact: {
                emailAddress: p.email,
                phones: [
                    {
                        deviceType: 'MOBILE',
                        countryCallingCode: extractCountryCode(p.phone),
                        number: extractPhoneNumber(p.phone),
                    },
                ],
            },
            documents: [
                {
                    documentType: 'PASSPORT',
                    number: p.passport,
                    expiryDate: '2030-01-01',
                    issuanceCountry: countryISO,
                    nationality: countryISO,
                    holder: true,
                },
            ],
        };
    });
}

/* ------------------------------------------------------------------ */
/*  Seat-map: search → match → fetch seatmap                          */
/* ------------------------------------------------------------------ */

export async function getSeatMap(params: {
    flight: FlightInput;
    passengers: number;
}): Promise<any> {
    const { flight, passengers } = params;
    const departureDate =
        flight.departure?.split(/[T\s]/)[0] || new Date().toISOString().split('T')[0];

    console.log('[AmadeusFlightService] SeatMap – Searching offers:', {
        from: flight.from,
        to: flight.to,
        date: departureDate,
        adults: passengers,
    });

    // Step 1: Search for offers
    const searchResult = await searchFlightOffers(
        flight.from,
        flight.to,
        departureDate,
        passengers,
    );

    const offers = searchResult?.data || [];
    if (offers.length === 0) {
        throw new Error('No flight offers found for the specified route and date.');
    }

    // Step 2: Match the selected flight
    const matchedOffer = matchOfferToFlight(offers, flight);
    if (!matchedOffer) {
        throw new Error('Could not match selected flight to available Amadeus offers.');
    }

    console.log('[AmadeusFlightService] SeatMap – Matched offer:', matchedOffer?.id);

    // Step 3: Fetch seatmap using the matched offer
    const seatmapResult = await amadeusRequest('POST', '/v1/shopping/seatmaps', {
        data: {
            data: [matchedOffer],
        },
    });

    console.log('[AmadeusFlightService] SeatMap – Retrieved', seatmapResult?.data?.length || 0, 'seatmaps');
    return seatmapResult;
}

/* ------------------------------------------------------------------ */
/*  Seat-map by flight order ID (GET)                                  */
/* ------------------------------------------------------------------ */

export async function getSeatMapByOrderId(flightOrderId: string): Promise<any> {
    console.log('[AmadeusFlightService] SeatMap by order ID:', flightOrderId);

    const seatmapResult = await amadeusRequest('GET', '/v1/shopping/seatmaps', {
        params: { 'flight-orderId': flightOrderId },
    });

    console.log('[AmadeusFlightService] SeatMap – Retrieved', seatmapResult?.data?.length || 0, 'seatmaps');
    return seatmapResult;
}

/* ------------------------------------------------------------------ */
/*  Main: search → match → price → book                               */
/* ------------------------------------------------------------------ */

export async function createFlightOrder(params: CreateFlightOrderParams): Promise<any> {
    const { flight, passengers } = params;

    // Extract YYYY-MM-DD from departure (handles "2026-03-14T15:25", "2026-03-14 15:25", "2026-03-14")
    const departureDate =
        flight.departure?.split(/[T\s]/)[0] || new Date().toISOString().split('T')[0];

    console.log('[AmadeusFlightService] Step 1 – Searching offers:', {
        from: flight.from,
        to: flight.to,
        rawDeparture: flight.departure,
        parsedDate: departureDate,
        adults: passengers.length,
    });

    // Step 1: Search
    const searchResult = await searchFlightOffers(
        flight.from,
        flight.to,
        departureDate,
        passengers.length,
    );

    const offers = searchResult?.data || [];
    if (offers.length === 0) {
        throw new Error('No flight offers found for the specified route and date.');
    }

    // Step 2: Match
    const matchedOffer = matchOfferToFlight(offers, flight);
    if (!matchedOffer) {
        throw new Error('Could not match selected flight to available Amadeus offers.');
    }

    console.log('[AmadeusFlightService] Step 2 – Matched offer:', matchedOffer?.id);

    // Step 3: Price
    const pricingResult = await priceFlightOffer(matchedOffer);
    const pricedOffers = pricingResult?.data?.flightOffers || [];
    if (pricedOffers.length === 0) {
        throw new Error('Flight offer pricing failed. The fare may no longer be available.');
    }
    const pricedOffer = pricedOffers[0];

    console.log('[AmadeusFlightService] Step 3 – Priced at:', pricedOffer?.price?.grandTotal);

    // Step 4: Book
    const travelers = buildTravelers(passengers);
    const orderPayload = {
        data: {
            type: 'flight-order',
            flightOffers: [pricedOffer],
            travelers,
        },
    };

    console.log('[AmadeusFlightService] Step 4 – Creating order...');
    const orderResult = await amadeusRequest('POST', '/v1/booking/flight-orders', {
        data: orderPayload,
    });

    console.log('[AmadeusFlightService] Order created:', orderResult?.data?.id);
    return orderResult;
}
