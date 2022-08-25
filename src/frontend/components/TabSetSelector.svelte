<script lang="ts">
  import page from 'page';

  const tabSetLabels = ['Data', 'Admin'];

  let selection = window.location.pathname.includes('/admin/') ? 'admin' : 'data';

  const onChange = () => page(selection == 'admin' ? '/admin/files' : '/');
</script>

<div class="btn-group" role="group" aria-label="Switch between data and admin tabs">
  {#each tabSetLabels as tabSetLabel}
    {@const tabSet = tabSetLabel.toLowerCase()}
    <input
      type="radio"
      class="btn-check"
      bind:group={selection}
      name="tab_set"
      id={tabSet}
      value={tabSet}
      on:change={onChange}
    />
    <label class="btn btn-outline-primary compact" for={tabSet}>{tabSetLabel}</label>
  {/each}
</div>
