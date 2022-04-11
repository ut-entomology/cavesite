<script lang='ts'>
// modified from https://github.com/bestguy/sveltestrap (v5.9.0)
// due to intermittend problems using sveltestrap

import classnames from './utils';
  import Button from './Button.svelte';

  let className = '';
  export { className as class };
  export let icon: string | null = null;
  export let toggle: ((event: any) => void) | null = null;
  export let closeAriaLabel = 'Close';

  $: classes = classnames(className, 'toast-header');

  $: tagClassName = classnames('me-auto', { 'ms-2': icon != null });
</script>

<div {...$$restProps} class={classes}>
  {#if icon}
    <svg
      class={`rounded text-${icon}`}
      width="20"
      height="20"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      focusable="false"
      role="img"
    >
      <rect fill="currentColor" width="100%" height="100%" />
    </svg>
  {:else}
    <slot name="icon" />
  {/if}
  <strong class={tagClassName}>
    <slot />
  </strong>
  {#if toggle}
    <slot name="close">
      <Button close on:click={toggle} aria-label={closeAriaLabel} />
    </slot>
  {/if}
</div>
