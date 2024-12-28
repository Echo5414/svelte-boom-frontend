<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth';
  import { mapOptions, teamOptions, grenadeTypes } from '$lib/stores/filters';
  import { notifyGrenadeChange } from '$lib/stores/grenades';
  const dispatch = createEventDispatcher();

  export let show = false;

  let isPublic = true;
  let isLoading = false;

  // Initialize empty arrays for data
  let maps = [];
  let teams = [];
  let types = [];
  let movements = [];
  let techniques = [];
  let precisions = [];

  // Only fetch data when modal is shown
  $: if (show && !maps.length) {
    console.log('Fetching form data...');
    Promise.all([
      fetchMaps(),
      fetchTeams(),
      fetchTypes(),
      fetchMovements(),
      fetchTechniques(),
      fetchPrecisions()
    ]).then(() => {
      console.log('Form data loaded successfully');
    }).catch(error => {
      console.error('Error loading form data:', error);
    });
  }

  type Team = 'CT' | 'T';
  type GrenadeType = 'DECOY' | 'FLASH' | 'HE' | 'MOLOTOV' | 'SMOKE';
  type Technique = 'JUMPTHROW' | 'LEFT_CLICK' | 'RIGHT_CLICK';
  type Movement = 'CROUCH' | 'RUNNING' | 'STANDING' | 'WALKING';
  type Precision = 'MODERATE' | 'NOT_PRECISE' | 'VERY_PRECISE';

  interface FormData {
    title: string;
    team: Team;
    type: GrenadeType;
    technique: Technique;
    movement: Movement;
    precision: Precision;
    map: string;
    airTime: string;
    position: string;
    thumbnail: File | null;
    lineup: File | null;
    video: File | null;
  }

  let formData: FormData = {
    title: '',
    team: '',
    type: '',
    technique: '',
    movement: '',
    precision: '',
    map: '',
    airTime: '',
    position: '',
    thumbnail: null,
    lineup: null,
    video: null,
  };

  // Add these variables to handle custom select
  let dropdownStates = {
    team: false,
    technique: false,
    movement: false,
    precision: false,
    map: false,
    type: false
  };

  const STRAPI_URL = import.meta.env.VITE_STRAPI_URL;

  // Interface für die Maps
  interface MapData {
    id: number;
    documentId: string;
    name: string;
  }

  interface TeamData {
    id: number;
    documentId: string;
    name: string;
    value: string;
  }

  interface MovementData {
    id: number;
    documentId: string;
    name: string;
    value: string;
  }

  interface TechniqueData {
    id: number;
    documentId: string;
    name: string;
    value: string;
  }

  interface PrecisionData {
    id: number;
    documentId: string;
    name: string;
    value: string;
  }

  interface TypeData {
    id: number;
    documentId: string;
    name: string;
    value: string;
  }

  async function fetchMaps() {
    try {
      const response = await fetch(`${STRAPI_URL}/api/maps?fields[0]=name&fields[1]=id&fields[2]=documentId`);
      const data = await response.json();
      
      maps = data.data.map((map: MapData) => ({
        id: map.id,
        documentId: map.documentId,
        value: map.documentId,
        label: map.name
      })).sort((a, b) => a.label.localeCompare(b.label));
    } catch (error) {
      console.error('Error fetching maps:', error);
    }
  }

  async function fetchTeams() {
    try {
      const response = await fetch(`${STRAPI_URL}/api/teams?fields[0]=name&fields[1]=documentId&fields[2]=id`);
      const data = await response.json();
      
      teams = data.data.map((team: TeamData) => ({
        id: team.id,
        documentId: team.documentId,
        value: team.id.toString(),
        label: team.name
      })).sort((a, b) => a.label.localeCompare(b.label));
      
      console.log('Fetched teams:', teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }

  async function fetchTypes() {
    try {
      const response = await fetch(`${STRAPI_URL}/api/types?fields[0]=name&fields[1]=value&fields[2]=documentId&fields[3]=id`);
      const data = await response.json();
      
      console.log('Raw types data:', data);
      
      types = data.data.map((type: TypeData) => ({
        id: type.id,
        documentId: type.documentId,
        value: type.documentId,
        label: type.name
      })).sort((a, b) => a.label.localeCompare(b.label));
      
      console.log('Processed types:', types);
    } catch (error) {
      console.error('Error fetching types:', error);
    }
  }

  async function fetchMovements() {
    try {
      const response = await fetch(`${STRAPI_URL}/api/movements?fields[0]=name&fields[1]=value&fields[2]=id&fields[3]=documentId`);
      const data = await response.json();
      
      movements = data.data.map((movement: MovementData) => ({
        id: movement.id,
        documentId: movement.documentId,
        value: movement.value,
        label: movement.name
      })).sort((a, b) => a.label.localeCompare(b.label));
      
      console.log('Fetched movements:', movements);
    } catch (error) {
      console.error('Error fetching movements:', error);
    }
  }

  async function fetchTechniques() {
    try {
      const response = await fetch(`${STRAPI_URL}/api/techniques?fields[0]=name&fields[1]=value&fields[2]=id&fields[3]=documentId`);
      const data = await response.json();
      
      techniques = data.data.map((technique: TechniqueData) => ({
        id: technique.id,
        documentId: technique.documentId,
        value: technique.value,
        label: technique.name
      })).sort((a, b) => a.label.localeCompare(b.label));
      
      console.log('Fetched techniques:', techniques);
    } catch (error) {
      console.error('Error fetching techniques:', error);
    }
  }

  async function fetchPrecisions() {
    try {
      const response = await fetch(`${STRAPI_URL}/api/precisions?fields[0]=name&fields[1]=value&fields[2]=id&fields[3]=documentId`);
      const data = await response.json();
      
      precisions = data.data.map((precision: PrecisionData) => ({
        id: precision.id,
        documentId: precision.documentId,
        value: precision.value,
        label: precision.name
      })).sort((a, b) => a.label.localeCompare(b.label));
      
      console.log('Fetched precisions:', precisions);
    } catch (error) {
      console.error('Error fetching precisions:', error);
    }
  }

  // Interface für die API-Optionen
  interface ApiOptions {
    teams: Array<{ value: string, label: string }>;
    types: Array<{ value: string, label: string }>;
    techniques: Array<{ value: string, label: string }>;
    movements: Array<{ value: string, label: string }>;
    precisions: Array<{ value: string, label: string }>;
    maps: Array<{ value: string, label: string }>;
  }

  let options: ApiOptions = {
    teams: [],
    types: [],
    techniques: [],
    movements: [],
    precisions: [],
    maps: []
  };

  onMount(async () => {
    await Promise.all([
      fetchMaps()
    ]);
  });

  async function uploadMedia(file: File, field: string) {
    const formData = new FormData();
    formData.append('files', file);
    
    // Get JWT from localStorage
    const jwt = localStorage.getItem('jwt');
    if (!jwt) {
      throw new Error('Authentication token not found');
    }
    
    try {
      const response = await fetch(`${STRAPI_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}` // Add the authorization header
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Upload error for ${field}:`, errorData);
        throw new Error(`Failed to upload ${field}: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Upload success for ${field}:`, data);
      
      if (!data || !data[0] || !data[0].id) {
        throw new Error(`Invalid response format for ${field} upload`);
      }
      
      return data[0].id;
    } catch (error) {
      console.error(`Error uploading ${field}:`, error);
      throw error;
    }
  }

  let isSubmitting = false;
  let error = null;

  async function handleSubmit() {
    isSubmitting = true;
    error = null;
    
    try {
      // Check which required fields are missing
      const missingFields = [];
      
      if (!formData.title) missingFields.push('Title');
      if (!formData.map) missingFields.push('Map');
      if (!formData.team) missingFields.push('Team');
      if (!formData.type) missingFields.push('Grenade Type');
      if (!formData.technique) missingFields.push('Technique');
      if (!formData.movement) missingFields.push('Movement');
      if (!formData.precision) missingFields.push('Precision');
      if (!formData.position) missingFields.push('Position');
      if (!formData.thumbnail) missingFields.push('Thumbnail');
      if (!formData.lineup) missingFields.push('Lineup');
      
      if (missingFields.length > 0) {
        throw new Error(`Please fill in the following fields: ${missingFields.join(', ')}`);
      }

      // Upload media files first
      const [thumbnailId, lineupId, videoId] = await Promise.all([
        formData.thumbnail ? uploadMedia(formData.thumbnail, 'thumbnail') : null,
        formData.lineup ? uploadMedia(formData.lineup, 'lineup') : null,
        formData.video ? uploadMedia(formData.video, 'video') : null
      ]);

      // Get the current user from the store
      let currentUser;
      user.subscribe(value => {
        currentUser = value;
      })();

      if (!currentUser) {
        throw new Error('You must be logged in to submit grenades');
      }

      // Prepare the grenade data
      const grenadeData = {
        data: {
          title: formData.title,
          type: { 
            connect: [{ 
              documentId: types.find(t => t.value === formData.type)?.documentId 
            }]
          },
          team: { 
            connect: [{ 
              documentId: teams.find(t => t.value === formData.team)?.documentId 
            }]
          },
          airtime: formData.airTime ? parseFloat(formData.airTime) : 0,
          precision: { 
            connect: [{ 
              documentId: precisions.find(p => p.value === formData.precision)?.documentId 
            }]
          },
          technique: { 
            connect: [{ 
              documentId: techniques.find(t => t.value === formData.technique)?.documentId 
            }]
          },
          movement: { 
            connect: [{ 
              documentId: movements.find(m => m.value === formData.movement)?.documentId 
            }]
          },
          position: formData.position,
          likes: 0,
          views: 0,
          public: isPublic,
          map: { 
            connect: [{ 
              documentId: maps.find(m => m.value === formData.map)?.documentId 
            }]
          },
          thumbnail: thumbnailId,
          lineup: lineupId,
          ...(videoId && { video: videoId }),
          user: {
            connect: [{ id: currentUser.id }]
          }
        }
      };

      // Get JWT from localStorage
      const jwt = localStorage.getItem('jwt');
      if (!jwt) {
        throw new Error('Authentication token not found');
      }

      // Submit the grenade data with authorization header
      const response = await fetch(`${STRAPI_URL}/api/grenades?status=draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}` // Add the authorization header
        },
        body: JSON.stringify(grenadeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      closeModal();
      dispatch('success', result);
      notifyGrenadeChange();
    } catch (err) {
      console.error('Submission error:', err);
      error = err.message;
    } finally {
      isSubmitting = false;
    }
  }

  // Add state for file names
  let fileNames = {
    thumbnail: '',
    lineup: '',
    video: ''
  };

  let uploadingFiles = {
    thumbnail: false,
    lineup: false,
    video: false
  };

  async function handleFileChange(event: Event, type: 'thumbnail' | 'lineup' | 'video') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      uploadingFiles[type] = true;
      formData[type] = input.files[0];
      fileNames[type] = input.files[0].name;
      uploadingFiles[type] = false;
    }
  }

  function closeModal() {
    dispatch('close');
  }

  function toggleDropdown(type: keyof typeof dropdownStates) {
    // Close all dropdowns first
    Object.keys(dropdownStates).forEach(key => {
      if (key !== type) {
        dropdownStates[key] = false;
      }
    });
    
    // Toggle the selected dropdown
    dropdownStates[type] = !dropdownStates[type];
  }

  async function selectOption(type: string, value: string, label: string) {
    console.log('Selecting option:', { type, value, label }); // Debug log
    formData[type] = value;
    dropdownStates[type] = false;
  }

  // Close dropdowns when clicking outside
  function handleClickOutside(event) {
    // Check if event.target is a DOM element
    if (event.target instanceof Element) {
      if (!event.target.closest('.modal-content')) {
        show = false;
      }
    }
  }

  function clearFile(type: 'thumbnail' | 'lineup' | 'video') {
    formData[type] = null;
    fileNames[type] = '';
  }
</script>

<!-- Add the click outside handler -->
<svelte:window on:click={handleClickOutside} />

{#if show}
  <div 
    class="modal-backdrop" 
    transition:fade 
    on:click|self={() => dispatch('close')}
  >
    <div 
      class="modal" 
      transition:fly={{ y: 20 }}
      on:click|stopPropagation
    >
      {#if $user}
        <div class="modal-header">
          <div class="header-content">
            <h2>Submit Grenade</h2>
            <p class="header-description">
              Fill in the details for your new grenade lineup.
            </p>
          </div>
          <button class="close-btn" on:click={closeModal}>×</button>
        </div>

        <form class="modal-content" on:submit|preventDefault={() => {}}>
          <!-- Title (100%) -->
          <div class="form-group">
            <label for="title">Title *</label>
            <div class="input-with-icon">
              <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 3H7a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4Z"/>
                <path d="M9 9h6"/>
                <path d="M9 13h6"/>
                <path d="M9 17h4"/>
              </svg>
              <input 
                type="text" 
                id="title" 
                placeholder="Enter grenade title..." 
                bind:value={formData.title}
                class="text-input"
                required
              />
            </div>
          </div>

          <!-- Map (50%) | Team (50%) -->
          <div class="form-grid">
            <div class="form-group">
              <label for="map">Map *</label>
              <div class="custom-select">
                <button 
                  type="button"
                  class="select-button"
                  on:click|stopPropagation={() => toggleDropdown('map')}
                >
                  {formData.map ? maps.find(o => o.value === formData.map)?.label : 'Select Map'}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {#if dropdownStates.map}
                  <div class="select-dropdown">
                    {#each maps as option}
                      <button 
                        type="button"
                        class="option-button"
                        class:selected={formData.map === option.value}
                        on:click|stopPropagation={() => selectOption('map', option.value, option.label)}
                      >
                        {#if option.thumbnail}
                          <img 
                            src={`${STRAPI_URL}${option.thumbnail}`} 
                            alt={option.label}
                            class="map-thumbnail"
                          />
                        {/if}
                        {option.label}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
            <div class="form-group">
              <label for="team">Team *</label>
              <div class="custom-select">
                <button 
                  type="button"
                  class="select-button"
                  on:click|stopPropagation={() => toggleDropdown('team')}
                >
                  {formData.team ? teams.find(o => o.value === formData.team)?.label : 'Select Team'}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {#if dropdownStates.team}
                  <div class="select-dropdown">
                    {#each teams as option}
                      <button 
                        type="button"
                        class="option-button"
                        class:selected={formData.team === option.value}
                        on:click|stopPropagation={() => selectOption('team', option.value, option.label)}
                      >
                        {option.label}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <!-- Grenade Type (50%) | Technique (50%) -->
          <div class="form-grid">
            <div class="form-group">
              <label for="type">Grenade Type *</label>
              <div class="custom-select">
                <button 
                  type="button"
                  class="select-button"
                  on:click|stopPropagation={() => toggleDropdown('type')}
                >
                  {formData.type ? types.find(o => o.value === formData.type)?.label : 'Select Type'}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {#if dropdownStates.type}
                  <div class="select-dropdown">
                    {#each types as option}
                      <button 
                        type="button"
                        class="option-button"
                        class:selected={formData.type === option.value}
                        on:click|stopPropagation={() => selectOption('type', option.value, option.label)}
                      >
                        {option.label}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
            <div class="form-group">
              <label for="technique">Technique *</label>
              <div class="custom-select">
                <button 
                  type="button"
                  class="select-button"
                  on:click|stopPropagation={() => toggleDropdown('technique')}
                >
                  {formData.technique ? techniques.find(o => o.value === formData.technique)?.label : 'Select Technique'}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {#if dropdownStates.technique}
                  <div class="select-dropdown">
                    {#each techniques as option}
                      <button 
                        type="button"
                        class="option-button"
                        class:selected={formData.technique === option.value}
                        on:click|stopPropagation={() => selectOption('technique', option.value, option.label)}
                      >
                        {option.label}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <!-- Movement (50%) | Precision (50%) -->
          <div class="form-grid">
            <div class="form-group">
              <label for="movement">Movement *</label>
              <div class="custom-select">
                <button 
                  type="button"
                  class="select-button"
                  on:click|stopPropagation={() => toggleDropdown('movement')}
                >
                  {formData.movement ? movements.find(o => o.value === formData.movement)?.label : 'Select Movement'}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {#if dropdownStates.movement}
                  <div class="select-dropdown">
                    {#each movements as option}
                      <button 
                        type="button"
                        class="option-button"
                        class:selected={formData.movement === option.value}
                        on:click|stopPropagation={() => selectOption('movement', option.value, option.label)}
                      >
                        {option.label}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
            <div class="form-group">
              <label for="precision">Precision *</label>
              <div class="custom-select">
                <button 
                  type="button"
                  class="select-button"
                  on:click|stopPropagation={() => toggleDropdown('precision')}
                >
                  {formData.precision ? precisions.find(o => o.value === formData.precision)?.label : 'Select Precision'}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {#if dropdownStates.precision}
                  <div class="select-dropdown">
                    {#each precisions as option}
                      <button 
                        type="button"
                        class="option-button"
                        class:selected={formData.precision === option.value}
                        on:click|stopPropagation={() => selectOption('precision', option.value, option.label)}
                      >
                        {option.label}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <!-- Position (66%) | Air Time (33%) -->
          <div class="form-grid position-time">
            <div class="form-group">
              <label for="position">Position *</label>
              <div class="input-with-icon">
                <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <input 
                  type="text" 
                  id="position" 
                  placeholder="setpos x y z; setang x y z" 
                  bind:value={formData.position}
                  class="text-input"
                  required
                />
              </div>
            </div>
            <div class="form-group">
              <label for="airTime">Air Time (seconds)</label>
              <div class="input-with-icon">
                <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <input 
                  type="text" 
                  id="airTime" 
                  placeholder="e.g. 6.6" 
                  bind:value={formData.airTime}
                  class="text-input"
                />
              </div>
            </div>
          </div>

          <!-- Rest of the form (uploads, visibility, buttons) stays the same -->

          <div class="form-grid uploads">
            <div class="form-group">
              <label for="thumbnail">Thumbnail</label>
              <input 
                type="file" 
                id="thumbnail"
                accept="image/*"
                on:change={(e) => handleFileChange(e, 'thumbnail')}
                style="display: none"
              />
              <button 
                class="upload-button" 
                class:has-file={fileNames.thumbnail}
                class:uploading={uploadingFiles.thumbnail}
                on:click={() => document.getElementById('thumbnail').click()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {#if uploadingFiles.thumbnail}
                  Uploading...
                {:else}
                  {fileNames.thumbnail || 'Upload'}
                {/if}
                {#if fileNames.thumbnail}
                  <button 
                    class="clear-file"
                    on:click|stopPropagation={() => clearFile('thumbnail')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                {/if}
              </button>
            </div>

            <div class="form-group">
              <label for="lineup">Lineup</label>
              <input 
                type="file" 
                id="lineup"
                accept="image/*"
                on:change={(e) => handleFileChange(e, 'lineup')}
                style="display: none"
              />
              <button 
                class="upload-button" 
                class:has-file={fileNames.lineup}
                class:uploading={uploadingFiles.lineup}
                on:click={() => document.getElementById('lineup').click()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {#if uploadingFiles.lineup}
                  Uploading...
                {:else}
                  {fileNames.lineup || 'Upload'}
                {/if}
                {#if fileNames.lineup}
                  <button 
                    class="clear-file"
                    on:click|stopPropagation={() => clearFile('lineup')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                {/if}
              </button>
            </div>

            <div class="form-group">
              <label for="video">Video</label>
              <input 
                type="file" 
                id="video"
                accept="video/*"
                on:change={(e) => handleFileChange(e, 'video')}
                style="display: none"
              />
              <button 
                class="upload-button" 
                class:has-file={fileNames.video}
                class:uploading={uploadingFiles.video}
                on:click={() => document.getElementById('video').click()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {#if uploadingFiles.video}
                  Uploading...
                {:else}
                  {fileNames.video || 'Upload'}
                {/if}
                {#if fileNames.video}
                  <button 
                    class="clear-file"
                    on:click|stopPropagation={() => clearFile('video')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                {/if}
              </button>
            </div>
          </div>

          <div class="visibility-card">
            <div class="visibility-content">
              <div class="visibility-text">
                <h2>Public</h2>
                <p class="visibility-description">Make this grenade visible to everyone</p>
              </div>
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  bind:checked={isPublic}
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="cancel-button" on:click={closeModal}>
              Cancel
            </button>
            <button type="button" class="submit-button" disabled={isSubmitting} on:click={handleSubmit}>
              {isSubmitting ? 'Submitting...' : 'Submit Grenade'}
            </button>
          </div>

          {#if error}
            <div class="error-message">
              {error}
            </div>
          {/if}
        </form>
      {:else}
        <div class="modal-header">
          <div class="header-content">
            <h2>Authentication Required</h2>
            <p class="header-description">
              You need to be logged in to submit grenades.
            </p>
          </div>
          <button class="close-btn" on:click={closeModal}>×</button>
        </div>
        
        <div class="modal-content login-prompt">
          <p>Please log in with your Steam account to submit grenades and contribute to the community.</p>
          <button 
            class="login-button" 
            on:click={() => {
              const steamLogin = document.querySelector('.steam-login');
              if (steamLogin instanceof HTMLElement) {
                steamLogin.click();
              }
              closeModal();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            Login with Steam
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
  }

  .modal {
    background-color: var(--color-surface);
    border-radius: var(--radius-lg);
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-xl);
  }

  .modal-header {
    padding: var(--spacing-6);
    position: relative;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--spacing-4);
  }

  .header-content {
    padding-right: var(--spacing-8);
  }

  .modal-header h2 {
    margin: 0;
    font-size: var(--font-size-xl);
    color: var(--color-text-primary);
    margin-bottom: var(--spacing-1);
  }

  .header-description {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
  }

  .close-btn {
    position: absolute;
    top: var(--spacing-4);
    right: var(--spacing-4);
    background-color: transparent;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    font-size: 20px;
    padding: 0;
    line-height: 1;
    transition: background-color 0.2s ease;
  }

  .close-btn:hover {
    background-color: var(--color-surface-active);
  }

  .modal-content {
    padding: var(--spacing-6);
    padding-top: 0;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 var(--spacing-3);
    margin-bottom: 0;
  }

  .form-group {
    margin-bottom: var(--spacing-3);
  }

  label {
    display: block;
    margin-bottom: var(--spacing-2);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  input[type="text"],
  select {
    width: 100%;
    padding: var(--spacing-2);
    background-color: var(--color-surface-active);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--font-size-base);
    appearance: none;
    cursor: pointer;
  }

  input[type="text"]:focus,
  select:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  select {
    width: 100%;
    padding: var(--spacing-3);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--font-size-base);
    appearance: none;
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent; /* Removes tap highlight on mobile */
    color-scheme: dark;
  }

  select option {
    background-color: var(--color-surface) !important;
    color: var(--color-text-primary) !important;
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
  }

  select option:hover,
  select option:focus,
  select option:active {
    background: var(--color-surface-active) !important;
    background-color: var(--color-surface-active) !important;
    color: var(--color-text-primary) !important;
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
  }

  /* Override for Firefox */
  @-moz-document url-prefix() {
    select {
      color-scheme: dark;
    }
    
    select option {
      background-color: var(--color-surface) !important;
    }
    
    select option:hover,
    select option:focus {
      background-color: var(--color-surface-active) !important;
      box-shadow: 0 0 0 99999px var(--color-surface-active) inset !important;
    }
  }

  /* Override for Webkit */
  @media screen and (-webkit-min-device-pixel-ratio: 0) {
    select option {
      background-color: var(--color-surface) !important;
    }
    
    select option:hover,
    select option:focus {
      background-color: var(--color-surface-active) !important;
      box-shadow: 0 0 0 99999px var(--color-surface-active) inset !important;
    }
  }

  /* Remove any system highlighting */
  ::selection {
    background-color: transparent;
  }

  ::-moz-selection {
    background-color: transparent;
  }

  .file-input {
    position: relative;
  }

  .file-input input[type="file"] {
    display: none;
  }

  .file-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3);
    background-color: var(--color-surface-active);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--color-text-primary);
  }

  .file-label:hover {
    background-color: var(--color-surface-hover);
  }

  .toggle-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .toggle-wrapper {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .toggle {
    position: relative;
    width: 44px;
    height: 24px;
    background-color: var(--color-background);
    border-radius: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  input[type="checkbox"] {
    display: none;
  }

  input[type="checkbox"]:checked + .toggle {
    background-color: var(--color-primary);
  }

  .toggle-handle {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  input[type="checkbox"]:checked + .toggle .toggle-handle {
    transform: translateX(20px);
  }

  .toggle-text {
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    min-width: 48px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-3);
    margin-top: var(--spacing-6);
  }

  .cancel-button {
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-md);
    background-color: var(--color-surface-active);
    border: none;
    color: var(--color-text-primary);
    font-size: var(--font-size-base);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .cancel-button:hover {
    background-color: var(--color-surface-hover);
  }

  .submit-button {
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-md);
    background-color: var(--color-primary);
    border: none;
    color: white;
    font-size: var(--font-size-base);
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .submit-button:hover {
    opacity: 0.9;
  }

  @media (max-width: 640px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
  }

  select option[disabled] {
    display: none;
  }

  .custom-select {
    position: relative;
    width: 100%;
  }

  .select-button {
    width: 100%;
    padding: var(--spacing-3);
    background-color: var(--color-surface-active);
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--font-size-base);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: left;
    transition: background-color 0.2s ease;
  }

  .select-button:hover {
    background-color: var(--color-surface-hover);
  }

  .select-dropdown {
    position: absolute;
    top: calc(100% + var(--spacing-2));
    left: 0;
    right: 0;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    z-index: var(--z-modal);
    padding: var(--spacing-1);
    box-shadow: 0 0px 32px 0px rgb(0 0 0 / 0.25);
    max-height: calc(var(--spacing-3) * 2 + (40px * 5)); /* Height for 5 items */
    overflow-y: auto;
  }

  .option-button {
    width: 100%;
    padding: var(--spacing-3);
    background: none;
    border: none;
    color: var(--color-text-primary);
    text-align: left;
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background-color 0.2s ease;
    font-size: var(--font-size-base);
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .option-button:hover {
    background-color: var(--color-surface-hover);
  }

  .option-button.selected {
    background-color: var(--color-surface-active);
  }

  /* Update input styling */
  .text-input {
    width: 100%;
    padding: var(--spacing-3);
    background-color: var(--color-surface-active);
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--font-size-base);
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    outline: none;
  }

  .text-input:focus {
    outline: none;
    box-shadow: none;
  }

  /* Remove default focus ring and tap highlight */
  input[type="text"] {
    -webkit-tap-highlight-color: transparent;
  }

  /* Remove autofill background color */
  input[type="text"]:-webkit-autofill,
  input[type="text"]:-webkit-autofill:hover,
  input[type="text"]:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--color-text-primary);
    -webkit-box-shadow: 0 0 0px 1000px var(--color-surface) inset;
    transition: background-color 5000s ease-in-out 0s;
  }

  /* Remove Firefox focus ring */
  input[type="text"]::-moz-focus-inner {
    border: 0;
  }

  /* Remove IE clear button */
  input[type="text"]::-ms-clear {
    display: none;
  }

  .position-time {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-3);
  }

  .position-time .form-group {
    margin: 0;
  }

  .position-time .form-group input {
    width: 100%;
  }

  .position-time .form-group:last-child input {
    width: 100%;
    min-width: 0;
  }



  /* Update grid styles for uploads */
  .uploads {
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--spacing-4);
    margin-bottom: var(--spacing-2);
  }

  .upload-button {
    width: 100%;
    padding: var(--spacing-3);
    background-color: var(--color-surface-active);
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    transition: background-color 0.2s ease;
    max-width: 100%;
  }

  .upload-button:hover {
    background-color: var(--color-surface-hover);
  }

  .upload-button svg {
    color: var(--color-text-primary);
  }

  .upload-button.has-file {
    background-color: var(--color-surface-hover);
    border: 1px solid var(--color-primary);
  }

  .upload-button span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .visibility-card {
    background-color: var(--color-surface-active);
    border-radius: var(--radius-md);
    padding: var(--spacing-4);
  }

  .visibility-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-4);
  }

  .visibility-text h3 {
    font-size: var(--font-size-base);
    color: var(--color-text-primary);
    margin: 0;
  }

  .visibility-description {
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
    margin: 0;
    margin-top: var(--spacing-1);
  }

  /* Toggle switch styles */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .visibility-content > label {
    margin-bottom: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--color-background);
    transition: .3s;
    border-radius: 24px;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: .3s;
    border-radius: 50%;
  }

  input:checked + .toggle-slider {
    background-color: var(--color-primary);
  }

  input:checked + .toggle-slider:before {
    transform: translateX(20px);
  }

  .input-with-icon {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon {
    position: absolute;
    left: var(--spacing-3);
    color: var(--color-text-secondary);
    top: 50%;
    transform: translateY(-50%);
  }

  .input-with-icon input {
    width: 100%;
    padding: var(--spacing-3);
    padding-left: calc(var(--spacing-3) * 2 + 16px);
    padding-top: calc(var(--spacing-3) - 2px);
    background-color: var(--color-surface-active);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--font-size-base);
    line-height: 1;
    transition: var(--transition-colors);
  }

  .input-with-icon input:focus {
    outline: none;
    border-color: var(--color-text-secondary);
    background-color: var(--color-surface-hover);
  }

  .input-with-icon input:hover {
    background-color: var(--color-surface-hover);
  }



  /* Global input styles to remove browser defaults */
  input {
    outline: none !important; /* Remove browser default focus ring */
    -webkit-appearance: none; /* Remove iOS default styling */
    -moz-appearance: none;
    appearance: none;
  }

  .input-with-icon input {
    width: 100%;
    padding: var(--spacing-3);
    padding-left: calc(var(--spacing-3) * 2 + 16px);
    padding-top: calc(var(--spacing-3) - 2px);
    background-color: var(--color-surface-active);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--font-size-base);
    line-height: 1;
    transition: var(--transition-colors);
  }

  .input-with-icon input:focus {
    outline: none;
    border-color: var(--color-text-secondary); /* Helleres Grau */
    background-color: var(--color-surface-hover);
  }

  .input-with-icon input:hover {
    background-color: var(--color-surface-hover);
  }

  /* Optional: Wenn du möchtest, dass der Focus-State noch sichtbarer ist */
  .input-with-icon input:focus-visible {
    outline: none;
    border-color: var(--color-text-secondary);
    background-color: var(--color-surface-hover);
  }

  /* Customize scrollbar for dropdown */
  .select-dropdown::-webkit-scrollbar {
    width: 6px;
  }

  .select-dropdown::-webkit-scrollbar-track {
    background: var(--color-surface);
    border-radius: var(--radius-sm);
  }

  .select-dropdown::-webkit-scrollbar-thumb {
    background: var(--color-surface-active);
    border-radius: var(--radius-sm);
  }

  .select-dropdown::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-tertiary);
  }

  .upload-button.uploading {
    opacity: 0.7;
    cursor: wait;
  }

  .map-thumbnail {
    width: 40px;
    height: 24px;
    object-fit: cover;
    border-radius: var(--radius-sm);
  }

  .clear-file {
    position: absolute;
    right: var(--spacing-2);
    top: 50%;
    transform: translateY(-50%);
    background: var(--color-surface);
    border: none;
    border-radius: var(--radius-sm);
    width: 24px;
    height: 24px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: all 0.2s ease;
  }

  .clear-file:hover {
    background: var(--color-surface-hover);
    color: var(--color-primary);
  }

  .upload-button {
    position: relative;
  }

  .upload-button.has-file {
    padding-right: calc(var(--spacing-3) + 24px);
  }

  .login-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-6);
    padding: var(--spacing-8) var(--spacing-6);
    text-align: center;
  }

  .login-prompt p {
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
    margin: 0;
    max-width: 400px;
  }

  .login-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-6);
    background-color: var(--color-primary);
    border: none;
    border-radius: var(--radius-md);
    color: white;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .login-button:hover {
    opacity: 0.9;
  }
</style> 
