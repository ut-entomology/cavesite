<script lang="ts">
  export let message: string;
</script>

<div class="message">{@html message}</div>

<style>
  .message {
    margin: 3rem 0;
    text-align: center;
    font-size: 1.2rem;
  }

  :global(.no-selection-paren) {
    margin-top: 0.8rem;
    font-size: 85%;
  }
</style>
