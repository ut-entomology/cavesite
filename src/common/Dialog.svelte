<script lang="ts">
  let classes: string | undefined = undefined;

  export let title: string;
  export { classes as class };
</script>

<div class="dialog {classes ? classes : ''}">
  <div class="row">
    <h2 class="col">{title}</h2>
  </div>
  <slot />
</div>
