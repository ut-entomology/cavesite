<script lang="ts">
  import router from 'page';
  import { type SvelteComponent, onMount } from 'svelte';

  import { client, errorReason } from './stores/client';
  import { userInfo } from './stores/user_info';
  import { appInfo } from './stores/app_info';
  import { globalDialog } from './stores/globalDialog.svelte';
  import { type LoginInfo, toResetQueryStr } from '../shared/user_auth';
  import { initRefresher, setExpiration } from './util/refresher';
  import Layout from './routes/_Layout.svelte';
  import WelcomePage from './routes/welcome/WelcomePage.svelte';
  import TaxaPage from './routes/taxa/TaxaPage.svelte';
  import LocationsPage from './routes/locations/LocationsPage.svelte';
  import QueriesPage from './routes/queries/QueriesPage.svelte';
  import TimePage from './routes/time/TimePage.svelte';
  import PredictionsPage from './routes/predictions/PredictionsPage.svelte';
  import UsersPage from './routes/admin/users/UsersPage.svelte';
  import LogsPage from './routes/admin/logs/LogsPage.svelte';
  import SchedulePage from './routes/admin/schedule/SchedulePage.svelte';
  import NotFound from './routes/NotFound.svelte';
  import Notice from './common/Notice.svelte';
  import { DialogSpec } from './common/VariableDialog.svelte';
  import { showNotice } from './common/VariableNotice.svelte';
  import { logoutUser } from './util/user_util';
  import { pageName } from './stores/pageName';

  // Initialize client-side routes.

  const routes: Record<string, typeof SvelteComponent> = {
    '/': WelcomePage,
    '/taxa': TaxaPage,
    '/locations': LocationsPage,
    '/time': TimePage,
    '/predictions': PredictionsPage,
    '/queries': QueriesPage,

    '/admin/users': UsersPage,
    '/admin/logs': LogsPage,
    '/admin/schedule': SchedulePage,

    '*': NotFound
  };

  let pageComponent: typeof SvelteComponent;
  let params: any = null;
  $: title = $appInfo ? `${$appInfo.appTitle} - ${$pageName}` : '';
  $: {
    document.title = title;
  }

  for (const [route, component] of Object.entries(routes)) {
    router(
      route,
      (ctx, next) => {
        params = ctx.params;
        next();
      },
      // @ts-ignore
      () => (pageComponent = component)
    );
  }
  router.start();

  async function prepare() {
    // Get app information and re-establish any prior login.

    const res = await $client.post('/api/auth/connect');
    if (res.data) {
      const loginInfo: LoginInfo = res.data;
      appInfo.set({
        appTitle: loginInfo.appTitle,
        appSubtitle: loginInfo.appSubtitle,
        hiddenRoutes: loginInfo.hiddenRoutes
      });
      if (loginInfo.userInfo && loginInfo.expiration) {
        $userInfo = loginInfo.userInfo;
        setExpiration(loginInfo.expiration);
      }
      $appInfo.hiddenRoutes.forEach((route) => delete routes[route]);
    }

    // Handle a password reset request.

    const resetParams = getResetParams();
    if (resetParams && $userInfo && resetParams.email !== $userInfo.email) {
      await logoutUser(true);
      router('/' + toResetQueryStr(resetParams.email, resetParams.resetCode));
    }

    // Initialize session refresh.

    initRefresher({
      refreshMillis: 5 * 60 * 1000 /* 5 minutes */,
      onRefresh: async () => {
        try {
          const res = await $client.post('/api/auth/refresh');
          return res.data.expiration;
        } catch (err: any) {
          return 0;
        }
      },
      onWarning: () => {
        showNotice({
          message: 'Your login session is about to expire.',
          header: 'WARNING',
          alert: 'warning',
          button: 'Continue',
          onClose: async () => {
            try {
              const res = await $client.post('/api/auth/refresh');
              setExpiration(res.data.expiration);
            } catch (err: any) {
              // ignore
            }
          }
        });
      },
      onExpiration: async () => {
        logoutUser(false);
        window.location.href = '/';
      }
    });
  }

  onMount(() => {
    const resetParams = getResetParams();
    if (resetParams) {
      $globalDialog = new DialogSpec('ResetPasswordDialog', resetParams);
    }
  });

  function getResetParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') != 'reset') {
      return null;
    }
    const email = params.get('email');
    const resetCode = params.get('code');
    if (!email || !resetCode) {
      router('/');
      return null;
    }
    return { email, resetCode };
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="robots" content="noindex nofollow" />
  <html lang="en" />
</svelte:head>
{#await prepare() then}
  {#if pageComponent !== NotFound}
    <Layout>
      {#if params.length > 0}
        <svelte:component this={pageComponent} {params} />
      {:else}
        <svelte:component this={pageComponent} />
      {/if}
    </Layout>
  {:else}
    <svelte:component this={pageComponent} />
  {/if}
{:catch err}
  {@const message = err.response ? errorReason(err.response) : err.message}
  <Notice
    header="ERROR"
    alert="danger"
    message={message + '\n' + err.stack}
    on:close={() => {}}
  />
{/await}

<style lang="scss" global>
  @use 'sass:math';
  @import './variables.scss';

  @import '../../node_modules/bootstrap/scss/functions';
  @import '../../node_modules/bootstrap/scss/variables';
  @import '../../node_modules/bootstrap/scss/utilities';

  // Must precede loading boostrap SCSS
  $utilities: (
    // responsive width
    'rw':
      (
        class: 'rw',
        property: width,
        responsive: true,
        values: (
          // can't figure out how to generate this
          1: math.percentage(math.div(1, 12)),
          2: math.percentage(math.div(2, 12)),
          3: math.percentage(math.div(3, 12)),
          4: math.percentage(math.div(4, 12)),
          5: math.percentage(math.div(5, 12)),
          6: math.percentage(math.div(6, 12)),
          7: math.percentage(math.div(7, 12)),
          8: math.percentage(math.div(8, 12)),
          9: math.percentage(math.div(9, 12)),
          10: math.percentage(math.div(10, 12)),
          11: math.percentage(math.div(11, 12)),
          12: math.percentage(math.div(12, 12))
        )
      )
  );

  @import '../../node_modules/bootstrap/scss/bootstrap';

  // Layout

  html {
    margin: 0;
    padding: 0;
  }

  body {
    box-sizing: content-box;
    margin: 0;
    padding: 0;
    background-color: rgb(120, 84, 84);
    height: 100%;
  }

  h2 {
    font-size: 1.2rem;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .text {
    font-family: 'Times New Roman', Times, serif;
  }

  // Buttons

  .btn-group label {
    padding: 0.1rem 0.7rem;
  }

  button.btn-major,
  button.btn-minor {
    color: $blueLinkForeColor;
    padding: 0.1rem 1rem;
    border-radius: 0.5rem;
  }

  button.btn-major {
    background-color: $majorButtonColor;
    border: 1px solid $majorButtonColor;
  }

  button.btn-minor {
    background-color: $minorButtonColor;
    border: 1px solid $minorButtonColor;
  }

  button.btn-major:hover,
  button.btn-minor:hover {
    border: 1px solid $blueLinkForeColor;
    color: $blueLinkForeColor;
  }

  button.compact {
    padding: 0 0.5rem;
    font-size: 90%;
  }

  input[file]::before {
    font-size: 90%;
  }

  .link_text {
    color: $blueLinkForeColor;
    text-decoration: underline;
    cursor: pointer;
  }

  // Modals

  .dialog {
    padding: 1.5rem;
  }

  .dialog,
  .modal-notice {
    border-radius: 8px;
    pointer-events: auto;
  }

  .modal-notice {
    margin: 0 auto;
    padding: 1rem;
  }

  .modal-flash {
    padding: 1.5rem;
    text-align: center;
  }

  // Alerts

  .disable-clicks {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10000;
  }

  .alert {
    margin-bottom: 0; // override default 1rem
  }

  // Multi-page code-provided CSS

  .taxon-rank {
    opacity: $deemphOpacity;
  }

  .stats_deemph {
    color: #6a547f;
    font-size: 0.95em;
  }
</style>
