<script lang="ts">
  import InfoDialog from '../../dialogs/InfoDialog.svelte';
  import { PREDICTION_HISTORY_SAMPLE_DEPTH } from '../../../shared/model';

  export let close: () => void;
</script>

<InfoDialog title="About Prediction Accuracy" maxWidth="800px" onClose={close}>
  <p>
    This page makes predictions about the number of additional species researchers will
    find on their next visit or person-visit to a cave and predictions about the taxa of
    those additional species. The page also determines the accuracy of the predictive
    technique by applying the technique to recent historical data and measuring the
    degree to which it correctly predicted subsequent historical data. While the
    predictions are specific to each cave, prediction accuracy is measured on a
    per-cluster basis.
  </p>

  <h3>Predicting number of additional species (+spp.)</h3>

  <p>
    Predictions of the number of additional species expected to be found are made
    separately for the next visit to the cave and the next person-visit to the cave. The
    person-visit prediction is the additional species expected to be found for each
    person next visiting the cave. If the number of people participating in a collecting
    trip significantly affects the number of species found, person-visit predictions
    will be more accurate than visit predictions.
  </p>
  <p>
    The prediction algorithm predicts the number of expected future species as a
    function of the number of past species found. This entails counting species for all
    records, whether the associated specimens are determined to species or not. The
    minimum possible number of species is used, assuming the available determinations
    are correct. For example, if one specimen is only determined to the order Araneae,
    another to the family Hahniidae, another to the genus <i>Cicurina</i>, and another
    to the species <i>Cicurina bandera</i>, the species count remains at 1 because this
    species belongs to each of these higher ranks and it's possible that all of the
    specimens are actually the same species. However, the addition of a second family, a
    second genus, or a second species determination would increase the count.
  </p>
  <p>
    To produce the number of additional species expected to be found at a cave, the
    power curve <span class="eq">y</span> <span class="eq">=</span>
    <span class="eq">Ax<sup>P</sup>+B</span> is fit to recent visits to the cave. Here,
    <span class="eq">x</span>
    is the number of visits or person-visits, <span class="eq">y</span> is the total
    number of species found at the cave by the time of that visit or person-visit,
    <span class="eq">A</span>
    and <span class="eq">B</span> are constants determined by linear regression, and
    <span class="eq">P</span> is a constant determined by a binary search of linear
    regressions finding <span class="eq">A</span>, <span class="eq">B</span>, and
    <span class="eq">P</span> having minimal RMSE. The curve is then extended to the next
    visit or person visit, and the increase in the number of species is recorded as the prediction
    of the number of additional species expected on the next visit or person-visit.
  </p>
  <p>
    When configuring the clusters, you specify the minimum and maximum number of recent
    visits to use for making predictions. This determines which points <span class="eq"
      >(x,</span
    > <span class="eq">y)</span> are used to produce the power curve. No fewer than 2 visits
    can be used to make a prediction. If you allow 2-visit predictions and a cave has only
    2 visits, the slope of a line through the points of those visits will be used as the
    predicted number of additional species for that cave; the power curve is used when 3
    or more visits are available. If the minimum number of visits you allow is N and the
    cave has fewer than N points, no prediction is made for the number of additional species
    expected to be found at the cave.
  </p>
  <p>
    The greater the minimum number of visits used in making predictions, the more
    accurate the predictions tend to be, but the fewer caves for which predictions can
    be made about the expected number of additional species.
  </p>
  <p>
    If you specify 'All' as maximum number of visits, a curve will be fit to all visits
    to the cave at and above the minimum visits specified. Be aware that initial visits
    to a cave tend to be highly productive, biasing the curve upwards and possibly
    worsening predictions for future visits when species are actually leveling off.
  </p>
  <p>
    The accuracy of these predictions is determined separately for each cluster. Within
    a cluster, caves are sorted by the number of additional species expected on the next
    visit or person-visit, highest counts first. The prediction of the top cave in this
    sort is referred to as the "Top 1" prediction. The predictions of the top two caves
    in this sort are together the "Top 2" predictions, and so on. We can refer to the
    "Top N" predictions as the predictions of the top N caves of this sort. Accuracy is
    measured for each top N group within a cluster, rather than for each cave.
  </p>
  <p>
    To produce a measure of accuracy for each top N group, the most recent {PREDICTION_HISTORY_SAMPLE_DEPTH}
    visits are first docked from all caves. The above technique is then applied to the remaining
    points, as if this were the dataset from which predictions should be made. Predictions
    of the number of additional species expected are made for each cave having a sufficient
    number of visits, separately for the next visit and the next person-visit. In each set,
    the caves are then sorted by their predictions, highest predictions first. Let's call
    this the "predicted sort". The "actual sort" is a sort of the caves according to the
    number of additional species actually found on the next visit or person-visit. Since
    we started {PREDICTION_HISTORY_SAMPLE_DEPTH}
    visits back, we have this data, found at {PREDICTION_HISTORY_SAMPLE_DEPTH - 1} visits
    back.
  </p>
  <p>
    For each value of N, the caves common to both the top N of the predicted sort and
    the top N of the actual sort are counted, and this count is divided by N. This is
    the fraction of caves that were correctly predicted to occur within the top N caves
    of the sort. However, it is possible that the predicted sort has fewer caves than
    the actual sort, due to being unable to make predictions with fewer data points. For
    this reason, the number of caves in each top N of the predicted sort are also
    tracked, and this number serves as the weight associated with the particular top N
    fraction.
  </p>
  <p>
    After producing fractions and weights for each top N group from a dock of the most
    recent {PREDICTION_HISTORY_SAMPLE_DEPTH} visits, the process repeats, docking one fewer
    number of recent visits each time, until all possible numbers of visits have been docked.
    For each top N group, the fractions collected for the group are averaged together, weighted
    by the number of caves contributing the fractions. The result is a single fraction for
    each top N group of the cluster indicating the fraction of caves correctly predicted
    to occur within the top N group of caves, on average, across the cluster.
  </p>
  <p>
    The fraction for a top N group of predictions indicates the fraction of caves
    predicted to occur within the top N group that can be expected to actually be a top
    N prediction, according to historical data. The page reports these fractions as
    percentages. For example, a top 5 accuracy of 25% would mean that 25% of the caves
    shown in the top N group can actually be expected to be among the top N best
    yielding caves on the next visit or person-visit. Put another way, a top 5 accuracy
    of 25% would mean that 25% of the top N predictions can be expected to have been
    correctly placed among the top N, according to historical data.
  </p>

  <h3>Predicting next expected taxa (+taxa)</h3>

  <p>
    Caves are sorted into clusters by the similarity of their fauna under the assumption
    that the more similar the fauna has been in the past, the more similar it will be in
    the future. The additional fauna expected to be found in a cave is merely the fauna
    found elsewhere in the cluster to which the cave belongs but not yet found in the
    cave. For each cave, these remaining fauna are sorted by the number of visits to
    other caves of the cluster in which their taxa have been found. The greater the
    number of visits a taxon has, the higher the taxon appears in the sort, and
    presumably the more likely the taxon will appear in future visits to the cave. The
    taxonomic predictions therefore use historical prevalence to predict the taxa most
    likely to be encountered next.
  </p>
  <p>
    Predictions are not necessarily available for each taxonomic rank. They instead
    suggest the most specific determinations that will be made for future specimens
    according to the most specific determinations made for past specimens. For example,
    if all past insects of a cluster have been determined to species, the cluster will
    provide no prediction for the class Insecta, only predictions for species previously
    determined; and if some past specimens were determined to Insecta but the cave does
    not yet have a specimen with this incomplete determination, there will be a
    prediction for future specimens only determined to class Insecta according to its
    prevalence elsewhere in the cluster. Over time, as past specimens become further
    determined, predicted taxa will become more specific too.
  </p>
  <p>
    The accuracy of taxonomic predictions is measured similarly to the accuracy for the
    number of additional species expected. The process starts by first docking the {PREDICTION_HISTORY_SAMPLE_DEPTH}
    most recent visits from a single cave, leaving all other caves of the cluster complete.
    It then identifies all taxonomic determinations found elsewhere in the cluster but not
    yet in this cave, and it sorts these taxa by the number of visits in which they occurred
    in other caves, highest counts first. This is the "predicted sort". The "actual sort"
    consists of the actual taxa known to have been added to the cave during the {PREDICTION_HISTORY_SAMPLE_DEPTH}
    visits that were docked. It is sorted first by the visit on which the taxa were first
    encountered and second by taxonomic rank, highest rank first. Determinations of higher
    rank are more likely than those of lower rank, given that they encompass more species,
    making a rank sort within a visit more likely to order the taxa found within the visit
    similarly to the order of taxa by frequency in the predicted sort.
  </p>
  <p>
    As with predictions of number of species, accuracy is measured for each top N
    predicted taxa. For each value of N, the taxa common to both the top N of the
    predicted sort and the top N of the actual sort are counted, and this count is
    divided by N. This is the fraction of taxa that were correctly predicted to occur
    within the top N taxa of the sort. However, it is possible that the predicted sort
    has fewer taxa than the actual sort, due to the cave producing taxa not found
    elsewhere in the cluster. For this reason, the number of taxa in each top N of the
    predicted sort are also tracked, and this number serves as the weight associated
    with the particular top N fraction.
  </p>
  <p>
    After producing fractions and weights for each top N group from a dock of the most
    recent {PREDICTION_HISTORY_SAMPLE_DEPTH} visits to the cave, the process repeats, docking
    one fewer number of recent visits each time, until all possible numbers of visits have
    been docked for the cave. The algorithm repeats this process for each cave, collecting
    all the fractions and all the weights associated with each top N group of taxa. Then,
    for each top N group, the fractions collected for the group are averaged together, weighted
    by the number of taxa contributing the fractions. The result is a single fraction for
    each top N group of the cluster indicating the fraction of taxa correctly predicted to
    occur within the top N group of taxa, on average, across the cluster.
  </p>
  <p>
    The fraction for a top N group of predictions indicates the fraction of taxa
    predicted to occur within the top N group that can be expected to actually be a top
    N prediction, according to historical data. The page reports these fractions as
    percentages. For example, a top 5 accuracy of 25% would mean that 25% of the taxa
    shown in the top N group can be expected to be among the next N taxa found in the
    cave, according to historical data.
  </p>

  <h3>caveats</h3>
</InfoDialog>
