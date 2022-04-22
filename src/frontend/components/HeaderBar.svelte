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

  const padlockIcon = `<svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24" width="24px" height="24px">    <path d="M 12 1 C 8.6761905 1 6 3.6761905 6 7 L 6 8 C 4.9 8 4 8.9 4 10 L 4 20 C 4 21.1 4.9 22 6 22 L 18 22 C 19.1 22 20 21.1 20 20 L 20 10 C 20 8.9 19.1 8 18 8 L 18 7 C 18 3.6761905 15.32381 1 12 1 z M 12 3 C 14.27619 3 16 4.7238095 16 7 L 16 8 L 8 8 L 8 7 C 8 4.7238095 9.7238095 3 12 3 z M 12 13 C 13.1 13 14 13.9 14 15 C 14 16.1 13.1 17 12 17 C 10.9 17 10 16.1 10 15 C 10 13.9 10.9 13 12 13 z"/></svg>`;

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
          <div class="padlock">{@html padlockIcon}</div>
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
    margin-right: 0.4rem;
  }
  .padlock {
    display: inline-block;
    padding: 1px 4px 2px 4px;
    margin-right: 0.4rem;
    border-radius: $border-radius;
    fill: $blueLinkBackColor;
    cursor: pointer;
  }
  .padlock:hover {
    fill: $backgroundColor;
    background-color: $blueLinkBackColor;
  }
</style>
