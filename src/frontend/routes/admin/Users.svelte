<script lang="ts">
  import { StatusCodes, getReasonPhrase } from 'http-status-codes';

  import { Permission, type AdminUserInfo } from '../../../shared/user_auth';
  import AdminTabRoute from '../../components/AdminTabRoute.svelte';
  import ServerError from '../../components/ServerError.svelte';
  import ConfirmationRequest, {
    ConfirmationDetails
  } from '../../common/ConfirmationRequest.svelte';
  import { flashMessage } from '../../common/VariableFlash.svelte';
  import { showNotice } from '../../common/VariableNotice.svelte';
  import { DialogSpec } from '../../common/VariableDialog.svelte';
  import { currentDialog } from '../../stores/currentDialog.svelte';
  import { client } from '../../stores/client';

  const EXPANDED_SYMBOL = '&#9660';
  const COLLAPSED_SYMBOL = '&#9654;';

  let users: AdminUserInfo[] = [];
  let expandedUser: AdminUserInfo | null = null;

  let confirmationDetails: ConfirmationDetails | null = null;

  async function loadUsers() {
    const res = await $client.post('/api/user/get_all');
    for (const userInfo of res.data) {
      users.push(userInfo);
    }
  }

  function toggleExpansion(user: AdminUserInfo) {
    expandedUser = user === expandedUser ? null : user;
  }

  function toPermissionsString(user: AdminUserInfo): string {
    let permissions: string[] = [];
    if (user.permissions & Permission.Admin) {
      permissions.push('Admin');
    } else if (user.permissions & Permission.Edit) {
      permissions.push('Edit');
    } else if (user.permissions & Permission.Coords) {
      permissions.push('Coords');
    }
    if (permissions.length == 0) {
      permissions.push('(none)');
    }
    return permissions
      .map((p) => `<span class='${p.toLowerCase()}'>${p}</span>`)
      .join(' | ');
  }

  const addUser = () => {
    currentDialog.set(
      new DialogSpec('EditUserDialog', {
        userInfo: null,
        onSuccess: (user: AdminUserInfo) => {
          users.push(user);
          sortUsers();
          users = users; // update rendering
        }
      })
    );
  };

  const dropUser = (user: AdminUserInfo) => {
    confirmationDetails = {
      message: `Drop user ${toUserDescription(user)}?`,
      okayButton: 'Drop',
      onOkay: async () => {
        confirmationDetails = null;
        const res = await $client.post('/api/user/drop', { userID: user.userID });
        if (res.status == StatusCodes.OK) {
          await flashMessage('Dropped user');
        } else {
          showNotice(
            `Drop failed<br/><br/>` + getReasonPhrase(res.status),
            'Error',
            'danger'
          );
        }
      },
      onCancel: async () => {
        confirmationDetails = null;
        await flashMessage('Canceled drop');
      }
    };
  };

  const editUser = (user: AdminUserInfo) => {
    currentDialog.set(
      new DialogSpec('EditUserDialog', {
        userInfo: user,
        onSuccess: (edits: AdminUserInfo) => {
          user.firstName = edits.firstName;
          user.lastName = edits.lastName;
          user.affiliation = edits.affiliation;
          user.email = edits.email;
          user.permissions = edits.permissions;
          sortUsers();
          users = users; // update rendering
        }
      })
    );
  };

  const resetPassword = (_user: AdminUserInfo) => {
    //
  };

  function sortUsers() {
    users.sort((a, b) => {
      if (a.lastName < b.lastName) return -1;
      if (a.lastName == b.lastName) {
        if (a.firstName == b.firstName) return 0;
        return a.firstName < b.firstName ? -1 : 1;
      }
      return 1;
    });
  }

  function toUserDescription(user: AdminUserInfo): string {
    let desc = user.firstName ? `${user.firstName} ${user.lastName}` : user.lastName;
    desc += ` <${user.email}>`;
    if (user.affiliation) {
      desc += ' at ' + user.affiliation;
    }
    return desc;
  }
</script>

<AdminTabRoute activeTab="Users">
  {#await loadUsers() then}
    <div class="view">
      <div class="general_buttons">
        <button class="btn btn-major add_user" on:click={addUser}>Add User</button>
      </div>
      {#each users as user}
        {@const expanded = user === expandedUser}
        {@const permissions = toPermissionsString(user)}
        <div class="user">
          <div class="row">
            <div class="col">
              <div class="toggle" on:click={() => toggleExpansion(user)}>
                {@html expanded ? EXPANDED_SYMBOL : COLLAPSED_SYMBOL}
              </div>
            </div>
            <div class="col-4">
              {user.lastName}{user.firstName ? ', ' + user.firstName : ''}
            </div>
            <div class="col-6">
              {user.affiliation ? user.affiliation : ''}
            </div>
            <div class="col-2">{@html permissions.split(' | ')[0]}</div>
          </div>
          {#if expanded}
            <div class="expansion">
              <div class="row">
                <div class="col-3">Permissions:</div>
                <div class="col-9">{permissions}</div>
              </div>
              <div class="row">
                <div class="col-3">Email:</div>
                <div class="col-9">{user.email}</div>
              </div>
              <div class="row">
                <div class="col-3">Last login:</div>
                <div class="col-9">
                  {#if user.lastLoginDate}
                    {user.lastLoginDate} from IP {user.lastLoginIP}
                  {:else}
                    user has not yet logged in
                  {/if}
                </div>
              </div>
              <div class="row">
                <div class="col-3">Created:</div>
                <div class="col-9">
                  {user.createdOn} by {user.createdByName
                    ? user.createdByName
                    : '(admin tool)'}
                </div>
              </div>
              <div class="row user_buttons">
                <button class="btn btn-minor" on:click={() => resetPassword(user)}
                  >Reset Password</button
                >
                <button class="btn btn-minor" on:click={() => dropUser(user)}
                  >Drop</button
                >
                <button class="btn btn-major" on:click={() => editUser(user)}
                  >Edit</button
                >
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
    {#if confirmationDetails}
      <ConfirmationRequest {...confirmationDetails} />
    {/if}
  {:catch err}
    <ServerError error={err.response} />
  {/await}
</AdminTabRoute>

<style lang="scss">
  .view {
    margin: 1em;
  }

  .general_buttons {
    text-align: right;
    margin-bottom: 1rem;
  }

  .toggle {
    cursor: pointer;
  }

  :global {
    span.admin {
      color: red;
    }
    span.edit {
      color: purple;
    }
    span.coords {
      color: green;
    }
  }

  .user_buttons button {
    margin-left: 2rem;
  }
</style>
