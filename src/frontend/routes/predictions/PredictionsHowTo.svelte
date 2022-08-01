<script lang="ts">
  import ExampleImage from '../../components/ExampleImage.svelte';
  import { MAX_LOOKUP_MATCHES } from '../../../shared/model';
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

<p>
  Upon generating a set of clusters, the page provides a variety of tools for examining
  the clusters and associated predictions. Let's sequentially go down the page looking
  at each tool to get an overview of the tool's purpose and meaning.
</p>
<ExampleImage
  src="/predictions/clustering-title-summary.png"
  alt="Example title and summary of the clustering"
/>
<p>
  A description akin to the above appears at the top of the page. The title line
  indicates the number of caves having the requested fauna and the number of clusters of
  these caves the clustering was able to generate. Below the title line is a summary of
  your chosen clustering configuration.
</p>
<ExampleImage
  src="/predictions/accuracy-summary.png"
  alt="Example accuracy summary of a clustering"
/>
<p>
  The above information describes the general accuracy of the clustering. It helps you
  assess whether you've produced a clustering that is accurate enough for your needs.
  Click on the "about accuracy" link (but not in the above example image) to learn how
  prediction accuracy is assessed and the exact meanings of each of the provided summary
  measures.
</p>
<ExampleImage
  src="/predictions/radar-graph.png"
  alt="Example radar graph of a clustering"
/>
<p>
  This radar graph shows you the percentage overlap in taxa among the clusters. Notice
  that each cluster has its own color and number, the latter of which is preceded by a
  pound sign (#). Each radial line represents a cluster containing the indicated number
  of taxonomic determinations across all of its caves. The ten concentric circles
  represent percent overlap in increments of 10%. The intersection of a color of one
  cluster on the radial line of another cluster indicates the percentage of taxa
  (actually taxonomic determinations) of the second cluster that are also found in the
  first cluster. In case that's confusing, you can hover the cursor over any of the
  circled points of intersection to see a clear explanation of the meaning of the point.
</p>
<p>
  This graph helps you understand how successfully the clustering was able to partition
  caves into clusters using the requested configuration. The less overlap among the
  clusters, the more successful the partitioning, and the more likely each clustering
  represents a distinct cave habitat with distinct fauna. Clusterings with less overlap
  look more star-like, with longer and sharper points. The more overlap there is, the
  more amorphous and circular the graph appears. Take note of any clusters that are
  particularly distinct from the others, as you can investigate these clusters with
  tools further down on the page to see which taxa are unique to which caves.
</p>
<ExampleImage
  src="/predictions/pie-chart.png"
  alt="Example pie chart of caves per cluster"
/>
<p>
  The pie chart illustrates the relative number of caves found in each cluster. The
  color assigned to each cluster is constant throughout the page, so the color of a
  slice of this pie chart identifies its associated cluster. You can hover the cursor
  over a slice to see the cluster number and the number of caves in the cluster.
</p>
<ExampleImage
  src="/predictions/cave-name-lookup-empty.png"
  alt="Empty cave name lookup tool"
/>
<ExampleImage
  src="/predictions/cave-name-lookup-list.png"
  alt="Cave name lookup tool with dropdown"
/>
<ExampleImage
  src="/predictions/cave-name-lookup-selection.png"
  alt="Cave name lookup tool with selection"
/>
<p>
  The above set of images shows a series of interactions with the cave lookup box. The
  first image is what you see before you type anything into the box. You can type any
  portion of a cave name, and it will show up to {MAX_LOOKUP_MATCHES} caves whose names contain
  the text you typed. This is what you see in the second image. When you click on one of
  the caves in the list, the list disappears and you get the third image. Notice that a loupe
  icon appears to the right of the box. Clicking on this loupe pops up a dialog box that
  provides particulars about the cave, including the taxa next predicted to be found in the
  cave and their estimated accuracies.
</p>
<ExampleImage src="/predictions/cluster-controls.png" alt="The cluster controls" />
<p>
  The remainder of the page characterizes a single cluster, and the above controls are
  specific to this cluster. The left-most control selects the cluster and provides both
  the cluster number and its color. The center controls select between the per-visit and
  per-person-visit analysises, which can yield different graphs of data and different
  predictions of the number of additional species expected to be found next. Use the
  analysis that you find more meaningful or the one that produces the best predictions.
  The "Show Avg. Model" button on the right replaces the graph (below) with an
  interactive graph for experimenting with curves that estimate the rate at which
  additional species are found across the cluster as a whole. You'll find an explanation
  of this interactive graph further below.
</p>
<ExampleImage
  src="/predictions/full-cluster-graph.png"
  alt="An example graph of all the points in a cluster"
/>
<p>
  This is a graph of all the visits (or person-visits) occuring among all the caves of
  the cluster, showing the cumulative number of species ever found in the cave by the
  completion of that visit (or person-visit). As explained below, this is a measure of
  the minimum possible number of species, regardless of the taxonomic ranks to which
  determinations are made. If you hover the cursor over a point, all of the points of
  the cave to which the point belongs will be highlighted. You may also find bulleted
  footnotes below the graph. These enumerate the kinds of incomplete data found in the
  cluster and should be self-explanatory.
</p>

<h3>How Predictions Work</h3>

<h3>Exploring Average Models</h3>

<h3>Examining a Particular Cave</h3>
