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
			fallback: 'index.html', // This is crucial for client-side routing
			pages: 'build',
			assets: 'build',
			precompress: false,
			strict: true
		}),
		prerender: {
			handleHttpError: ({ path, referrer, message }) => {
				// Ignore all 404s except for the root page
				if (path !== '/' && message.includes('Not found')) return;
				throw new Error(message);
			}
		}
	},
};

export default config;
