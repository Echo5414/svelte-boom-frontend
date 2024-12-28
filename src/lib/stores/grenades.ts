import { writable } from 'svelte/store';

export const grenadeStore = writable({
  lastUpdate: Date.now(),
});

export function notifyGrenadeChange() {
  grenadeStore.update(state => ({
    ...state,
    lastUpdate: Date.now()
  }));
} 