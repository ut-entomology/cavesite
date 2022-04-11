<script lang="ts">
  import * as yup from 'yup';
  import { createForm, ContextForm, Input } from '../common/forms';
  import { flashMessage } from '../common/VariableFlash.svelte';
  import { currentDialog } from '../stores/currentDialog.svelte';
  import ModalDialog from '../common/ModalDialog.svelte';

  const title = "Login Form";

  let errorMessage = '';

  const context = createForm({
    initialValues: { email: '', password: '' },
    validationSchema: yup.object().shape({
      email: yup.string().email().required().label('Email'),
      password: yup.string().required().label('Password')
    }),
    onSubmit: async (values) => {
      const response = await fetch('/api/sign-up', {
        method: 'POST',
        body: JSON.stringify(values),
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        // TBD: update session info?
        closeDialog();
        await flashMessage('You are logged in');
      } else {
        errorMessage = (await response.json()).message;
      }
    }
  });

  const closeDialog = () => {
    $currentDialog = null;
  };
</script>

<ModalDialog {title} contentClasses="login-form-content">
  <ContextForm class="container g-0" {context}>
    <div class="row mb-2 justify-content-center">
      <div class="col-sm-3">
        <label for="email" class="col-form-label">Email</label>
      </div>
      <div class="col-sm-7">
        <Input id="email" name="email" />
      </div>
    </div>
    <div class="row mb-3 justify-content-center">
      <div class="col-sm-3">
        <label for="password" class="col-form-label">Password</label>
      </div>
      <div class="col-sm-7">
        <Input id="password" name="password" type="password" />
      </div>
    </div>
    <div class="row g-2">
      <div class="col-12 text-center">
        <button class="btn btn-minor" type="button" on:click={closeDialog}>Cancel</button>
        <button class="btn btn-major" type="submit">Login</button>
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
