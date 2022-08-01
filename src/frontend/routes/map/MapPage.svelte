<script lang="ts">
  import ConfirmationRequest from '../../common/ConfirmationRequest.svelte';
  import DataTabRoute from '../../components/DataTabRoute.svelte';
  import TabHeader from '../../components/TabHeader.svelte';
  import EmptyTab from '../../components/EmptyTab.svelte';
  import { pageName } from '../../stores/pageName';
  import { client } from '../../stores/client';
  import {
    type GeneralQuery,
    type QueryColumnSpec,
    type QueryRow,
    QueryColumnID
  } from '../../../shared/general_query';
  import { getLocationFilter } from '../../lib/query_filtering';

  $pageName = 'Map View';
  const tabName = 'Map';

  let requestClearConfirmation = false;
  let clearInput: () => void;
  let mapLoaded = false;

  function loadMap() {}

  const clearSelections = () => (requestClearConfirmation = true);

  const confirmClear = () => {
    requestClearConfirmation = false;
    clearInput();
    mapLoaded = false;
  };

  const cancelClear = () => (requestClearConfirmation = false);
</script>

<DataTabRoute activeTab={tabName}>
  <svelte:fragment slot="body">
    <div class="container-fluid mb-3">
      <TabHeader {tabName} title={$pageName}>
        <span slot="instructions">TBD</span>
        <span slot="main-buttons">
          {#if mapLoaded}
            <button class="btn btn-minor" type="button" on:click={clearSelections}
              >Clear</button
            >
          {/if}
          <button class="btn btn-major" type="button" on:click={loadMap}
            >{mapLoaded ? 'Change Map' : 'Load Map'}</button
          >
        </span>
      </TabHeader>

      {#if !mapLoaded}
        <EmptyTab message="No map loaded" />
      {:else}
        <div class="container-fluid gx-1">
          <!--TBD: map-->
        </div>
      {/if}
    </div>
  </svelte:fragment>
</DataTabRoute>

{#if requestClearConfirmation}
  <ConfirmationRequest
    alert="warning"
    message="Clear this map?"
    okayButton="Clear"
    onOkay={confirmClear}
    onCancel={cancelClear}
  />
{/if}
