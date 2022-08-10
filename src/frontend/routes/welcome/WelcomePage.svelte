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
        Welcome to a preview of the <u><b>Texas Underground</b></u> website. This site provides
        access to the Biospeleological Collection at the University of Texas at Austin, restricted
        to the specimens collected in Texas. Maintained by James R. Reddell, this collection
        is the largest in the world dedicated to cave invertebrates.
      </p>
      <p>This preview allows you to do the following:</p>
      <ul>
        <li>Browse the taxa found in the collection</li>
        <li>Browse the locations where specimens were collected</li>
        <li>View color-coded maps of the data</li>
        <li>View seasonality and history graphs</li>
        <li>Predict which taxa might be found on future visits to caves</li>
        <li>Query for specimen data based on custom criteria</li>
      </ul>
      <p>The following features are under development:</p>
      <ul>
        <li>How-to guides for the various tabs</li>
        <li>Needed admin pages</li>
      </ul>
      <p>
        <b>EXPECT BUGS</b> (of all kinds). The site is still under development. Please report
        any problems you have, along with your suggestions for improvement and feature requests.
        We are also still cleaning and converting the data, so please also report anything
        odd you notice with the data itself.
      </p>
      <p>
        For issues related to site functionality or data, please email the developer <a
          href="mailto:joe.lapp@utexas.edu">joe.lapp@utexas.edu</a
        >.
      </p>
      <p>
        For general issues, please email the collection curator <a
          href="alex.wild@utexas.edu">alex.wild@utexas.edu</a
        >.
      </p>
    </div>
  </svelte:fragment>
</DataTabRoute>
