<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { user } from '$lib/stores/auth';
  import GrenadeGrid from '$lib/components/GrenadeGrid.svelte';
  import { grenadeStore } from '$lib/stores/grenades';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  const STRAPI_URL = import.meta.env.VITE_STRAPI_URL;

  // Get initial tab from URL or default to 'published'
  $: activeTab = $page.url.searchParams.get('tab') || 'published';

  let publishedGrenades = [];
  let draftGrenades = [];
  let likedGrenades = [];
  let isLoading = true;
  let pageVisible = true;

  // Load all data initially
  async function loadAllData() {
    if (!$user) return;
    
    isLoading = true;
    const jwt = localStorage.getItem('jwt');
    
    if (!jwt) {
      console.error('No JWT found');
      return;
    }

    try {
      const [publishedResponse, draftResponse, likedResponse] = await Promise.all([
        fetch(
          `${STRAPI_URL}/api/grenades?filters[user][id][$eq]=${$user.id}&status=published&populate=*`,
          { headers: { 'Authorization': `Bearer ${jwt}` } }
        ),
        fetch(
          `${STRAPI_URL}/api/grenades?filters[user][id][$eq]=${$user.id}&status=draft&populate=*`,
          { headers: { 'Authorization': `Bearer ${jwt}` } }
        ),
        fetch(
          `${STRAPI_URL}/api/grenades?filters[likedBy][id][$eq]=${$user.id}&status=published&populate=*`,
          { headers: { 'Authorization': `Bearer ${jwt}` } }
        )
      ]);

      const [publishedData, draftData, likedData] = await Promise.all([
        publishedResponse.json(),
        draftResponse.json(),
        likedResponse.json()
      ]);

      // Process all data
      publishedGrenades = processGrenades(publishedData.data);
      const allDrafts = processGrenades(draftData.data);
      likedGrenades = processGrenades(likedData.data);

      // Filter out drafts that have published versions
      const publishedDocumentIds = new Set(publishedGrenades.map(g => g.documentId));
      draftGrenades = allDrafts.filter(draft => !publishedDocumentIds.has(draft.documentId));

    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      isLoading = false;
    }
  }

  function processGrenades(data) {
    if (!data) return [];
    
    return data.map(grenadeData => {
      try {
        return {
          id: grenadeData.id,
          documentId: grenadeData.documentId,
          title: grenadeData.title || 'Untitled',
          author: grenadeData.user?.username || 'Unknown',
          userId: grenadeData.user?.id,
          likes: grenadeData.likes || 0,
          views: grenadeData.views || 0,
          type: grenadeData.type?.name || 'Unknown',
          map: grenadeData.map?.name || 'Unknown',
          team: grenadeData.team?.name || 'Unknown',
          image: grenadeData.thumbnail 
            ? `${STRAPI_URL}${grenadeData.thumbnail.url}` 
            : '/images/default.jpg',
          video: grenadeData.video ? {
            src: `${STRAPI_URL}${grenadeData.video.url}`,
            preview: grenadeData.thumbnail 
              ? `${STRAPI_URL}${grenadeData.thumbnail.url}` 
              : '/images/default.jpg'
          } : null,
          status: grenadeData.publishedAt ? 'published' : 'draft'
        };
      } catch (error) {
        console.error('Error processing grenade:', error);
        return null;
      }
    }).filter(Boolean);
  }

  // Handle tab changes - now just switches the view
  function handleTabChange(tab: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    goto(url.toString(), { replaceState: false });
  }

  // Expose loadAllData as a refresh function
  export async function refresh() {
    await loadAllData();
  }

  // Add visibility change handler
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && !pageVisible) {
      pageVisible = true;
      refresh();
    } else {
      pageVisible = false;
    }
  }

  // Subscribe to grenade store changes
  $: if ($grenadeStore.lastUpdate) {
    refresh();
  }

  // Only load data once on mount
  onMount(() => {
    if ($user) {
      loadAllData();
    }
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup listener on component destroy
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });
</script>

<div class="profile-page">
  {#if $user}
    <header class="profile-header">
      <div class="user-info">
        {#if $user?.avatar}
          <img src={$user.avatar} alt={$user.username} class="avatar" />
        {:else}
          <div class="avatar-placeholder">
            {$user?.username?.[0]?.toUpperCase()}
          </div>
        {/if}
        <div class="user-details">
          <h1>{$user?.username}</h1>
          <span class="steam-id">Steam ID: {$user?.steamId || 'Not connected'}</span>
        </div>
      </div>
    </header>

    <div class="tab-controls">
      <button 
        class="tab-btn" 
        class:active={activeTab === 'published'} 
        on:click={() => handleTabChange('published')}
      >
        Published
        <span class="count">{publishedGrenades.length}</span>
      </button>
      <button 
        class="tab-btn" 
        class:active={activeTab === 'drafts'} 
        on:click={() => handleTabChange('drafts')}
      >
        Drafts
        <span class="count">{draftGrenades.length}</span>
      </button>
      <button 
        class="tab-btn" 
        class:active={activeTab === 'liked'} 
        on:click={() => handleTabChange('liked')}
      >
        Liked
        <span class="count">{likedGrenades.length}</span>
      </button>
    </div>

    {#if isLoading}
      <div class="loading">Loading...</div>
    {:else}
      <div class="grenades-container" transition:fade>
        {#if activeTab === 'published'}
          <GrenadeGrid grenades={publishedGrenades} skipFetch={true} />
        {:else if activeTab === 'drafts'}
          <GrenadeGrid grenades={draftGrenades} skipFetch={true} />
        {:else if activeTab === 'liked'}
          <GrenadeGrid grenades={likedGrenades} skipFetch={true} />
        {/if}
      </div>
    {/if}
  {:else}
    <p>Please log in to view your profile.</p>
  {/if}
</div>

<style>
  .profile-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-6);
  }

  .profile-header {
    background: var(--color-surface);
    padding: var(--spacing-8);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-6);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
  }

  .avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-2xl);
    color: white;
  }

  .user-details h1 {
    margin: 0;
    font-size: var(--font-size-2xl);
    color: var(--color-text-primary);
  }

  .steam-id {
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
  }

  .tab-controls {
    display: flex;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-6);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--spacing-4);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-4);
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: var(--font-size-base);
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
  }

  .tab-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .tab-btn.active {
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .count {
    background: var(--color-surface);
    color: var(--color-text-secondary);
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
  }

  .tab-btn.active .count {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .loading {
    text-align: center;
    padding: var(--spacing-8);
    color: var(--color-text-secondary);
  }

  .grenades-container {
    min-height: 200px;
  }
</style> 