<script lang="ts">
  import page from 'page';

  const tabSetLabels = ['Data', 'Admin'];

  let selection = 'data';

  $: {
    if (selection == 'admin') {
      console.log('admin');
      page('/admin/users');
    } else {
      console.log('data');
      page('/taxa');
    }
  }
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
    />
    <label class="btn btn-outline-primary" for={tabSet}>{tabSetLabel}</label>
  {/each}
</div>
