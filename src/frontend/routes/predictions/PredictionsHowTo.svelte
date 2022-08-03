<script lang="ts">
  import ExampleImage from '../../components/ExampleImage.svelte';
  import AboutAccuracyDialog from './AboutAccuracy.svelte';
  import AboutAvgModel from './AboutAvgModel.svelte';
  import { MAX_LOOKUP_MATCHES } from '../../../shared/model';

  let showingAboutAccuracy = false;
  let showingAboutAvgModel = false;
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
  Click on the <span
    class="col link_text"
    on:click={() => (showingAboutAccuracy = true)}>about accuracy</span
  > link (but not in the above example image) to learn how prediction accuracy is assessed
  and the exact meanings of each of the provided summary measures.
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
<ExampleImage
  src="/predictions/average-cluster-model.png"
  alt="An example average model for all caves of the cluster"
/>
<p>
  If you click the "Show Avg. Model" button, the graph is replaced with different graph,
  shown above, depicting the points (recent visits) that were used to predict numbers of
  expected additional species. It also shows a curve generated by averaging the curves
  fit to each of the caves; this is not a curve fit directly to the points on the graph.
  The curve represents the average rate at which species are added to the checklists of
  species known for each of the caves of the cluster.
</p>
<p>
  Below the graph of the average model, you'll find a plot of the residuals of the curve
  when fit to the recent points of the individual caves. Because the curve is an average
  of curve rather than a fit to the points, the residuals need not minimize the RMSE.
  For this reason, you may want to play with the parameters used for generated the
  average model, which appear to the right of the residuals plot. You can learn the
  details of how the average model is generated and the meanings of these parameters by
  clicking on the <span
    class="col link_text"
    on:click={() => (showingAboutAvgModel = true)}>about this model</span
  > link (though not in the above example image).
</p>
<ExampleImage
  src="/predictions/predicted-additional-species.png"
  alt="Example bar chart showing predicted additional species"
/>
<p>
  This chart shows the number of additional species you can expect to find on your next
  visit (or person-visit) to caves of the cluster. This is the number of species that
  the next visit (or person-visit) would add to the checklist of species known for the
  cave, counting only species that have not yet been seen in the cave. The chart only
  lists caves for which predictions could be made, which are those having at least the
  minimum number of visits specified in the clustering configuration. When you click on
  a cave in this list, you'll get a popup providing more information about the cave,
  including predictions of the next taxa likely to be found. The chart can be sorted by
  either increasing or decreasing order of predicted number of additional species.
</p>
<p>
  Any superscripts you see the end of a cave name refer to the notes presented under the
  above graph of all visits (or person-visits) to the cave.
</p>
<p>
  The predictions are made by fitting a power curve <span class="eq">y</span>
  <span class="eq">=</span>
  <span class="eq">Ax<sup>P</sup>+B</span> to the points of the cave, where
  <span class="eq">x</span>
  is the number of visits or person-visits, <span class="eq">y</span> is the total number
  of species found at the cave by the time of that visit or person-visit. It only fits the
  points in the configured range of recent visits. The prediction is the increase in number
  of species at the next visit or person-visit, according to this curve.
</p>
<p>
  Each reported accuracy applies to its associated group of top N caves, not just to the
  cave next to which it is listed. It is generated by testing the predictive technique
  against historical data. The percentage given for a top N group indicates the fraction
  of caves predicted to occur within this group that can be expected to actually occur
  within this group, according to historical data. You can read more about how
  predictions work below.
</p>
<ExampleImage
  src="/predictions/caves-without-predictions.png"
  alt="Example bar chart showing caves not having predictions"
/>
<p>
  This chart shows the caves having too few visits to make predictions, according to the
  requested clustering configuration. It sorts the caves by the number of species added
  to the cave checklist on the most recent visit. You can display the sort in either
  increasing or decreasing order.
</p>
<ExampleImage
  src="/predictions/taxa-incluster.png"
  alt="Example bar chart showing the taxa of the cluster by frequency of occurrence"
/>
<p>
  This chart lists all of the taxonomic determinations made for all of the caves of the
  cluster, and it sorts them by the cumulative number of visits on which they were found
  in the cluster. This list essentially defines the cluster, as these are the taxa found
  to be more common to the caves of the cluster than to caves of other clusters. You can
  sort the list by either increasing or decreasing number of visits on which taxa were
  found.
</p>

<h3>Examining a Particular Cave</h3>

<p>
  The page provides two bar charts that list caves, and each cave in these charts is a
  link you can click. When you click on a cave, you get a popup that provides
  information about just that cave. This section sequentially describes the elements of
  this cave-specific presentation.
</p>
<ExampleImage
  src="/predictions/per-cave-header.png"
  alt="Example header of a cave-specific popup"
/>
<p>
  The top of this popup names the cave and the county in which it is located. It also
  tells you the cluster number to which the cave was assigned and the predicted number
  of additional species to be found on the next visit and person-visit to the cave. All
  of this information is also available in the display for the cluster.
</p>
<ExampleImage
  src="/predictions/per-cave-graph-with-curve.png"
  alt="Example of a cave-specific graph showing the prediction curve"
/>
<p>
  If predictions of numbers of additional species could not be made for the cave, you
  will see a simple graph of all the visits (or person-visits) made to the cave. If such
  predictions could be made, you will see the same graph with additional features
  explaining the predictions, similar to the one above. The switch button at the top of
  graph allows you to select between the graphs of visits and person-visits, with each
  graph depicting its associated prediction. The labels above the graph define the
  features. The graph highlights the recent visits that were used to fit a curve, and it
  shows you the curve that was fit to these points. The curve extends one visit (or
  person-visit) beyond those recorded. The cumulative number of species at this next
  point is its next predicted value. The prediction of number of additional species is
  the difference between this value and the last recorded cumulative number of species.
</p>
<ExampleImage
  src="/predictions/per-cave-predicted-taxa.png"
  alt="Example chart of the taxa predictions for a cave"
/>
<p>
  This chart shows you the taxonomic determinations found in the cluster to which the
  cave belongs that have not yet been made for the cave. The taxa are sorted by the
  number of visits to caves of this cluster in which the taxa were found. Presumably,
  the most frequently encountered remaining taxa are the most likely taxa to be
  encountered next in the cave. The accuracies reported in the left column tell you the
  frequency with which this assumption is true for recent historical data. A top N
  accuracy of P percent means that, historically, P percent of the top N taxa of the
  predicted sort were in the top N of the actual remaining taxa of the cave. Read on for
  a fuller explanation of these predictions and their accuracies.
</p>
<ExampleImage
  src="/predictions/per-cave-taxa.png"
  alt="Example chart of the taxa found in a cave"
/>
<p>
  The last chart lists all of the taxonomic determinations made for specimens collected
  from the cave, sorted by the number of visits on which specimens of that determination
  were collected from the cave. It provides an estimate of the frequency at which taxa
  were encountered in the cave.
</p>

<h3>Predicting Numbers of Additional Species</h3>

<p>
  Predictions of the number of additional species expected to be found are made
  separately for the next visit to the cave and the next person-visit to the cave. The
  person-visit prediction is the additional species expected to be found for each person
  next visiting the cave. If the number of people participating in a collecting trip
  significantly affects the number of species found, person-visit predictions will be
  more accurate than visit predictions.
</p>
<p>
  The prediction algorithm predicts the number of expected future species as a function
  of the number of past species found. This entails counting species for all records,
  whether the associated specimens are determined to species or not. The minimum
  possible number of species is used, assuming the available determinations are correct.
  For example, if one specimen is only determined to the order Araneae, another to the
  family Hahniidae, another to the genus <i>Cicurina</i>, and another to the species
  <i>Cicurina bandera</i>, the species count remains at 1 because this species belongs
  to each of these higher ranks and it's possible that all of the specimens are actually
  the same species. However, the addition of a second family, a second genus, or a
  second species determination would increase the count.
</p>
<p>
  To produce the number of additional species expected to be found at a cave, the power
  curve <span class="eq">y</span> <span class="eq">=</span>
  <span class="eq">Ax<sup>P</sup>+B</span> is fit to recent visits to the cave. Here,
  <span class="eq">x</span>
  is the number of visits or person-visits, <span class="eq">y</span> is the total
  number of species found at the cave by the time of that visit or person-visit,
  <span class="eq">A</span>
  and <span class="eq">B</span> are constants determined by linear regression, and
  <span class="eq">P</span> is a constant determined by a binary search of linear
  regressions finding <span class="eq">A</span>, <span class="eq">B</span>, and
  <span class="eq">P</span> having minimal RMSE. The curve is then extended to the next visit
  or person visit, and the increase in the number of species is recorded as the prediction
  of the number of additional species expected on the next visit or person-visit.
</p>
<p>
  When configuring the clusters, you specify the minimum and maximum number of recent
  visits to use for making predictions. This range determines which points <span
    class="eq">(x,</span
  > <span class="eq">y)</span> are used to produce the power curve. No fewer than 2 visits
  can be used to make a prediction. If you allow 2-visit predictions and a cave has only
  2 visits, the slope of a line through the points of those visits will be used as the predicted
  number of additional species for that cave; the power curve is used when 3 or more visits
  are available. If the minimum number of visits you allow is N and the cave has fewer than
  N points, no prediction is made for the number of additional species expected to be found
  at the cave.
</p>

<h3>Predicting Next Expected Taxa</h3>

<p>
  Caves are sorted into clusters by the similarity of their fauna under the assumption
  that the more similar the fauna has been in the past, the more similar it will be in
  the future. The additional fauna expected to be found in a cave is merely the fauna
  found elsewhere in the cluster to which the cave belongs but not yet found in the
  cave. For each cave, these remaining fauna are sorted by the number of visits to other
  caves of the cluster in which their taxa have been found. The greater the number of
  visits a taxon has, the higher the taxon appears in the sort, and presumably the more
  likely the taxon will appear in future visits to the cave. The taxonomic predictions
  therefore use historical prevalence to predict the taxa most likely to be encountered
  next.
</p>
<p>
  Predictions are not necessarily available for each taxonomic rank. They instead
  suggest the most specific determinations that will be made for future specimens
  according to the most specific determinations made for past specimens. For example, if
  all past insects of a cluster have been determined to species, the cluster will
  provide no prediction for the class Insecta, only predictions for species previously
  determined; and if some past specimens were determined to Insecta but the cave does
  not yet have a specimen with this incomplete determination, there will be a prediction
  for future specimens only determined to class Insecta according to its prevalence
  elsewhere in the cluster. Over time, as past specimens become further determined,
  predicted taxa will become more specific too.
</p>
<p>
  The <span class="col link_text" on:click={() => (showingAboutAccuracy = true)}
    >about accuracy</span
  > link in the accuracy summary explains how accuracies are determined per cave and taxon.
  It also explains how the summary and overview accuracies are determined for the clustering
  as a whole.
</p>

{#if showingAboutAccuracy}
  <AboutAccuracyDialog close={() => (showingAboutAccuracy = false)} />
{/if}

{#if showingAboutAvgModel}
  <AboutAvgModel close={() => (showingAboutAvgModel = false)} />
{/if}
