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
  const accessLevelTips: Record<string, string> = {
    none: 'User cannot login',
    coords: 'User has access to private coordinates.',
    edit:
      'User has access to private coordinates and can add, ' +
      'edit, and remove private coordinates.',
    admin:
      'User has unrestricted access to the website and can ' +
      'manage users, private coordinates, the GBIF schedule, and logs.'
  };

  let users: AdminUserInfo[] = [];
  let expandedUser: AdminUserInfo | null = null;

  let confirmationDetails: ConfirmationDetails | null = null;

  async function loadUsers() {
    const res = await $client.post('/api/user/get_all');
    for (const userInfo of res.data) {
      userInfo.createdOn = new Date(userInfo.createdOn);
      userInfo.lastLoginDate = new Date(userInfo.lastLoginDate);
      users.push(userInfo);
    }
  }

  function toggleExpansion(user: AdminUserInfo) {
    expandedUser = user === expandedUser ? null : user;
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
      message: `Drop user ${toUserDescription(user, false, true)}?`,
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

  function toAccessLevel(user: AdminUserInfo): string {
    let level = 'none';
    if (user.permissions & Permission.Admin) {
      level = 'Admin';
    } else if (user.permissions & Permission.Edit) {
      level = 'Edit';
    } else if (user.permissions & Permission.Coords) {
      level = 'Coords';
    }
    return `<span class='${level.toLowerCase()}' title='${
      accessLevelTips[level.toLowerCase()]
    }'>${level}</span>`;
  }

  function toUserDescription(
    user: AdminUserInfo,
    lastNameFirst: boolean,
    includeEmail: boolean
  ): string {
    let desc = user.lastName;
    if (user.firstName) {
      if (lastNameFirst) {
        desc = `${user.lastName}, ${user.firstName}`;
      } else {
        desc = `${user.firstName} ${user.lastName}`;
      }
    }
    desc = `<b>${desc}</b>`;
    if (includeEmail) {
      desc += ` <${user.email}>`;
    }
    if (user.affiliation) {
      desc += ` (${user.affiliation})`;
    }
    return desc;
  }
</script>

<AdminTabRoute activeTab="Users">
  {#await loadUsers() then}
    <div class="container-fluid view">
      <div class="general_buttons">
        <button class="btn btn-major add_user" on:click={addUser}>Add User</button>
      </div>
      {#each users as user}
        {@const expanded = user === expandedUser}
        <div class="user">
          <div class="row mb-1 selectable" on:click={() => toggleExpansion(user)}>
            <div class="col-auto">
              {@html expanded ? EXPANDED_SYMBOL : COLLAPSED_SYMBOL}
            </div>
            <div class="col-auto">{@html toAccessLevel(user)}</div>
            <div class="col-auto">{@html toUserDescription(user, true, false)}</div>
          </div>
          {#if expanded}
            <div class="row gx-3 mb-1">
              <div class="col-3 text-end">Email:</div>
              <div class="col-9">{user.email}</div>
            </div>
            <div class="row gx-3 mb-1">
              <div class="col-3 text-end">Last Login:</div>
              <div class="col-9">
                {#if user.lastLoginDate}
                  {user.lastLoginDate.toLocaleString()} <i>from</i> IP {user.lastLoginIP}
                {:else}
                  user has not yet logged in
                {/if}
              </div>
            </div>
            <div class="row gx-3 mb-1">
              <div class="col-3 text-end">Added:</div>
              <div class="col-9">
                {user.createdOn.toLocaleString()} <i>by</i>
                {user.createdByName ? user.createdByName : 'create-admin tool'}
              </div>
            </div>
            <div class="row gx-3 mt-3 mb-3 justify-content-center">
              <div class="col-auto">
                <button class="btn btn-major" on:click={() => editUser(user)}
                  >Edit</button
                >
              </div>
              <div class="col-auto">
                <button class="btn btn-minor" on:click={() => resetPassword(user)}
                  >Reset Password</button
                >
              </div>
              <div class="col-auto">
                <button class="btn btn-minor" on:click={() => dropUser(user)}
                  >Drop</button
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
    margin: 0.5rem 0;
  }

  .general_buttons {
    text-align: right;
    margin: 1rem 0 0.5rem 0;
  }

  .selectable {
    padding: 0.5rem;
    border: 1px solid #fff;
  }
  .selectable:hover {
    cursor: pointer;
    border: 1px solid #0000cc;
    border-radius: 10px;
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

  .text-end {
    text-align: right;
  }
</style>
