<script lang="ts">
  import router from 'page';
  import type { SvelteComponent } from 'svelte';

  import { client, errorReason } from './stores/client';
  import { appInfo } from './stores/appInfo';
  import Layout from './routes/_Layout.svelte';
  import WelcomePage from './routes/welcome/WelcomePage.svelte';
  import PredictionsPage from './routes/predictions/PredictionsPage.svelte';
  import NotFound from './routes/NotFound.svelte';
  import Notice from './common/Notice.svelte';
  import { pageName } from './stores/pageName';
  import type { AppInfo } from '../shared/app_info';

  // Initialize client-side routes.

  const routes: Record<string, typeof SvelteComponent> = {
    '/': WelcomePage,
    '/predictions': PredictionsPage,

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
      const resAppInfo: AppInfo = res.data;
      appInfo.set({
        appTitle: resAppInfo.appTitle,
        appSubtitle: resAppInfo.appSubtitle,
        hiddenRoutes: resAppInfo.hiddenRoutes,
        mapToken: resAppInfo.mapToken
      });
      $appInfo.hiddenRoutes.forEach((route) => delete routes[route]);
    }
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

  h3 {
    font-size: 1.2rem;
    font-weight: bold;
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

  .compact {
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

  .eq {
    font-family: 'Courier New', Courier, monospace;
  }

  .hidden {
    display: none;
  }
</style>
