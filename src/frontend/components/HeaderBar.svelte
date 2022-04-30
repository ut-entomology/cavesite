<script lang="ts">
  import page from 'page';

  import { Permission } from '../../shared/user_auth';
  import { DialogSpec } from '../common/VariableDialog.svelte';
  import { flashMessage } from '../common/VariableFlash.svelte';
  import TabSetSelector from '../components/TabSetSelector.svelte';
  import { currentDialog } from '../stores/currentDialog.svelte';
  import { appInfo } from '../stores/app_info';
  import { userInfo } from '../stores/user_info';
  import { logoutUser } from '../util/user_util';

  function login() {
    currentDialog.set(new DialogSpec('LoginDialog'));
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
    currentDialog.set(new DialogSpec('LoginInfoDialog'));
  }
</script>

<div class="header_bar">
  <div class="title_row">
    <div class="app_title">{$appInfo.appTitle}</div>
    <div class="user_menu">
      <div>
        {#if $userInfo}
          {#if $userInfo.permissions & Permission.Admin}
            <TabSetSelector />
          {/if}
          <div
            class="login_info"
            on:click={showLoginInfo}
            aria-label="Login information"
          >
            i
          </div>
          <!-- <button
            class="btn btn-minor login_info"
            aria-label="Login information"
            on:click={showLoginInfo}>i</button
          > -->
          <button class="btn btn-major" on:click={logout}>Logout</button>
        {:else}
          <button class="btn btn-major" on:click={login}>Login</button>
        {/if}
      </div>
    </div>
  </div>
  <div class="app_subtitle text">{$appInfo.appSubtitle}</div>
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
  // button.login_info {
  //   margin-right: 0.4rem;
  //   padding: 0 0.5rem;
  //   font-family: 'Courier New', Courier, 'Lucida Sans Typewriter', 'Lucida Typewriter',
  //     monospace;
  //   font-weight: bold;
  //   font-size: 1.2rem;
  //   line-height: 1.7rem;
  // }

  .login_info {
    display: inline-block;
    width: 1.8rem;
    height: 1.8rem;
    margin-right: 0.4rem;
    border: 1px solid $blueLinkBackColor;
    border-radius: 0.9rem;
    color: $blueLinkBackColor;
    font-family: 'Courier New', Courier, 'Lucida Sans Typewriter', 'Lucida Typewriter',
      monospace;
    font-weight: bold;
    font-size: 1.2rem;
    text-align: center;
    vertical-align: middle;
    cursor: pointer;
  }
  .login_info:hover {
    color: $backgroundColor;
    background-color: $blueLinkBackColor;
  }
</style>
