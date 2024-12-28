import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface User {
  id: number;
  username: string;
  email: string;
  steamId: string;
  avatar?: string;
}

function createUserStore() {
  const { subscribe, set, update } = writable<User | null>(null);

  return {
    subscribe,
    set: (user: User | null) => {
      console.log('Setting user:', user);
      set(user);
    },
    update,
    login: (userData: User, jwt: string) => {
      if (browser) {
        localStorage.setItem('jwt', jwt);
      }
      set(userData);
    },
    logout: () => {
      if (browser) {
        localStorage.removeItem('jwt');
      }
      set(null);
    },
    init: async () => {
      if (!browser) {
        set(null);
        return;
      }

      const jwt = localStorage.getItem('jwt');
      if (!jwt) {
        set(null);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_STRAPI_URL}/api/users/me`, {
          headers: {
            'Authorization': `Bearer ${jwt}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();
        set(userData);
      } catch (error) {
        console.error('Error initializing user:', error);
        localStorage.removeItem('jwt');
        set(null);
      }
    }
  };
}

const userStore = createUserStore();

// Initialize the store when the module loads
if (browser) {
  userStore.init();
}

// Export the store and login function
export const user = userStore;
export const login = userStore.login;
export const logout = userStore.logout; 