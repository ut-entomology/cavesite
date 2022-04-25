<script lang="ts">
  import * as yup from 'yup';

  import { createForm, ContextForm, Input } from '../common/forms';
  import { flashMessage } from '../common/VariableFlash.svelte';
  import { currentDialog } from '../stores/currentDialog.svelte';
  import ModalDialog from '../common/ModalDialog.svelte';
  import { client, errorReason } from '../stores/client';

  let errorMessage = '';

  const context = createForm({
    initialValues: { email: '' },
    validationSchema: yup.object().shape({
      email: yup.string().email().required().label('Email')
    }),
    onSubmit: async (values) => {
      try {
        await $client.post('/api/auth/request-reset', values);
        closeDialog();
        await flashMessage('Email sent', 'warning', 1750);
      } catch (err: any) {
        errorMessage = errorReason(err.response);
      }
    }
  });

  const closeDialog = () => {
    $currentDialog = null;
  };
</script>

<ModalDialog title="Password Reset Request" contentClasses="reset-request-form-content">
  <ContextForm class="container g-0" {context}>
    <div class="row mb-3">
      <div class="col-auto">Enter the email address to which to send a reset code.</div>
    </div>
    <div class="row mb-3 justify-content-center">
      <div class="col-sm-2">
        <label for="email" class="col-form-label">Email</label>
      </div>
      <div class="col-sm-9">
        <Input id="email" name="email" />
      </div>
    </div>
    <div class="row justify-content-center">
      <div class="col-auto">
        If the email address is on file, you will receive an email. Click on the link
        found in that email. To protect our users from discovery, we display the same
        "Email sent" message regardless of whether the email is on file.
      </div>
    </div>
    <div class="row g-2">
      <div class="col-12 text-center">
        <button class="btn btn-minor" type="button" on:click={closeDialog}
          >Cancel</button
        >
        <button class="btn btn-major" type="submit">Send Email</button>
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
  :global(.reset-request-form-content) {
    margin: 0 auto;
    max-width: 28rem;
  }

  button {
    margin: 1.5rem 0.5rem 0 0.5rem;
  }

  .info-row {
    margin-top: 1.5rem;
    text-align: center;
  }
</style>
