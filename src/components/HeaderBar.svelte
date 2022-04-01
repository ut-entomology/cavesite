<script lang="ts">
  //import { flashMessage } from '../common/VariableFlash.svelte';
  //import { showNotice } from '../common/VariableNotice.svelte';

  export let appTitle = 'Texas Underground';

  const currentUser:any = null;

  function login() {}

  function logout() {}
</script>

<div class="header_bar container-flud g-0">
  <div class="row">
    <div class="col-3 app_title">{appTitle}</div>
    <div class="col-6 logged_in_user">
      {#if currentUser === null}
        <span>not logged in</span>
      {:else}
        <div>
          {currentUser.name}
          {#if currentUser.saved}
            <span>(saved login)</span>
          {/if}
        </div>
      {/if}
    </div>
    <div class="col-3 login_logout">
      <div>
        {#if currentUser === null}
          <button
            class="btn btn-major compact"
            on:click={login}
          >
            Login
          </button>
        {:else}
          <button class="btn btn-minor compact" on:click={logout}>Logout</button>
        {/if}
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  @import '../values';

  .header_bar {
    flex: 0;
    width: 100%;
    background-color: $pageBarBackgroundColor;
    color: $pageBarTextColor;
    padding: 0.3rem $horizontalMargin;
  }

  .app_title,
  .logged_in_user,
  .login_logout {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .app_title {
    color: rgb(172, 92, 0);
  }

  .logged_in_user {
    text-align: center;
  }

  .login_logout {
    text-align: right;
  }

  .login_logout .btn {
    // .btn's vertical align messes up vertical centering
    vertical-align: baseline;
  }

  .logged_in_user span {
    font-style: italic;
  }
</style>
