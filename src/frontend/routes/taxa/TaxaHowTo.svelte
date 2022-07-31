<script lang="ts">
  import ExampleImage from '../../components/ExampleImage.svelte';
  import { checkmarkIcon } from '../../components/SelectionButton.svelte';
</script>

<p>
  This tab allows you to browse the taxa for which there are records in the collection.
  It also allows you to select taxa for use on the Time and Queries tabs. If you select
  taxa here, then when you switch to either of these other tabs, that tab will give you
  the option of restricting its output to just the taxa that you selected. Finally, the
  bottom of the present page displays the known locations for the currently selected set
  of taxa.
</p>

<p>
  To locate a taxon, either type the taxon into the lookup field or click the "Browse
  Taxa" button. You can type any portion of the taxon name into the lookup field, and it
  will show you all of the taxa containing the text you typed. Here is an example:
</p>

<ExampleImage
  src="/taxa/taxon-lookup.png"
  alt="Example of typing into the lookup field"
/>

<p>
  In order to do anything with a taxon you type, you must either type enough of the name
  that only one taxon is listed below, or else click on one of the taxa. After clicking
  on "Latrodectus mactans", the lookup box appears as follows:
</p>

<ExampleImage
  src="/taxa/taxon-lookup-selection.png"
  alt="Example of selecting a taxon after typing into the lookup field"
/>

<p>
  Clicking on the plus (+) sign next to the name to adds the taxon to the list of
  selected taxa. (Clicking on the loupe will open the taxon browser at this taxon.) If
  you also did this for "Cicurina bandera", you would the following tree:
</p>

<ExampleImage
  src="/taxa/taxa-selections.png"
  alt="Example of a tree of selected taxa"
  padding={0.2}
/>

<p>
  Notice that there are both checkmarks ({@html checkmarkIcon}) and pluses (+) in the
  tree. A checkmark indicates a selected taxon, and a plus indicates a taxon that can be
  selected. Clicking on a checkmark deselects the taxon, and clicking on a plus selects
  the taxon.
</p>

<p>If you click on the plus of a taxonomic rank that already contains selected taxa,</p>
