<script lang="ts">
  import { user } from '../stores/user';

  import { Permission } from '../../shared/user_auth';
  import { DialogSpec } from '../common/VariableDialog.svelte';
  import { flashMessage } from '../common/VariableFlash.svelte';
  import TabSetSelector from '../components/TabSetSelector.svelte';
  import { currentDialog } from '../stores/currentDialog.svelte';
  import { client, setCSRF } from '../stores/client';

  const APP_TITLE = 'Texas Underground';
  const APP_SUBTITLE = 'The University of Texas Biospeleological Collection';

  function login() {
    currentDialog.set(new DialogSpec('LoginDialog'));
  }

  async function logout() {
    const res = await $client.post('/apis/logout');
    setCSRF(null);
    if (res.status == 200) {
      await flashMessage('You have logged out');
    } else {
      await flashMessage(`Error ${res.status} logging out`);
    }
  }
</script>

<div class="header_bar">
  <div class="title_row">
    <div class="app_title">{APP_TITLE}</div>
    <div class="user_menu">
      <div>
        {#if $user}
          {#if $user.permissions & Permission.Admin}
            <TabSetSelector />
          {/if}
          <button class="btn btn-major" on:click={logout}>Logout</button>
        {:else}
          <button class="btn btn-major" on:click={login}> Login </button>
        {/if}
      </div>
    </div>
  </div>
  <div class="app_subtitle text">{APP_SUBTITLE}</div>
</div>

<style lang="scss">
  @import '../variables.scss';

  .header_bar {
    flex: 0;
    color: $pageBarTextColor;
    padding: 0.5rem 0;
  }

  .title_row {
    display: flex;
    justify-content: space-between;
  }

  .app_title {
    color: $texasRed;
    font-size: 1.5rem;
    font-weight: bold;
  }

  .app_subtitle {
    font-size: 1.1rem;
  }

  .user_menu {
    padding-top: 0.3rem;
  }
</style>
