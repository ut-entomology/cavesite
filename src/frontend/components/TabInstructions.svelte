<script lang="ts">
  export let classes: string = '';
</script>

<div class="row justify-content-center">
  <div class="tab-instructions {classes}">
    <slot />
  </div>
</div>
