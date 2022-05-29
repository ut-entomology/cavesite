<script lang="ts" context="module">
  import type { QueryColumnSpec } from '../../shared/user_query';

  export interface ResultColumnInfo extends QueryColumnSpec {
    fullName: string; // name to display for column when configuring filter
    abbrName: string | null; // name to display for column in column header
    description: string; // information about the column
    requested: boolean; // whether query requests the column
    nullable: boolean; // whether column can be null
    emWidth: number; // width of the column in em
  }

  export type ColumnInfoMap = Record<number, ResultColumnInfo>;
</script>
