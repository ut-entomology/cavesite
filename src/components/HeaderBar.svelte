<script lang="ts">
  import { session } from '$app/stores';

  import { DialogSpec } from '../common/VariableDialog.svelte';
  import { Permission } from '../shared/user_info';
  import TabSetSelector from '../components/TabSetSelector.svelte';
  import { currentDialog } from '../stores/currentDialog.svelte';

  const APP_TITLE = 'Texas Underground';
  const APP_SUBTITLE = 'The University of Texas Biospeleological Collection';

  function login() {
    currentDialog.set(new DialogSpec('LoginDialog'));
  }

  function logout() {}
</script>

<div class="header_bar">
  <div class="title_row">
    <div class="app_title">{APP_TITLE}</div>
    <div class="user_menu">
      <div>
        {#if $session.user}
          {#if $session.user.permissions & Permission.Admin}
            <TabSetSelector />
          {/if}
          <button class="btn btn-major" on:click={logout}>Logout</button>
        {:else}
          <button
            class="btn btn-major"
            on:click={login}
          >
            Login
          </button>
        {/if}
      </div>
    </div>
  </div>
  <div class="app_subtitle text">{APP_SUBTITLE}</div>
</div>

<style lang="scss">
  @import '../values';

  .header_bar {
    flex: 0;
    width: 100%;
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
    padding-top: .3rem;
  }
</style>
