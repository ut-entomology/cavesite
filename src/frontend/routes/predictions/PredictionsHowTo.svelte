<script lang="ts">
  import ExampleImage from '../../components/ExampleImage.svelte';
</script>

<p>
  This tab predicts the number of additional species you can expect to find on your next
  visit to a cave and the most likely taxa these additional species will have. It also
  predicts the number of additional species to expect per participating collector on the
  next visit (per "person-visit"), in case these predictions are more accurate. The tab
  estimates the accuracy of its predictions according to the accuracy of the predictive
  technique on recent historical data. You can also examine plots of numbers of species
  found across visits and person-visits, regressions of these plots fit to power curves,
  and the frequencies at which taxa are found on visits to caves.
</p>
<p>
  In order to limit the fauna and ensure predictions are meaningful, the analysis is
  restricted to caves. We do not have exact information about which locations are caves
  and which are not, but most caves seem to include the word "cave" in their names, so
  only locations that include the sequence of characters "cave" are included in the
  analysis. This includes, for example, names including the word "cavern".
</p>

<h3>Generating Clusters</h3>

<p>
  To produce predictions, we must first partition the set of caves into clusters in a
  process called "clustering." The process groups caves by the similarity of their
  fauna. We assume that the more similar the fauna, the more similar the habitat, and
  the more alike the caves. The more alike the caves of a cluster, the more accurately
  we should be able to make predictions about any cave in the cluster from information
  about the other caves of the cluster. The accuracy achievable by applying the
  predictive technique to historical data clustered this way suggests that these
  assumptions are reasonable.
</p>
<p>
  There does not appear to be an ideal way to cluster caves by the similarity of their
  fauna. You'll instead explore various clustering configurations to find one that meets
  your criteria. When you click the "Load Clusters" button (or the "Change Clusters"
  button if clusters are already loaded), you'll be given the following dialog box of
  the most helpful parameters:
</p>

<ExampleImage
  src="/predictions/default-predictions-config.png"
  alt="Default predictions configuration"
/>

<p>The parameters are as follows:</p>

<ul>
  <li>
    <b>Maximum clusters</b> into which to group the caves &mdash; This is the number of clusters
    you want to attempt to produce. Depending on other parameters of the clustering, the
    algorithm may not succeed in producing the requested number of clusters. Generally, the
    more clusters you have, the more accurate the predictions, until you exceed the natural
    number of clusters available.
  </li>
  <li>
    <b>Fauna to compare</b> when clustering caves by common taxa &mdash; This selects the
    fauna that will be used when comparing caves for similarity. "All fauna" uses all specimens
    collected for each cave in the analysis. "Genera of cave obligates" uses only specimens
    belonging to genera for which at least one species is known to be cave obligate, whether
    or not the specimen is cave obligate. "Cave obligates" uses only specimens that are known
    to be cave obligate. Generally, the more restricted the fauna, the more accurate the
    predictions, but the fewer caves for which predictions are made.
  </li>
  <li>
    <b>Highest taxonomic rank</b> to use in comparisons &mdash; This selects the taxonomic
    ranks that are to contribute to the similarity of compared specimens. Each taxonomic
    rank of each specimen is compared, up to the rank specified here. Lower taxonomic ranks
    contribute more to the similarity measure than higher ranks, and ranks above the rank
    selected here contribute nothing to similarity. Lower ranks tend to produce better predictions,
    but mainly for well-sampled caves, leaving less-sampled caves poorly analyzed.
  </li>
  <li>
    <b>Min./max. recent visits</b> to use for making predictions &mdash; This specifies the
    visits to use when making predictions of the number of additional species to expect on
    the next visit or person-visit to a cave. Only the most recent visits are used, up to
    the maximum number of recent visits given. Caves having fewer than the minimum number
    of visits are left out of the analysis. This also determines the visits used to generate
    the average model for each cluster (explained below). Early visits to a cluster are generally
    productive and tend to skew predictions high, so accuracy tends to degrade as the maximum
    increases; but the fewer the number of points, the lower the accuracy too, suggesting
    that neither the minimum nor the maximum should be too low.
  </li>
  <li>
    <b>Use proximity</b> to place caves among equally similar clusters &mdash; This indicates
    whether to supplant the random assignment of caves to one of equally similar clusters
    with an assignment to the cluster whose centroid is nearest the cave. Caves of similar
    fauna need not be proximal, and caves of different fauna can be proximal, so rather than
    always improving prediction results, using proximity tends to greatly randomize results.
    However, the fewer caves and the fewer taxa under analysis, the more using proximity
    seems to improve the accuracy of predicting taxa.
  </li>
</ul>

<p>
  Once you've selected your configuration, click the "Submit" button. The page will
  display information describing the clusters generated and their predictions. However,
  if you were to then click "Change Clusters" to get this dialog box again and then
  click "Submit" to submit the same configuration again, you would find yourself
  presented with a slightly different clustering and slightly different predictions.
  This is because there is an element of randomness to clustering. You may want to
  repeatedly submit the same configuration until you find a clustering that is useful to
  you or perhaps just to understand the effects of the configuration.
</p>

<h3>Overview of the Presentation</h3>

<p>foo</p>

<h3>How Predictions Work</h3>

<h3>Exploring Average Models</h3>
