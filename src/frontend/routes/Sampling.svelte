<script lang="ts">
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import { effortPoints } from '../stores/effortPoints';

  const loadPoints = async () => {
    //
  };
</script>

<DataTabRoute activeTab="Sampling">
  <div class="container-fluid">
    <TabHeader title="Sampling Effort" instructions="Instructions TBD">
      <span slot="main-buttons">
        {#if $effortPoints != null}
          [Per Visit|Per Person-Visit]
        {/if}
      </span>
    </TabHeader>

    {#if $effortPoints === null}
      <button class="btn btn-major" type="button" on:click={loadPoints}
        >Load Data</button
      >
    {/if}
  </div>
</DataTabRoute>
