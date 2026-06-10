import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const AMADEUS_BASE_URL = process.env.AMADEUS_API_URL;
const CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getAmadeusToken(): Promise<string> {
    const now = Date.now();
    if (cachedToken && now < tokenExpiresAt - 120000) return cachedToken;

    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', CLIENT_ID || '');
        params.append('client_secret', CLIENT_SECRET || '');

        const response = await axios.post(
            `${AMADEUS_BASE_URL}/v1/security/oauth2/token`,
            params,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        );

        cachedToken = response.data.access_token;
        tokenExpiresAt = now + response.data.expires_in * 1000;
        return cachedToken as string;
    } catch (error) {
        console.error('[AmadeusTokenService] Auth failed:', error);
        throw new Error('Amadeus Auth Failed');
    }
}

export function getAmadeusBaseUrl(): string {
    return AMADEUS_BASE_URL || 'https://test.api.amadeus.com';
}
