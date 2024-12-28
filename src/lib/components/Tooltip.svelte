<script lang="ts">
  export let text: string = '';
  export let position: 'top' | 'right' | 'bottom' | 'left' = 'top';
  export let delay: number = 0;
  
  let visible = false;
  let timeoutId: NodeJS.Timeout;

  function showTooltip() {
    timeoutId = setTimeout(() => {
      visible = true;
    }, delay);
  }

  function hideTooltip() {
    clearTimeout(timeoutId);
    visible = false;
  }
</script>

<div 
  class="tooltip-wrapper"
  on:mouseenter={showTooltip}
  on:mouseleave={hideTooltip}
  on:focusin={showTooltip}
  on:focusout={hideTooltip}
>
  <slot />
  {#if visible}
    <div class="tooltip" class:visible data-position={position}>
      {text}
    </div>
  {/if}
</div>

<style>
  .tooltip-wrapper {
    position: relative;
    display: inline-flex;
  }

  .tooltip {
    position: absolute;
    background-color: var(--color-surface-active);
    color: var(--color-text-primary);
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    white-space: nowrap;
    z-index: var(--z-tooltip);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--color-border);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .tooltip.visible {
    opacity: 1;
  }

  /* Position variants */
  .tooltip[data-position="top"] {
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
  }

  .tooltip[data-position="bottom"] {
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
  }

  .tooltip[data-position="left"] {
    right: calc(100% + 8px);
    top: 50%;
    transform: translateY(-50%);
  }

  .tooltip[data-position="right"] {
    left: calc(100% + 8px);
    top: 50%;
    transform: translateY(-50%);
  }

  /* Arrows */
  .tooltip[data-position]::after {
    content: '';
    position: absolute;
    border: 5px solid transparent;
  }

  .tooltip[data-position="top"]::after {
    border-top-color: var(--color-surface-active);
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
  }

  .tooltip[data-position="bottom"]::after {
    border-bottom-color: var(--color-surface-active);
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
  }

  .tooltip[data-position="left"]::after {
    border-left-color: var(--color-surface-active);
    right: -10px;
    top: 50%;
    transform: translateY(-50%);
  }

  .tooltip[data-position="right"]::after {
    border-right-color: var(--color-surface-active);
    left: -10px;
    top: 50%;
    transform: translateY(-50%);
  }
</style> 