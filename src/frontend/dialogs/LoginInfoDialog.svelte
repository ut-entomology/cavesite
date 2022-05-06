<script lang="ts">
  import { globalDialog } from '../stores/globalDialog.svelte';
  import ModalDialog from '../common/ModalDialog.svelte';
  import { userInfo } from '../stores/user_info';
  import { DialogSpec } from '../common/VariableDialog.svelte';

  $: userName = $userInfo!.firstName
    ? $userInfo!.firstName + ' ' + $userInfo!.lastName
    : $userInfo!.lastName;
  function changePassword() {
    closeDialog();
    $globalDialog = new DialogSpec('ChangePasswordDialog');
  }

  function closeDialog() {
    $globalDialog = null;
  }
</script>

{#if $userInfo}
  <ModalDialog title="Login Information" contentClasses="login-info-content">
    <div class="login_info alert-warning pt-3 pb-3">
      <div class="row">
        <div>
          You are logged in as
          <div class="user_info">
            <span class="user_name">{userName}</span><br />
            {#if $userInfo.affiliation}{$userInfo.affiliation}<br />{/if}
            {$userInfo.email}
          </div>
        </div>
      </div>
      <div class="row mb-4">
        <div>
          at IP address <span class="ip">{$userInfo?.lastLoginIP}</span>.
        </div>
      </div>
      {#if $userInfo.priorLoginDate}
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
      {/if}
    </div>
    <div class="row g-2">
      <div class="col-12 text-center">
        <button class="btn btn-minor" type="button" on:click={changePassword}
          >Change Password</button
        >
        <button class="btn btn-major" type="submit" on:click={closeDialog}>Close</button
        >
      </div>
    </div>
  </ModalDialog>
{/if}

<style lang="scss">
  @import '../variables.scss';

  :global(.login-info-content) {
    margin: 0 auto;
    max-width: 28rem;
  }

  .login_info {
    border-radius: $border-radius;
    text-align: center;
  }

  .user_info {
    margin: 0.75rem 0;
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
