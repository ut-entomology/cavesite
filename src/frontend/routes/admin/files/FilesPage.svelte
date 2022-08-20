<script lang="ts" context="module">
  import { createSessionStore } from '../../../util/session_store';

  export const dataKey = createSessionStore<string | null>('data_key', null);
</script>

<script lang="ts">
  import AdminTabRoute from '../../../components/AdminTabRoute.svelte';
  import TabHeader from '../../../components/TabHeader.svelte';
  import FileDialog, { type FileSpec } from './FileDialog.svelte';
  import { pageName } from '../../../stores/pageName';
  import { DataKey } from '../../../../shared/data_keys';

  $pageName = 'Data Files';
  const tabName = 'Files';

  const fileSpecs: FileSpec[] = [
    {
      dataKey: DataKey.CaveLocalities,
      title: 'Cave Localities',
      instructions:
        "List of the locality names of caves not having the text 'cave' in their names. You must follow each locality name with the county name in parentheses. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. Changes apply on the next import from GBIF."
    },
    {
      dataKey: DataKey.CaveObligates,
      title: 'Cave Obligates',
      instructions:
        "List of all cave obligates at one taxon per line. You may list genera, species, and subspecies. Do not include taxon authors. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. Changes apply on the next import from GBIF."
    }
  ];

  let dialogFileSpec = fileSpecs.find((spec) => spec.dataKey == $dataKey) || null;

  function openDialog(fileSpec: FileSpec) {
    $dataKey = fileSpec.dataKey;
    dialogFileSpec = fileSpec;
  }

  function closeDialog() {
    $dataKey = null;
    dialogFileSpec = null;
  }
</script>

<AdminTabRoute activeTab="Files">
  <div class="container-fluid">
    <TabHeader {tabName} title={$pageName}>
      <span slot="instructions">
        These data files govern the operation of the website. Click on a file to view or
        edit it. They are stored in the database rather than in the file system so that
        they get backed up with the database.
      </span>
    </TabHeader>
    <ul class="mt-3 mb-3">
      {#each fileSpecs as fileSpec}
        <li>
          <span class="link_text" on:click={() => openDialog(fileSpec)}
            >{fileSpec.title}</span
          >
        </li>
      {/each}
    </ul>
  </div>
</AdminTabRoute>

{#if dialogFileSpec}
  <FileDialog fileSpec={dialogFileSpec} close={closeDialog} />
{/if}
