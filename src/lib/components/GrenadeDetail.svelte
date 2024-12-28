<script lang="ts">
  import { fade, scale, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { user } from '$lib/stores/auth';

  const STRAPI_URL = import.meta.env.VITE_STRAPI_URL;

  export let grenade = null;
  export let onGrenadeLoad = (data) => {};

  let isVideoPlaying = false;
  let videoElement: HTMLVideoElement;
  let isFullscreen = false;
  let activeTab = 'video';

  let isLiked = false;
  let isBookmarked = false;

  let progress = 0;
  let currentTime = 0;
  let duration = 0;
  let isDragging = false;

  let showSpeedMenu = false;
  const speedOptions = [0.5, 1, 2];
  let currentSpeed = 1;

  let volume = 1;
  let isMuted = false;
  let showVolumeControl = false;
  let previousVolume = 1;

  let showTimePreview = false;
  let previewTime = 0;
  let previewPosition = 0;

  let zoomLevel = 1;
  let showCrosshair = false;

  let isExpanded = false;

  const scaleTransition = {
    duration: 300,
    start: 0.98,
    opacity: 0,
    easing: cubicOut
  };

  const transitionDuration = 300;
  const transitionConfig = {
    duration: transitionDuration,
    easing: cubicOut
  };

  let controlsVisible = false;

  onMount(() => {
    setTimeout(() => {
      controlsVisible = true;
    }, 100);

    fetchGrenadeDetails();
  });

  async function fetchGrenadeDetails() {
    const grenadeDocumentId = $page.params.id;
    const jwt = localStorage.getItem('jwt');
    const headers = jwt ? { 'Authorization': `Bearer ${jwt}` } : {};

    try {
      // Check if we're coming from the drafts section
      const isDraft = window.location.pathname.includes('/drafts/') || 
                     new URLSearchParams(window.location.search).get('status') === 'draft';

      // Only allow draft access if user is authenticated
      if (isDraft && !jwt) {
        console.error('Authentication required to view drafts');
        return;
      }

      let response;
      let data;

      if (isDraft && jwt) {
        // If it's a draft, fetch both to ensure we get the latest version
        const [publishedResponse, draftResponse] = await Promise.all([
          fetch(
            `${STRAPI_URL}/api/grenades?filters[documentId][$eq]=${grenadeDocumentId}&status=published&populate=*`,
            { headers }
          ),
          fetch(
            `${STRAPI_URL}/api/grenades?filters[documentId][$eq]=${grenadeDocumentId}&status=draft&populate=*`,
            { headers }
          )
        ]);

        const [publishedData, draftData] = await Promise.all([
          publishedResponse.json(),
          draftResponse.json()
        ]);

        // Prefer draft version when coming from drafts
        if (draftData.data && draftData.data.length > 0) {
          data = draftData;
        } else if (publishedData.data && publishedData.data.length > 0) {
          data = publishedData;
        }
      } else {
        // For published grenades, just fetch the published version
        response = await fetch(
          `${STRAPI_URL}/api/grenades?filters[documentId][$eq]=${grenadeDocumentId}&status=published&populate=*`,
          { headers }
        );
        data = await response.json();
      }

      if (!data?.data?.[0]) {
        console.error('No grenade data found');
        return;
      }

      const grenadeData = data.data[0];
      
      grenade = {
        id: grenadeData.id,
        documentId: grenadeData.documentId,
        title: grenadeData.title || 'Untitled',
        author: grenadeData.user?.username || 'Unknown',
        userId: grenadeData.user?.id,
        likes: grenadeData.likes || 0,
        views: grenadeData.views || 0,
        type: grenadeData.type?.name || 'Unknown',
        video: grenadeData.video ? `${STRAPI_URL}${grenadeData.video.url}` : null,
        thumbnail: grenadeData.thumbnail 
          ? `${STRAPI_URL}${grenadeData.thumbnail.url}` 
          : '/images/default.jpg',
        team: grenadeData.team?.name || 'Unknown',
        technique: grenadeData.technique?.name || 'Unknown',
        movement: grenadeData.movement?.name || 'Unknown',
        precision: grenadeData.precision?.name || 'Unknown',
        airTime: grenadeData.airtime || 0,
        createdAt: grenadeData.createdAt || new Date().toISOString(),
        lineup: grenadeData.lineup 
          ? `${STRAPI_URL}${grenadeData.lineup.url}` 
          : null,
        map: grenadeData.map?.name || 'Unknown',
        position: grenadeData.position || '',
        likedBy: grenadeData.likedBy || []
      };

      // Initialize like state
      if ($user) {
        isLiked = grenade.likedBy.some(u => u.id === $user.id);
        console.log('Initial like state:', { 
          userId: $user.id, 
          likedBy: grenade.likedBy,
          isLiked 
        });
      }

      // Set initial active tab - prefer video if available, otherwise lineup
      activeTab = grenade.video ? 'video' : (grenade.lineup ? 'lineup' : 'video');

      if (onGrenadeLoad) {
        onGrenadeLoad(grenade);
      }

    } catch (error) {
      console.error('Error fetching grenade details:', error);
    }
  }

  function getControlDelay(index) {
    return 200 + (index * 100);
  }

  function toggleVideo() {
    if (videoElement) {
      if (videoElement.paused) {
        videoElement.play();
        isVideoPlaying = true;
      } else {
        videoElement.pause();
        isVideoPlaying = false;
      }
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      videoElement.requestFullscreen();
      isFullscreen = true;
    } else {
      document.exitFullscreen();
      isFullscreen = false;
    }
  }

  async function toggleLike() {
    if (!grenade) return;
    
    const jwt = localStorage.getItem('jwt');
    if (!jwt) {
        console.error('No JWT found - user must be logged in to like');
        return;
    }

    try {
        const response = await fetch(`${STRAPI_URL}/api/grenades/${grenade.documentId}/${isLiked ? 'unlike' : 'like'}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Error toggling like:', data.error);
            return;
        }

        grenade = {
            ...grenade,
            likes: data.data.likes,
            likedBy: data.data.likedBy || []
        };

        isLiked = grenade.likedBy.some(u => u.id === $user?.id);
        console.log('Updated like state:', { 
            likes: grenade.likes,
            likedBy: grenade.likedBy,
            isLiked 
        });

    } catch (error) {
        console.error('Error toggling like:', error);
    }
  }

  // Update the reactive statement to check user store
  $: {
    if (grenade?.likedBy && $user) {
        const likedByArray = Array.isArray(grenade.likedBy) ? grenade.likedBy : [];
        console.log('Checking like status:', { 
            likes: grenade.likes,
            likedBy: likedByArray,
            userId: $user.id,
            hasLiked: likedByArray.some(u => u.id === $user.id)
        });
        isLiked = likedByArray.some(u => u.id === $user.id);
    }
  }

  function toggleBookmark() {
    isBookmarked = !isBookmarked;
  }

  async function handleShare() {
    try {
        await navigator.clipboard.writeText(window.location.href);
        const btn = document.querySelector('.share-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
        `;
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy URL:', err);
    }
  }

  function handleTimeUpdate(event) {
    if (!isDragging) {
      currentTime = videoElement.currentTime;
      duration = videoElement.duration;
      progress = (currentTime / duration) * 100;
    }
  }

  function formatTime(seconds) {
    // Handle edge cases
    if (!seconds || seconds < 0) {
      return '0:00';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function handleProgressBarClick(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    progress = Math.max(0, Math.min(percentage, 100));
    videoElement.currentTime = (progress / 100) * videoElement.duration;
  }

  function handleProgressBarHover(event) {
    if (event.buttons === 1) { // Left mouse button is pressed
      handleProgressBarClick(event);
    }
  }

  function handleProgressHover(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, event.clientX - rect.left); // Ensure x is not negative
    const percentage = Math.min((x / rect.width) * 100, 100); // Cap at 100%
    previewPosition = Math.max(0, Math.min(x, rect.width));
    previewTime = (percentage / 100) * videoElement.duration;
    showTimePreview = true;
  }

  function handleProgressLeave() {
    showTimePreview = false;
  }

  function setPlaybackSpeed(speed) {
    currentSpeed = speed;
    if (videoElement) {
      videoElement.playbackRate = speed;
    }
    showSpeedMenu = false;
  }

  function toggleMute() {
    if (videoElement) {
      if (isMuted) {
        videoElement.volume = previousVolume;
        volume = previousVolume;
      } else {
        previousVolume = volume;
        videoElement.volume = 0;
        volume = 0;
      }
      isMuted = !isMuted;
    }
  }

  function handleVolumeChange(event) {
    const newVolume = parseFloat(event.target.value);
    volume = newVolume;
    if (videoElement) {
      videoElement.volume = newVolume;
      isMuted = newVolume === 0;
      event.target.style.setProperty('--volume', newVolume);
    }
  }

  function handleZoomIn() {
    zoomLevel = Math.min(zoomLevel + 0.25, 3); // Max zoom 3x
  }
  
  function handleZoomOut() {
    zoomLevel = Math.max(zoomLevel - 0.25, 1); // Min zoom 1x
  }
  
  function toggleCrosshair() {
    showCrosshair = !showCrosshair;
  }

  function toggleExpand() {
    isExpanded = !isExpanded;
  }

  function switchTab(tab) {
    activeTab = tab;
    showCrosshair = false;
    zoomLevel = 1;
  }

  async function handleCopyPosition() {
    if (!grenade?.position) {
        console.error('No position data available');
        return;
    }

    try {
        await navigator.clipboard.writeText(grenade.position);
        // Optional: Add some visual feedback that the copy was successful
        const btn = document.querySelector('.copy-position');
        const originalText = btn.innerHTML;
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
        `;
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy position:', err);
    }
  }
</script>

<div class="grenade-detail">
  {#if grenade}
    <div 
      class="main-layout" 
      class:expanded={isExpanded}
      in:fade={transitionConfig}
    >
      <div 
        class="video-section" 
        class:expanded={isExpanded}
        in:fly={{ ...transitionConfig, x: -20 }}
      >
        <!-- Video Container -->
        <div class="video-container" class:fullscreen={isFullscreen}>
          <div class="video-wrapper" class:lineup-mode={activeTab === 'lineup'}>
            <div class="zoom-controls">
              {#if controlsVisible}
                <button 
                  class="zoom-btn" 
                  on:click={handleZoomIn}
                  style="animation-delay: {getControlDelay(0)}ms"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="11" y1="8" x2="11" y2="14"/>
                    <line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </button>
                <button 
                  class="zoom-btn" 
                  on:click={handleZoomOut}
                  style="animation-delay: {getControlDelay(1)}ms"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </button>
                <button 
                  class="zoom-btn" 
                  class:active={showCrosshair} 
                  on:click={toggleCrosshair}
                  style="animation-delay: {getControlDelay(2)}ms"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1"/>
                    <line x1="12" y1="3" x2="12" y2="9"/>
                    <line x1="12" y1="15" x2="12" y2="21"/>
                    <line x1="3" y1="12" x2="9" y2="12"/>
                    <line x1="15" y1="12" x2="21" y2="12"/>
                  </svg>
                </button>
                <button 
                  class="zoom-btn" 
                  class:active={isExpanded} 
                  on:click={toggleExpand}
                  style="animation-delay: {getControlDelay(3)}ms"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    {#if isExpanded}
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                    {:else}
                      <path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1"/>
                    {/if}
                  </svg>
                </button>
              {/if}
            </div>

            {#if activeTab === 'video'}
              <video
                bind:this={videoElement}
                src={grenade.video}
                poster={grenade.thumbnail}
                loop
                on:click={toggleVideo}
                on:timeupdate={handleTimeUpdate}
                style="transform: scale({zoomLevel})"
              />
              
              <div class="video-controls-wrapper">
                <div class="video-controls" transition:fade={{ duration: transitionDuration }}>
                  <div class="left-controls">
                    <button class="control-btn" on:click={toggleVideo}>
                      {#if isVideoPlaying}
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                      {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      {/if}
                    </button>

                    <div 
                      class="volume-control-container"
                      on:mouseenter={() => showVolumeControl = true}
                      on:mouseleave={() => showVolumeControl = false}
                    >
                      <div class="volume-control">
                        <button 
                          class="control-btn"
                          on:click={toggleMute}
                        >
                          {#if isMuted || volume === 0}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                              <line x1="23" y1="9" x2="17" y2="15"/>
                              <line x1="17" y1="9" x2="23" y2="15"/>
                            </svg>
                          {:else if volume < 0.5}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                            </svg>
                          {:else}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                            </svg>
                          {/if}
                        </button>
                      </div>

                      {#if showVolumeControl}
                        <div class="volume-slider-container">
                          <div class="volume-slider-wrapper">
                            <div class="volume-slider-track">
                              <div 
                                class="volume-slider-fill" 
                                style="height: {volume * 100}%"
                              ></div>
                            </div>
                            <input 
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={volume}
                              on:input={handleVolumeChange}
                              class="volume-slider"
                            />
                          </div>
                        </div>
                      {/if}
                    </div>

                    <div class="time-display">
                      <span>{formatTime(currentTime)}</span>
                      <span class="time-separator">/</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div 
                    class="progress-bar" 
                    on:mousedown={handleProgressBarClick}
                    on:mousemove={handleProgressBarHover}
                    on:mousemove={handleProgressHover}
                    on:mouseleave={handleProgressLeave}
                  >
                    <div class="progress-bar-filled" style="width: {progress}%"></div>
                    <div class="progress-handle" style="left: {progress}%"></div>
                    
                    {#if showTimePreview}
                      <div 
                        class="time-preview"
                        style="left: {previewPosition}px"
                      >
                        {formatTime(previewTime)}
                      </div>
                    {/if}
                  </div>

                  <div class="right-controls">
                    <div class="speed-control">
                      <button class="control-btn speed-btn" on:click={() => showSpeedMenu = !showSpeedMenu}>
                        <span class="speed-label">{currentSpeed}x</span>
                      </button>
                      
                      {#if showSpeedMenu}
                        <div class="speed-menu" transition:fade={{ duration: 100 }}>
                          {#each speedOptions as speed}
                            <button 
                              class="speed-option" 
                              class:active={currentSpeed === speed}
                              on:click={() => setPlaybackSpeed(speed)}
                            >
                              {speed}x
                            </button>
                          {/each}
                        </div>
                      {/if}
                    </div>

                    <button class="control-btn" on:click={toggleFullscreen}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            {:else}
              <img
                src={grenade.lineup}
                alt="Lineup screenshot"
                style="transform: scale({zoomLevel})"
                class="lineup-image"
              />
            {/if}

            {#if showCrosshair}
              <div class="crosshair">
                <div class="crosshair-vertical"></div>
                <div class="crosshair-horizontal"></div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Tab Controls -->
        <div class="tab-controls">
          {#if controlsVisible}
            <div 
              class="segmented-control"
              style="animation-delay: {getControlDelay(0)}ms"
            >
              {#if grenade.video}
                <button 
                  class="segment-btn" 
                  class:active={activeTab === 'video'}
                  on:click={() => switchTab('video')}
                >
                  Video
                </button>
              {/if}
              {#if grenade.lineup}
                <button 
                  class="segment-btn" 
                  class:active={activeTab === 'lineup'}
                  on:click={() => switchTab('lineup')}
                >
                  Lineup
                </button>
              {/if}
            </div>

            <div class="interaction-buttons">
              <div 
                class="interaction-btn views-btn"
                style="animation-delay: {getControlDelay(1)}ms"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <span>{grenade.views}</span>
              </div>

              <button 
                class="action-btn"
                class:active={isLiked}
                on:click={toggleLike}
                disabled={!$user}
                title={$user ? 'Like this grenade' : 'Login to like grenades'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>{grenade?.likes || 0}</span>
              </button>

              <button 
                class="interaction-btn" 
                class:active={isBookmarked} 
                on:click={toggleBookmark}
                style="animation-delay: {getControlDelay(3)}ms"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </button>

              <button 
                class="action-btn share-btn" 
                on:click={handleShare}
                style="animation-delay: {getControlDelay(4)}ms"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Share
              </button>
            </div>
          {/if}
        </div>
      </div>

      <div 
        class="details-card"
        in:fly={{ ...transitionConfig, x: isExpanded ? 0 : 20, y: isExpanded ? 20 : 0 }}
      >
        {#if controlsVisible}
          <h2 
            class="details-heading"
            style="animation-delay: {getControlDelay(0)}ms"
          >
            Details
          </h2>
        {/if}

        <div class="details-grid">
          {#if controlsVisible}
            <div 
              class="detail-item"
              style="animation-delay: {getControlDelay(0)}ms"
            >
              <span class="detail-label">Team</span>
              <div class="detail-value">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 64 64" fill="currentColor">
                  <path d="M48.9,49.9c-.4-1.4-.8-2.8-1.6-4-.3-.4-.7-.9-.8-1.6.5,0,.9,0,1.3,0,.4,0,.7,0,1.1,0,.3,0,.6,0,.9,0,1.6,0,3.1-.4,4.5-1.2.7-.4,1.3-1,1.7-1.8-1.8-.4-3.5-.8-5.3-1.2.2-.1.2-.2.3-.3,1.5-.4,2.8-1.2,4-2.2,1.2-1,2-2.3,2.3-4h-1.5c-.4,0-.9,0-1.3,0-.4,0-.9,0-1.5-.1.4-.3.7-.5,1.1-.7,1.1-.6,1.9-1.5,2.6-2.5.4-.7.6-1.5.4-2.3-2.8,1.2-3.5,1.5-4.2,1.4,1.6-1.7,2.2-3.8,2-6.1-1.2.5-2,1.5-3.2,1.7.7-2.4,1.1-4.7.3-7.1-1.1.4-1.6,1.4-2.5,2,0-1.6,0-3.1,0-4.6,0-.9-.2-1.7-.4-2.5,0-.2-.2-.3-.4-.5-.6.4-1.1,1-1.8,1.2,0-.1,0-.2,0-.2,0-1.1-.1-2.2-.2-3.3,0-.4-.1-.8-.3-1.2-.3-.6-.4-1.3-1-1.6-.7.3-.7,1.2-1.4,1.3,0,0-.1-.1-.1-.2-.3-1.9-.9-3.8-1.8-5.6-.5-1-1.2-1.9-2.3-2.3-.3,0-.5-.2-.8.2.4.7.8,1.4,1.2,2.1,1.3,2.7,2.7,5.4,3.9,8.2.9,2.1,1.7,4.3,2.6,6.5,1.1,3,1.9,6.2,2.6,9.3.4,1.7.7,3.5.7,5.3,0,.2,0,.4,0,.6,0,.4.1.8.1,1.2,0,1-.2,2-.4,3-.2,1-.6,1.9-1.4,2.7-1,.9-2.3,1.1-3.4.6-.2-.3-.3-.7-.5-1,0-1.3,0-2.6.3-3.9.2-.7.2-1.5.3-2.2-.2-.2-.4-.4-.6-.5-1.6.4-2.9,1.4-4.4,2.3-1.5-1.8-2.7-3.8-4.1-5.6.7-1.5,1.4-2.9,2.1-4.5,0-.7-.2-1.5-.2-2.3,0-3-.1-6-.2-9,0-.6-.3-1.2-.4-1.7-.3-.2-.6-.3-.9-.4-1.1,3.5-2.1,6.9-3.2,10.3.8.4,1.2,1.1,1.2,1.9-.4,1.6-1.4,2-2.9,1.7-.2-.2-.5-.4-.8-.5q-.4-.8-.3-1.8c.4-.5.7-.9,1-1.3-.3-1-.7-2.1-1-3.3-.6-2.1-1.3-4.2-1.9-6.3,0-.2-.2-.4-.4-.7-.3.4-.6.7-.9,1.1,0,.8-.2,1.6-.3,2.5,0,2.5-.2,5.1-.2,7.6,0,.8,0,1.6,0,2.6.6,1.3,1.2,2.8,1.9,4.2-.4.5-.8,1-1.2,1.5-.8,1.1-1.5,2.2-2.3,3.2-.2.3-.4.6-.9.6-1.2-1-2.6-1.8-4.3-2.2-.4.8-.3,1.5-.2,2.2.2,1.2.4,2.5.4,3.7,0,.9-.2,1.5-1,2-1.8.4-3.4-1.1-3.9-2.6-.4-1.2-.6-2.4-.7-3.7,0-1.7.1-3.3.4-4.9.2-1.3.4-2.7.7-4,.7-2.9,1.5-5.7,2.5-8.5,1-2.7,2.1-5.4,3.3-8.1,1.2-2.6,2.6-5.1,3.9-7.7,0-.1.1-.3.2-.4-.6-.3-1,.2-1.3.2-1.1.9-1.9,1.9-2.4,3.1-.5,1.4-1,2.7-1.2,4.2,0,.2-.2.4-.3.7-.5-.6-.9-1-1.4-1.5-1.5,2-1.4,4.3-1.4,6.6-.8-.5-1.4-.9-2.1-1.3,0,.2-.1.2-.2.3-.3.9-.4,1.8-.5,2.7-.1,1-.2,2,0,3,.1.5,0,1,0,1.6-.9-.7-1.6-1.4-2.4-2-.3.5-.6,1.3-.6,2,0,1.5,0,3,.5,4.4,0,.3.2.5-.2.8-1-.6-2-1.3-3-2,0,2.4.6,4.5,2.3,6.5-1.7-.3-3.1-.9-4.5-1.6,0,.9.3,1.7.7,2.4.4.7.8,1.4,1.5,1.9.7.4,1.3.9,2.1,1.4-1.6,0-3,0-4.3,0,0,.2,0,.2,0,.3,0,.1,0,.3,0,.4.4,1.6,1.5,2.8,2.8,3.7.9.6,1.9,1,2.8,1.5.2.1.4.2.8.5-1.9.4-3.6.8-5.3,1.2.2.4.4.6.5.9l.2.2c1.5,1.3,3.3,1.9,5.3,1.9.9,0,1.9.2,2.8,0,.2,0,.5,0,.8,0-.2.3-.3.5-.5.8-.8,1.3-1.5,2.6-1.9,4-.4,1.4-.8,2.9-1,4.3-.2,1.3-.5,2.6-.6,4-.1,1.5,0,3,0,4.5,0,.6,0,1.4.8,1.8,1,0,2,0,3,0,.5,0,.9-.1,1.2-.5.2-3.8.5-7.6,1.6-11.5.3-.2.8-.4,1.2-.6.2,0,.4,0,.6,0,.1,0,.2.3.3.4-.2.4-.4.7-.6,1,.5.5.9,1,1.7,1.1,1.1-1.1,2.4-2.2,3.5-3.4.7-.7,1.4-1.5,1.7-2.5.7-2,1.2-4.1,1.6-6.2.2-1,.3-2,.5-3,.1-1,.2-2.1.4-3.1,0-.1,0-.3,0-.5-.2.1-.3.2-.4.3-1.3,1.8-2.6,3.5-3.9,5.3-1.3,1.7-2.6,3.4-3.8,5.1-1.1,1.4-2.1,2.9-3.1,4.4-.4.6-.8,1.2-.9,2-.2,1.2-.4,2.4-.7,3.7-.4,2-.5,4.1-.6,6.1,0,.2,0,.3,0,.5h-1.4c-.1-.7-.2-1.4-.3-2.1-.1-1.3,0-2.6.2-3.9.2-1.3.5-2.5.8-3.7.4-1.7.8-3.4,1.6-4.9.6-1,1.2-2,1.9-2.9,1.3-1.8,2.5-3.6,3.9-5.3,1.6-2.1,3.2-4.3,4.8-6.4.4-.5.8-1,1.1-1.5.9.5,1,1.5,1.7,2,.9-.5.9-1.6,1.8-2,.4.5.7,1,1,1.4,1.6,2.1,3.1,4.2,4.7,6.2,1.6,2.1,3.2,4.3,4.7,6.5.6.9,1.1,1.8,1.6,2.8.7,1.6,1.1,3.3,1.5,5,.5,1.9.8,3.8.8,5.8,0,.3,0,.7,0,1,0,.7,0,1.4-.4,2h-1.5c0-.3,0-.6,0-.9,0-1.4,0-2.7-.2-4.1-.2-1.6-.5-3.1-.8-4.7-.2-.8-.4-1.7-.9-2.5-1.4-2-2.8-4-4.3-5.9-1.3-1.8-2.7-3.6-4-5.4-1-1.4-2.1-2.8-3.1-4.1,0,.4,0,.8,0,1.2,0,1.7.4,3.3.6,4.9.3,2.2.9,4.4,1.6,6.6.3.8.7,1.4,1.2,2,1.1,1.1,2.2,2.2,3.3,3.3.3.3.7.5,1.1.8.5-.4,1-.8,1.4-1.2-.2-.4-.4-.8-.7-1.2.2-.2.5-.4.6-.6.8.1,1.1.6,1.6,1.1.3,1.2.6,2.5.8,3.7.3,1.5.5,3.1.4,4.6,0,1,0,2.1.4,3.2,1.5.3,3.1.3,4.6,0,.1-.6.3-.9.3-1.3,0-2.4.1-4.8-.2-7.2-.3-1.7-.6-3.4-1-5.1Z"/>
                </svg>
                <span>{grenade.team}</span>
              </div>
            </div>

            <div 
              class="detail-item"
              style="animation-delay: {getControlDelay(1)}ms"
            >
              <span class="detail-label">Technique</span>
              <div class="detail-value">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
                <span>{grenade.technique}</span>
              </div>
            </div>

            <div 
              class="detail-item"
              style="animation-delay: {getControlDelay(2)}ms"
            >
              <span class="detail-label">Movement</span>
              <div class="detail-value">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <span>{grenade.movement}</span>
              </div>
            </div>

            <div 
              class="detail-item"
              style="animation-delay: {getControlDelay(3)}ms"
            >
              <span class="detail-label">Precision</span>
              <div class="detail-value">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20V10"/>
                  <path d="M18 20V4"/>
                  <path d="M6 20v-4"/>
                </svg>
                <span>{grenade.precision}</span>
              </div>
            </div>

            <div 
              class="detail-item"
              style="animation-delay: {getControlDelay(4)}ms"
            >
              <span class="detail-label">Airtime</span>
              <div class="detail-value">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <span>{grenade.airTime}</span>
              </div>
            </div>
          {/if}
        </div>

        {#if controlsVisible}
          <button 
            class="copy-position"
            on:click={handleCopyPosition}
            disabled={!grenade?.position}
            style="animation-delay: {getControlDelay(7)}ms"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            Copy Position
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <p>Loading...</p>
  {/if}
</div>

<style>
  .segmented-control,
  .interaction-btn {
    opacity: 0;
    transform: translateX(-20px);
    animation: controlFadeIn 0.5s ease forwards;
  }

  @keyframes controlFadeIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .grenade-detail {
    width: 100%;
  }

  .main-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: var(--spacing-6);
    margin-bottom: var(--spacing-6);
    align-items: start;
    transition: all 0.5s ease;
  }

  .main-layout.expanded {
    grid-template-columns: 1fr;
  }

  .video-container {
    border-radius: var(--radius-lg);
    overflow: hidden;
    background-color: var(--color-surface);
    transition: width 0.3s ease;
  }

  .video-wrapper {
    position: relative;
    width: 100%;
    padding-top: 56.25%;
    overflow: hidden;
  }

  video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: pointer;
    transition: transform 0.2s ease;
    transform-origin: center;
  }

  .video-controls-wrapper {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, transparent 100%);
    padding: var(--spacing-4);
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 2;
  }

  .video-wrapper:hover .video-controls-wrapper {
    opacity: 1;
  }

  .video-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    background: var(--color-surface);
    padding: var(--spacing-2);
    border-radius: var(--radius-lg);
  }

  .left-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    min-width: max-content;
  }

  .time-display {
    color: rgba(255, 255, 255, 0.8);
    font-size: 13px;
    display: flex;
    gap: var(--spacing-1);
  }

  .time-separator {
    opacity: 0.4;
  }

  .control-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    padding: var(--spacing-1);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    border-radius: var(--radius-sm);
  }

  .control-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .control-btn svg {
    width: 20px;
    height: 20px;
  }

  .details-card {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    padding: var(--spacing-6);
    height: fit-content;
    position: sticky;
    top: var(--spacing-6);
    transform-origin: top;
    will-change: transform, opacity;
  }

  .expanded .details-card {
    position: relative;
    top: 0;
    margin-top: var(--spacing-6);
    width: 100%;
  }

  .details-card h2 {
    font-size: var(--font-size-xl);
    margin-bottom: var(--spacing-6);
    color: var(--color-text-primary);
  }

  .details-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .detail-item {
    opacity: 0;
    transform: translateY(10px);
    animation: detailFadeIn 0.5s ease forwards;
  }

  @keyframes detailFadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .detail-label {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .detail-value {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    color: var(--color-text-primary);
    font-size: var(--font-size-base);
  }

  .detail-value svg {
    color: var(--color-text-primary);
  }

  .description {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    padding: var(--spacing-6);
  }

  .description h2 {
    font-size: var(--font-size-xl);
    margin-bottom: var(--spacing-4);
    color: var(--color-text-primary);
  }

  .description p {
    color: var(--color-text-secondary);
    line-height: 1.6;
  }

  @media (max-width: 1200px) {
    .main-layout {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .video-controls {
      opacity: 1;
    }
  }

  .copy-position {
    margin-top: var(--spacing-6);
    width: 100%;
    padding: var(--spacing-3);
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    transition: background-color 0.2s ease;
  }

  .copy-position:hover {
    background-color: var(--color-primary-hover);
  }

  .copy-position:active {
    transform: translateY(1px);
  }

  .copy-position svg {
    width: 16px;
    height: 16px;
  }

  .video-section {
    opacity: 0;
    animation: sectionFadeIn 1s ease forwards;
    animation-delay: 100ms;
    height: fit-content;
    min-height: 100%;
    position: relative;
    transform: translateZ(0);
  }

  .video-container {
    position: relative;
    width: 100%;
    border-radius: var(--radius-lg);
    overflow: hidden;
    background-color: var(--color-surface);
    height: fit-content;
  }

  .video-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    background: var(--color-surface);
  }

  @keyframes sectionFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .tab-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4) 0;
    border-top: 1px solid var(--color-border);
  }

  .segmented-control {
    display: flex;
    background: var(--color-surface);
    /* padding: var(--spacing-1); */
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
    font-weight: var(--font-weight-medium);
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
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: var(--font-size-base);
  }

  .interaction-btn:hover,
  .interaction-btn.active {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .interaction-btn.share-btn {
    background: var(--color-surface);
    border-radius: var(--radius-md);
    padding: var(--spacing-2) var(--spacing-4);
  }

  .interaction-btn.share-btn:hover {
    background: var(--color-surface-hover);
  }

  .progress-bar {
    flex: 1;
    height: 16px;
    background: transparent;
    cursor: pointer;
    position: relative;
    margin: 0 var(--spacing-4);
    display: flex;
    align-items: center;
  }

  .progress-bar::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 1.5px;
  }

  .progress-bar-filled {
    height: 3px;
    background: #ff4545;
    border-radius: 1.5px;
    position: absolute;
    left: 0;
    /* transition: width 0.1s linear; */
  }

  .progress-handle {
    position: absolute;
    top: 50%;
    width: 10px;
    height: 10px;
    background: #ff4545;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    opacity: 0;
  }

  .progress-bar:hover .progress-handle {
    opacity: 1;
  }

  .speed-control {
    position: relative;
    display: flex;
    align-items: center;
  }

  .speed-menu {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: var(--spacing-2);
    background: var(--color-surface);
    border-radius: var(--radius-md);
    padding: var(--spacing-1);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    min-width: 80px;
    z-index: 10;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--color-border);
  }

  .speed-btn {
    min-width: 46px;
    text-align: center;
  }

  .speed-label {
    font-size: 13px;
    font-weight: var(--font-weight-medium);
    display: block;
  }

  .speed-option {
    padding: var(--spacing-2) var(--spacing-3);
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 13px;
    text-align: center;
    border-radius: var(--radius-sm);
    transition: all 0.2s;
  }

  .speed-option:hover,
  .speed-option.active {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .right-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .volume-control-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .volume-control {
    position: relative;
    display: flex;
    align-items: center;
  }

  .volume-slider-container {
    position: absolute;
    bottom: calc(100% + var(--spacing-2));
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-surface);
    padding: var(--spacing-2);
    border-radius: var(--radius-md);
    z-index: 10;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--color-border);
  }

  .volume-slider-container::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 0;
    width: 100%;
    height: 8px;
    background: transparent;
  }

  .volume-slider-wrapper {
    position: relative;
    height: 100px;
    width: 24px;
    padding: var(--spacing-2);
  }

  .volume-slider-track {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 12px;
    width: 4px;
    height: 76px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .volume-slider-fill {
    position: absolute;
    bottom: 0;
    width: 100%;
    background: #ff4545;
    border-radius: 2px;
  }

  .volume-slider {
    -webkit-appearance: none;
    appearance: none;
    position: absolute;
    bottom: 50%;
    width: 76px;
    height: 4px;
    background: transparent;
    transform-origin: left center;
    transform: rotate(-90deg) translateX(-50%) translateY(4px);
    cursor: pointer;
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    transform: translateY(-4px);
    border-radius: 50%;
    background: #ff4545;
    cursor: pointer;
    /* border: 2px solid rgba(0, 0, 0, 0.4); */
  }

  .volume-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ff4545;
    cursor: pointer;
    border: 2px solid rgba(0, 0, 0, 0.4);
  }

  .volume-slider::-webkit-slider-runnable-track {
    width: 100%;
    height: 4px;
    background: transparent;
  }

  .volume-slider::-moz-range-track {
    width: 100%;
    height: 4px;
    background: transparent;
  }

  .time-preview {
    position: absolute;
    bottom: calc(100% + 8px);
    transform: translateX(-50%);
    background: var(--color-surface);
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    pointer-events: none;
    white-space: nowrap;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--color-border);
  }

  .time-preview::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: var(--color-surface);
  }

  .zoom-controls {
    position: absolute;
    top: var(--spacing-4);
    right: var(--spacing-4);
    display: flex;
    gap: var(--spacing-1);
    z-index: 2;
  }

  .zoom-btn {
    background: var(--color-surface);
    border: none;
    color: var(--color-text-secondary);
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    opacity: 0;
    transform: translateX(20px);
    animation: zoomControlFadeIn 0.5s ease forwards;
  }

  @keyframes zoomControlFadeIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .zoom-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .zoom-btn.active {
    background: var(--color-primary);
    color: white;
  }

  .crosshair {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .crosshair-vertical,
  .crosshair-horizontal {
    position: absolute;
    background: rgba(255, 255, 255, 1);
/*     box-shadow: 0 0 1px rgba(0, 0, 0, 1); */
  }

  .crosshair-vertical {
    position: absolute;
    width: 2px;
    height: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 1);
    clip-path: polygon(
      0 0, 
      100% 0, 
      100% calc(50% - 4px), 
      0 calc(50% - 4px), 
      0 calc(50% + 4px), 
      100% calc(50% + 4px), 
      100% 100%, 
      0 100%
    );
  }

  .crosshair-horizontal {
    position: absolute;
    height: 2px;
    width: 100%;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 1);
    clip-path: polygon(
      0 0,
      calc(50% - 4px) 0,
      calc(50% - 4px) 100%,
      0 100%,
      0 0,
      100% 0,
      100% 100%,
      calc(50% + 4px) 100%,
      calc(50% + 4px) 0,
      calc(50% - 4px) 0
    );
  }

  .crosshair-dot {
    display: none;
  }

  .zoom-btn.active:not(:hover) {
    background: var(--color-primary);
    color: white;
  }

  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: zoom-in;
    transition: transform 0.2s ease;
    transform-origin: center;
  }

  .video-controls-wrapper {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
  }

  .video-wrapper:hover .video-controls-wrapper {
    opacity: 1;
    pointer-events: auto;
  }

  :global([data-tab="lineup"]) .video-controls-wrapper {
    display: none;
  }

  .views-btn {
    cursor: default;
    user-select: none;
  }

  .views-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .details-heading,
  .copy-position {
    opacity: 0;
    visibility: hidden;
    transform: translateY(-20px);
    animation: detailSlideDown 0.5s ease forwards;
  }

  @keyframes detailSlideDown {
    from {
      opacity: 0;
      visibility: hidden;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
  }

  .video-section,
  .details-card {
    opacity: 0;
    animation: sectionFadeIn 1s ease forwards;
    animation-delay: 100ms;
  }

  .details-card {
    animation-delay: 100ms; /* Slight delay for the details card */
  }

  @keyframes sectionFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .copy-position {
    /* ... existing styles ... */
    transition: all 0.2s ease;
  }

  .copy-position:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: var(--color-surface);
  }

  .copy-position:not(:disabled):hover {
    background-color: var(--color-primary-hover);
  }

  .copy-position:not(:disabled):active {
    transform: translateY(1px);
  }

  /* Optional: Add a tooltip style for the disabled state */
  .copy-position:disabled::after {
    content: 'No position data available';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-surface);
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  .copy-position:disabled:hover::after {
    opacity: 1;
  }

  .no-media {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--color-surface);
    color: var(--color-text-secondary);
    gap: var(--spacing-4);
  }

  .no-media svg {
    opacity: 0.5;
  }

  .no-media p {
    font-size: var(--font-size-base);
    margin: 0;
  }

  /* Update the segmented control styles to handle single tab */
  .segmented-control {
    display: flex;
    background: var(--color-surface);
    /* padding: var(--spacing-1); */
    border-radius: var(--radius-md);
    gap: var(--spacing-1);
  }

  /* Hide the entire tab controls if no media is available */
  .tab-controls:empty {
    display: none;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-surface);
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .action-btn.active {
    color: var(--color-primary);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-btn:disabled:hover {
    background: var(--color-surface);
    color: var(--color-text-secondary);
  }

  .lineup-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    cursor: default;
  }

  .lineup-mode .video-controls-wrapper {
    display: none !important;
  }
</style> 