<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  const STRAPI_URL = import.meta.env.VITE_STRAPI_URL;

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    
    fetch(`${STRAPI_URL}/api/auth/steam/callback?${params.toString()}`)
      .then(response => response.json())
      .then(data => {
        // Send message to parent window
        window.opener.postMessage({
          type: 'STEAM_AUTH_SUCCESS',
          data: data
        }, window.location.origin);
        
        // Close the popup
        window.close();
      })
      .catch(error => {
        window.opener.postMessage({
          type: 'STEAM_AUTH_ERROR',
          error: error.message
        }, window.location.origin);
        window.close();
      });
  });
</script>

<div class="callback-container">
  <div class="loading-text">Processing Steam login...</div>
</div>

<style>
  .callback-container {
    width: 100%;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-background);
  }

  .loading-text {
    color: var(--color-text-primary);
    font-size: var(--font-size-lg);
  }
</style> 