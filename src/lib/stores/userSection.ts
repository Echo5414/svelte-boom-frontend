import { writable } from 'svelte/store';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Get initial state from localStorage or default to closed (72px)
const storedWidth = isBrowser ? localStorage.getItem('userSectionWidth') || '72px' : '72px';

export const userSectionWidth = writable(storedWidth);

// Subscribe to changes and save to localStorage only in browser environment
if (isBrowser) {
  userSectionWidth.subscribe(value => {
    localStorage.setItem('userSectionWidth', value);
  });
} 