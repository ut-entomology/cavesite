<script lang="ts">
  import * as yup from 'yup';
  import { createForm, ContextForm, Input } from '../common/forms';
  import { flashMessage } from '../common/VariableFlash.svelte';
  import { currentDialog } from '../stores/currentDialog.svelte';
  import ModalDialog from '../common/ModalDialog.svelte';
  import { client } from '../stores/client';
  import { userInfo } from '../stores/user_info';
  //import { CSRF_TOKEN_HEADER } from '../../shared/user_auth';

  const title = 'Login Form';

  let errorMessage = '';

  const context = createForm({
    initialValues: { email: '', password: '' },
    validationSchema: yup.object().shape({
      email: yup.string().email().required().label('Email'),
      password: yup.string().required().label('Password')
    }),
    onSubmit: async (values) => {
      try {
        const res = await $client.post('/apis/auth/login', values);
        //setCSRF(res.headers[CSRF_TOKEN_HEADER]);
        $userInfo = res.data;
        closeDialog();
        await flashMessage('You are logged in');
      } catch (err: any) {
        //setCSRF(null);
        $userInfo = null;
        errorMessage = err.message;
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
    <div class="info-row">
      <a href="https://gdpr.eu/cookies/" target="_blank">EPD Notice</a>: This site uses
      cookies<br />to track login sessions.
    </div>
    <div class="row g-2">
      <div class="col-12 text-center">
        <button class="btn btn-minor" type="button" on:click={closeDialog}
          >Cancel</button
        >
        <button class="btn btn-major" type="submit">Login</button>
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
  :global(.login-form-content) {
    margin: 0 auto;
    max-width: 28rem;
  }

  button {
    width: 6rem;
    margin: 1.5rem 0.5rem 0 0.5rem;
  }

  .info-row {
    margin-top: 1.5rem;
    text-align: center;
  }
</style>
