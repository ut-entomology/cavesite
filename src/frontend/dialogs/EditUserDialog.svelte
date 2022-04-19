<script lang="ts">
  import { StatusCodes, getReasonPhrase } from 'http-status-codes';

  import * as yup from 'yup';
  import { createForm, ContextForm, Input } from '../common/forms';
  import { currentDialog } from '../stores/currentDialog.svelte';
  import ModalDialog from '../common/ModalDialog.svelte';
  import { Permission, UserInfo, AdminUserInfo } from '../../shared/user_auth';
  import { client } from '../stores/client';
  import { flashMessage } from '../common/VariableFlash.svelte';
  import { showNotice } from '../common/VariableNotice.svelte';

  enum AccessLevel {
    None = 'none',
    Coords = 'coords',
    Edit = 'edit',
    Admin = 'admin'
  }
  type EditableInfo = Omit<UserInfo, 'userID' | 'lastLoginDate' | 'lastLoginIP'>;
  type FormUserInfo = EditableInfo & { accessLevel: AccessLevel };

  export let userInfo: EditableInfo | null;
  export let onSuccess: (user: AdminUserInfo) => void = () => {};

  let creatingUser = false;
  let title = 'Edit User';
  let submitLabel = 'Update';
  let accessLevel = AccessLevel.None;
  let errorMessage = '';

  if (!userInfo) {
    creatingUser = true;
    title = 'Add User';
    submitLabel = 'Add';

    userInfo = {
      firstName: '',
      lastName: '',
      affiliation: '',
      email: '',
      permissions: 0
    };
  }
  if (userInfo.permissions & Permission.Admin) {
    accessLevel = AccessLevel.Admin;
  } else if (userInfo.permissions & Permission.Edit) {
    accessLevel = AccessLevel.Edit;
  } else if (userInfo.permissions & Permission.Coords) {
    accessLevel = AccessLevel.Coords;
  }
  const formUserInfo: FormUserInfo = Object.assign({ accessLevel }, userInfo);

  const context = createForm({
    initialValues: formUserInfo,
    validationSchema: yup.object().shape({
      firstName: yup.string().trim().required().label('First Name'),
      lastName: yup.string().trim().required().label('Last Name'),
      affiliation: yup.string().trim().label('Affiliation'),
      email: yup.string().trim().email().required().label('Email'),
      accessLevel: yup.string().required().label('Access Level')
    }),
    onSubmit: async (values) => {
      let permissions = 0;
      if (values.accessLevel == AccessLevel.Admin) {
        permissions = Permission.Admin | Permission.Edit | Permission.Coords;
      } else if (values.accessLevel == AccessLevel.Edit) {
        permissions = Permission.Edit | Permission.Coords;
      } else if (values.accessLevel == AccessLevel.Coords) {
        permissions = Permission.Coords;
      }
      let newInfo: EditableInfo = Object.assign({ permissions }, values);
      try {
        if (creatingUser) {
          await createUser(newInfo);
        } else {
          await updateUser(newInfo);
        }
      } catch (err) {
        errorMessage = (err as Error).message;
      }
    }
  });

  async function createUser(userInfo: EditableInfo) {
    const res = await $client.post('/api/user/add', userInfo);
    if (res.status == StatusCodes.OK) {
      await flashMessage('Created user');
      closeDialog();
      onSuccess(res.data);
    } else {
      showNotice(
        `Failed to add user<br/><br/>` + getReasonPhrase(res.status),
        'Error',
        'danger'
      );
    }
  }

  async function updateUser(_userInfo: EditableInfo) {
    const res = await $client.post('/api/user/update', userInfo);
    if (res.status == StatusCodes.OK) {
      await flashMessage('Updated user');
      closeDialog();
      onSuccess(res.data);
    } else {
      showNotice(
        `Failed to update user<br/><br/>` + getReasonPhrase(res.status),
        'Error',
        'danger'
      );
    }
  }

  const closeDialog = () => {
    $currentDialog = null;
  };
</script>

<ModalDialog {title} contentClasses="login-form-content">
  <ContextForm class="container g-0" {context}>
    <div class="row mb-2 justify-content-center">
      <div class="col-sm-3">
        <label for="firstName" class="col-form-label">First Name</label>
      </div>
      <div class="col-sm-7">
        <Input id="firstName" name="firstName" />
      </div>
    </div>
    <div class="row mb-2 justify-content-center">
      <div class="col-sm-3">
        <label for="lastName" class="col-form-label">Last Name</label>
      </div>
      <div class="col-sm-7">
        <Input id="lastName" name="lastName" />
      </div>
    </div>
    <div class="row mb-2 justify-content-center">
      <div class="col-sm-3">
        <label for="email" class="col-form-label">Email</label>
      </div>
      <div class="col-sm-7">
        <Input id="email" name="email" />
      </div>
    </div>
    <div class="row mb-2 justify-content-center">
      <div class="col-sm-3">
        <label for="affiliation" class="col-form-label">Affiliation</label>
      </div>
      <div class="col-sm-7">
        <Input id="affiliation" name="affiliation" />
      </div>
    </div>
    <div class="row mb-3 justify-content-center">
      <div class="col-sm-3">
        <label for="accessLevel" class="col-form-label">Access Level</label>
      </div>
      <div class="col-sm-7">
        <select id="accessLevel" name="accessLevel">
          <option value="none">None (account disabled)</option>
          <option value="coords">See Private Coordinates</option>
          <option value="edit">Edit Private Coordiates</option>
          <option value="admin">Administration</option>
        </select>
      </div>
    </div>
    <div class="row g-2">
      <div class="col-12 text-center">
        <button class="btn btn-minor" type="button" on:click={closeDialog}
          >Cancel</button
        >
        <button class="btn btn-major" type="submit">{submitLabel}</button>
      </div>
    </div>
    {#if errorMessage}
      <div class="error-region">
        <div class="alert alert-danger" role="alert">{errorMessage}</div>
      </div>
    {/if}
  </ContextForm>
</ModalDialog>

<style>
  :global(.login-form-content) {
    margin: 0 auto;
    max-width: 28rem;
  }

  button {
    width: 6rem;
    margin: 1rem 0.5rem 0 0.5rem;
  }

  .error-region {
    margin-top: 1rem;
  }
</style>
