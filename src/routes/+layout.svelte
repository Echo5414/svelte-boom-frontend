<script lang="ts">
	import '../app.css';
	import '$lib/styles/tokens.css';
	import { sidebarWidth } from '$lib/stores/sidebar';
	import { userSectionWidth } from '$lib/stores/userSection';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import UserSection from '$lib/components/UserSection.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { loadFilterData } from '$lib/stores/filters';

	$: isAuthRoute = $page.url.pathname.startsWith('/auth');

	// Load filter data immediately and track loading state
	let isLoading = true;
	let filterDataPromise = loadFilterData().finally(() => {
		isLoading = false;
	});
</script>

{#if !isAuthRoute}
	{#await filterDataPromise}
		<div class="loading">Loading...</div>
	{:then}
		<div class="layout">
			<Sidebar />
			<main>
				<div class="content">
					<div class="container">
						<slot />
					</div>
				</div>
			</main>
			<UserSection />
		</div>
	{/await}
{:else}
	<slot />
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: var(--color-background);
		color: var(--color-text-primary);
		font-family: var(--font-family-base);
		height: 100vh;
		overflow: hidden;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.layout {
		display: grid;
		grid-template-columns: auto 1fr auto;
		height: 100vh;
		overflow: hidden;
	}

	main {
		min-width: 0;
		overflow-y: auto;
		position: relative;
		z-index: 1;
		height: 100vh;
	}

	.content {
		padding: var(--content-padding-y) var(--content-padding-x);
		min-height: 100%;
	}

	.container {
		max-width: var(--content-max-width);
		margin: 0 auto;
		width: 100%;
	}

	.loading {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		color: var(--color-text-secondary);
	}
</style>
