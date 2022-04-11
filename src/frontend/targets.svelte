<script lang="ts" context="module">
  import type { SvelteComponent } from 'svelte';

  import LoginDialog from './dialogs/LoginDialog.svelte';

  const targetMap: Record<string, typeof SvelteComponent> = {
    LoginDialog
  };

  export function toSvelteTarget(targetName: string): typeof SvelteComponent {
    const targetComponent = targetMap[targetName];
    if (!targetComponent) {
      throw Error(`Target component '${targetName}' not found`);
    }
    return targetComponent;
  }
</script>
