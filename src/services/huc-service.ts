import type { HUC8Feature, HUC8FeatureCollection } from '../types';
import type { Polygon, MultiPolygon } from 'geojson';

const WBD_BASE_URL = 'https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/4';

/**
 * Convert GeoJSON geometry to ESRI JSON format for API queries
 */
function toEsriGeometry(geometry: Polygon | MultiPolygon): object {
  if (geometry.type === 'Polygon') {
    return {
      rings: geometry.coordinates,
      spatialReference: { wkid: 4326 },
    };
  } else {
    // MultiPolygon - flatten all rings
    return {
      rings: geometry.coordinates.flat(),
      spatialReference: { wkid: 4326 },
    };
  }
}

/**
 * Make a POST request to the USGS API (handles large geometries better than GET)
 */
async function queryWBD(params: Record<string, string>): Promise<HUC8FeatureCollection> {
  const body = new URLSearchParams(params);

  const response = await fetch(`${WBD_BASE_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Find HUC8 that contains the given coordinates
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns HUC8 feature containing the point
 * @throws Error if no HUC8 found or API fails
 */
export async function findHUC8ByPoint(lat: number, lng: number): Promise<HUC8Feature> {
  const geometry = JSON.stringify({ x: lng, y: lat });

  const params = {
    geometry,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'huc8,name,states,areaacres,areasqkm',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
  };

  try {
    const data = await queryWBD(params);

    if (!data.features || data.features.length === 0) {
      throw new Error(
        'No HUC8 found for this location. Please ensure the location is within the United States.'
      );
    }

    return data.features[0];
  } catch (error) {
    if (error instanceof Error && error.message.includes('No HUC8')) {
      throw error;
    }
    throw new Error(`HUC8 lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find all HUC8 boundaries that touch the given HUC8 geometry
 * @param geometry - GeoJSON polygon geometry of the source HUC8
 * @returns Array of adjacent HUC8 features
 * @throws Error if API fails
 */
export async function findAdjacentHUC8s(
  geometry: Polygon | MultiPolygon
): Promise<HUC8Feature[]> {
  const esriGeometry = toEsriGeometry(geometry);

  const params = {
    geometry: JSON.stringify(esriGeometry),
    geometryType: 'esriGeometryPolygon',
    inSR: '4326',
    spatialRel: 'esriSpatialRelTouches',
    outFields: 'huc8,name,states',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
  };

  try {
    const data = await queryWBD(params);
    return data.features || [];
  } catch (error) {
    throw new Error(`Adjacent HUC8 lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get HUC8 by its code directly
 * @param huc8Code - The 8-digit HUC code
 * @returns HUC8 feature or null if not found
 */
export async function getHUC8ByCode(huc8Code: string): Promise<HUC8Feature | null> {
  const params = {
    where: `huc8='${huc8Code}'`,
    outFields: 'huc8,name,states,areaacres,areasqkm',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
  };

  try {
    const data = await queryWBD(params);
    return data.features?.[0] || null;
  } catch (error) {
    throw new Error(`HUC8 lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
