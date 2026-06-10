export type TravelProvider = 'amadeus' | 'duffel';

export function getTravelProvider(): TravelProvider {
    const raw = (process.env.AI_TRAVEL_PROVIDER || 'amadeus').trim().toLowerCase();
    return raw === 'duffel' ? 'duffel' : 'amadeus';
}

export function isDuffelProvider(): boolean {
    return getTravelProvider() === 'duffel';
}
