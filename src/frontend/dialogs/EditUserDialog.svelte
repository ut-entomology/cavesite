<script lang="ts">
  import * as yup from 'yup';
  import { createForm, ContextForm, Input, Select } from '../common/forms';
  import ModalDialog from '../common/ModalDialog.svelte';
  import { Permission, AdminUserInfo, NewUserInfo } from '../../shared/user_auth';
  import { client, errorReason } from '../stores/client';
  import { flashMessage } from '../common/VariableFlash.svelte';
  import { showNotice } from '../common/VariableNotice.svelte';

  enum AccessLevel {
    None = 'none',
    Coords = 'coords',
    Edit = 'edit',
    Admin = 'admin'
  }

  export let userInfo: NewUserInfo | null;
  export let onSuccess: (user: AdminUserInfo) => void = () => {};
  export let onClose: () => void;

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
      userID: 0,
      firstName: '',
      lastName: '',
      affiliation: '',
      email: '',
      permissions: 0,
      priorLoginDate: null,
      priorLoginIP: null
    };
  }
  if (userInfo.permissions & Permission.Admin) {
    accessLevel = AccessLevel.Admin;
  } else if (userInfo.permissions & Permission.Edit) {
    accessLevel = AccessLevel.Edit;
  } else if (userInfo.permissions & Permission.Coords) {
    accessLevel = AccessLevel.Coords;
  }

  const context = createForm({
    initialValues: Object.assign({ accessLevel }, userInfo),
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
      let newUserInfo = Object.assign({}, values, { permissions });
      try {
        if (creatingUser) {
          await createUser(newUserInfo);
        } else {
          await updateUser(newUserInfo);
        }
      } catch (err) {
        errorMessage = (err as Error).message;
      }
    }
  });

  async function createUser(userInfo: NewUserInfo) {
    try {
      onClose();
      const res = await $client.post('/api/user/add', userInfo);
      await flashMessage('Created user<br/>Emailed credentials', 'warning', 1750);
      onSuccess(res.data);
    } catch (err: any) {
      showNotice({
        message: `Failed to add user<br/><br/>` + errorReason(err.response),
        header: 'Error',
        alert: 'danger'
      });
    }
  }

  async function updateUser(userInfo: NewUserInfo) {
    try {
      onClose();
      const res = await $client.post('/api/user/update', userInfo);
      await flashMessage('Updated user');
      onSuccess(res.data);
    } catch (err: any) {
      showNotice({
        message: `Failed to update user<br/><br/>` + errorReason(err.response),
        header: 'Error',
        alert: 'danger'
      });
    }
  }
</script>

<ModalDialog {title} contentClasses="user-form-content">
  <ContextForm class="container-fluid g-0" {context}>
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
        <Select id="accessLevel" name="accessLevel" class="form-select">
          <option value="none">None (account disabled)</option>
          <option value="coords">See Precise Coordinates</option>
          <option value="edit">Edit Precise Coordinates</option>
          <option value="admin">Admin (all permissions)</option>
        </Select>
      </div>
    </div>
    <div class="row g-2">
      <div class="col-12 text-center">
        <button class="btn btn-minor" type="button" on:click={onClose}>Cancel</button>
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
  :global(.user-form-content) {
    margin: 0 auto;
    max-width: 36rem;
  }

  button {
    width: 6rem;
    margin: 1rem 0.5rem 0 0.5rem;
  }

  .error-region {
    margin-top: 1rem;
  }
</style>
