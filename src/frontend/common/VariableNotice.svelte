<script lang="ts" context="module">
  import { writable } from 'svelte/store';

  export interface NoticeConfig {
    message: string;
    header?: string;
    alert?: string;
    button?: string;
    onClose?: () => void;
  }

  const noticeStore = writable<NoticeConfig | null>(null);

  export function showNotice(config: NoticeConfig) {
    config.header = config.header || 'Notice';
    config.alert = config.alert || 'light';
    noticeStore.set(config);
  }
</script>

<script lang="ts">
  import Notice from './Notice.svelte';

  const closeNotice = () => {
    if ($noticeStore && $noticeStore.onClose) {
      $noticeStore.onClose();
    }
    noticeStore.set(null);
  };
</script>

{#if $noticeStore}
  <Notice
    alert={$noticeStore.alert}
    header={$noticeStore.header}
    message={$noticeStore.message}
    button={$noticeStore.button}
    on:close={closeNotice}
  />
{/if}
