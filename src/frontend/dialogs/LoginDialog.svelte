<script lang="ts">
  import * as yup from 'yup';
  import { StatusCodes } from 'http-status-codes';

  import { createForm, ContextForm, Input } from '../common/forms';
  import { flashMessage } from '../common/VariableFlash.svelte';
  import { globalDialog } from '../stores/globalDialog.svelte';
  import ModalDialog from '../common/ModalDialog.svelte';
  import { client } from '../stores/client';
  import { userInfo } from '../stores/user_info';
  import { setExpiration } from '../util/refresher';
  import { DialogSpec } from '../common/VariableDialog.svelte';
  //import { CSRF_TOKEN_HEADER } from '../../shared/user_auth';

  const title = 'Login Form for Admins';

  let errorMessage = '';

  const context = createForm({
    initialValues: { email: '', password: '' },
    validationSchema: yup.object().shape({
      email: yup.string().email().required().label('Email'),
      password: yup.string().required().label('Password')
    }),
    onSubmit: async (values) => {
      try {
        const res = await $client.post('/api/auth/login', values);
        $userInfo = res.data.userInfo;
        setExpiration(res.data.expiration);
        closeDialog();
        await flashMessage('You are logged in');
        window.location.reload();
      } catch (err: any) {
        $userInfo = null;
        if (err.response.status == StatusCodes.UNAUTHORIZED) {
          errorMessage = 'Incorrect email or password';
        }
      }
    }
  });

  async function requestPasswordReset() {
    closeDialog();
    $globalDialog = new DialogSpec('ResetRequestDialog');
  }

  const closeDialog = () => {
    $globalDialog = null;
  };
</script>

<ModalDialog {title} contentClasses="login-form-content">
  <ContextForm class="container g-0" {context}>
    <div class="row mb-2 justify-content-center">
      <div class="col-sm-3">
        <label for="email" class="col-form-label">Email</label>
      </div>
      <div class="col-sm-7">
        <Input id="email" name="email" autocomplete="username" />
      </div>
    </div>
    <div class="row mb-3 justify-content-center">
      <div class="col-sm-3">
        <label for="password" class="col-form-label">Password</label>
      </div>
      <div class="col-sm-7">
        <Input
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
        />
      </div>
    </div>
    <div class="info-row">
      You may request a <!-- svelte-ignore a11y-invalid-attribute --><a
        href="#"
        on:click={requestPasswordReset}>password reset</a
      ><br />if you forgot your password.
    </div>
    <div class="row g-2">
      <div class="col-12 text-center">
        <button class="btn btn-minor" type="button" on:click={closeDialog}
          >Cancel</button
        >
        <button class="btn btn-major" type="submit">Login</button>
      </div>
    </div>
    <div class="info-row">
      <a href="https://gdpr.eu/cookies/" target="_blank">EPD Notice</a>: This site uses
      cookies<br />to track login sessions.
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
