<script lang="ts">
  import { getReasonPhrase } from 'http-status-codes';

  export let error: any;
</script>

<div>
  Server error: <span>{getReasonPhrase(error.status)}</span>
</div>

<style>
  div {
    margin: 1.5em 1em;
  }
  span {
    color: red;
    font-weight: bold;
  }
</style>
