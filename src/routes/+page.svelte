<script>
  import GrenadeGrid from '$lib/components/GrenadeGrid.svelte';
  import Tooltip from '$lib/components/Tooltip.svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { sidebarWidth } from '$lib/stores/sidebar';
  import { fade, slide } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { searchTerm } from '$lib/stores/search';
  import { loadFilterData } from '$lib/stores/filters';
  import { filters } from '$lib/stores/filters';
  
  const STRAPI_URL = import.meta.env.VITE_STRAPI_URL;
  
  let isSearchOpen = false;
  let searchInput;
  let searchWidth = tweened(38, {
    duration: 200,
    easing: cubicOut
  });
  let headerVisible = false;
  let grenades = [];
  let isLoading = true;
  let showFilterMenu = false;
  let selectedSort = 'newest'; // default sort

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'a-z', label: 'Name (A-Z)' },
    { value: 'z-a', label: 'Name (Z-A)' }
  ];

  async function fetchGrenades() {
    try {
      const response = await fetch(`${STRAPI_URL}/api/grenades?status=published&populate=*`);
      const { data } = await response.json();
      
      grenades = data.map(grenade => ({
        id: grenade.id,
        documentId: grenade.documentId,
        title: grenade.title || 'Untitled',
        author: grenade.user?.username || 'Unknown',
        likes: grenade.likes || 0,
        views: grenade.views || 0,
        type: grenade.type?.name || 'Unknown',
        map: grenade.map?.name || 'Unknown',
        team: grenade.team?.name || 'Unknown',
        createdAt: grenade.createdAt,
        image: grenade.thumbnail 
          ? `${import.meta.env.VITE_STRAPI_URL}${grenade.thumbnail.url}` 
          : '/images/default.jpg',
        video: grenade.video ? {
          src: `${import.meta.env.VITE_STRAPI_URL}${grenade.video.url}`,
          preview: grenade.thumbnail 
            ? `${import.meta.env.VITE_STRAPI_URL}${grenade.thumbnail.url}` 
            : '/images/default.jpg'
        } : null
      }));
      
      // Initial sort by newest
      grenades.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      console.log('Processed grenades:', grenades); // Debug log
    } catch (error) {
      console.error('Error fetching grenades:', error);
    } finally {
      isLoading = false;
    }
  }

  onMount(async () => {
    setTimeout(() => {
      headerVisible = true;
    }, 100);
    
    await fetchGrenades();
  });

  function toggleSearch() {
    isSearchOpen = !isSearchOpen;
    searchWidth.set(isSearchOpen ? 238 : 38);
    
    if (isSearchOpen) {
      setTimeout(() => {
        searchInput?.focus();
      }, 50);
    }
  }

  function handleBlur(event) {
    if (!event.relatedTarget?.classList.contains('search-trigger')) {
      isSearchOpen = false;
      searchWidth.set(38);
    }
  }

  function handleSearchClick(event) {
    event.stopPropagation();
  }

  function handleSearch(event) {
    $searchTerm = event.target.value;
  }

  const getHeaderDelay = (index) => 200 + (index * 100);

  function handleSort(option) {
    selectedSort = option.value;
    showFilterMenu = false;
    
    // Sort the grenades array based on selection
    grenades = [...grenades].sort((a, b) => {
      switch(option.value) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'a-z':
          return a.title.localeCompare(b.title);
        case 'z-a':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  }

  // Close menu when clicking outside
  function handleClickOutside(event) {
    if (!event.target.closest('.filter-menu-container')) {
      showFilterMenu = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside}/>

<main class="content">
  <header class="header">
    <h1>{$filters.map}</h1>
    
    <div class="header-actions">
      {#if headerVisible}
        <div 
          class="header-action"
          style="animation-delay: {getHeaderDelay(0)}ms"
        >
          <div 
            class="search" 
            style="width: {$searchWidth}px"
            on:click={handleSearchClick}
          >
            <button 
              class="icon-button search-trigger"
              on:click={toggleSearch}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
            
            <input 
              bind:this={searchInput}
              type="text" 
              placeholder="Search grenades..." 
              class="search-input"
              class:search-input-visible={isSearchOpen}
              on:blur={handleBlur}
              on:input={handleSearch}
            />
          </div>
        </div>

        <div 
          class="header-action filter-menu-container"
          style="animation-delay: {getHeaderDelay(1)}ms"
        >
          <button 
            class="icon-button"
            class:active={showFilterMenu}
            on:click|stopPropagation={() => showFilterMenu = !showFilterMenu}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
            </svg>
          </button>

          {#if showFilterMenu}
            <div 
              class="filter-menu"
              transition:fade={{ duration: 100 }}
              on:click|stopPropagation
            >
              <div class="category-header">Sort By</div>
              {#each sortOptions as option}
                <button 
                  class="filter-option" 
                  class:active={selectedSort === option.value}
                  on:click={() => handleSort(option)}
                >
                  <span class="item-icon">
                    {#if option.value.includes('newest') || option.value.includes('oldest')}
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20V10"/>
                        <path d="M18 20V4"/>
                        <path d="M6 20v-4"/>
                      </svg>
                    {:else}
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      </svg>
                    {/if}
                  </span>
                  {option.label}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </header>

  {#if isLoading}
    <div class="loading">Loading grenades...</div>
  {:else}
    <GrenadeGrid {grenades} skipFetch={true} />
  {/if}
</main>

<style>
  .content {
    background-color: var(--color-background);
    min-width: 0;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-8);
    padding: 0;
    width: 100%;
    position: relative;
    z-index: var(--z-header);
  }

  h1 {
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-semibold);
    margin: 0;
    white-space: nowrap;
    letter-spacing: -0.5px;
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

  .header-actions {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
  }

  .search {
    position: relative;
    display: flex;
    align-items: center;
    overflow: hidden;
    border-radius: var(--radius-md);
    background: var(--color-surface);
    border: none;
  }

  .icon-button {
    background: var(--color-surface);
    border: none;
    color: var(--color-text-secondary);
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

  .header-actions > .icon-button {
    background: var(--color-surface);
    border: none;
    border-radius: var(--radius-md);
  }

  .search-trigger {
    position: relative;
    z-index: 2;
    border-radius: var(--radius-md);
    background: var(--color-surface);
    width: 38px;
    height: 38px;
  }

  .search-input {
    position: absolute;
    left: 0;
    top: 0;
    background-color: var(--color-surface);
    border: none;
    color: var(--color-text-primary);
    padding: 0 var(--spacing-4) 0 46px;
    height: 38px;
    font-size: var(--font-size-base);
    width: 100%;
    opacity: 0;
    pointer-events: none;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
  }

  .search-input-visible {
    opacity: 1;
    pointer-events: auto;
    visibility: visible;
  }

  .search-input:focus {
    outline: none;
    box-shadow: none;
  }

  .search-input:focus-visible {
    outline: none;
    box-shadow: none;
  }

  .search-input::placeholder {
    color: var(--color-text-secondary);
  }

  /* Responsive adjustments */
  @media (max-width: 1200px) {
    .container {
      grid-template-columns: var(--sidebar-width) 1fr var(--user-section-width);
    }
  }

  @media (max-width: 1024px) {
    .container {
      grid-template-columns: 240px 1fr;
    }
  }

  @media (max-width: 768px) {
    .container {
      grid-template-columns: 1fr;
    }

    .header {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-4);
    }

    .header-actions {
      justify-content: flex-end;
    }

    .search {
      flex: 1;
    }

    .search-input {
      width: calc(100% - 42px);
    }
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

  .loading {
    text-align: center;
    padding: var(--spacing-8);
    color: var(--color-text-secondary);
  }

  .filter-menu-container {
    position: relative;
  }

  .filter-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    min-width: 200px;
    box-shadow: 0 0px 32px 0px rgb(0 0 0 / 0.25);
    z-index: var(--z-tooltip);
    padding: var(--spacing-1);
  }

  .category-header {
    padding: var(--spacing-2) var(--spacing-3);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 500;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: var(--spacing-1);
  }

  .filter-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    width: 100%;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: var(--font-size-base);
    transition: all 0.2s;
    border-radius: var(--radius-md);
    text-align: left;
  }

  .filter-option:hover,
  .filter-option.active {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .filter-option .item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    color: inherit;
  }

  .icon-button.active {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }
</style>
