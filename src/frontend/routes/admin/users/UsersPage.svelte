<script lang="ts">
  import {
    Permission,
    type AdminUserInfo,
    type NewUserInfo
  } from '../../../../shared/user_auth';
  import AdminTabRoute from '../../../components/AdminTabRoute.svelte';
  import TabHeader from '../../../components/TabHeader.svelte';
  import ServerError from '../../../components/ServerError.svelte';
  import ConfirmationRequest, {
    ConfirmationDetails
  } from '../../../common/ConfirmationRequest.svelte';
  import EditUserDialog from './EditUserDialog.svelte';
  import { flashMessage } from '../../../common/VariableFlash.svelte';
  import { showNotice } from '../../../common/VariableNotice.svelte';
  import { client, errorReason } from '../../../stores/client';
  import { pageName } from '../../../stores/pageName';

  $pageName = 'Registered Users';
  const tabName = 'Users';

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
  let dialogParams: {
    userInfo: NewUserInfo | null;
    onSuccess: (user: AdminUserInfo) => void;
  } | null = null;

  async function loadUsers() {
    const res = await $client.post('/api/user/pull_all');
    for (const userInfo of res.data) {
      userInfo.createdOn = new Date(userInfo.createdOn);
      userInfo.lastLoginDate = userInfo.lastLoginDate
        ? new Date(userInfo.lastLoginDate)
        : null;
      users.push(userInfo);
    }
  }

  function toggleExpansion(user: AdminUserInfo) {
    expandedUser = user === expandedUser ? null : user;
  }

  const addUser = () => {
    dialogParams = {
      userInfo: null,
      onSuccess: (user: AdminUserInfo) => {
        users.push(user);
        sortUsers();
        users = users; // update rendering
      }
    };
  };

  const dropUser = (user: AdminUserInfo) => {
    confirmationDetails = {
      message: `Drop user ${toUserDescription(user, false, true)}?`,
      okayButton: 'Drop',
      onOkay: async () => {
        confirmationDetails = null;
        try {
          await $client.post('/api/user/drop', { userID: user.userID });
          const droppedIndex = users.findIndex((u) => u.userID == user.userID);
          users.splice(droppedIndex, 1);
          users = users; // update rendering
          await flashMessage('Dropped user');
        } catch (err: any) {
          showNotice({
            message: `Drop failed<br/><br/>` + errorReason(err.response),
            header: 'Error',
            alert: 'danger'
          });
        }
      },
      onCancel: async () => {
        confirmationDetails = null;
        await flashMessage('Canceled drop');
      }
    };
  };

  const editUser = (user: AdminUserInfo) => {
    dialogParams = {
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
    };
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

<AdminTabRoute activeTab={tabName}>
  {#await loadUsers() then}
    <div class="container-fluid">
      <TabHeader {tabName} title={$pageName}>
        <span slot="main-buttons">
          <button class="btn btn-major add_user" on:click={addUser}>Add User</button>
        </span>
      </TabHeader>
      {#each users as user}
        {@const expanded = user === expandedUser}
        <div class="container-fluid g-0 user">
          <div class="row selectable" on:click={() => toggleExpansion(user)}>
            <div class="col-auto">
              {@html expanded ? EXPANDED_SYMBOL : COLLAPSED_SYMBOL}
            </div>
            <div class="col-auto access-level">{@html toAccessLevel(user)}</div>
            <div class="col-auto">{@html toUserDescription(user, true, false)}</div>
          </div>
          {#if expanded}
            <div class="row gx-3 mt-2 mb-1">
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
            <div class="row gx-3 justify-content-center user-buttons">
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

{#if dialogParams}
  <EditUserDialog {...dialogParams} onClose={() => (dialogParams = null)} />
{/if}

<style lang="scss">
  .user > .row {
    margin: 0;
  }
  .selectable {
    padding: 0.5rem;
    border: 1px solid #fff;
  }
  .selectable:hover {
    cursor: pointer;
    border: 1px solid #0000cc;
  }
  .user:nth-child(even) .selectable {
    background-color: #dcdcdc;
  }
  .user:nth-child(odd) .selectable {
    background-color: #efefef;
  }

  .access-level {
    width: 5rem;
  }

  :global {
    span.admin {
      color: red;
      font-weight: bold;
    }
    span.edit {
      color: purple;
      font-weight: bold;
    }
    span.coords {
      color: green;
      font-weight: bold;
    }
  }

  .user-buttons {
    padding: 0.5rem 0 1rem 0;
  }

  .text-end {
    text-align: right;
  }
</style>
