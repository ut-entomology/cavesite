<script lang="ts">
  export let message: string;
</script>

<div class="message">{@html message}</div>

<style>
  .message {
    margin: 2rem 0;
    text-align: center;
    font-size: 1.1rem;
  }

  :global(.empty-tab-parens) {
    margin-top: 0.2rem;
    font-size: 90%;
  }
</style>
