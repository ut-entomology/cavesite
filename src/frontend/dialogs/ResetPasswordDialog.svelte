<script lang="ts">
  // See also the similar ChangePasswordDialog.

  import * as yup from 'yup';
  import page from 'page';

  import { createForm, ContextForm, Input } from '../common/forms';
  import { flashMessage } from '../common/VariableFlash.svelte';
  import { globalDialog } from '../stores/globalDialog.svelte';
  import ModalDialog from '../common/ModalDialog.svelte';
  import type { PasswordResetInfo } from '../../shared/user_auth';
  import { client, errorReason } from '../stores/client';

  export let email: string;
  export let resetCode: string;

  let errorMessage = '';

  const context = createForm({
    initialValues: { newPassword: '', confirmNewPassword: '' },
    validationSchema: yup.object().shape({
      newPassword: yup.string().required().label('New Password'),
      confirmNewPassword: yup
        .string()
        .required()
        .test('passwords-match', 'Passwords must match', function (value) {
          return value === this.parent.newPassword;
        })
        .label('Confirm New Password')
    }),
    onSubmit: async (values) => {
      try {
        await $client.post('/api/auth/reset-password', {
          email,
          password: values.newPassword,
          resetCode
        } as PasswordResetInfo);
        closeDialog();
        await flashMessage('Changed password');
        page('/');
      } catch (err: any) {
        errorMessage = errorReason(err.response);
      }
    }
  });

  const cancelDialog = () => {
    closeDialog();
    page('/');
  };

  const closeDialog = () => {
    $globalDialog = null;
  };
</script>

<ModalDialog title="Reset Password" contentClasses="change-pw-form-content">
  <ContextForm class="container g-0" {context}>
    <div class="row mb-3 justify-content-center">
      <div class="col-sm-5">
        <label for="newPassword" class="col-form-label">New Password</label>
      </div>
      <div class="col-sm-6">
        <Input id="newPassword" name="newPassword" type="password" />
      </div>
    </div>
    <div class="row mb-3 justify-content-center">
      <div class="col-sm-5">
        <label for="confirmNewPassword" class="col-form-label"
          >Confirm New Password</label
        >
      </div>
      <div class="col-sm-6">
        <Input id="confirmNewPassword" name="confirmNewPassword" type="password" />
      </div>
    </div>
    <div class="row g-2">
      <div class="col-12 text-center">
        <button class="btn btn-minor" type="button" on:click={cancelDialog}
          >Cancel</button
        >
        <button class="btn btn-major" type="submit">Change Password</button>
      </div>
    </div>
    {#if errorMessage}
      <div class="info-row">
        <div class="alert alert-danger" role="alert">{errorMessage}</div>
      </div>
    {/if}
  </ContextForm>
</ModalDialog>

<style>
  :global(.change-pw-form-content) {
    margin: 0 auto;
    max-width: 32rem;
  }

  button {
    margin: 1.5rem 0.5rem 0 0.5rem;
  }

  .info-row {
    margin-top: 1.5rem;
    text-align: center;
  }
</style>
