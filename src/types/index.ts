import type { Polygon, MultiPolygon } from 'geojson';

export interface HUC8Properties {
  huc8: string;
  name: string;
  states: string;
  areaacres?: number;
  areasqkm?: number;
}

export interface HUC8Feature {
  type: 'Feature';
  properties: HUC8Properties;
  geometry: Polygon | MultiPolygon;
}

export interface HUC8FeatureCollection {
  type: 'FeatureCollection';
  features: HUC8Feature[];
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}
