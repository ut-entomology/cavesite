<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { usingAdminTabs } from '../stores/usingAdminTabs';

  const tabSetLabels = ['Data', 'Admin'];

  let selection = $usingAdminTabs ? 'admin' : 'data';

  function tabSetChanged() {
    if (selection == 'admin') {
      usingAdminTabs.set(true);
      push('/admin/users');
    } else {
      usingAdminTabs.set(false);
      push('/taxa');
    }
  }
</script>

<div class="btn-group" role="group" aria-label="Switch between data and admin tabs">
  {#each tabSetLabels as tabSetLabel}
    {@const tabSet = tabSetLabel.toLowerCase()}
    {@const checked = tabSet == selection}
    <input
      type="radio"
      class="btn-check"
      name={tabSet}
      id={tabSet}
      autocomplete="off"
      {checked}
      on:change={tabSetChanged}
    />
    <label class="btn btn-outline-primary" for={tabSet}>{tabSetLabel}</label>
  {/each}
</div>
