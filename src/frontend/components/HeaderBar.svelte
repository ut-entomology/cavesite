<script lang="ts">
  import page from 'page';

  import { Permission } from '../../shared/user_auth';
  import { DialogSpec } from '../common/VariableDialog.svelte';
  import { flashMessage } from '../common/VariableFlash.svelte';
  import TabSetSelector from '../components/TabSetSelector.svelte';
  import { currentDialog } from '../stores/currentDialog.svelte';
  import { client } from '../stores/client';
  import { appInfo } from '../stores/app_info';
  import { userInfo } from '../stores/user_info';
  import { setExpiration } from '../util/refresher';

  function login() {
    currentDialog.set(new DialogSpec('LoginDialog'));
  }

  async function logout() {
    try {
      await $client.get('/api/auth/logout');
      //setCSRF(null);
      $userInfo = null;
      setExpiration(0);
      page('/');
    } catch (err: any) {
      await flashMessage(`Error ${err.response.status} logging out`);
    }
  }
</script>

<div class="header_bar">
  <div class="title_row">
    <div class="app_title">{$appInfo.title}</div>
    <div class="user_menu">
      <div>
        {#if $userInfo}
          {#if $userInfo.permissions & Permission.Admin}
            <TabSetSelector />
          {/if}
          <button class="btn btn-major" on:click={logout}>Logout</button>
        {:else}
          <button class="btn btn-major" on:click={login}>Login</button>
        {/if}
      </div>
    </div>
  </div>
  <div class="app_subtitle text">{$appInfo.subtitle}</div>
</div>

<style lang="scss">
  @import '../variables.scss';

  .header_bar {
    flex: 0;
    color: $pageBarTextColor;
    padding: 0.5rem 0 1rem 0;
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
  .user_menu :global(.btn-group) {
    margin-right: 1rem;
  }
</style>
