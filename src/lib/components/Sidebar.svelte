<script>
  import Tooltip from './Tooltip.svelte';
  import SubmitGrenadeModal from './SubmitGrenadeModal.svelte';
  import { sidebarWidth } from '$lib/stores/sidebar';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createEventDispatcher } from 'svelte';
  import { filters } from '$lib/stores/filters';
  const dispatch = createEventDispatcher();
  
  const STRAPI_URL = import.meta.env.VITE_STRAPI_URL;
  
  // Add state for maps data
  let mapsByCategory = [];
  let isLoading = true;

  // Add teams state
  let teams = [];

  // Add state for grenade types
  let grenadeTypes = [];

  // Add state for collections
  let collections = [];

  // Add this near the top of the script section
  let isMinimized = false;
  
  onMount(() => {
    // Get the stored sidebar state, default to 'true' (minimized) if not set
    const storedState = localStorage.getItem('sidebarMinimized');
    isMinimized = storedState === null ? true : storedState === 'true';
    
    // Set initial width based on state
    sidebarWidth.set(isMinimized ? '72px' : '240px');
  });

  function toggleSidebar() {
    isMinimized = !isMinimized;
    // Store the new state
    localStorage.setItem('sidebarMinimized', isMinimized);
    sidebarWidth.set(isMinimized ? '72px' : '240px');
  }

  // Fetch maps data on mount
  onMount(async () => {
    try {
      // Fetch maps
      const mapsResponse = await fetch(`${STRAPI_URL}/api/maps?populate=*`);
      const mapsData = await mapsResponse.json();
      
      // Fetch teams
      const teamsResponse = await fetch(`${STRAPI_URL}/api/teams?populate=*`);
      const teamsData = await teamsResponse.json();

      // Fetch grenade types
      const typesResponse = await fetch(`${STRAPI_URL}/api/types?populate=*`);
      const typesData = await typesResponse.json();

      // Fetch collections
      const collectionsResponse = await fetch(`${STRAPI_URL}/api/collections?populate=*`);
      const collectionsData = await collectionsResponse.json();
      
      // Process collections data
      collections = collectionsData.data.map(collection => ({
        name: collection.name,
        value: collection.value,
        icon: collection.icon || null
      })).sort((a, b) => {
        // Define the custom order using the API value field
        const order = {
          'NO_COLLECTION': 0,
          'LIKED': 1
        };
        
        // Use the order object to determine sort position
        // Collections not in the order object will be sorted alphabetically after the ordered ones
        const orderA = order[a.value] ?? 999;
        const orderB = order[b.value] ?? 999;
        
        if (orderA === orderB) {
          // If both items are not in the order object, sort alphabetically
          return a.name.localeCompare(b.name);
        }
        return orderA - orderB;
      });

      // Process teams data
      teams = teamsData.data.map(team => ({
        name: team.name,
        value: team.value,
        icon: team.icon || null
      })).sort((a, b) => {
        // Custom sort order: Both Teams first, then CT, then T
        const order = { 'Both Teams': 0, 'Counter-Terrorists': 1, 'Terrorists': 2 };
        return order[a.name] - order[b.name];
      });

      // Process grenade types data and sort them
      grenadeTypes = typesData.data.map(type => ({
        name: type.name,
        value: type.value,
        icon: type.icon || null,
        count: grenadeCounts[type.name] || 0
      })).sort((a, b) => {
        // Define the custom order using the API value field
        const order = {
          'ALL_GRENADES': 0,
          'SMOKE': 1,
          'MOLOTOV': 2,
          'FLASH': 3,
          'HE': 4,
          'DECOY': 5
        };
        
        // Use the order object to determine sort position
        return (order[a.value] ?? 999) - (order[b.value] ?? 999);
      });

      // Group maps by category
      const groupedMaps = mapsData.data.reduce((acc, map) => {
        const category = map.category?.name || 'Uncategorized';
        
        if (!acc.find(g => g.category === category)) {
          acc.push({
            category: category,
            maps: []
          });
        }

        const group = acc.find(g => g.category === category);
        group.maps.push({
          name: map.name,
          icon: map.icon || null
        });

        return acc;
      }, []);

      // Sort maps within each category
      groupedMaps.forEach(group => {
        group.maps.sort((a, b) => a.name.localeCompare(b.name));
      });

      // Sort categories with custom order: General first, Active Duty second, Reserve third, Community fourth, then others
      groupedMaps.sort((a, b) => {
        const categoryOrder = {
          'General': 0,
          'Active Duty': 1,
          'Reserve': 2,
          'Community': 3
        };
        
        const orderA = categoryOrder[a.category] !== undefined ? categoryOrder[a.category] : 4;
        const orderB = categoryOrder[b.category] !== undefined ? categoryOrder[b.category] : 4;
        
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        
        return a.category.localeCompare(b.category);
      });

      mapsByCategory = groupedMaps;
      isLoading = false;
    } catch (error) {
      console.error('Error fetching data:', error);
      isLoading = false;
    }
  });

  const grenadeCounts = {
    'Smoke Grenade': 67,
    'Molotov': 14,
    'Flashbang': 14,
    'High Explosive Grenade': 7,
    'Decoy Grenade': 0
  };

  // Update navigationItems to use collections
  $: navigationItems = [
    {
      title: 'MAPS',
      items: mapsByCategory
    },
    {
      title: 'TEAMS',
      items: teams
    },
    {
      title: 'GRENADES',
      items: grenadeTypes
    },
    {
      title: 'COLLECTIONS',
      items: collections
    },
    {
      title: 'RESET',
      items: []
    }
  ];

  // Track active selection for each category
  let activeSelections = {
    'MAPS': 'All Maps',
    'TEAMS': 'Both Teams',
    'GRENADES': 'All Grenades',
    'COLLECTIONS': 'No Collection',
    'RESET': 'Reset Filters'
  };

  let activeSubmenu = null;

  // Add this to handle animation delays
  const getAnimationDelay = (index) => `${200 + (index * 50)}ms`;

  // Add modal state
  let showSubmitModal = false;

  function toggleSubmenu(title, event) {
    // Prevent click from propagating to document
    if (event) {
      event.stopPropagation();
    }
    
    // If we're clicking the same submenu that's already open, close it
    if (activeSubmenu === title) {
      activeSubmenu = null;
      return;
    }
    
    // Close any other open submenu first
    activeSubmenu = null;
    
    // Small delay to ensure tooltip is closed before opening submenu
    setTimeout(() => {
      activeSubmenu = title;
    }, 50);
  }

  // Close submenu when clicking outside
  function handleClickOutside(event) {
    // Check if event.target is a DOM element
    if (event.target instanceof Element) {
      if (!event.target.closest('.nav-item')) {
        activeSubmenu = null;
      }
    }
  }

  function selectItem(category, itemName) {
    activeSelections[category] = itemName;
    activeSubmenu = null;
    
    // Update the filters store
    filters.update(current => {
      switch(category) {
        case 'MAPS':
          return { ...current, map: itemName };
        case 'TEAMS':
          return { ...current, team: itemName };
        case 'GRENADES':
          return { ...current, grenade: itemName };
        case 'COLLECTIONS':
          return { ...current, collection: itemName };
        default:
          return current;
      }
    });
  }

  // Add this function to handle logo clicks
  function handleLogoClick() {
    goto('/');
  }

  function resetFilters() {
    activeSelections = {
      'MAPS': 'All Maps',
      'TEAMS': 'Both Teams',
      'GRENADES': 'All Grenades',
      'COLLECTIONS': 'No Collection',
      'RESET': 'Reset Filters'
    };
    filters.set({
      map: 'All Maps',
      team: 'Both Teams',
      grenade: 'All Grenades',
      collection: 'No Collection'
    });
    activeSubmenu = null;
  }

  // Make sure filters store is initialized with default values
  onMount(() => {
    filters.set({
      map: 'All Maps',
      team: 'Both Teams',
      grenade: 'All Grenades',
      collection: 'No Collection'
    });
  });

  // Add this helper function at the top of your script section
  function findMapIcon(mapsByCategory, mapName) {
    for (const category of mapsByCategory) {
      for (const map of category.maps) {
        if (map.name === mapName) {
          return map.icon || '';
        }
      }
    }
    return '';
  }

  // Add this reactive statement near the top of your script section
  $: currentIcon = (section, activeSelection) => {
    if (section.title === 'MAPS') {
      if (activeSelection === 'All Maps') {
        return mapsByCategory[0]?.maps[0]?.icon || '';
      }
      return findMapIcon(mapsByCategory, activeSelection);
    } else if (section.title === 'RESET') {
      return `<svg id="icon_reset" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20.3 14">
        <path fill="currentColor" fill-rule="evenodd" d="M20.3,11V3c0-1.7-1.3-3-3-3H6.5c-.9,0-1.7.4-2.3,1-.8,1-2.4,2.8-3.5,4-1,1.1-1,2.8,0,4,1.1,1.2,2.7,3,3.5,4,.6.7,1.4,1,2.3,1h10.8c1.7,0,3-1.3,3-3ZM9.9,7l-1.3,1.3c-.4.4-.4,1,0,1.4.4.4,1,.4,1.4,0l1.3-1.3,1.3,1.3c.4.4,1,.4,1.4,0,.4-.4.4-1,0-1.4l-1.3-1.3,1.3-1.3c.4-.4.4-1,0-1.4-.4-.4-1-.4-1.4,0l-1.3,1.3-1.3-1.3c-.4-.4-1-.4-1.4,0-.4.4-.4,1,0,1.4l1.3,1.3Z"/>
      </svg>`;
    } else {
      return section.items.find(item => item.name === activeSelection)?.icon || '';
    }
  };
</script>

<svelte:window on:click={handleClickOutside}/>

<aside class="sidebar" class:minimized={isMinimized}>
  <div class="sidebar-header">
    <div class="chevron-container">
      <Tooltip text={isMinimized ? "Expand Sidebar" : "Collapse Sidebar"} position="right">
        <button class="toggle-button" on:click={toggleSidebar}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="3" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            style="transform: rotate({isMinimized ? 180 : 0}deg)"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </Tooltip>
    </div>
    <div class="logo-wrapper" on:click={handleLogoClick} role="button" tabindex="0">
      {#if isMinimized}
        <img src="/images/logo_valve_minimal.svg" alt="CS Grenade Hub Logo" class="logo-minimal" />
      {:else}
        <img src="/images/logo_valve.svg" alt="CS Grenade Hub Logo" class="logo-full" />
      {/if}
    </div>
  </div>

  <nav class="navigation">
    {#each navigationItems as section, i}
      <div 
        class="nav-item"
        style="animation-delay: {getAnimationDelay(i)}"
        on:click={(e) => {
          if (section.title === 'RESET') {
            resetFilters();
          } else {
            toggleSubmenu(section.title, e);
          }
        }}
        class:has-active-submenu={activeSubmenu === section.title}
        data-selected={
          section.title === 'MAPS' ? activeSelections['MAPS'] !== 'All Maps' :
          section.title === 'TEAMS' ? activeSelections['TEAMS'] !== 'Both Teams' :
          section.title === 'GRENADES' ? activeSelections['GRENADES'] !== 'All Grenades' :
          section.title === 'COLLECTIONS' ? activeSelections['COLLECTIONS'] !== 'No Collection' :
          false
        }
      >
        {#if isMinimized}
          <Tooltip text={section.title === 'RESET' ? 'Reset Filters' : section.title.charAt(0) + section.title.slice(1).toLowerCase()} position="right">
            <div class="nav-item-button">
              <span class="section-icon">
                {@html currentIcon(section, activeSelections[section.title])}
              </span>
            </div>
          </Tooltip>
        {:else}
          <div class="nav-item-button">
            <span class="section-icon">
              {@html currentIcon(section, activeSelections[section.title])}
            </span>
            <span class="active-selection text-truncate">
              {activeSelections[section.title]}
            </span>
            {#if section.title === 'GRENADES' && section.items.find(item => item.name === activeSelections[section.title])?.count}
              <span class="count">
                {section.items.find(item => item.name === activeSelections[section.title]).count}
              </span>
            {/if}
          </div>
        {/if}

        {#if activeSubmenu === section.title}
          <div 
            class="submenu"
            on:click={(e) => e.stopPropagation()}
          >
            {#if section.title === 'MAPS'}
              <ul>
                {#if isLoading}
                  <li class="loading">Loading maps...</li>
                {:else}
                  {#each mapsByCategory as category}
                    <li class="category-header">{category.category}</li>
                    {#each category.maps as map}
                      <li 
                        class:active={activeSelections[section.title] === map.name}
                        on:click={() => selectItem(section.title, map.name)}
                      >
                        {#if map.icon}
                          <span class="item-icon">
                            {@html map.icon}
                          </span>
                        {:else}
                          <span class="item-icon"></span>
                        {/if}
                        {map.name}
                      </li>
                    {/each}
                  {/each}
                {/if}
              </ul>
            {:else}
              <ul>
                <li class="category-header">
                  {#if section.title === 'GRENADES'}
                    Grenades
                  {:else if section.title === 'TEAMS'}
                    Teams
                  {:else if section.title === 'COLLECTIONS'}
                    Collections
                  {/if}
                </li>
                {#each section.items as item}
                  <li 
                    class:active={activeSelections[section.title] === item.name}
                    on:click={() => selectItem(section.title, item.name)}
                  >
                    <span class="item-icon">
                      {#if item.icon}
                        {@html item.icon}
                      {/if}
                    </span>
                    <span class="item-name text-truncate">{item.name}</span>
                    {#if item.count !== undefined}
                      <span class="count">{item.count}</span>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </nav>

  <div class="submit-button-container">
    {#if isMinimized}
      <Tooltip text="Submit Grenade" position="right">
        <button 
          class="submit-button" 
          class:minimized={isMinimized}
          on:click={(e) => {
            e.stopPropagation();
            showSubmitModal = true;
          }}
        >
          <span>+</span>
        </button>
      </Tooltip>
    {:else}
      <button 
        class="submit-button" 
        class:minimized={isMinimized}
        on:click={(e) => {
          e.stopPropagation();
          showSubmitModal = true;
        }}
      >
        Submit Grenade
      </button>
    {/if}
  </div>

  {#if showSubmitModal}
    <SubmitGrenadeModal 
      show={showSubmitModal}
      on:close={() => showSubmitModal = false}
    />
  {/if}
</aside>

<style>
  /* Keyframes */
  @keyframes scaleIn {
    0% {
      transform: scale(0.8);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes submenuFadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes submenuFadeOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-4px);
    }
  }

  @keyframes submenuItemFadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Sidebar */
  .sidebar {
    background-color: var(--color-surface);
    border-right: 1px solid var(--color-border);
    padding: var(--spacing-2);
    height: 100vh;
    display: flex;
    flex-direction: column;
    width: 240px;
    position: sticky;
    top: 0;
    left: 0;
    z-index: 10;
    transition: width 0.3s ease;
  }

  .sidebar.minimized {
    width: 72px;
  }

  /* Sidebar Header */
  .sidebar-header {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-bottom: var(--spacing-4);
    padding: var(--spacing-2);
  }

  .chevron-container {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    margin-bottom: var(--spacing-4);
  }

  .minimized .chevron-container {
    justify-content: center;
  }

  .toggle-button {
    background-color: var(--color-surface-active);
    border: none;
    border-radius: 0; /* var(--radius-md) */
    color: var(--color-text-primary);
    cursor: pointer;
    padding: var(--spacing-2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .logo-wrapper {
    margin-top: var(--spacing-2);
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .logo-wrapper:hover {
    transform: scale(1.02);
  }

  .logo-wrapper:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: var(--radius-md);
  }

  .logo-wrapper:focus:not(:focus-visible) {
    outline: none;
  }

  .logo-full,
  .logo-minimal {
    height: 32px;
    width: auto;
    transition: transform 0.3s ease;
    animation: scaleIn 0.3s ease forwards;
  }

  .sidebar:not(.minimized) .logo-full {
    animation: scaleIn 0.3s ease forwards;
  }

  .minimized .logo-minimal {
    animation: scaleIn 0.3s ease forwards;
  }

  .logo-full:hover,
  .logo-minimal:hover {
    transform: scale(1.05);
  }

  .logo {
    display: none;
  }

  .logo-minimal-wrapper {
    display: none;
  }

  .logo-minimal {
    height: 34px !important;
    width: auto !important;
  }

  /* Navigation */
  .navigation {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--spacing-1);
    padding: var(--spacing-4) var(--spacing-2);
  }

  /* Nav item */
  .nav-item {
    position: relative;
    width: 100%;
    opacity: 0;
    transform: translateY(10px);
    animation: fadeIn 0.3s ease forwards;
    cursor: pointer;
    border-radius: var(--radius-md);
    padding: var(--spacing-2) var(--spacing-3);
  }

  .nav-item:hover {
    background-color: var(--color-surface-hover);
  }

  .nav-item[data-selected="true"] .section-icon {
    color: var(--color-text-primary);
  }

  .nav-item:hover .section-icon {
    color: var(--color-text-primary);
  }

  .nav-item:last-child {
    margin-top: var(--spacing-4);
  }

  /* When minimized */
  .minimized .nav-item {
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: slideInMinimized 0.3s ease forwards;
  }

  @keyframes slideInMinimized {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Nav item button/content */
  .nav-item-button {
    padding: var(--spacing-1);
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    width: 100%;
  }

  .nav-item-content {
    padding: var(--spacing-2);
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    background-color: var(--color-surface);
  }

  .nav-item-content:hover {
    background-color: var(--color-surface-hover);
  }

  .minimized .nav-item-button {
    padding: 0;
    height: 42px;
    width: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    border-radius: var(--radius-md);
  }

  /* Icons */
  .section-icon,
  .item-icon {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    transition: color 0.2s ease;
  }

  .section-icon :global(svg),
  .item-icon :global(svg) {
    width: 18px;
    height: 18px;
    color: inherit;
    fill: currentColor !important;
    stroke: none !important;
  }

  /* Hover and active states for icons */
  .submenu li:hover .item-icon,
  .submenu li.active .item-icon,
  .nav-item:hover .section-icon,
  .nav-item.has-active-submenu .section-icon {
    color: var(--color-text-primary);
  }

  /* Submenu */
  .submenu {
    position: absolute;
    left: calc(100% - -8px);
    top: -4px;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    min-width: 200px;
    box-shadow: 0 0px 32px 0px rgb(0 0 0 / 0.25);
    z-index: 9999;
    opacity: 0;
    transform: translateY(-4px);
    animation: submenuFadeIn 0.25s ease forwards;
  }

  .submenu.closing {
    animation: submenuFadeOut 0.25s ease forwards;
  }

  .submenu ul {
    padding: var(--spacing-1);
    max-height: 400px;
    overflow-y: auto;
    scrollbar-gutter: stable;
  }

  /* Scrollbar styling */
  .submenu ul::-webkit-scrollbar {
    width: 8px;
  }

  .submenu ul::-webkit-scrollbar-track {
    background: transparent;
  }

  .submenu ul::-webkit-scrollbar-thumb {
    background-color: var(--color-border);
    border-radius: 4px;
  }

  .submenu ul {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    transition: scrollbar-color 0.3s;
  }

  .submenu ul:hover,
  .submenu ul:focus,
  .submenu ul:active {
    scrollbar-color: var(--color-border) transparent;
  }

  .submenu li {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    color: var(--color-text-secondary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
    font-size: var(--font-size-sm);
    width: 100%;
    opacity: 0;
    transform: translateY(10px);
    animation: submenuItemFadeIn 0.3s ease forwards;
  }

  .submenu li:hover {
    background-color: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .submenu li.active {
    background-color: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .submenu li.category-header {
    opacity: 1;
    transform: none;
    animation: none;
    cursor: default;
    user-select: none;
    background-color: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    margin-top: var(--spacing-1);
    padding: var(--spacing-2) var(--spacing-3);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .category-header:first-child {
    margin-top: 0;
  }

  /* Staggered animation for submenu items */
  .submenu li:nth-child(1) { animation-delay: 0.05s; }
  .submenu li:nth-child(2) { animation-delay: 0.1s; }
  .submenu li:nth-child(3) { animation-delay: 0.15s; }
  .submenu li:nth-child(4) { animation-delay: 0.2s; }
  .submenu li:nth-child(5) { animation-delay: 0.25s; }
  .submenu li:nth-child(6) { animation-delay: 0.3s; }
  .submenu li:nth-child(7) { animation-delay: 0.35s; }
  .submenu li:nth-child(8) { animation-delay: 0.4s; }
  .submenu li:nth-child(9) { animation-delay: 0.45s; }
  .submenu li:nth-child(10) { animation-delay: 0.5s; }

  /* Text truncation */
  .text-truncate {
    max-width: 120px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-block;
  }

  .item-name {
    flex: 1;
    min-width: 0;
  }

  /* Counts */
  .count {
    margin-left: auto;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    min-width: 24px;
    text-align: right;
  }

  /* Loading state */
  .loading {
    color: var(--color-text-secondary);
    padding: var(--spacing-3);
    text-align: center;
    user-select: text;
  }

  /* Submit button */
  .submit-button-container {
    margin-top: auto;
    padding: var(--spacing-2);
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .submit-button {
    background-color: var(--color-primary);
    border: none;
    border-radius: 0; /* var(--radius-md) */
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    overflow: hidden;
    height: 42px;
    white-space: nowrap;
  }

  .sidebar:not(.minimized) .submit-button {
    width: 100%;
    padding: 0 var(--spacing-4);
  }

  .minimized .submit-button {
    width: 36px;
    height: 36px;
    padding: 0;
  }

  /* User selection disable */
  .nav-item,
  .nav-item-content,
  .item-name,
  .active-selection,
  .submenu li,
  .count {
    user-select: none;
  }

  /* Tooltip adjustments for minimized */
  :global(.minimized .nav-item-button .tooltip) {
    margin-left: var(--spacing-4);
    font-size: var(--font-size-base);
  }

  /* Ensure submenu positioning in minimized state */
  .minimized .submenu {
    left: calc(100% - -8px);
    top: 0;
  }

  /* Add this style for the active-selection text */
  .active-selection {
    color: var(--color-text-secondary);
    transition: color 0.2s ease;
  }

  /* Update hover and active states to include the text */
  .nav-item:hover .active-selection,
  .nav-item.has-active-submenu .active-selection,
  .nav-item[data-selected="true"] .active-selection {
    color: var(--color-text-primary);
  }
</style>
