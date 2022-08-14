<script lang="ts">
  import DataTabRoute from '../../components/DataTabRoute.svelte';
  import TabHeader from '../../components/TabHeader.svelte';
  import { pageName } from '../../stores/pageName';

  $pageName = 'Welcome';
  const tabName = 'Welcome';
</script>

<DataTabRoute activeTab={tabName}>
  <svelte:fragment slot="body">
    <div class="container-fluid mb-3">
      <TabHeader {tabName} title={$pageName} />
      <p>
        Welcome to my capstone project. This tool helps researchers extend the known
        ranges of cave invertebrates in Texas. Please click on the 'Predictions' tab.
      </p>
      <p>
        Caves are largely isolated from one another and it is difficult to assess which
        species of any given cave should also be found in other caves. Researchers can
        use this tool to group caves into clusters and leverage information about each
        cluster as a whole to make inferences about the individual caves of the cluster.
        For each cave, the tool estimates the effort required to find additional species
        and reports the most likely species to be found. Given that there are over 1,700
        caves in Texas and that researchers have limited resources, the tool should help
        researchers decide which caves to prioritize for further sampling. By accurately
        prioritizing caves for sampling, researchers can maximize both the number of
        species for which they extend ranges and the sizes of those range extensions.
      </p>
      <p>
        The project is live for use by cave researchers at <a
          href="https://caves.tacc.utexas.edu/"
          target="_blank">caves.tacc.utexas.edu</a
        >. The entire cave research site is available open source under the Apache 2
        license at
        <a href="https://github.com/ut-entomology/cavesite" target="_blank"
          >this github repo</a
        >. You'll find the capstone subset of the site in the
        <a
          href="https://github.com/ut-entomology/cavesite/tree/capstone"
          target="_blank">capstone branch</a
        > of the repo.
      </p>
      <p class="email">
        <a href="mailto:joe.lapp@utexas.edu">joe.lapp@utexas.edu</a>
      </p>
    </div>
  </svelte:fragment>
</DataTabRoute>

<style>
  .email {
    margin: 1.5rem auto;
    font-size: 1.2rem;
    text-align: center;
  }
</style>
