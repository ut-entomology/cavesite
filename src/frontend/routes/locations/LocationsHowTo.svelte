<script lang="ts">
  import { onMount } from 'svelte';

  import ExampleImage from '../../components/ExampleImage.svelte';
  import SimpleTOC from '../../components/SimpleTOC.svelte';
  import { checkmarkIcon } from '../../components/SelectionButton.svelte';
  import { MAX_LOOKUP_MATCHES } from '../../../shared/model';

  let updateTOC: () => void;

  onMount(() => updateTOC());
</script>

<p>
  This tab allows you to browse the locations for which the collection has records, and
  it allows you to select locations. The bottom of the page displays the taxa known for
  the selected locations. Your selections can also be used on the Time and Queries tabs.
  After selecting locations here and switching to either of these other tabs, that tab
  will give you the option of restricting output to just the locations you selected.
</p>

<SimpleTOC tag="h3" setUpdater={(updater) => (updateTOC = updater)} />

<h3 id="autocompletion">The Location Autocompletion Box</h3>

<p>
  To find a location, either type the location's name into the lookup field or click the
  "Browse Locations" button. You can type any portion of the location name into the
  lookup field, and it will show you up to {MAX_LOOKUP_MATCHES} locations containing the
  text you typed. Here is an example:
</p>

<ExampleImage
  src="/static/locations/location-lookup.jpg"
  alt="Example of typing into the lookup field"
/>

<p>
  In order to do anything with a location you type, you must either type enough of the
  name that only one location is listed below, or else click on one of the locations.
  Upon clicking "Big Foot Cave", the lookup box appears as follows:
</p>

<ExampleImage
  src="/static/locations/location-lookup-selection.jpg"
  alt="Example of selecting a location after typing into the lookup field"
/>

<p>
  Clicking on the plus (+) sign next to the name to adds the location to the list of
  selected locations. Clicking on the loupe will open the location browser at this
  location.
</p>

<h3 id="selections_tree">The Location Selections Tree</h3>

<p>
  Each location you add by clicking a checkbox appears in a tree that displays locations
  hierarchically by county. For example, the following tree depicts the location
  selections after adding "Big Foot Cave", "Spider Cave", and "Williamson County":
</p>

<ExampleImage
  src="/static/locations/location-selections.jpg"
  alt="Example of a tree of selected locations"
  padding={0.2}
/>

<p>
  Notice that there are both checkmarks ({@html checkmarkIcon}) and pluses (+) in the
  tree. A checkmark indicates a selected location, and a plus indicates an unselected
  location that can be selected. Selected locations are also in <b>bold</b>. Clicking on
  a checkmark deselects the location, and clicking on a plus selects the location.
</p>
<p>
  Also notice that all of the county names are links. If you click on a county, the
  location browser opens showing all locations found in the county.
</p>
<p>
  The triangles to the left of each county is button that allow you to expand or
  contract the tree at that county. They are useful for reducing the size of a large
  selection tree to help you explore the tree.
</p>
<p>
  When other tabs use your location selections, they pull in all records found in the
  selected counties and locations. Here, the "Williamson County" selection therefore
  includes all localities in Williamson County, whereas only the named localities in the
  other two counties are pulled in. If you click on the plus to add a county that
  already contains one or more selected localities, the locality selections disappear
  because the county includes them. For example, after clicking the plus to add "Uvalde
  County" to the above selections tree, the tree becomes the following:
</p>

<ExampleImage
  src="/static/locations/location-collapsed-selections.jpg"
  alt="Example of collapsing tree by selection"
  padding={0.2}
/>

<p>
  Clicking on a checkmark removes the associated location from the selections. Upon
  clicking the checkmark next to "Spider Cave" in the above tree, we remove the only
  selection in "Travis County", so the "Travis County" selection dissappears:
</p>

<ExampleImage
  src="/static/locations/dropped-locality-selections.jpg"
  header=""
  alt="Only Uvalde County and Williamson County selected."
  padding={0.2}
/>

<p>
  If you don't select any locations, other tabs will not restrict locations at all,
  which is equivalent to selecting all locations.
</p>

<h3 id="location_browser">The Location Browser</h3>

<p>
  You can open the location browser by clicking on the "Browse Locations" button, by
  clicking on the loupe icon next to a location you've typed, or by clicking on a county
  in the tree of selected locations. Clicking on the "Browse Locations" button browses
  locations starting from a list of counties. Clicking on the loupe browses the
  locations at the county of the location. Clicking on a county in the selections tree
  browses the localities in that county.
</p>

<p>
  For example, if you open the location browser at Williamson County or browse to
  Williamson County from the "Browse Locations" button, you'll see the following popup:
</p>

<ExampleImage
  src="/static/locations/location-browser.jpg"
  alt="Example view of the location browser"
  padding={0.2}
/>

<p>
  The location browser works similarly to the location selections tree, allowing you to
  add locations to your selections by clicking the plus icon and remove locations from
  your selections by clicking the checkmark icon. You can also navigate among counties
  by clicking the county links.
</p>

<p>
  If you navigate into a selected county, you'll find that all of the localities it
  contains are also selected. You are free to deselect any of these localities. Mind
  you, if you deselect a locality in a county that you have selected, the county ceases
  to be selected because not all of its localities are selected, and all other
  localities of the county remain selected. This allows you to select all localities in
  a county except for a few. For example, to select all localities in Uvalde County but
  "Big Foot Cave", first add "Uvalde County" to your selections, then navigate to "Big
  Foot Cave" and remove it from your selections.
</p>

<p>
  The <b>Select All</b> button selects all of the localities shown in the browser, and
  the <b>Deselect All</b> button deselects all of the localities shown in the browser.
</p>
