<script lang="ts">
  import router from 'page';
  import type { SvelteComponent } from 'svelte';

  import { client } from './stores/client';
  import { userInfo } from './stores/user_info';
  import { appInfo } from './stores/app_info';
  import type { LoginInfo } from '../shared/user_auth';
  import { initRefresher, setExpiration } from './util/refresher';
  import Layout from './routes/_Layout.svelte';
  import Welcome from './routes/Welcome.svelte';
  import Taxa from './routes/Taxa.svelte';
  import Locations from './routes/Locations.svelte';
  import Specimens from './routes/Specimens.svelte';
  import Users from './routes/admin/Users.svelte';
  import Coords from './routes/admin/Coords.svelte';
  import Logs from './routes/admin/Logs.svelte';
  import Schedule from './routes/admin/Schedule.svelte';
  import NotFound from './routes/NotFound.svelte';
  import { showNotice } from './common/VariableNotice.svelte';

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
      userInfo.set(null);
      window.location.href = '/';
    }
  });

  // Initialize client-side routes.

  const routes = {
    '/': Welcome,
    '/taxa': Taxa,
    '/locations': Locations,
    '/specimens': Specimens,

    '/admin/users': Users,
    '/admin/coords': Coords,
    '/admin/logs': Logs,
    '/admin/schedule': Schedule,

    '*': NotFound
  };

  let page: typeof SvelteComponent;
  let params: any = null;

  for (const [route, component] of Object.entries(routes)) {
    router(
      route,
      (ctx, next) => {
        params = ctx.params;
        next();
      },
      () => (page = component)
    );
  }
  router.start();

  async function connect() {
    const res = await $client.post('/api/auth/connect');
    if (res.data) {
      const loginInfo: LoginInfo = res.data;
      appInfo.set({
        appTitle: loginInfo.appTitle,
        appSubtitle: loginInfo.appSubtitle
      });
      if (loginInfo.userInfo && loginInfo.expiration) {
        $userInfo = loginInfo.userInfo;
        setExpiration(loginInfo.expiration);
      }
    }
  }
</script>

{#await connect() then}
  {#if page !== NotFound}
    <Layout>
      {#if params.length > 0}
        <svelte:component this={page} {params} />
      {:else}
        <svelte:component this={page} />
      {/if}
    </Layout>
  {:else}
    <svelte:component this={page} />
  {/if}
{:catch err}
  Unable to connect to server.
  <br />{err}
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
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    background-color: $backgroundColor;
  }

  .page-content {
    flex: auto;
    display: flex;
    flex-direction: column;
    margin: $horizontalMargin;
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

  .alert {
    margin-bottom: 0; // override default 1rem
  }
</style>
