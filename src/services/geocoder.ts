import type { GeocodingResult, NominatimResult } from '../types';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds to be safe with Nominatim's 1 req/sec limit

let lastRequestTime = 0;

/**
 * Reset the rate limiter - used for testing
 */
export function resetRateLimiter(): void {
  lastRequestTime = 0;
}

/**
 * Wait if needed to respect rate limiting
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (lastRequestTime > 0 && timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

/**
 * Geocode an address or zip code to coordinates using Nominatim
 * @param query - Address or zip code to geocode
 * @returns Geocoding result with lat, lng, and display name
 * @throws Error if address not found or API fails
 */
export async function geocodeAddress(query: string): Promise<GeocodingResult> {
  await waitForRateLimit();

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    countrycodes: 'us',
    addressdetails: '1',
  });

  const response = await fetch(`${NOMINATIM_BASE_URL}?${params}`, {
    headers: {
      'User-Agent': 'HUC8-Lookup-App/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`);
  }

  const data: NominatimResult[] = await response.json();

  if (data.length === 0) {
    throw new Error('Address not found. Please try a different search.');
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}
