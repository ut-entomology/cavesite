<script lang="ts">
  import ModalDialog from '../../../common/ModalDialog.svelte';
  import { localToInputDate, inputToLocalDate } from '../../../util/conversion';
  import { stripTimeZone } from '../../../../shared/date_tools';

  export let submit: (throughDate: Date) => void;
  export let close: () => void;

  let throughStr = localToInputDate(new Date());

  function onSubmit() {
    submit(stripTimeZone(inputToLocalDate(throughStr)));
  }
</script>

<ModalDialog title="Delete Website Logs" contentClasses="delete-logs-dialog">
  <div class="row mb-2">
    <div class="col">
      Deletes website logs up through the indicated date. The server also maintains logs
      of all visits to the website, and these logs will not be affected.
    </div>
  </div>

  <div class="container-fluid">
    <div class="row mt-3 mb-2 gx-2 justify-content-evenly">
      <div class="col-auto">
        <input
          type="date"
          class="form-control date_picker"
          required={true}
          bind:value={throughStr}
        />
      </div>
    </div>
  </div>

  <div class="dialog_controls row g-2">
    <div class="col-12 text-center">
      <button class="btn btn-minor" type="button" on:click={close}>Cancel</button>
      <button class="btn btn-major" type="button" on:click={onSubmit}>Submit</button>
    </div>
  </div>
</ModalDialog>

<style lang="scss">
  .dialog_controls button {
    width: 6rem;
    margin: 1rem 0.5rem 0 0.5rem;
  }
</style>
