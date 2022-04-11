<script lang="ts" context="module">
  import { writable } from 'svelte/store';

  interface NoticeData {
    message: string;
    header: string;
    alert: string;
  }

  const noticeStore = writable<NoticeData | null>(null);

  export function showNotice(
    message: string,
    header: string = 'Notice',
    alert: string = 'light'
  ) {
    noticeStore.set({ message, header, alert });
  }
</script>

<script lang="ts">
  import Notice from './Notice.svelte';

  const closeNotice = () => {
    noticeStore.set(null);
  };
</script>

{#if $noticeStore}
  <Notice
    alert={$noticeStore.alert}
    header={$noticeStore.header}
    message={$noticeStore.message}
    on:close={closeNotice}
  />
{/if}
