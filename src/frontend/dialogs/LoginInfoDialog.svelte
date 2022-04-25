<script lang="ts">
  import { currentDialog } from '../stores/currentDialog.svelte';
  import ModalDialog from '../common/ModalDialog.svelte';
  import { userInfo } from '../stores/user_info';

  $: userName = $userInfo!.firstName
    ? $userInfo!.firstName + ' ' + $userInfo!.lastName
    : $userInfo!.lastName;
  function requestReset() {
    closeDialog();
    //$currentDialog = TBD;
  }

  function closeDialog() {
    $currentDialog = null;
  }
</script>

<ModalDialog title="Login Information" contentClasses="login-info-content">
  <div class="login-info alert-warning pt-3 pb-3">
    {#if $userInfo?.priorLoginDate}
      <div class="row mb-4">
        <div>
          Your are logged in as<br /><span class="user_name">{userName}</span>
          {#if $userInfo.affiliation}<br />{$userInfo.affiliation}{/if}
        </div>
      </div>
      <div class="row mb-4">
        <div>
          at IP address <span class="ip">{$userInfo?.lastLoginIP}</span>.
        </div>
      </div>
      <div class="row mb-2">
        <div>
          You previous login was on<br />{new Date(
            $userInfo.priorLoginDate
          ).toLocaleString()}.<br />
          {#if $userInfo.priorLoginIP == $userInfo.lastLoginIP}
            from the same IP address.
          {:else}
            from IP <span class="ip">{$userInfo.priorLoginIP}</span>.
          {/if}
        </div>
      </div>
    {:else}
      <div class="row mb-2"><div>This is your first login.</div></div>
      <div class="row">
        <div>Your IP address is <span class="ip">{$userInfo?.lastLoginIP}</span>.</div>
      </div>
    {/if}
  </div>
  <div class="row g-2">
    <div class="col-12 text-center">
      <button class="btn btn-minor" type="button" on:click={requestReset}
        >Request Password Reset</button
      >
      <button class="btn btn-major" type="submit" on:click={closeDialog}>Close</button>
    </div>
  </div>
</ModalDialog>

<style lang="scss">
  @import '../variables.scss';

  :global(.login-info-content) {
    margin: 0 auto;
    max-width: 28rem;
  }

  .login-info {
    border-radius: $border-radius;
    text-align: center;
  }

  span.user_name {
    font-weight: bold;
  }

  span.ip {
    font-weight: bold;
  }

  button {
    margin: 1.5rem 0.5rem 0 0.5rem;
  }
</style>
