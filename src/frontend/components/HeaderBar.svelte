<script lang="ts">
  import page from 'page';

  import CircleIconButton from './CircleIconButton.svelte';
  import { Permission } from '../../shared/user_auth';
  import { DialogSpec } from '../common/VariableDialog.svelte';
  import { flashMessage } from '../common/VariableFlash.svelte';
  import TabSetSelector from '../components/TabSetSelector.svelte';
  import { globalDialog } from '../stores/globalDialog.svelte';
  import { userInfo } from '../stores/user_info';
  import { logoutUser } from '../util/user_util';
  import { appInfo } from '../stores/app_info';

  function login() {
    globalDialog.set(new DialogSpec('LoginDialog'));
  }

  async function logout() {
    try {
      await logoutUser(true);
      page('/');
    } catch (err: any) {
      await flashMessage(`Error ${err.response.status} logging out`);
    }
  }

  function showLoginInfo() {
    globalDialog.set(new DialogSpec('LoginInfoDialog'));
  }
</script>

<header>
  <div class="container-fluid">
    <div class="title_row">
      <div class="app_title">{$appInfo.appTitle}</div>
      <div class="user_menu">
        <div>
          {#if $userInfo}
            {#if $userInfo.permissions & Permission.Admin}
              <TabSetSelector />
            {/if}
            <CircleIconButton
              class="login_info_button"
              on:click={showLoginInfo}
              bordered={true}
              label="Login information"
            >
              i
            </CircleIconButton>
            <button class="btn btn-major compact" on:click={logout}>Logout</button>
          {:else}
            <button class="btn btn-minor compact" on:click={login}>Admin Login</button>
          {/if}
        </div>
      </div>
    </div>
    <div class="app_subtitle text">{$appInfo.appSubtitle}</div>
  </div>
</header>

<style lang="scss">
  @import '../variables.scss';

  header {
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

  :global(.login_info_button) {
    width: 1.6rem;
    height: 1.6rem;
    margin-right: 0.4rem;
    font-family: 'Courier New', Courier, 'Lucida Sans Typewriter', 'Lucida Typewriter',
      monospace;
    font-weight: bold;
    font-size: 1.05rem;
  }
</style>
