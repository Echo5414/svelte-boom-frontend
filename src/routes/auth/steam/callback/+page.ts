import { redirect } from '@sveltejs/kit';
import { login } from '$lib/stores/auth';
import { browser } from '$app/environment';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL;

export const load = async ({ url, fetch }) => {
  const params = url.searchParams;
  const steamId = params.get('openid.identity')?.split('/').pop();

  if (!steamId) {
    throw redirect(303, '/login?error=no-steam-id');
  }

  // Only proceed with authentication if we're in the browser
  if (!browser) {
    return {};
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/auth/steam/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ steamId })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.jwt || !data.user) {
      throw new Error('Invalid authentication response');
    }

    // Store the auth data
    login(data.user, data.jwt);

    // Handle popup scenario
    if (window.opener) {
      window.opener.postMessage(
        { 
          type: 'STEAM_AUTH_SUCCESS',
          data: { user: data.user, jwt: data.jwt }
        }, 
        window.location.origin
      );
      window.close();
      return {};
    }

    // Handle direct navigation
    throw redirect(303, '/');

  } catch (error) {
    if (window.opener) {
      window.opener.postMessage(
        { 
          type: 'STEAM_AUTH_ERROR',
          error: error instanceof Error ? error.message : 'Authentication failed'
        }, 
        window.location.origin
      );
      window.close();
      return {};
    }
    
    throw redirect(303, '/login?error=steam-auth-failed');
  }
}; 