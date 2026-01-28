import { describe, it, expect } from 'vitest';
import { mockFetchResponse, getLastFetchUrl, getLastFetchOptions } from './setup';
import { findHUC8ByPoint, findAdjacentHUC8s } from '../src/services/huc-service';
import type { HUC8Feature } from '../src/types';

const mockHUC8Feature: HUC8Feature = {
  type: 'Feature',
  properties: {
    huc8: '02070010',
    name: 'Middle Potomac-Anacostia-Occoquan',
    states: 'DC,MD,VA',
    areaacres: 570189.5,
    areasqkm: 2307.5,
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

describe('findHUC8ByPoint', () => {
  it('should return HUC8 feature for valid US coordinates', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [mockHUC8Feature],
    });

    const result = await findHUC8ByPoint(38.8977, -77.0365);

    expect(result).toEqual(mockHUC8Feature);
    expect(result.properties.huc8).toBe('02070010');
    expect(result.properties.name).toBe('Middle Potomac-Anacostia-Occoquan');
  });

  it('should throw error for coordinates outside US', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [],
    });

    await expect(findHUC8ByPoint(51.5074, -0.1278)).rejects.toThrow(
      'No HUC8 found'
    );
  });

  it('should throw error on API failure', async () => {
    mockFetchResponse({}, false, 500);

    await expect(findHUC8ByPoint(38.8977, -77.0365)).rejects.toThrow(
      'HUC8 lookup failed'
    );
  });

  it('should use correct USGS WBD API endpoint', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [mockHUC8Feature],
    });

    await findHUC8ByPoint(38.8977, -77.0365);

    const url = getLastFetchUrl();
    expect(url).toContain('hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/4');
  });

  it('should use POST method for requests', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [mockHUC8Feature],
    });

    await findHUC8ByPoint(38.8977, -77.0365);

    const options = getLastFetchOptions();
    expect(options?.method).toBe('POST');
  });

  it('should include correct geometry parameters in body', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [mockHUC8Feature],
    });

    await findHUC8ByPoint(38.8977, -77.0365);

    const options = getLastFetchOptions();
    const body = options?.body as string;
    expect(body).toContain('geometryType=esriGeometryPoint');
    expect(body).toContain('spatialRel=esriSpatialRelIntersects');
  });

  it('should use WGS84 coordinate system (inSR=4326)', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [mockHUC8Feature],
    });

    await findHUC8ByPoint(38.8977, -77.0365);

    const options = getLastFetchOptions();
    const body = options?.body as string;
    expect(body).toContain('inSR=4326');
  });

  it('should request geometry in WGS84 (outSR=4326)', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [mockHUC8Feature],
    });

    await findHUC8ByPoint(38.8977, -77.0365);

    const options = getLastFetchOptions();
    const body = options?.body as string;
    expect(body).toContain('outSR=4326');
  });

  it('should request GeoJSON format', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [mockHUC8Feature],
    });

    await findHUC8ByPoint(38.8977, -77.0365);

    const options = getLastFetchOptions();
    const body = options?.body as string;
    expect(body).toContain('f=geojson');
  });

  it('should request required output fields', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [mockHUC8Feature],
    });

    await findHUC8ByPoint(38.8977, -77.0365);

    const options = getLastFetchOptions();
    const body = options?.body as string;
    expect(body).toContain('outFields=');
    expect(body).toContain('huc8');
    expect(body).toContain('name');
    expect(body).toContain('states');
    expect(body).toContain('areaacres');
  });

  it('should include geometry coordinates in request', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [mockHUC8Feature],
    });

    await findHUC8ByPoint(38.8977, -77.0365);

    const options = getLastFetchOptions();
    const body = options?.body as string;
    // URL-encoded coordinates
    expect(body).toContain('-77.0365');
    expect(body).toContain('38.8977');
  });
});

describe('findAdjacentHUC8s', () => {
  it('should return adjacent HUC8 features', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [mockAdjacentFeature],
    });

    const result = await findAdjacentHUC8s(mockHUC8Feature.geometry, mockHUC8Feature.properties.huc8);

    expect(result).toHaveLength(1);
    expect(result[0].properties.huc8).toBe('02070008');
  });

  it('should return multiple adjacent HUC8s when available', async () => {
    const secondAdjacent: HUC8Feature = {
      ...mockAdjacentFeature,
      properties: {
        ...mockAdjacentFeature.properties,
        huc8: '02070012',
        name: 'Lower Potomac',
      },
    };

    mockFetchResponse({
      type: 'FeatureCollection',
      features: [mockAdjacentFeature, secondAdjacent],
    });

    const result = await findAdjacentHUC8s(mockHUC8Feature.geometry, mockHUC8Feature.properties.huc8);

    expect(result).toHaveLength(2);
  });

  it('should return empty array if no adjacent HUC8s', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [],
    });

    const result = await findAdjacentHUC8s(mockHUC8Feature.geometry, mockHUC8Feature.properties.huc8);

    expect(result).toEqual([]);
  });

  it('should use esriSpatialRelIntersects for spatial query', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [],
    });

    await findAdjacentHUC8s(mockHUC8Feature.geometry, mockHUC8Feature.properties.huc8);

    const options = getLastFetchOptions();
    const body = options?.body as string;
    expect(body).toContain('spatialRel=esriSpatialRelIntersects');
  });

  it('should use esriGeometryPolygon for geometry type', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [],
    });

    await findAdjacentHUC8s(mockHUC8Feature.geometry, mockHUC8Feature.properties.huc8);

    const options = getLastFetchOptions();
    const body = options?.body as string;
    expect(body).toContain('geometryType=esriGeometryPolygon');
  });

  it('should use same USGS WBD API endpoint', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [],
    });

    await findAdjacentHUC8s(mockHUC8Feature.geometry, mockHUC8Feature.properties.huc8);

    const url = getLastFetchUrl();
    expect(url).toContain('hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/4');
  });

  it('should throw error on API failure', async () => {
    mockFetchResponse({}, false, 500);

    await expect(findAdjacentHUC8s(mockHUC8Feature.geometry, mockHUC8Feature.properties.huc8)).rejects.toThrow(
      'Adjacent HUC8 lookup failed'
    );
  });

  it('should request geometry for rendering', async () => {
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [],
    });

    await findAdjacentHUC8s(mockHUC8Feature.geometry, mockHUC8Feature.properties.huc8);

    const options = getLastFetchOptions();
    const body = options?.body as string;
    expect(body).toContain('returnGeometry=true');
  });

  it('should filter out the source HUC8 from results', async () => {
    // API returns both the source HUC8 and an adjacent one
    mockFetchResponse({
      type: 'FeatureCollection',
      features: [mockHUC8Feature, mockAdjacentFeature],
    });

    const result = await findAdjacentHUC8s(mockHUC8Feature.geometry, mockHUC8Feature.properties.huc8);

    // Source HUC8 should be filtered out
    expect(result).toHaveLength(1);
    expect(result[0].properties.huc8).toBe('02070008');
    expect(result.find(f => f.properties.huc8 === mockHUC8Feature.properties.huc8)).toBeUndefined();
  });
});
