import { geocodeAddress } from './services/geocoder';
import { findHUC8ByPoint, findAdjacentHUC8s } from './services/huc-service';
import { MapController } from './components/map-controller';
import type { HUC8Feature, GeocodingResult } from './types';

export class HUC8App {
  private mapController: MapController;
  private currentHUC8: HUC8Feature | null = null;

  // DOM Elements (initialized in initElements, called from constructor)
  private searchForm!: HTMLFormElement;
  private addressInput!: HTMLInputElement;
  private searchButton!: HTMLButtonElement;
  private buttonText!: HTMLElement;
  private spinner!: HTMLElement;
  private errorMessage!: HTMLElement;
  private resultsPanel!: HTMLElement;
  private hucCodeEl!: HTMLElement;
  private hucNameEl!: HTMLElement;
  private hucStatesEl!: HTMLElement;
  private hucAreaEl!: HTMLElement;
  private adjacentListEl!: HTMLUListElement;

  constructor() {
    this.mapController = new MapController('map');
    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    this.searchForm = document.getElementById('search-form') as HTMLFormElement;
    this.addressInput = document.getElementById('address-input') as HTMLInputElement;
    this.searchButton = document.getElementById('search-button') as HTMLButtonElement;
    this.buttonText = this.searchButton.querySelector('.button-text') as HTMLElement;
    this.spinner = this.searchButton.querySelector('.spinner') as HTMLElement;
    this.errorMessage = document.getElementById('error-message') as HTMLElement;
    this.resultsPanel = document.getElementById('results-panel') as HTMLElement;
    this.hucCodeEl = document.getElementById('huc-code') as HTMLElement;
    this.hucNameEl = document.getElementById('huc-name') as HTMLElement;
    this.hucStatesEl = document.getElementById('huc-states') as HTMLElement;
    this.hucAreaEl = document.getElementById('huc-area') as HTMLElement;
    this.adjacentListEl = document.getElementById('adjacent-list') as HTMLUListElement;
  }

  private bindEvents(): void {
    this.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSearch();
    });

    // Handle window resize for map
    window.addEventListener('resize', () => {
      this.mapController.invalidateSize();
    });
  }

  private async handleSearch(): Promise<void> {
    const query = this.addressInput.value.trim();
    if (!query) {
      this.showError('Please enter an address or zip code.');
      return;
    }

    this.showLoading();
    this.hideError();

    try {
      // Step 1: Geocode the address
      const location = await geocodeAddress(query);

      // Step 2: Find HUC8 for the location
      const huc8Feature = await findHUC8ByPoint(location.lat, location.lng);

      // Step 3: Find adjacent HUC8s
      const adjacentFeatures = await findAdjacentHUC8s(huc8Feature.geometry);

      // Step 4: Display results
      this.displayResults(location, huc8Feature, adjacentFeatures);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      this.showError(message);
    } finally {
      this.hideLoading();
    }
  }

  private displayResults(
    location: GeocodingResult,
    huc8Feature: HUC8Feature,
    adjacentFeatures: HUC8Feature[]
  ): void {
    // Clear previous results
    this.mapController.clearAll();

    // Add marker at search location
    this.mapController.addSearchMarker(location.lat, location.lng);

    // Display primary HUC8
    this.mapController.displayPrimaryHUC(huc8Feature);

    // Display adjacent HUC8s with click handler
    this.mapController.displayAdjacentHUCs(adjacentFeatures, (feature) => {
      this.selectHUC8(feature);
    });

    // Update info panel
    this.updateInfoPanel(huc8Feature.properties);
    this.updateAdjacentList(adjacentFeatures);

    // Show results panel
    this.resultsPanel.classList.remove('hidden');
    this.currentHUC8 = huc8Feature;
  }

  private updateInfoPanel(props: HUC8Feature['properties']): void {
    this.hucCodeEl.textContent = props.huc8;
    this.hucNameEl.textContent = props.name;
    this.hucStatesEl.textContent = props.states;
    this.hucAreaEl.textContent = props.areaacres
      ? `${Number(props.areaacres).toLocaleString()} acres`
      : '--';
  }

  private updateAdjacentList(features: HUC8Feature[]): void {
    if (features.length === 0) {
      this.adjacentListEl.innerHTML = '<li class="no-adjacent">No adjacent watersheds found</li>';
      return;
    }

    this.adjacentListEl.innerHTML = features
      .map(
        (f) => `
        <li>
          <button class="adjacent-btn" data-huc="${f.properties.huc8}">
            <strong>${f.properties.huc8}</strong> - ${f.properties.name}
          </button>
        </li>
      `
      )
      .join('');

    // Add click handlers
    this.adjacentListEl.querySelectorAll('.adjacent-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const hucCode = (btn as HTMLButtonElement).dataset.huc;
        const feature = features.find((f) => f.properties.huc8 === hucCode);
        if (feature) {
          this.selectHUC8(feature);
        }
      });
    });
  }

  private async selectHUC8(feature: HUC8Feature): Promise<void> {
    this.showLoading();

    try {
      // Find adjacent HUC8s for the new selection
      const adjacentFeatures = await findAdjacentHUC8s(feature.geometry);

      // Clear and redraw
      this.mapController.clearAll();
      this.mapController.displayPrimaryHUC(feature);
      this.mapController.displayAdjacentHUCs(adjacentFeatures, (f) => {
        this.selectHUC8(f);
      });

      // Update info panel
      this.updateInfoPanel(feature.properties);
      this.updateAdjacentList(adjacentFeatures);
      this.currentHUC8 = feature;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load watershed.';
      this.showError(message);
    } finally {
      this.hideLoading();
    }
  }

  private showLoading(): void {
    this.addressInput.disabled = true;
    this.searchButton.disabled = true;
    this.buttonText.classList.add('hidden');
    this.spinner.classList.remove('hidden');
  }

  private hideLoading(): void {
    this.addressInput.disabled = false;
    this.searchButton.disabled = false;
    this.buttonText.classList.remove('hidden');
    this.spinner.classList.add('hidden');
  }

  private showError(message: string): void {
    this.errorMessage.textContent = message;
    this.errorMessage.classList.remove('hidden');
  }

  private hideError(): void {
    this.errorMessage.classList.add('hidden');
  }

  /**
   * Get the currently selected HUC8 feature
   */
  getCurrentHUC8(): HUC8Feature | null {
    return this.currentHUC8;
  }
}
