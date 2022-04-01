<script>
// modified from https://github.com/bestguy/sveltestrap (v5.9.0)
// due to intermittend problems using sveltestrap

import classnames from './utils';

  let className = '';
  export { className as class };

  $: classes = classnames(className, 'toast-body');
</script>

<div {...$$restProps} class={classes}>
  <slot />
</div>
