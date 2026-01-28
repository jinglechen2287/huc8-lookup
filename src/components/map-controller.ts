import L from 'leaflet';
import type { HUC8Feature } from '../types';

// Style configurations
const PRIMARY_STYLE: L.PathOptions = {
  color: '#2563eb',
  weight: 3,
  opacity: 1,
  fillColor: '#3b82f6',
  fillOpacity: 0.3,
};

const ADJACENT_STYLE: L.PathOptions = {
  color: '#16a34a',
  weight: 2,
  opacity: 0.8,
  fillColor: '#22c55e',
  fillOpacity: 0.15,
};

const ADJACENT_HOVER_STYLE: L.PathOptions = {
  weight: 3,
  fillOpacity: 0.3,
};

export class MapController {
  private map: L.Map;
  private primaryHUCLayer: L.GeoJSON | null = null;
  private adjacentHUCLayer: L.LayerGroup;
  private markerLayer: L.LayerGroup;

  constructor(containerId: string) {
    // Initialize map centered on US
    this.map = L.map(containerId).setView([39.8283, -98.5795], 4);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(this.map);

    // Initialize layer groups
    this.adjacentHUCLayer = L.layerGroup().addTo(this.map);
    this.markerLayer = L.layerGroup().addTo(this.map);
  }

  /**
   * Clear all layers from the map
   */
  clearAll(): void {
    if (this.primaryHUCLayer) {
      this.map.removeLayer(this.primaryHUCLayer);
      this.primaryHUCLayer = null;
    }
    this.adjacentHUCLayer.clearLayers();
    this.markerLayer.clearLayers();
  }

  /**
   * Add a marker at the search location
   */
  addSearchMarker(lat: number, lng: number): void {
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'search-marker',
        html: '<div class="marker-pin"></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      }),
    });
    marker.addTo(this.markerLayer);
  }

  /**
   * Display the primary HUC8 boundary
   */
  displayPrimaryHUC(feature: HUC8Feature, onClick?: (feature: HUC8Feature) => void): void {
    this.primaryHUCLayer = L.geoJSON(feature, {
      style: PRIMARY_STYLE,
      onEachFeature: (feat, layer) => {
        const props = feat.properties as HUC8Feature['properties'];
        layer.bindPopup(`
          <div class="huc-popup">
            <strong>HUC8: ${props.huc8}</strong><br>
            <span class="huc-name">${props.name}</span><br>
            <span class="huc-states">States: ${props.states}</span>
          </div>
        `);

        if (onClick) {
          layer.on('click', () => onClick(feature));
        }
      },
    }).addTo(this.map);

    // Fit map to the HUC8 boundary
    this.map.fitBounds(this.primaryHUCLayer.getBounds(), { padding: [50, 50] });
  }

  /**
   * Display adjacent HUC8 boundaries
   */
  displayAdjacentHUCs(
    features: HUC8Feature[],
    onClick?: (feature: HUC8Feature) => void
  ): void {
    features.forEach((feature) => {
      const layer = L.geoJSON(feature, {
        style: ADJACENT_STYLE,
        onEachFeature: (feat, lyr) => {
          const props = feat.properties as HUC8Feature['properties'];
          lyr.bindPopup(`
            <div class="huc-popup adjacent">
              <strong>HUC8: ${props.huc8}</strong><br>
              <span class="huc-name">${props.name}</span><br>
              <span class="huc-states">States: ${props.states}</span><br>
              <em class="click-hint">Click to view this watershed</em>
            </div>
          `);

          // Hover effects
          lyr.on('mouseover', () => {
            (lyr as L.Path).setStyle(ADJACENT_HOVER_STYLE);
          });
          lyr.on('mouseout', () => {
            (lyr as L.Path).setStyle(ADJACENT_STYLE);
          });

          if (onClick) {
            lyr.on('click', () => onClick(feature));
          }
        },
      });

      layer.addTo(this.adjacentHUCLayer);
    });
  }

  /**
   * Call when container size changes
   */
  invalidateSize(): void {
    this.map.invalidateSize();
  }

  /**
   * Get the Leaflet map instance (for advanced use cases)
   */
  getMap(): L.Map {
    return this.map;
  }

  /**
   * Prepare the map for printing by forcing tile visibility
   */
  prepareForPrint(): void {
    this.map.invalidateSize();
  }
}
