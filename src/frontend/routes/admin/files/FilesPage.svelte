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
          instructions: `Provide the site's title and subtitle on two separate lines. These correspond to the ${_toVarNames(
            commonTemplateVars
          )} variables used in other files. Changes apply to the website the next time the user loads the website (e.g. a page reload), and they apply immediately to email templates.`
        },
        {
          dataKey: DataKey.WelcomePage,
          title: 'Welcome Page',
          instructions: `Provide the HTML for the Welcome page. You may use the ${_toVarNames(
            commonTemplateVars
          )} variables. You may also use any CSS class available in Bootstrap 5. You may pull in images from other websites or upload them to this site at /var/www/html/static, referencing them relative to the URL "/static/" (via the &lt;img&gt; tag). Changes apply the next time the user loads the website (e.g. a page reload).`
        },
        {
          dataKey: DataKey.DefaultQueryFields,
          title: 'Default Query Fields',
          instructions: `Provide the default query fields, which are shown when the user first visits the Queries tab and after the user clears the Queries tab. Letter case does not matter. The default fields are shown in the order given here. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. All of the query fields appear in this file, but the ones not occurring as defaults are commented out, informing you of their names. If you accidentally delete fields, you can visit the <a href="TBD">source file</a> to recover them. Changes apply the next time the user loads the website (e.g. a page reload).`
        }
      ]
    },
    {
      name: 'Locality Characterization',
      specs: [
        {
          dataKey: DataKey.KarstRegions,
          title: 'Karst Regions',
          instructions: `List of all region shapefiles that have been uploaded to <a href="https://www.mapbox.com/" target="_blank">MapBox</a>, along with their characterizations. Upload these as 'tilesets' to <a href="https://studio.mapbox.com/" target="_blank">MapBox Studio</a>. List each tileset here on its own line in the format "[KR|KFR]: <i>property-name</i>, <i>tileset-name</i>, <i>tileset-ID</i>" (e.g. "KR: Region, Karst_Regions_TSS-4adrg1, jtlapput.d6bu8w0a"). Use 'KR' for Texas-wide karst regions and 'KFR' for karst faunal regions. Retrieve the tileset name and tileset ID from MapBox Studio after uploading the shapefile. <i>property-name</i> is the name of the property within the shapefile that describes a region and can vary from file to file. You can have multiple KR and KFR lines, one for each shapefile tileset. The order in which you list them does not matter. Everything is case-sensitive. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. Changes apply on each user's next browser session. To update an existing shapefile, click the '...' next to the name of the shapefile in MapBox Studio and then click 'Replace'.`
        },
        {
          dataKey: DataKey.TerrestrialKarstTerms,
          title: 'Terrestrial Karst Terms',
          instructions:
            "List terms that necessarily designate a locality as terrestrial karst, one term per line. Terms are not case sensitive and may include spaces and punctuation, but they must indicate complete words, not portions of words. Any given locality can be both terrestrial and aquatic. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. Changes apply on the next import from GBIF."
        },
        {
          dataKey: DataKey.TerrestrialKarstLocalities,
          title: 'Terrestrial Karst Localities',
          instructions:
            "List of the locality names of terrestrial karst features (e.g. caves) not designated at terrestrial karst by a term. Any given locality can be both terrestrial and aquatic. You must follow each locality name with the county name in parentheses. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. Changes apply on the next import from GBIF."
        },
        {
          dataKey: DataKey.AquaticKarstTerms,
          title: 'Aquatic Karst Terms',
          instructions:
            "List terms that necessarily designate a locality as aquatic karst, one term per line. Terms are not case sensitive and may include spaces and punctuation, but they must indicate complete words, not portions of words. Not case sensitive. Any given locality can be both terrestrial and aquatic. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. Changes apply on the next import from GBIF."
        },
        {
          dataKey: DataKey.AquaticKarstLocalities,
          title: 'Aquatic Karst Localities',
          instructions:
            "List of the locality names of aquatic karst features (e.g. springs) not designated at aquatic karst by a term. Any given locality can be both terrestrial and aquatic. You must follow each locality name with the county name in parentheses. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. Changes apply on the next import from GBIF."
        }
      ]
    },
    {
      name: 'Species Characterization',
      specs: [
        {
          dataKey: DataKey.Stygobites,
          title: 'Stygobites',
          instructions:
            "List of all stygobites at one taxon per line. You may list genera, species, and subspecies. Do not include taxon authors. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. Changes apply on the next import from GBIF."
        },
        {
          dataKey: DataKey.Troglobites,
          title: 'Troglobites',
          instructions:
            "List of all stygobites at one taxon per line. You may list genera, species, and subspecies. Do not include taxon authors. Blank lines are ignored, as are lines beginning with '#', which you can use for comments. Changes apply on the next import from GBIF."
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
          dataKey: DataKey.PasswordResetLinkEmail,
          title: 'Password Reset Link Email',
          instructions: `Provide the text for the email that gets sent when the user requests a password reset, providing a link for resetting the password. The first line must begin with "Subject:" and be followed by the email's subject line. Both the subject and body may specify any of the following variables in curly brackets: ${_toVarNames(
            resetRequestEmailVars
          )}. The email must include at least the reset link. Don't include any HTML. Changes apply to the next email sent.`
        },
        {
          dataKey: DataKey.NewPasswordEmail,
          title: 'New Password Email',
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
    <p class="addendum">
      The sysadmin maintains additional site configuration in a '.env' file that is part
      of the deployment. This file specifies the site URL, the directory in which to
      store log files, the details of the database connection, the <a
        href="https://www.mapbox.com/"
        target="_blank">MapBox</a
      >
      access token for displaying maps, and the
      <a href="https://sendgrid.com/" target="_blank">SendGrid</a> API key for sending user
      credential emails. It can also specify website tabs to hide from users, which is useful
      for tabs that are under development or that have issues requiring resolution.
    </p>
  </div>
</AdminTabRoute>

{#if dialogFileSpec}
  <FileDialog fileSpec={dialogFileSpec} close={closeDialog} />
{/if}

<style>
  .addendum {
    font-size: 0.9rem;
    margin-top: 1.5rem;
  }
</style>
