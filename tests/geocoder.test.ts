import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockFetchResponse, getLastFetchUrl, getLastFetchOptions } from './setup';
import { geocodeAddress, resetRateLimiter } from '../src/services/geocoder';

describe('geocodeAddress', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it('should return coordinates for a valid US address', async () => {
    const mockResponse = [
      {
        lat: '38.8977',
        lon: '-77.0365',
        display_name: '1600 Pennsylvania Avenue NW, Washington, DC 20500, USA',
      },
    ];
    mockFetchResponse(mockResponse);

    const result = await geocodeAddress('1600 Pennsylvania Avenue, Washington DC');

    expect(result).toEqual({
      lat: 38.8977,
      lng: -77.0365,
      displayName: '1600 Pennsylvania Avenue NW, Washington, DC 20500, USA',
    });
  });

  it('should throw error for address not found', async () => {
    mockFetchResponse([]);

    await expect(geocodeAddress('xyznonexistentaddress123')).rejects.toThrow(
      'Address not found'
    );
  });

  it('should throw error on API failure', async () => {
    mockFetchResponse({}, false, 500);

    await expect(geocodeAddress('any address')).rejects.toThrow('Geocoding failed');
  });

  it('should include required User-Agent header', async () => {
    const mockResponse = [
      {
        lat: '40.7128',
        lon: '-74.0060',
        display_name: 'New York, NY, USA',
      },
    ];
    mockFetchResponse(mockResponse);

    await geocodeAddress('New York');

    const options = getLastFetchOptions();
    expect(options?.headers).toBeDefined();
    const headers = options?.headers as Record<string, string>;
    expect(headers['User-Agent']).toContain('HUC8');
  });

  it('should limit results to US (countrycodes=us)', async () => {
    const mockResponse = [
      {
        lat: '34.0522',
        lon: '-118.2437',
        display_name: 'Los Angeles, CA, USA',
      },
    ];
    mockFetchResponse(mockResponse);

    await geocodeAddress('Los Angeles');

    const url = getLastFetchUrl();
    expect(url).toContain('countrycodes=us');
  });

  it('should request only 1 result (limit=1)', async () => {
    const mockResponse = [
      {
        lat: '41.8781',
        lon: '-87.6298',
        display_name: 'Chicago, IL, USA',
      },
    ];
    mockFetchResponse(mockResponse);

    await geocodeAddress('Chicago');

    const url = getLastFetchUrl();
    expect(url).toContain('limit=1');
  });

  it('should use correct Nominatim API endpoint', async () => {
    const mockResponse = [
      {
        lat: '33.4484',
        lon: '-112.0740',
        display_name: 'Phoenix, AZ, USA',
      },
    ];
    mockFetchResponse(mockResponse);

    await geocodeAddress('Phoenix');

    const url = getLastFetchUrl();
    expect(url).toContain('nominatim.openstreetmap.org/search');
  });

  it('should respect rate limiting (1 req/sec)', async () => {
    const mockResponse = [
      {
        lat: '39.7392',
        lon: '-104.9903',
        display_name: 'Denver, CO, USA',
      },
    ];

    // First call
    mockFetchResponse(mockResponse);
    const start = Date.now();
    await geocodeAddress('Denver');

    // Second call should be delayed
    mockFetchResponse(mockResponse);
    await geocodeAddress('Denver');
    const elapsed = Date.now() - start;

    // Should have waited at least ~1000ms for rate limiting
    expect(elapsed).toBeGreaterThanOrEqual(1000);
  });

  it('should encode query parameters properly', async () => {
    const mockResponse = [
      {
        lat: '40.7128',
        lon: '-74.0060',
        display_name: 'New York, NY, USA',
      },
    ];
    mockFetchResponse(mockResponse);

    await geocodeAddress('123 Main St, New York');

    const url = getLastFetchUrl();
    // Should be URL encoded
    expect(url).toContain('123');
    expect(url).toContain('Main');
    expect(url).not.toContain(' '); // Spaces should be encoded
  });
});
