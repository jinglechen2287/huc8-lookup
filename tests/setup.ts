import { vi, beforeEach, afterEach } from 'vitest';

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Mock fetch globally
global.fetch = vi.fn();

// Helper to create a mock fetch response
export function mockFetchResponse(data: unknown, ok = true, status = 200): void {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

// Helper to create a mock fetch error
export function mockFetchError(message: string): void {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error(message));
}

// Helper to get the URL that fetch was called with
export function getLastFetchUrl(): string {
  const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
  if (calls.length === 0) {
    throw new Error('fetch was not called');
  }
  return calls[calls.length - 1][0] as string;
}

// Helper to get fetch call options
export function getLastFetchOptions(): RequestInit | undefined {
  const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
  if (calls.length === 0) {
    throw new Error('fetch was not called');
  }
  return calls[calls.length - 1][1] as RequestInit | undefined;
}

// Mock Leaflet for map controller tests
export const mockLeaflet = {
  map: vi.fn(() => ({
    setView: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),
    removeLayer: vi.fn().mockReturnThis(),
    addLayer: vi.fn().mockReturnThis(),
    invalidateSize: vi.fn().mockReturnThis(),
  })),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn().mockReturnThis(),
  })),
  geoJSON: vi.fn(() => ({
    addTo: vi.fn().mockReturnThis(),
    getBounds: vi.fn(() => ({
      extend: vi.fn().mockReturnThis(),
    })),
    bindPopup: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    setStyle: vi.fn().mockReturnThis(),
  })),
  layerGroup: vi.fn(() => ({
    addTo: vi.fn().mockReturnThis(),
    clearLayers: vi.fn().mockReturnThis(),
    addLayer: vi.fn().mockReturnThis(),
  })),
  marker: vi.fn(() => ({
    addTo: vi.fn().mockReturnThis(),
  })),
  divIcon: vi.fn(() => ({})),
};
