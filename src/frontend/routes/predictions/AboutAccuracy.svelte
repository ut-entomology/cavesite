<script lang="ts">
  import { onMount } from 'svelte';

  import InfoDialog from '../../dialogs/InfoDialog.svelte';
  import HowToUse from '../../components/HowToUse.svelte';
  import SimpleTOC from '../../components/SimpleTOC.svelte';
  import { PREDICTION_HISTORY_SAMPLE_DEPTH } from '../../../shared/model';

  export let close: () => void;

  let updateTOC: () => void;

  onMount(() => updateTOC());
</script>

<InfoDialog title="About Prediction Accuracy" maxWidth="800px" onClose={close}>
  <HowToUse>
    <p>
      In addition to providing predictions, this tab reports estimates of the accuracy
      of its predictions. Accuracy is determined by applying the predictive technique to
      historical data and measuring the degree to which the predictions agree with
      subsequent historical data. While the predictions are specific to each cave,
      prediction accuracy is measured separately for each cluster. Accuracy measurements
      always apply to the cluster as a whole and not to individual caves or taxa. The
      tab also provides estimates of the overall accuracy of the clustering, spanning
      all clusters.
    </p>
    <p>
      The explanations that follow may make more sense after you've read the portion of
      the tab's how-to guide that describes how predictions are made.
    </p>

    <SimpleTOC tag="h3" setUpdater={(updater) => (updateTOC = updater)} />

    <h3 id="species_accuracy">
      Accuracy of predicting numbers of additional species (+spp.)
    </h3>

    <p>
      The tab makes predictions about the number of additional species researchers will
      find on their next visit or person-visit to a cave. Recall that it does this by
      fitting a power curve to the points associated with a range of recent visits to
      the cave and then extending the curve to the next visit or person-visit. Given
      that the data only has records of visits for which specimens were collected, it's
      clear that this technique will often be unreliable. Accuracy measurements of this
      technique can help you decide the degree to which to trust these predictions, or
      perhaps the degree to which you can treat these predictions as measures of the
      numbers of additional species that remain in the caves, independently of whether
      they would be found on the next visit or person-visit.
    </p>
    <p>
      The accuracy of predictions is determined separately for each cluster. Within a
      cluster, caves are sorted by the number of additional species predicted for the
      next visit or person-visit, highest count first. The prediction of the top cave in
      this sort is referred to as the "Top 1" prediction. The predictions of the top two
      caves in this sort, irrespective of order, are together the "Top 2" predictions,
      and so on. We can refer to the "Top N" predictions as the predictions of the top N
      caves of this sort, ignoring their order. Accuracy is measured for each top N
      group within a cluster, rather than for each cave.
    </p>
    <p>
      To produce a measure of accuracy for each top N group, the most recent {PREDICTION_HISTORY_SAMPLE_DEPTH}
      visits are first docked from all caves. The predictive technique is then applied to
      the remaining points, as if this were the dataset from which predictions should be
      made. Predictions of the number of additional species expected are made for each cave
      having a sufficient number of visits, separately for the next visit and the next person-visit.
      In each set, the caves are then sorted by their predictions, highest predicted value
      first. Let's call this the "predicted sort". The "actual sort" is a sort of the caves
      according to the number of additional species actually found on the next visit or person-visit.
      Since we started {PREDICTION_HISTORY_SAMPLE_DEPTH}
      visits back, we have this 'actual' data at {PREDICTION_HISTORY_SAMPLE_DEPTH - 1} visits
      back.
    </p>
    <p>
      For each value of N, the caves common to both the top N of the predicted sort and
      the top N of the actual sort are counted, and this count is divided by N. This is
      the fraction of caves that were correctly predicted to occur within the top N
      caves of the sort. However, it is possible that the predicted sort has fewer caves
      than the actual sort, due to being unable to make predictions using fewer data
      points. For this reason, the number of caves in each top N of the predicted sort
      are also tracked, and this number serves as the weight associated with the
      particular top N fraction.
    </p>
    <p>
      After producing fractions and weights for each top N group from a dock of the most
      recent {PREDICTION_HISTORY_SAMPLE_DEPTH} visits, the process repeats, docking one fewer
      number of recent visits each time, until each of the {PREDICTION_HISTORY_SAMPLE_DEPTH}
      sets of recent visits has been docked. For each top N group, the fractions collected
      for the group are averaged together, weighted by the number of caves contributing the
      fractions. The result is a single fraction for each top N group of the cluster indicating
      the fraction of caves correctly predicted to occur within the top N group of caves,
      on average, across the cluster.
    </p>
    <p>
      The fraction for a top N group of predictions indicates the fraction of caves
      predicted to occur within the top N group that can be expected to actually occur
      among the top N caves after further collection, at least according to historical
      data. The page reports these fractions as percentages. For example, a top 5
      accuracy of 25% would mean that 25% of the caves shown in the top N group can
      actually be expected to be among the top N best yielding caves on the next visit
      or person-visit. Put still another way, a top 5 accuracy of 25% would mean that
      25% of the top N predictions can be expected to have been correctly placed among
      the top N, according to historical data.
    </p>

    <h3 id="taxa_accuracy">Accuracy of predicting next expected taxa (+taxa)</h3>

    <p>
      This tab also makes predictions about which taxa remain to be found in a cave that
      have not already been found in the cave. Recall that these expected remaining taxa
      are the taxa of the cluster to which the cave belongs that have not yet been found
      in the cave. More specifically, the predictions are for taxonomic determinations
      made in the cluster than have not yet been made for the cave, regardless of the
      taxonomic rank of the determinations. These remaining taxa are sorted by the
      number of visits in which they've been found in the other caves of the cluster,
      highest count first, thereby ordering them by their assumed likelihood of being
      found in the cave.
    </p>
    <p>
      The accuracy of taxonomic predictions is measured similarly to the accuracy for
      the number of additional species expected. The process starts by first docking the {PREDICTION_HISTORY_SAMPLE_DEPTH}
      most recent visits from a single cave, leaving all other caves of the cluster complete.
      It then identifies all taxonomic determinations found elsewhere in the cluster but
      not yet in this cave, and it sorts these taxa by the number of visits in which they
      occurred in other caves, highest count first. This is the "predicted sort". The "actual
      sort" consists of the actual taxa known to have been added to the cave during the {PREDICTION_HISTORY_SAMPLE_DEPTH}
      visits that were docked. This is a two-phase sort: first by the visit in which the
      taxa were first encountered, oldest visit first, and second by taxonomic rank, highest
      rank first. Determinations of higher rank are more likely than those of lower rank,
      given that they encompass more species, making a rank sort within a visit more likely
      to order the taxa found within the visit like the ordering of taxa by frequency in
      the predicted sort.
    </p>
    <p>
      As with the predictions for number of additional species, accuracy is measured for
      each top N predicted taxa. For each value of N, the taxa common to both the top N
      of the predicted sort and the top N of the actual sort are counted, and this count
      is divided by N. This is the fraction of taxa that were correctly predicted to
      occur within the top N taxa of the sort, ignoring their order within these N taxa.
      However, it is possible that the predicted sort has fewer taxa than the actual
      sort, due to the cave producing taxa not found elsewhere in the cluster. For this
      reason, the number of taxa in each top N of the predicted sort are also tracked,
      and this number serves as the weight associated with the particular top N
      fraction.
    </p>
    <p>
      After producing fractions and weights for each top N group from a dock of the most
      recent {PREDICTION_HISTORY_SAMPLE_DEPTH} visits to the cave, the process repeats, docking
      one fewer number of recent visits each time, until each of the {PREDICTION_HISTORY_SAMPLE_DEPTH}
      sets of recent visits been docked. The algorithm repeats this process for each cave,
      collecting all the fractions and all the weights associated with each top N group of
      taxa. Then, for each top N group, the fractions collected for the group are averaged
      together, weighted by the number of taxa contributing the fractions. The result is
      a single fraction for each top N group of the cluster indicating the fraction of taxa
      correctly predicted to occur within the top N group of taxa, on average, across the
      cluster.
    </p>
    <p>
      The fraction for a top N group of predictions indicates the fraction of taxa
      predicted to occur within the top N group that can be expected to actually occur
      among the top N additional taxa after further collection, at least according to
      historical data. The page reports these fractions as percentages. For example, a
      top 5 accuracy of 25% would mean that 25% of the taxa shown in the top N group can
      be expected to be among the next N taxa found in the cave. However, because
      predictions of no additional taxa have zero weight in fraction averaging, this
      technique only assesses which taxa can be found when there are additional taxa to
      be found. You should instead look at predictions of numbers of additional species
      for determining how many taxa remain to be found in a cave.
    </p>

    <h3 id="overall_accuracy">Accuracy Summary and Overall Accuracy</h3>

    <p>
      The accuracy summary and overall accuracy percentages provide measures of the
      accuracy of the clustering itself, encompassing the predictions made for all of
      the clusters. You can glance at these numbers when experimenting with clusterings
      to find one that might be suitable, sparing you from having to examine the
      clusters in detail. However, you may still want to examine the details if you're
      trying to optimize the accuracy of predictions for a particular cave or group of
      caves.
    </p>
    <p>
      Top 10 and Top 20 summary accuracies of predicted numbers of additional species
      are given for both visits ("+spp. next visit") and person visits ("+spp. next
      person-visit"). The Top 10 summary accuracy is the average top 10 accuracy
      associated with the clusters, weighted by the number of caves in each cluster. If
      a cluster does not have enough predictions for a top 10 accuracy, the nearest
      lower top N accuracy is used instead. The Top 20 summary accuracy is the average
      top 20 accuracy associated with the clusters, also weighted by the number of caves
      in each cluster. If a cluster does not have enough predictions for a top 20
      accuracy, the accuracy of the nearest lower top N greater than 10 is used instead,
      if there is any. Note that when the ratio of caves-to-clusters drops below 20,
      these summaries tend toward 100% because all caves of the cluster are in the top
      20 caves.
    </p>
    <p>
      Top 3 and Top 6 summary accuracies of predicted remaining taxa are also given
      ("+taxa per cave"). The Top 3 summary accuracy is the average top 3 accuracy
      associated with the clusters, weighted by the number of caves in each cluster. If
      a cluster does not have enough predictions for a top 3 accuracy, the nearest lower
      top N accuracy is used instead. The Top 6 summary accuracy is the average top 6
      accuracy associated with the clusters, also weighted by the number of caves in
      each cluster. If a cluster does not have enough predictions for a top 6 accuracy,
      the accuracy of the nearest lower top N greater than 3 is used instead, if there
      is any.
    </p>
    <p>
      The overall accuracy of predicted numbers of additional species ("+spp.") is a
      function of a number computed for the Top 10 and Top 20 visit summary accuracies
      and a number computed for the Top 10 and Top 20 person-visit summary accuracies.
      For each pair of summary accuracies, if the Top 20 accuracy is zero, the number is
      the Top 10 accuracy. Otherwise, the number is the average of the Top 10 and Top 20
      accuracies. The overall accuracy of predicted numbers of additional species is the
      greater of these two numbers, thus reporting the better of the visits and
      person-visits accuracies. The associated number of caves is the number of caves
      having sufficient numbers of visits to contribute to this accuracy measure.
    </p>
    <p>
      The overall accuracy of predicted remaining taxa ("+taxa") is a function of the
      Top 3 and Top 6 summary accuracies for predicted remaining taxa. If the Top 6
      accuracy is zero, the overall accuracy is the Top 3 accuracy. Otherwise, the
      overall accuracy is the average of the Top 3 and Top 6 accuracies. The associated
      number of caves is the number of caves having at least two visits, which allows
      the cave to have at least one historical prediction to contribute to this accuracy
      measure.
    </p>

    <h3 id="caveat">Caveat on predictions and prediction accuracy</h3>

    <p>
      This tab makes predictions of numbers of additional species based on data that
      does not reflect all visits made to the caves. The algorithms are only aware of
      visits for which at least one specimen was collected and deposited in the UT
      Austin collection. Cave researcher James Reddell explains that there are many
      visits for which no specimens are collected, either because none at all were found
      or because none of interest were found. As a result, predictions of numbers of
      additional species should be treated as best-case scenarios. However, predictions
      for caves that are known to be regularly sampled can be treated as potentially
      more accurate.
    </p>
    <p>
      This caveat does not apply to predictions of the taxa that remain to be found in a
      cave, because these predictions already ignore visits in which no taxa were found.
    </p>
  </HowToUse>
</InfoDialog>
