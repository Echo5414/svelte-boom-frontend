<script lang="ts">
  import GrenadeDetail from '$lib/components/GrenadeDetail.svelte';
  import Tooltip from '$lib/components/Tooltip.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  
  let headerVisible = false;
  const grenadeId = $page.params.id;

  let activeTab = 'video';

  let grenadeData = null;

  const STRAPI_URL = import.meta.env.VITE_STRAPI_URL;

  async function fetchGrenade(documentId: string) {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) {
      console.error('No JWT found');
      return null;
    }

    try {
      // Try to fetch the grenade with both statuses in parallel
      const [publishedResponse, draftResponse] = await Promise.all([
        fetch(
          `${STRAPI_URL}/api/grenades?filters[documentId][$eq]=${documentId}&status=published&populate=*`,
          { headers: { 'Authorization': `Bearer ${jwt}` } }
        ),
        fetch(
          `${STRAPI_URL}/api/grenades?filters[documentId][$eq]=${documentId}&status=draft&populate=*`,
          { headers: { 'Authorization': `Bearer ${jwt}` } }
        )
      ]);

      const [publishedData, draftData] = await Promise.all([
        publishedResponse.json(),
        draftResponse.json()
      ]);

      console.log('Published data:', publishedData); // Debug log
      console.log('Draft data:', draftData); // Debug log

      // Return either the published or draft version, whichever exists
      if (publishedData.data && publishedData.data.length > 0) {
        return publishedData.data[0];
      }

      if (draftData.data && draftData.data.length > 0) {
        return draftData.data[0];
      }

      return null;
    } catch (error) {
      console.error('Error fetching grenade:', error);
      return null;
    }
  }

  function handleGrenadeLoad(data) {
    grenadeData = data;
  }

  onMount(() => {
    setTimeout(() => {
      headerVisible = true;
    }, 100);
  });

  const getHeaderDelay = (index) => 200 + (index * 100);

  function handleBack() {
    history.back();
  }
</script>

<main class="content">
  <div class="content-wrapper">
    <header class="header">
      <div class="header-title">
        <h1>
          {#if grenadeData}
            {grenadeData.map}: {grenadeData.title}
          {:else}
            Loading...
          {/if}
        </h1>
        {#if headerVisible && grenadeData}
          <div 
            class="header-meta"
            style="animation-delay: 300ms"
          >
            <span class="badge">Public</span>
            <span class="publish-info">
              Published {new Date(grenadeData.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })} — 
              <a class="s-XEeEwign4_oP" href="/user/{grenadeData.userId}">{grenadeData.author}</a>
            </span>
          </div>
        {/if}
      </div>
      
      <div class="header-actions">
        {#if headerVisible}
          <div class="header-action" style="animation-delay: {getHeaderDelay(0)}ms">
            <Tooltip text="Report" position="bottom">
              <button class="icon-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                  <line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
              </button>
            </Tooltip>
          </div>

          <div class="header-action" style="animation-delay: {getHeaderDelay(1)}ms">
            <Tooltip text="Edit" position="bottom">
              <button class="icon-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                </svg>
              </button>
            </Tooltip>
          </div>

          <div class="header-action" style="animation-delay: {getHeaderDelay(2)}ms">
            <Tooltip text="Close" position="bottom">
              <button class="icon-button" on:click={handleBack}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </Tooltip>
          </div>
        {/if}
      </div>
    </header>

    <GrenadeDetail onGrenadeLoad={handleGrenadeLoad} />
  </div>
</main>

<style>
  .content {
    background-color: var(--color-background);
    min-width: 0;
  }

  .content-wrapper {
    margin: 0 auto;
    width: 100%;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-8);
    padding: 0;
  }

  h1 {
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-semibold);
    margin: 0;
    white-space: normal;
    letter-spacing: -0.5px;
    opacity: 0;
    animation: fadeIn 0.5s ease forwards;
    line-height: 1.2;
    max-width: 800px;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .header-actions {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
  }

  .icon-button {
    background: var(--color-surface);
    border: none;
    color: var(--color-text-primary);
    min-width: 38px;
    height: 38px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--transition-all);
    flex-shrink: 0;
    border-radius: var(--radius-md);
  }

  .icon-button:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .header-action {
    opacity: 0;
    transform: translateX(-20px);
    animation: headerFadeIn 0.5s ease forwards;
  }

  @keyframes headerFadeIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (max-width: 768px) {
    .content {
      padding: var(--spacing-4);
    }
    
    .header {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-4);
    }

    .header-actions {
      justify-content: flex-end;
    }
  }

  .header-title {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
    opacity: 0;
    animation: fadeIn 0.5s ease forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .badge {
    background: var(--color-surface);
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
  }

  .publish-info a {
    color: var(--color-primary);
    text-decoration: none;
  }

  .publish-info a:hover {
    text-decoration: underline;
  }

  .tab-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-6);
  }

  .segmented-control {
    display: flex;
    background: var(--color-surface);
    padding: var(--spacing-1);
    border-radius: var(--radius-md);
    gap: var(--spacing-1);
  }

  .segment-btn {
    padding: var(--spacing-2) var(--spacing-4);
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--font-size-base);
    transition: all 0.2s ease;
  }

  .segment-btn.active {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .interaction-buttons {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
  }

  .interaction-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-surface);
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: var(--font-size-base);
  }

  .interaction-btn:hover {
    background: var(--color-surface-hover);
  }

  .likes .interaction-btn {
    color: var(--color-text-secondary);
  }

  .likes .interaction-btn:hover {
    color: var(--color-primary);
  }

  .likes .interaction-btn.active {
    color: var(--color-primary);
  }

  .likes .interaction-btn.active svg {
    fill: var(--color-primary);
  }
</style> 