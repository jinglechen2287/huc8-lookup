import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockLeaflet } from './setup';
import type { HUC8Feature } from '../src/types';

// Mock Leaflet globally before importing MapController
vi.mock('leaflet', () => ({
  default: mockLeaflet,
  ...mockLeaflet,
}));

const mockHUC8Feature: HUC8Feature = {
  type: 'Feature',
  properties: {
    huc8: '02070010',
    name: 'Middle Potomac-Anacostia-Occoquan',
    states: 'DC,MD,VA',
    areaacres: 570189.5,
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-77.5, 38.5],
        [-77.0, 38.5],
        [-77.0, 39.0],
        [-77.5, 39.0],
        [-77.5, 38.5],
      ],
    ],
  },
};

const mockAdjacentFeature: HUC8Feature = {
  type: 'Feature',
  properties: {
    huc8: '02070008',
    name: 'Upper Potomac',
    states: 'MD,VA,WV',
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-78.0, 39.0],
        [-77.5, 39.0],
        [-77.5, 39.5],
        [-78.0, 39.5],
        [-78.0, 39.0],
      ],
    ],
  },
};

describe('MapController', () => {
  let MapController: typeof import('../src/components/map-controller').MapController;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Create a mock DOM element for the map container
    document.body.innerHTML = '<div id="map"></div>';

    // Re-import to get fresh module with mocks
    const module = await import('../src/components/map-controller');
    MapController = module.MapController;
  });

  it('should initialize Leaflet map with correct center (US)', () => {
    new MapController('map');

    expect(mockLeaflet.map).toHaveBeenCalledWith('map');
    const mapInstance = mockLeaflet.map.mock.results[0].value;
    expect(mapInstance.setView).toHaveBeenCalled();

    // Check that setView was called with approximate US center coordinates
    const setViewCall = mapInstance.setView.mock.calls[0];
    const [center, zoom] = setViewCall;
    expect(center[0]).toBeCloseTo(39.8, 0); // Latitude ~39.8
    expect(center[1]).toBeCloseTo(-98.5, 0); // Longitude ~-98.5
    expect(zoom).toBe(4);
  });

  it('should add OpenStreetMap tile layer', () => {
    new MapController('map');

    expect(mockLeaflet.tileLayer).toHaveBeenCalled();
    const tileLayerCall = mockLeaflet.tileLayer.mock.calls[0];
    expect(tileLayerCall[0]).toContain('openstreetmap.org');
  });

  describe('displayPrimaryHUC', () => {
    it('should add GeoJSON layer for primary HUC8', () => {
      const controller = new MapController('map');

      controller.displayPrimaryHUC(mockHUC8Feature);

      expect(mockLeaflet.geoJSON).toHaveBeenCalledWith(
        mockHUC8Feature,
        expect.objectContaining({
          style: expect.any(Object),
        })
      );
    });

    it('should use blue styling for primary HUC8', () => {
      const controller = new MapController('map');

      controller.displayPrimaryHUC(mockHUC8Feature);

      const geoJSONCall = mockLeaflet.geoJSON.mock.calls[0];
      const options = geoJSONCall[1];

      // Check for blue color in style
      expect(options.style.color).toMatch(/#(2563eb|3b82f6)/i);
    });

    it('should fit map bounds to HUC8 boundary', () => {
      const controller = new MapController('map');

      controller.displayPrimaryHUC(mockHUC8Feature);

      const mapInstance = mockLeaflet.map.mock.results[0].value;
      expect(mapInstance.fitBounds).toHaveBeenCalled();
    });
  });

  describe('displayAdjacentHUCs', () => {
    it('should add GeoJSON layers for adjacent HUC8s', () => {
      const controller = new MapController('map');

      controller.displayAdjacentHUCs([mockAdjacentFeature]);

      expect(mockLeaflet.geoJSON).toHaveBeenCalled();
    });

    it('should use green styling for adjacent HUC8s', () => {
      const controller = new MapController('map');

      controller.displayAdjacentHUCs([mockAdjacentFeature]);

      const geoJSONCall = mockLeaflet.geoJSON.mock.calls[0];
      const options = geoJSONCall[1];

      // Check for green color in style
      expect(options.style.color).toMatch(/#(16a34a|22c55e)/i);
    });

    it('should handle multiple adjacent HUC8s', () => {
      const controller = new MapController('map');
      const secondAdjacent: HUC8Feature = {
        ...mockAdjacentFeature,
        properties: {
          ...mockAdjacentFeature.properties,
          huc8: '02070012',
        },
      };

      controller.displayAdjacentHUCs([mockAdjacentFeature, secondAdjacent]);

      // Should create a layer for each adjacent HUC8
      expect(mockLeaflet.geoJSON).toHaveBeenCalledTimes(2);
    });

    it('should call onClick callback when provided', () => {
      const controller = new MapController('map');
      const onClick = vi.fn();

      controller.displayAdjacentHUCs([mockAdjacentFeature], onClick);

      // The onClick should be stored in the options
      const geoJSONCall = mockLeaflet.geoJSON.mock.calls[0];
      const options = geoJSONCall[1];
      expect(options.onEachFeature).toBeDefined();
    });
  });

  describe('addSearchMarker', () => {
    it('should add a marker at the specified coordinates', () => {
      const controller = new MapController('map');

      controller.addSearchMarker(38.8977, -77.0365);

      expect(mockLeaflet.marker).toHaveBeenCalledWith(
        [38.8977, -77.0365],
        expect.any(Object)
      );
    });

    it('should use a custom icon for the marker', () => {
      const controller = new MapController('map');

      controller.addSearchMarker(38.8977, -77.0365);

      expect(mockLeaflet.divIcon).toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should clear all layers', () => {
      const controller = new MapController('map');

      // Add some layers first
      controller.displayPrimaryHUC(mockHUC8Feature);
      controller.displayAdjacentHUCs([mockAdjacentFeature]);
      controller.addSearchMarker(38.8977, -77.0365);

      // Clear all
      controller.clearAll();

      const mapInstance = mockLeaflet.map.mock.results[0].value;
      expect(mapInstance.removeLayer).toHaveBeenCalled();
    });

    it('should clear adjacent layer group', () => {
      const controller = new MapController('map');

      controller.displayAdjacentHUCs([mockAdjacentFeature]);
      controller.clearAll();

      // adjacentHUCLayer.clearLayers should have been called
      const layerGroupInstance = mockLeaflet.layerGroup.mock.results[0].value;
      expect(layerGroupInstance.clearLayers).toHaveBeenCalled();
    });
  });

  describe('invalidateSize', () => {
    it('should call map.invalidateSize()', () => {
      const controller = new MapController('map');

      controller.invalidateSize();

      const mapInstance = mockLeaflet.map.mock.results[0].value;
      expect(mapInstance.invalidateSize).toHaveBeenCalled();
    });
  });
});
