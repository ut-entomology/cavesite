<script lang="ts" context="module">
  export interface UserInfo {
    firstName: string;
    lastName: string;
    affiliation: string | null;
    email: string;
    permissions: number;
  }
</script>

<script lang="ts">
  import * as yup from 'yup';
  import { createForm, ContextForm, Input } from '../common/forms';
  import { flashMessage } from '../common/VariableFlash.svelte';
  import { currentDialog } from '../stores/currentDialog.svelte';
  import ModalDialog from '../common/ModalDialog.svelte';
  import { Permission } from '../../shared/user_auth';

  export let title: string;
  export let submitLabel: string;
  export let userInfo: UserInfo | null;
  export let onSuccess: () => void = () => {};

  enum AccessLevel {
    None = 'none',
    Coords = 'coords',
    Edit = 'edit',
    Admin = 'admin'
  }
  type FormUserInfo = UserInfo & { accessLevel: AccessLevel };

  let creatingUser = false;
  if (!userInfo) {
    creatingUser = true;
    userInfo = {
      firstName: '',
      lastName: '',
      affiliation: '',
      email: '',
      permissions: 0
    };
  }
  let accessLevel = AccessLevel.None;
  if (userInfo.permissions & Permission.Admin) {
    accessLevel = AccessLevel.Admin;
  } else if (userInfo.permissions & Permission.Edit) {
    accessLevel = AccessLevel.Edit;
  } else if (userInfo.permissions & Permission.Coords) {
    accessLevel = AccessLevel.Coords;
  }
  const formUserInfo: FormUserInfo = Object.assign({ accessLevel }, userInfo);

  let errorMessage = '';

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
      let newUserInfo: UserInfo = Object.assign({ permissions }, values);
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

  async function createUser(_userInfo: UserInfo) {
    // TODO: create user
    closeDialog();
    await flashMessage('User created');
    onSuccess();
  }

  async function updateUser(_userInfo: UserInfo) {
    // TODO: create user
    closeDialog();
    await flashMessage('User updated');
    onSuccess();
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
