<script lang="ts">
  import * as yup from 'yup';
  import { StatusCodes, getReasonPhrase } from 'http-status-codes';

  import { createForm, ContextForm, Input } from '../common/forms';
  import { flashMessage } from '../common/VariableFlash.svelte';
  import { currentDialog } from '../stores/currentDialog.svelte';
  import ModalDialog from '../common/ModalDialog.svelte';
  import { client } from '../stores/client';

  let errorMessage = '';

  const context = createForm({
    initialValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
    validationSchema: yup.object().shape({
      currentPassword: yup.string().required().label('Current Password'),
      newPassword: yup.string().required().label('New Password'),
      confirmNewPassword: yup
        .string()
        .required()
        .test('passwords-match', 'New passwords must match', function (value) {
          return value === this.parent.newPassword;
        })
        .label('Confirm New Password')
    }),
    onSubmit: async (values) => {
      try {
        await $client.post('/api/auth/change-password', {
          oldPassword: values.currentPassword,
          newPassword: values.newPassword
        });
        closeDialog();
        await flashMessage('Changed password');
      } catch (err: any) {
        if (err.response.status == StatusCodes.UNAUTHORIZED) {
          errorMessage = 'Incorrect password';
        } else {
          errorMessage = err.response.data?.message
            ? err.response.data.message
            : getReasonPhrase(err.response.status);
        }
      }
    }
  });

  const closeDialog = () => {
    $currentDialog = null;
  };
</script>

<ModalDialog title="Change Password" contentClasses="change-pw-form-content">
  <ContextForm class="container g-0" {context}>
    <div class="row mb-3 justify-content-center">
      <div class="col-sm-5">
        <label for="currentPassword" class="col-form-label">Current Password</label>
      </div>
      <div class="col-sm-6">
        <Input id="currentPassword" name="currentPassword" type="password" />
      </div>
    </div>
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
        <button class="btn btn-minor" type="button" on:click={closeDialog}
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
