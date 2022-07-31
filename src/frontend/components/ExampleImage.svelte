<script lang="ts">
  export let src: string;
  export let alt: string;
  export let header = 'EXAMPLE';
  export let padding: number = 0; // em
</script>

<div class="image">
  {#if header != ''}
    <div style="margin-bottom: {padding}em">{header}</div>
  {/if}
  <img {src} {alt} />
</div>

<style>
  .image {
    margin: 1rem 0 1.5rem 0;
    text-align: center;
    font-weight: bold;
    color: #bbb;
  }
</style>
