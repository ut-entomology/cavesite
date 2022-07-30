<script lang="ts">
  import SectionFootnotes from '../../components/SectionFootnotes.svelte';
  import {
    MAX_DAYS_TREATED_AS_PER_PERSON,
    TRAP_DAYS_PER_VISIT,
    EffortFlags
  } from '../../../shared/model';

  export let flags: EffortFlags;
  export let singleCave = false;

  const opening = singleCave
    ? 'Some records for this cave'
    : 'The records for some of these caves';
</script>

<SectionFootnotes>
  {#if flags & EffortFlags.missingDayOfMonth}
    <li>
      {opening} indicate the year and month collected but not the day of the month. These
      records are treated all occurring on a single visit on the first day of the month.
      {#if !singleCave}<span class="super_info"
          >(Designated below via the superscript <span>M</span>.)</span
        >{/if}
    </li>
  {/if}
  {#if flags & EffortFlags.missingMonth}
    <li>
      {opening} only indicate the year collected and not the month or day of month. These
      records are treated all occurring on a single visit on the first day of the year. {#if !singleCave}<span
          class="super_info"
          >(Designated below via the superscript <span>Y</span>.)</span
        >{/if}
    </li>
  {/if}
  {#if flags & EffortFlags.missingDate}
    <li>
      {opening} are missing dates and are treated as all occurring on the first visit to
      the cave, preceding all dated records for the cave.
      {#if !singleCave}<span class="super_info"
          >(Designated below via the superscript <span>X</span>.)</span
        >{/if}
    </li>
  {/if}
  {#if flags & EffortFlags.multiDayPersonVisit}
    <li>
      {opening} indicate collection over a range of 2 to {MAX_DAYS_TREATED_AS_PER_PERSON}
      days. These records are treated all occurring as separate visits on each day.
      {#if !singleCave}<span class="super_info"
          >(Designated below via the superscript <span>E</span>.)</span
        >{/if}
    </li>
  {/if}
  {#if flags & EffortFlags.trap}
    <li>
      {opening} indicate collection over a range of more than {MAX_DAYS_TREATED_AS_PER_PERSON}
      days. These records are assumed to be specimens collected via traps and are approximated
      as one visit for every {TRAP_DAYS_PER_VISIT}
      days of the range, dividing the collected species across the visits.
      {#if !singleCave}<span class="super_info"
          >(Designated below via the superscript
          <span>T</span>.)</span
        >{/if}
    </li>
  {/if}
</SectionFootnotes>

<style>
  .super_info span {
    font-weight: bold;
  }
</style>
