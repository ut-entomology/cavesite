<script lang="ts">
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import type {
    ResultColumnInfo,
    ColumnInfoMap
  } from '../dialogs/QueryFilterDialog.svelte';
  import { QueryColumnID } from '../../shared/user_query';

  function getDefaultColumnInfoMap(): ColumnInfoMap {
    const columnInfoMap: ColumnInfoMap = [];

    const setColumnInfo = (
      columnInfo: Omit<ResultColumnInfo, 'ascending' | 'nullValues'>
    ) => {
      columnInfoMap[columnInfo.columnID] = Object.assign(columnInfo, {
        ascending: null,
        nullValues: null
      });
    };

    setColumnInfo({
      columnID: QueryColumnID.ResultCount,
      fullName: 'Result Count',
      abbrName: 'Results',
      description:
        'Number of results in the data that are identical to the given result.',
      requested: true,
      nullable: false,
      emWidth: 5
    });
    setColumnInfo({
      columnID: QueryColumnID.CatalogNumber,
      fullName: 'Catalog Number',
      abbrName: 'Catalog No.',
      description: "Catalog number of the specimen(s) in UT Austin's Specify database.",
      requested: true,
      nullable: false,
      emWidth: 8
    });
    setColumnInfo({
      columnID: QueryColumnID.CollectionStartDate,
      fullName: 'Starting Collection Date',
      abbrName: 'Start Date',
      description: 'First day of collection, which may be the only collection date',
      requested: true,
      nullable: false, // TODO: Is this true?
      emWidth: 8
    });
    setColumnInfo({
      columnID: QueryColumnID.CollectionEndDate,
      fullName: 'Ending Collection Date',
      abbrName: 'End Date',
      description: 'Last day of collection, if collected over more than one day',
      requested: true,
      nullable: true,
      emWidth: 8
    });
    setColumnInfo({
      columnID: QueryColumnID.Collectors,
      fullName: 'Collector Names',
      abbrName: 'Collectors',
      description: 'Names of the participating collectors',
      requested: false,
      nullable: true,
      emWidth: 16
    });
    setColumnInfo({
      columnID: QueryColumnID.Determiners,
      fullName: 'Determiner Names',
      abbrName: 'Determiners',
      description: 'Names of the determiners',
      requested: false,
      nullable: true,
      emWidth: 8
    });
    setColumnInfo({
      columnID: QueryColumnID.DeterminationYear,
      fullName: 'Determination Year',
      abbrName: 'Det. Year',
      description: 'Names of the determiners',
      requested: false,
      nullable: true,
      emWidth: 8
    });
    setColumnInfo({
      columnID: QueryColumnID.CollectionRemarks,
      fullName: 'Collection Remarks',
      abbrName: null,
      description: 'Remarks about the collecting trip and habitat',
      requested: false,
      nullable: true,
      emWidth: 16
    });
    setColumnInfo({
      columnID: QueryColumnID.OccurrenceRemarks,
      fullName: 'Occurrence Remarks',
      abbrName: null,
      description: 'Remarks about the specimens collected',
      requested: false,
      nullable: true,
      emWidth: 16
    });
    setColumnInfo({
      columnID: QueryColumnID.DeterminationRemarks,
      fullName: 'Determination Remarks',
      abbrName: 'Det. Remarks',
      description: 'Remarks about the determination',
      requested: false,
      nullable: true,
      emWidth: 16
    });
    setColumnInfo({
      columnID: QueryColumnID.TypeStatus,
      fullName: 'Specimen Type Status',
      abbrName: 'Type Status',
      description: 'The type status of this particular specimen',
      requested: true,
      nullable: true,
      emWidth: 8
    });
    setColumnInfo({
      columnID: QueryColumnID.SpecimenCount,
      fullName: 'Specimen Count',
      abbrName: 'Count',
      description: 'The number of specimens collected',
      requested: true,
      nullable: true, // TODO: Might want to treat 0s as nulls, if not already
      emWidth: 4
    });
    setColumnInfo({
      columnID: QueryColumnID.Problems,
      fullName: 'Problems with the Record',
      abbrName: 'Problems',
      description: 'Problems encountered parsing the data record',
      requested: false,
      nullable: false,
      emWidth: 20
    });
    setColumnInfo({
      columnID: QueryColumnID.Phylum,
      fullName: 'Phylum',
      abbrName: null,
      description: 'Phylum determined for the specimen',
      requested: true,
      nullable: true,
      emWidth: 10
    });
    setColumnInfo({
      columnID: QueryColumnID.Class,
      fullName: 'Class',
      abbrName: null,
      description: 'Class determined for the specimen',
      requested: true,
      nullable: true,
      emWidth: 10
    });
    setColumnInfo({
      columnID: QueryColumnID.Order,
      fullName: 'Order',
      abbrName: null,
      description: 'Order determined for the specimen',
      requested: true,
      nullable: true,
      emWidth: 10
    });
    setColumnInfo({
      columnID: QueryColumnID.Family,
      fullName: 'Family',
      abbrName: null,
      description: 'Family determined for the specimen',
      requested: true,
      nullable: true,
      emWidth: 10
    });
    setColumnInfo({
      columnID: QueryColumnID.Genus,
      fullName: 'Genus',
      abbrName: null,
      description: 'Genus determined for the specimen',
      requested: true,
      nullable: true,
      emWidth: 10
    });
    setColumnInfo({
      columnID: QueryColumnID.Species,
      fullName: 'Species',
      abbrName: null,
      description: 'Specific epithet determined for the specimen',
      requested: true,
      nullable: true,
      emWidth: 10
    });
    setColumnInfo({
      columnID: QueryColumnID.Subspecies,
      fullName: 'Subspecies',
      abbrName: null,
      description: 'Infraspecific epithet determined for the specimen',
      requested: true,
      nullable: true,
      emWidth: 10
    });
    setColumnInfo({
      columnID: QueryColumnID.County,
      fullName: 'County',
      abbrName: null,
      description: 'County of Texas in which specimen was found',
      requested: true,
      nullable: true,
      emWidth: 16
    });
    setColumnInfo({
      columnID: QueryColumnID.Locality,
      fullName: 'Locality',
      abbrName: null,
      description: 'Locality within county where specimen was found',
      requested: true,
      nullable: false,
      emWidth: 20
    });
    setColumnInfo({
      columnID: QueryColumnID.Latitude,
      fullName: 'Latitude',
      abbrName: null,
      description: 'Latitude of cave at which specimen was found',
      requested: false,
      nullable: true,
      emWidth: 6
    });
    setColumnInfo({
      columnID: QueryColumnID.Longitude,
      fullName: 'Longitude',
      abbrName: null,
      description: 'Longitude of cave at which specimen was found',
      requested: false,
      nullable: true,
      emWidth: 6
    });
    return columnInfoMap;
  }
</script>

<DataTabRoute activeTab="Query">Query results</DataTabRoute>
