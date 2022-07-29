<script lang="ts">
  import * as yup from 'yup';
  import { createForm, ContextForm, Input } from '../../common/forms';
  import ModalDialog from '../../common/ModalDialog.svelte';

  const DEFAULT_FILENAME = 'cavedata';

  export let rowCount: number;
  export let submit: (filename: string) => void;
  export let close: () => void;

  let errorMessage = '';

  const context = createForm({
    initialValues: { filename: DEFAULT_FILENAME },
    validationSchema: yup.object().shape({
      filename: yup.string().trim().required().label('Filename')
    }),
    onSubmit: async (values) => {
      submit(values.filename);
    }
  });
</script>

<ModalDialog title="Download CSV File" contentClasses="download-form-content">
  <div class="row mb-3">
    <div class="col">
      Enter the name of the Excel-compatible CSV file you would like to download
      containing all {rowCount} rows of the present query.
    </div>
  </div>
  <ContextForm class="container-fluid g-0" {context}>
    <div class="row mb-2 justify-content-center">
      <div class="col-sm-3">
        <label for="firstName" class="col-form-label">Filename</label>
      </div>
      <div class="col-sm-7">
        <Input id="filename" name="filename" />
      </div>
    </div>
    <div class="row g-2">
      <div class="col-12 text-center">
        <button class="btn btn-minor" type="button" on:click={close}>Cancel</button>
        <button class="btn btn-major" type="submit">Download</button>
      </div>
    </div>
    {#if errorMessage}
      <div class="error-region">
        <div class="alert alert-danger" role="alert">{errorMessage}</div>
      </div>
    {/if}
  </ContextForm>
</ModalDialog>

<style>
  :global(.download-form-content) {
    margin: 0 auto;
    max-width: 32rem;
  }

  button {
    width: 7rem;
    margin: 1rem 0.5rem 0 0.5rem;
  }

  .error-region {
    margin-top: 1rem;
  }
</style>
