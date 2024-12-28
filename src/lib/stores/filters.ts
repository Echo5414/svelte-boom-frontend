import { writable, get, derived } from 'svelte/store';
import { browser } from '$app/environment';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL;

// Create a store for the loading state
const isLoading = writable(false);

// Create a store for the filter data
const filterData = writable({
  maps: [],
  teams: [],
  types: [],
  collections: []
});

// Create derived stores that only update when filterData changes
export const mapOptions = derived(filterData, $data => $data.maps);
export const teamOptions = derived(filterData, $data => $data.teams);
export const grenadeTypes = derived(filterData, $data => $data.types);
export const collections = derived(filterData, $data => $data.collections);

export const filters = writable({
  map: 'All Maps',
  team: 'Both Teams',
  grenade: 'All Grenades',
  collection: 'No Collection'
});

let isDataLoaded = false;

// Add a loading promise to prevent concurrent requests
let loadingPromise: Promise<void> | null = null;

export async function loadFilterData() {
  // Only fetch on client side
  if (!browser) return;

  // Return existing promise if loading
  if (loadingPromise) {
    return loadingPromise;
  }

  // Return if already loaded
  if (isDataLoaded || get(isLoading)) {
    return;
  }

  isLoading.set(true);

  loadingPromise = (async () => {
    try {
      const [mapsRes, teamsRes, typesRes, collectionsRes] = await Promise.all([
        fetch(`${STRAPI_URL}/api/maps?populate=*`),
        fetch(`${STRAPI_URL}/api/teams?populate=*`),
        fetch(`${STRAPI_URL}/api/types?populate=*`),
        fetch(`${STRAPI_URL}/api/collections?populate=*`)
      ]);

      const [mapsData, teamsData, typesData, collectionsData] = await Promise.all([
        mapsRes.json(),
        teamsRes.json(),
        typesRes.json(),
        collectionsRes.json()
      ]);

      filterData.set({
        maps: mapsData.data,
        teams: teamsData.data,
        types: typesData.data,
        collections: collectionsData.data
      });

      isDataLoaded = true;
    } catch (error) {
      console.error('Error loading filter data:', error);
    } finally {
      isLoading.set(false);
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

export function resetFilterData() {
  isDataLoaded = false;
  filterData.set({
    maps: [],
    teams: [],
    types: [],
    collections: []
  });
} 