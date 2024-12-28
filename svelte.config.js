import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Switch from adapter-auto to adapter-static for static builds
		adapter: adapter({
			// Set options if needed, such as fallback for single-page applications
			fallback: 'index.html', // Ensures the app works with client-side routing
		}),
	},
};

export default config;
