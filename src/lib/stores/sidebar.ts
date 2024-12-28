import { writable } from 'svelte/store';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Get initial state from localStorage or default to open (240px)
const storedWidth = isBrowser ? localStorage.getItem('sidebarWidth') || '240px' : '240px';

export const sidebarWidth = writable(storedWidth);

// Subscribe to changes and save to localStorage only in browser environment
if (isBrowser) {
  sidebarWidth.subscribe(value => {
    localStorage.setItem('sidebarWidth', value);
  });
} 