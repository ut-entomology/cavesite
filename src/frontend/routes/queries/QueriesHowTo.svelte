<script lang="ts">
  import { onMount } from 'svelte';

  import ExampleImage from '../../components/ExampleImage.svelte';
  import SimpleTOC from '../../components/SimpleTOC.svelte';

  let updateTOC: () => void;

  onMount(() => updateTOC());
</script>

<p>
  This tab allows you to query the data according to criteria of your choosing. You can
  choose the query fields, certain pre-selected values for those fields, the order in
  which the fields are presented as columns, and the order in which the result rows are
  sorted. You can use the Taxa and Locations tabs to restrict the taxa and locations
  searched by the query, and queries that include the 'Locality' field can be mapped.
  You can also download query results as Excel-compatible CSV files.
</p>

<SimpleTOC tag="h3" setUpdater={(updater) => (updateTOC = updater)} />

<h3 id="how_queries_work">How Queries Work</h3>

<p>
  Queries retrieve data from the records that characterize specimens. The results of a
  query is data found among these specimens and not necessarily the records for
  individual specimens. You may think of query results as only characterizing individual
  specimens when they include catalog numbers. When you don't ask for catalog numbers in
  the results, the results aggregate data across multiple specimens. This makes queries
  surprisingly powerful and flexible.
</p>
<p>
  The mechanism is pretty simple. You choose which columns you want in the query
  results, and the query only returns distinct rows. For example, if there are hundreds
  of records for federally listed species but you only ask for the taxa of federally
  listed species, you will get a list of the federally listed taxa that have been
  collected, with no two rows having the same taxon. If you wanted one row for each
  record of these taxa, you would also request the catalog number, which would make each
  row distinct for each record. When designing queries, just remember that query results
  never have identical rows.
</p>
<p>
  Despite eliminating duplicate rows from query results, the program knows how many
  records have the data shown in each row. You can include this number in the query
  results using the 'Record Count' field.
</p>
<p>This approach allows you to issue queries such as the following:</p>
<ul>
  <li>Show all federally listed taxa for which there are records.</li>
  <li>Show all SGCN troglobite species found in particular locations.</li>
  <li>Show all locations containing particular taxa.</li>
  <li>Show all taxa found in particular locations.</li>
  <li>Show all taxa for which the collection has type specimens.</li>
  <li>Show all taxa in particular families not yet determined to genus.</li>
  <li>Show all records having undescribed species.</li>
  <li>Show all records of particular taxa in particular locations.</li>
  <li>Show the dates of all visits ever made to a particular location.</li>
  <li>Show how many records there are of particular taxa at each location.</li>
  <li>Show all records of stygobites in a particular county.</li>
</ul>

<h3 id="issuing_queries">Issuing Queries</h3>

<p>
  When you first visit the Queries tab, no query results are shown, and you are given a
  "New Query" button. Upon pressing this button, a dialog box pops up, the top of which
  looks like the following, though the fields listed may be different:
</p>

<ExampleImage
  src="/static/queries/top-of-query-dialog.jpg"
  alt="Top portion of the New Query dialog box"
  padding={0.1}
/>

<p>
  Most of the header inputs are disabled by default. When disabled, queries span all of
  the available records. Enable and specify these inputs to restrict the records
  searched. The admin controls which fields are included in a query by default.
</p>
<p>The "New Query" dialog box consists of the following inputs:</p>
<ul>
  <li>
    <b>From</b> date <b>through</b> date &ndash; Restricts the query to examining only the
    records in the provided range of dates. To enable this input, click the checkbox to its
    left. Mind you, when enabled, queries will not search records lacking dates. There are
    records of karst obligates, including at-risk karst obligates, that lack dates. The circle-arrow
    on the right resets the date range to the oldest and newest possible dates.
  </li>
  <li>
    <b>Restrict results to selected</b> &ndash; Restricts the query to examining only particular
    taxa and/or particular locations. No restrictions are made by default, allowing the query
    to examine all taxa in all locations. To restrict taxa, select taxa on the Taxa tab and
    then check the "taxa" checkbox here. To restrict locations, select locations on the Locations
    tab and then check the "locations" checkbox here. The parenthesized text below this input
    explains the meaning of the currently checked restrictions.
  </li>
  <li>
    <b>Included in Query</b> &ndash; Lists the fields that you want to query and include
    in the query results. To add fields to the query, drag them to this box from the "Excluded
    from Query" box or click the '+' next to the field. To remove fields, drag them to the
    "Excluded from Query" box or click the '&times;' next to the field. You can drag fields
    around to change the order in which they appear in query results. If you sort fields,
    query results will sort rows first by the top-most sorted field in this box, then by
    the next sorted field below this, and so on. Some fields provide an additional input
    for restricting queries to just those records having particular values of the field.
  </li>
  <li>
    <b>Excluded from Query</b> &ndash; Lists the fields that will not appear in query results.
    You can think of this as the list of fields available for adding to the query. You can
    drag them to the "Included in Query" box or click the '+' next to a field. Queries do
    not restrict the values that can appear in these fields, except as indicated by the from-through
    date range, the selected taxa, and the selected locations.
  </li>
</ul>

<p>
  There are two buttons at the bottom of the dialog box. The <b>Cancel</b> button
  cancels the new query, discarding any changes you may have made. The next time you
  open the "New Query" dialog, it will show the prior issued query, if any. The
  <b>Submit</b> button submits the new query, replacing the prior query. The next time you
  open this dialog, it will show the query you designed and submitted.
</p>

<h3 id="query_results">Query Results</h3>

<p>
  Upon submitting a query, the page shows the query results in tabular form. The columns
  correspond to the fields you chose, and the rows correspond to the different
  combinations of values of those fields. The page only displays batches of several
  hundred rows at a time. At the top left of the page you'll find the range of row
  numbers for the currently displayed set of rows and the total number of rows in the
  query results. Here is an example:
</p>

<ExampleImage
  src="/static/queries/sample-query-results.jpg"
  alt="Sample query results"
  padding={0.2}
/>

<p>The following controls are available:</p>

<ul>
  <li>
    The circled question mark button pops up a box showing the information you are now
    reading.
  </li>
  <li>
    The up arrow next to the circled question mark expands the query results to fill the
    entire browser window. This allows you to see more columns and more rows without
    scrolling. In expanded mode, this button turns into a down arrow for collapsing the
    page again.
  </li>
  <li>
    The "Map Results" button shows the localities returned by the query in the Map tab,
    jumping over to that tab to do so. This button is only available for queries that
    include localities.
  </li>
  <li>
    The "Clear" button erases the query results and resets the "New Query" dialog box to
    show the default query.
  </li>
  <li>
    The "New Query" button allows you to create a new query, which once submitted,
    replaces any query results being displayed with new query results.
  </li>
  <li>
    The left/right arrow buttons at the top-right of the table navigate among query
    results. The far-left and far-right button jump to the first and last batches of
    rows, respectively. The double-arrow buttons each jump backward or forward by one
    batch of rows. The single-arrow buttons pull in a few more preceding rows or a few
    more following rows without replacing the entire batch.
  </li>
  <li>
    The skid bar to the right of each column header controls the width of the column.
    Click and drag these to resize columns. Resizing a column does not change the sizes
    of adjacent columns.
  </li>
  <li>
    The scroll bar at the bottom of the screen is only visible when the columns do not
    all fit on the screen. It allows you to scroll left and right to see all the
    columns.
  </li>
  <li>
    The scroll bar at the right of the screen is only visible when there are more rows
    than fit on the screen. It allows you to scroll more rows onto the screen.
  </li>
</ul>

<p>
  You control the order in which rows appear when you create the query. Each query field
  allows you to indicate whether to sort by its values and whether that sort is
  ascending or descending. If you sort multiple fields, rows sort by their values from
  left to right. For example, if you sort by taxa and locations and "Scientific Name"
  precedes "Locality", the results group rows by scientific name. Within a group,
  sequential rows enumerate the locations having that taxon. But if "Locality" is the
  left of "Scentific Name", the results group rows by location. Within a group,
  sequential rows enumerate the taxa at that location.
</p>

<h3 id="query_fields">Available Query Fields</h3>

<ExampleImage
  src="/static/queries/excluded-fields-all.jpg"
  alt="The excluded fields box showing all available fields"
/>

<p>
  The above image shows all of the fields available for queries (at the time of this
  writing). The meanings of these fields are as follows:
</p>

<ul>
  <li>
    <b>Aquatic Karst?</b> &ndash; Whether the locality for a record has been designated as
    aquatic karst. The admin maintains a list of terms that when found in a locality name
    designate the locality as being aquatic karst. The admin also maintains a list of localities
    to be designated as aquatic karst, regardless of whether the name has these terms. Finally,
    any locality having stygobites is also designated aquatic karst. A locality can be designated
    as both aquatic and terrestrial karst.
  </li>
  <li>
    <b>Catalog Number</b> &ndash; The unique number assigned to record by the university.
  </li>
  <li>
    <b>Class</b> &ndash; The taxonomic class of the specimen. Blank if not specified.
  </li>
  <li><b>Collectors</b> &ndash; The names of those who collected the specimen.</li>
  <li>
    <b>County</b> &ndash; The county in which the specimen was found. Blank if not known.
  </li>
  <li>
    <b>Date Collection Ended</b> &ndash; When the specimen label indicates that the collection
    occurred over a range of days, this is the last date of that range. Blank if the collection
    occurred on a single day.
  </li>
  <li>
    <b>Date Collection Started</b> &ndash; The date on which the specimen was collected,
    or if the specimen was collected over a range of dates, the starting date of this range.
  </li>
  <li>
    <b>Determination Notes</b> &ndash; Notes about the determination made for the specimen.
    Includes "n. sp." to indicate the specimen is believed to be undescribed.
  </li>
  <li>
    <b>Determination Year</b> &ndash; The year on which the determination was made, if known.
  </li>
  <li><b>Determiner Names</b> &ndash; The names of the determiners.</li>
  <li>
    <b>Family</b> &ndash; The taxonomic family of the specimen. Blank if not specified.
  </li>
  <li>
    <b>Federally Listed?</b> &ndash; Whether the specimen is a federally listed species.
  </li>
  <li><b>Genus</b> &ndash; The genus of the specimen. Blank if not specified.</li>
  <li>
    <b>Import Problems</b> &ndash; Problems that occurred when attempting to import the specimen
    from GBIF and the assumptions made so that the specimen could be imported.
  </li>
  <li>
    <b>Karst Obligate?</b> &ndash; Whether the specimen is a troglobite, a stygobite, or
    neither. Specimens not determined at least to genus are not designated as karst obligates,
    even if a later determination would designate them so. The admin maintains the list of
    which genera and species are considered troglobitic and stygobitic.
  </li>
  <li>
    <b>Latitude</b> &ndash; The latitude of the location, rounded to two decimal places.
    We pull this number from GBIF, where the latitude is public. Coordinates are withheld
    for specimens on military bases, and for some locations, coordinates are not known.
  </li>
  <li>
    <b>Life Stage</b> &ndash; The life stage of the specimen, if known. A vial may contain
    specimens of multiple life stages. This field indicates "adult" if at least one of them
    is an adult.
  </li>
  <li>
    <b>Locality &amp; Habitat Notes</b> &ndash; Further information about the location and
    circumstances in which the specimen was found. Contains the text "sensitive coordinates
    withheld" for specimens found on military bases, indicating that the coordinates are
    known but not publicly available.
  </li>
  <li>
    <b>Locality</b> &ndash; The name of the karst feature where the specimen was found.
  </li>
  <li>
    <b>Longitude</b> &ndash; The longitude of the location, rounded to two decimal places.
    We pull this number from GBIF, where the longitude is public. Coordinates are withheld
    for specimens on military bases, and for some locations, coordinates are not known.
  </li>
  <li>
    <b>Order</b> &ndash; The taxonomic order of the specimen. Blank if not specified.
  </li>
  <li><b>Phylum</b> &ndash; The phylum of the specimen. Blank if not specified.</li>
  <li>
    <b>Record Count</b> &ndash; The number of records in the database that the query result
    row describes.
  </li>
  <li>
    <b>Scientific Name</b> &ndash; The most specific taxon known for the specimen, expressed
    with the name that is unique with the animal kingdom. When GBIF provides the author and
    year, that information will also appear.
  </li>
  <li>
    <b>Species Epithet</b> &ndash; The species epithet of the species. Blank if not specified.
  </li>
  <li><b>Specimen Count</b> &ndash; The number of specimens in the vial.</li>
  <li>
    <b>Specimen Notes</b> &ndash; Notes about the specimens in the vial, such as the number
    of individuals at each life stage.
  </li>
  <li><b>Subgenus</b> &ndash; The subgenus of the specimen. Blank if not specified.</li>
  <li>
    <b>Subspecies Epithet</b> &ndash; The subspecies epithet of the species. Blank if not
    specified.
  </li>
  <li>
    <b>TPWD Status</b> &ndash; The conservation status that TPWD has assigned to the specimen,
    such as Species of Greater Conservation Need (SGCN).
  </li>
  <li>
    <b>Terrestrial Karst?</b> &ndash; Whether the locality for a record has been designated
    as terrestrial karst. The admin maintains a list of terms that when found in a locality
    name designate the locality as being terrestrial karst. The admin also maintains a list
    of localities to be designated as terrestrial karst, regardless of whether the name has
    these terms. Finally, any locality having troglobites is also designated terrestrial
    karst. A locality can be designated as both terrestrial and aquatic karst.
  </li>
  <li>
    <b>Texas State Rank</b> &ndash; The conservation rank that the state of Texas has assigned
    to the specimen.
  </li>
  <li>
    <b>Type Status</b> &ndash; Whether the specimen is a type specimen and the status of
    that type. Also indicates whether the specimen is thought to be undescribed.
  </li>
</ul>

<h3 id="example_queries">Example Queries</h3>

<p>
  This section provides some example queries to give you a sense of what can be done.
  For each example, the query and its results are presented before a discussion of the
  query.
</p>

<ExampleImage
  src="/static/queries/eg-federally-listed-query.jpg"
  alt="Example query for federally listed species"
  padding={0.1}
/>

<ExampleImage
  src="/static/queries/eg-federally-listed-results.jpg"
  alt="Example query results for federally listed species"
  padding={0.1}
/>

<p>
  This query retrieves all federally listed species for which the collection has
  records. For each, it also indicates whether the species is considered a karst
  obligate and the type of karst obligate. You can see that the results are not provided
  for each record, as each species is only listed once. Notice that "Yes" has been
  selected for "Federally Listed?", restricting results to just federally listed
  specimens. Notice also that "Yes" is shown for each specimen in the "Federally
  Listed?" column, even though this column is uninformative in the results.
</p>

<ExampleImage
  src="/static/queries/eg-travis-types-query.jpg"
  alt="Example query for type specimens in a county"
  padding={0.1}
/>

<ExampleImage
  src="/static/queries/eg-travis-types-results.jpg"
  alt="Example query results for type specimens in a county"
  padding={0.1}
/>

<p>
  This query retrieves all type specimens found in Travis County, names the karst
  feature where they were found, and indicates the number of type specimens found at
  that feature. To set this up, first select "Travis County" in the Locations tab, and
  then select the "locations" checkbox in the "New Query" dialog. The "Record Count"
  field indicates how many records are type specimens at each location.
</p>

<ExampleImage
  src="/static/queries/eg-barton-karst-query.jpg"
  alt="Example query for karst obligates at a location"
  padding={0.1}
/>

<ExampleImage
  src="/static/queries/eg-barton-karst-results.jpg"
  alt="Example query results for karst obligates at a location"
  padding={0.1}
/>

<p>
  This query retrieves the records of all karst obligates found at Barton Springs (Eliza
  Spring) in Travis County. To set this up, first select "Barton Springs (Eliza Spring)"
  in the Locations tab, and then select the "locations" checkbox in the "New Query"
  dialog. The "Karst Obligate?" field is set to "Yes" to restrict results to karst
  obligates at this location. Only stygobites were returned, indicating that no
  troglobites have been found at this location. No constraint was placed on "TPWD
  Status" so that the results would indicate whether each specimen was SGCN.
</p>
