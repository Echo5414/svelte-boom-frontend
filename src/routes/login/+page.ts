import { redirect } from '@sveltejs/kit';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL;

export const load = async ({ url }) => {
  const error = url.searchParams.get('error');
  
  if (error) {
    console.error('Login error:', error);
    // Optional: Handle different error types
  }
  
  // Redirect back to home
  throw redirect(303, '/');
}; 