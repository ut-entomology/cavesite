<script lang="ts">
  const SAMPLE_RATE_MILLIS = 100;
  const text = 'Drag to resize column';

  let classes = '';
  export { classes as class };
  export let onResize: (parentPxWidth: number) => void;
  export let minWidthPx: number;

  let element: HTMLElement;
  let initialX: number;
  let initialWidth = 0; // 0 => not being dragged
  let currentWidth: number;
  let timer: NodeJS.Timeout | null = null;

  const _onMouseDown = (event: MouseEvent) => {
    initialX = event.pageX;
    initialWidth = element.parentElement!.offsetWidth;
    currentWidth = initialWidth;
    timer = setTimeout(_updateWidth, SAMPLE_RATE_MILLIS);
  };

  const _onMouseMove = (event: MouseEvent) => {
    if (initialWidth > 0) {
      const width = initialWidth + event.pageX - initialX;
      currentWidth = width <= minWidthPx ? minWidthPx : width;
    }
  };

  const _onMouseUp = (event: MouseEvent) => {
    if (timer) clearTimeout(timer);
    if (initialWidth > 0) {
      _onMouseMove(event);
      initialWidth = 0;
      onResize(currentWidth);
    }
    timer = null;
  };

  function _updateWidth() {
    onResize(currentWidth);
    timer = setTimeout(_updateWidth, SAMPLE_RATE_MILLIS);
  }
</script>

<svelte:window on:mousemove={_onMouseMove} on:mouseup={_onMouseUp} />

<div bind:this={element} class={classes} on:mousedown={_onMouseDown}>
  <img src="/non-skid-icon-2x3.png" title={text} alt={text} draggable="false" />
</div>

<style>
  div {
    cursor: ew-resize;
    user-select: none;
  }
  div img {
    border-right: 1px solid black;
  }
</style>
