<script lang="ts" context="module">
  import { createSessionStore } from '../../../util/session_store';

  export const dataKey = createSessionStore<string | null>('data_key', null);
</script>

<script lang="ts">
  import AdminTabRoute from '../../../components/AdminTabRoute.svelte';
  import TabHeader from '../../../components/TabHeader.svelte';
  import FileDialog, { type FileSpec } from './FileDialog.svelte';
  import { pageName } from '../../../stores/pageName';
  import {
    DataKey,
    credentialEmailVars,
    resetRequestEmailVars,
    commonTemplateVars
  } from '../../../../shared/data_keys';

  $pageName = 'Data Files';
  const tabName = 'Files';

  interface FileGroup {
    name: string;
    specs: FileSpec[];
  }

  const fileGroups: FileGroup[] = [
    {
      name: 'Presentation',
      specs: [
        {
          dataKey: DataKey.SiteTitleAndSubtitle,
          title: 'Site Title & Subtitle',
          instructions: `Provide site's title and subtitle on two separate lines. These correspond to the ${_toVarNames(
            commonTemplateVars
          )} variables used in other files. Changes apply to the website the next time the user loads the website (e.g. a page reload), and they apply immediately to email templates.`
        },
        {
          dataKey: DataKey.WelcomePageHTML,
          title: 'Welcome Page',
          instructions: `Provide the HTML for the Welcome page. You may use the ${_toVarNames(
            commonTemplateVars
          )} variables. You may also use any CSS class available in Bootstrap 5. You may pull in images from other websites or upload them to this site at /var/www/html/static, referencing them relative to the URL "/static/" (via the <img> tag). Changes apply the next time the user loads the website (e.g. a page reload).`
        }
      ]
    },
    {
      name: 'Locality Characterization',
      specs: [
        {
          dataKey: DataKey.CaveLocalities,
          title: 'Cave Localities',
          instructions:
            "List of the locality names of caves not having the text 'cave' in their names. You must follow each locality name with the county name in parentheses. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. Changes apply on the next import from GBIF."
        },
        {
          dataKey: DataKey.KarstRegions,
          title: 'Karst Regions',
          instructions: `List of all region shapefiles that have been uploaded to MapBox, along with their characterizations. Upload these as 'tilesets' to MapBox Studio. List each tileset here on its own line in the format "[KR|KFR]: <property-name>, <tileset-name>, <tileset-ID>" (e.g. "KR: Region, Karst_Regions_TSS-4adrg1, jtlapput.d6bu8w0a"). Use 'KR' for Texas-wide karst regions and 'KFR' for karst faunal regions. Retrieve the tileset name and tileset ID from MapBox Studio after uploading the shapefile. <property-name> is the name of the property within the shapefile that describes a region and can vary from file to file. You can have multiple KR and KFR lines, one for each shapefile tileset. The order in which you list them does not matter. Everything is case-sensitive. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. Changes apply on each user's next browser session. To update an existing shapefile, click the '...' next to the name of the shapefile in MapBox Studio and then click 'Replace'.`
        }
      ]
    },
    {
      name: 'Species Characterization',
      specs: [
        {
          dataKey: DataKey.CaveObligates,
          title: 'Cave Obligates',
          instructions:
            "List of all cave obligates at one taxon per line. You may list genera, species, and subspecies. Do not include taxon authors. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. Changes apply on the next import from GBIF."
        },
        {
          dataKey: DataKey.TexasSpeciesStatus,
          title: 'Texas Species Status',
          instructions: `List of all cave invertebrate species that Texas monitors for conservation. Each line must list a species name, the state rank, and the TPWD status, in this order and separated by commas. For example, "Cicurina serena, S1, SGCN". Don't include the author name. You may leave the state rank or the TPWD status blank, provided that you still include the commas. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. Changes apply on the next import from GBIF.`
        },
        {
          dataKey: DataKey.FederalSpeciesStatus,
          title: 'Federal Species Status',
          instructions: `List of all federally listed cave invertebrate species at one per line. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. Changes apply on the next import from GBIF.`
        }
      ]
    },
    {
      name: 'Email Templates',
      specs: [
        {
          dataKey: DataKey.NewAccountEmail,
          title: 'New Account Email',
          instructions: `Provide the text for the email that gets sent for newly created user accounts. The first line must begin with "Subject:" and be followed by the email's subject line. Both the subject and body may specify any of the following variables in curly brackets: ${_toVarNames(
            credentialEmailVars
          )}. The email must include at least the password. Don't include any HTML. Changes apply to the next email sent.`
        },
        {
          dataKey: DataKey.ResetRequestEmail,
          title: 'Reset Request Email',
          instructions: `Provide the text for the email that gets sent when the user requests a password reset. The first line must begin with "Subject:" and be followed by the email's subject line. Both the subject and body may specify any of the following variables in curly brackets: ${_toVarNames(
            resetRequestEmailVars
          )}. The email must include at least the reset link. Don't include any HTML. Changes apply to the next email sent.`
        },
        {
          dataKey: DataKey.PasswordResetEmail,
          title: 'Password Reset Email',
          instructions: `Provide the text for the email that gets sent when an admin resets a user's password on behalf of the user. The first line must begin with "Subject:" and be followed by the email's subject line. Both the subject and body may specify any of the following variables in curly brackets: ${_toVarNames(
            credentialEmailVars
          )}. The email must include at least the password. Don't include any HTML. Changes apply to the next email sent.`
        }
      ]
    }
  ];

  let dialogFileSpec: FileSpec | null = null;
  for (const group of fileGroups) {
    for (const spec of group.specs) {
      if (spec.dataKey == $dataKey) {
        dialogFileSpec = spec;
        break;
      }
    }
  }

  function openDialog(fileSpec: FileSpec) {
    $dataKey = fileSpec.dataKey;
    dialogFileSpec = fileSpec;
  }

  function closeDialog() {
    $dataKey = null;
    dialogFileSpec = null;
  }

  function _toVarNames(nameList: string[]): string {
    let bracketedNames = nameList.map((n) => `{${n}}`);
    let varNames = bracketedNames.slice(0, nameList.length - 1).join(', ');
    if (nameList.length > 2) varNames += ',';
    return varNames + ' and ' + bracketedNames[nameList.length - 1];
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
    {#each fileGroups as group}
      <div>{group.name}</div>
      <ul class="mt-2 mb-3">
        {#each group.specs as spec}
          <li>
            <span class="link_text" on:click={() => openDialog(spec)}>{spec.title}</span
            >
          </li>
        {/each}
      </ul>
    {/each}
  </div>
</AdminTabRoute>

{#if dialogFileSpec}
  <FileDialog fileSpec={dialogFileSpec} close={closeDialog} />
{/if}
