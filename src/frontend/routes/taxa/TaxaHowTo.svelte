<script lang="ts">
  import ExampleImage from '../../components/ExampleImage.svelte';
  import { checkmarkIcon } from '../../components/SelectionButton.svelte';
  import { MAX_LOOKUP_MATCHES } from '../../../shared/model';
</script>

<p>
  This tab allows you to browse the taxa for which the collection has records, and it
  allows you to select taxa. The bottom of the page displays the known locations for the
  selected taxa. Your selections can also be used on the Time and Queries tabs. After
  selecting taxa here and switching to either of these other tabs, that tab will give
  you the option of restricting its output to just the taxa you selected.
</p>

<h3>The Taxon Autocompletion Box</h3>

<p>
  To locate a taxon, either type the taxon into the lookup field or click the "Browse
  Taxa" button. You can type any portion of the taxon name into the lookup field, and it
  will show you up to {MAX_LOOKUP_MATCHES} taxa containing the text you typed. Here is an
  example:
</p>

<ExampleImage
  src="/taxa/taxon-lookup.png"
  alt="Example of typing into the lookup field"
/>

<p>
  In order to do anything with a taxon you type, you must either type enough of the name
  that only one taxon is listed below, or else click on one of the taxa. Upon clicking "<i
    >Latrodectus</i
  >", the lookup box appears as follows:
</p>

<ExampleImage
  src="/taxa/taxon-lookup-selection.png"
  alt="Example of selecting a taxon after typing into the lookup field"
/>

<p>
  Clicking on the plus (+) sign next to the name to adds the taxon to the list of
  selected taxa. Clicking on the loupe will open the taxon browser at this taxon.
</p>

<h3>The Taxa Selections Tree</h3>

<p>
  Each taxon you add by clicking a checkbox appears in a tree that displays taxa
  hierarchically by rank, shown in the tree under its higher taxa. For example, the
  following tree depicts the taxon selections after adding both <i>Latrodectus</i>
  and <i>Cicurina bandera</i>:
</p>

<ExampleImage
  src="/taxa/taxa-selections.png"
  alt="Example of a tree of selected taxa"
  padding={0.2}
/>

<p>
  Notice that there are both checkmarks ({@html checkmarkIcon}) and pluses (+) in the
  tree. A checkmark indicates a selected taxon, and a plus indicates an unselected taxon
  that can be selected. Selected taxa are also in <b>bold</b>. Clicking on a checkmark
  deselects the taxon, and clicking on a plus selects the taxon.
</p>
<p>
  Also notice that all of the taxa are links except <i>Cicurina bandera</i>. If you
  click on a taxon link, the taxon browser opens showing all taxa found in the
  collection at the rank immediately below the taxon you clicked. The species
  <i>Cicurina bandera</i> has no subspecies, so there are no taxa to show below it and it
  does not appear as a link.
</p>
<p>
  The triangles to the left of each taxon are buttons that allow you to expand or
  contract the tree at that taxon. They are useful for reducing the size of a large
  selection tree to help you explore the tree.
</p>
<p>
  When other tabs use your taxa selections, they pull in all records whose
  determinations are at or below these taxa. The <i>Latrodectus</i> selection therefore also
  includes all species found in this genus. If you click on the plus to add a taxonomic rank
  that already contains one or more selected taxa, the lower taxon selections disappear because
  the higher selection includes them. For example, after clicking the plus to add "Araneae"
  to the above selections tree, the tree becomes the following:
</p>

<ExampleImage
  src="/taxa/taxa-collapsed-selections.png"
  alt="Example of tree collapsed to just Araneae"
  padding={0.2}
/>

<p>
  Clicking on a checkmark removes the associated taxon from the selections. Upon
  clicking the checkmark next to "Araneae" in the above tree, we remove the only
  selection in the tree. The tree disappears, and we get the following message:
</p>

<ExampleImage
  src="/taxa/taxa-no-selections.png"
  header=""
  alt="No selected taxa"
  padding={0.2}
/>

<p>
  If you don't select any taxa, other tabs will provide default taxa selections, such as
  restricting taxa to just those of cave obligates or not restricting taxa at all,
  equivalent to selecting all taxa.
</p>

<h3>The Taxon Browser</h3>

<p>
  You can open the taxon browser by clicking on the "Browse Taxa" button, by clicking on
  the loupe icon next to a taxon you've typed, or by clicking on a taxon link in the
  tree of selected taxa. Clicking on the "Browse Taxa" button browses taxa from the
  highest taxonomic rank, starting at kingdom Animalia. Clicking on the loupe browses
  the taxa at the taxonomic rank immediately below the indicated taxon, unless the taxon
  you typed contains no lower ranks, in which case the taxon browser opens at the
  immediately containing taxon. Clicking on a taxon link in the selections tree browses
  the taxa at and below the taxon.
</p>

<p>
  For example, if you open the taxon browser at Theridiidae or browse to Theridiidae
  from the "Browse Taxa" button, you'll see the following popup:
</p>

<ExampleImage
  src="/taxa/taxon-browser.png"
  alt="Example view of the taxon browser"
  padding={0.2}
/>

<p>
  The taxon browser works similarly to the taxon selections tree, allowing you to add
  taxa to your selections by clicking the plus icon and remove taxa from your selections
  by clicking the checkmark icon. You can also navigate among the taxa by clicking taxon
  links.
</p>

<p>
  If you navigate into a selected taxon, you'll find that all of the taxa it contains
  are also selected. You are free to deselect any of these taxa. Mind you, if you
  deselect a taxon below a taxon that you have selected, that higher taxon no longer
  includes all of the taxa it contains and therefore ceases to be selected. However, all
  other taxa that were previously selected below this higher taxon remain selected. This
  allows you to select all taxa in a group except for a few particular taxa. For
  example, to select all Araneae but <i>Latrodectus</i>, first add Araneae to your
  selections, then navigate to
  <i>Latrodectus</i> and remove it from your selections.
</p>

<p>
  The <b>Select All</b> button selects all of the lower taxa shown in the browser, and
  the <b>Deselect All</b> button deselects all of the lower taxa shown in the browser.
  These buttons prevent you from having to tediously select many taxa. For example, if
  you want all records determined to species within
  <i>Latrodectus</i>
  but not any determined to just <i>Latrodectus</i>, you can navigate to
  <i>Latrodectus</i>, make sure the genus itself is not selected, and then click "Select
  All" to add the lower taxa it contains.
</p>
