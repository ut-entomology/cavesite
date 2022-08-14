<script lang="ts">
  import InfoDialog from '../../components/InfoDialog.svelte';

  export let close: () => void;
</script>

<InfoDialog
  title="About the Average Model"
  classes="about_model_box"
  maxWidth="45rem"
  onClose={close}
>
  This model helps you understand the average rate at which additional species are found
  in the caves of this cluster. To produce this model, each cave is separately regressed
  and modeled to fit an equation of the form <span class="eq"
    >y<sub>k</sub> = A x<sup>P</sup> + B</span
  >. The points
  <span class="eq"
    >(x, (&Sigma; y<sub>k</sub>*w<sub>k</sub>)/(&Sigma; w<sub>k</sub>))</span
  >
  are then plotted, where <span class="eq">w<sub>k</sub></span> is the weight of cave
  <span class="eq">k</span>, and a new model is generated from these points to fit the
  same equation. The result is a weighted average of the individual cave models.

  <ul>
    <li>
      The "Min. pts." input specifies the minimum number of points that must occur in a
      cave for the cave's data to be included in the average model.
    </li>
    <li>
      The "Min. x." input specifies the minimum value of x (visits or person-visits)
      that the cave must have reached in order for the cave's data to be included in the
      average model.
    </li>
    <li>
      The "Weight" input provides the magnitude of the weighting <span class="eq"
        >W</span
      >, so that
      <span class="eq"
        >w<sub>k</sub>=<i>max</i>(&cup;{'{'}x<sub>ki</sub>{'}'})<sup>W</sup></span
      >, where
      <span class="eq">x<sub>ki</sub></span>
      are the x values of cave <span class="eq">k</span>. Higher values of
      <span class="eq">W</span> therefore bias the model toward caves having more visits
      or person-visits (the x values).
    </li>
    <li>
      The scatter and residuals plots only show data for caves that were included in the
      average model, and they only show the points actually being regressed, according
      to the selected maximum number of recent points to regress. The scatter plot's
      title indicates both the number of caves used in the average model and the total
      number of caves in the cluster.
    </li>
    <li>
      <b>IMPORTANT:</b> This modeling makes the largely false assumption that researchers
      collect at least one specimen on each visit to each cave and deposit that specimen
      in the UT Biospeleological collection; receipt of a specimen is what indicates a visit
      to the cave. The models are therefore a reflection of both natural conditions and human
      behavior.
    </li>
  </ul>
</InfoDialog>

<style>
  :global(.about_model_box) {
    font-size: 0.95rem;
  }

  ul {
    margin: 1rem 0 -0.5rem 0;
  }
  li {
    margin: 0.5rem 0;
  }
</style>
