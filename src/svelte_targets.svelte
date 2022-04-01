<script lang="ts" context="module">
  // TODO: This is app-specific so should move up a directory, me thinks.

  import type { SvelteComponent } from 'svelte';

  import UserLoginDialog from '../dialogs/UserLoginDialog.svelte';

  const targetMap: Record<string, typeof SvelteComponent> = {
    UserLoginDialog
  };

  export function toSvelteTarget(targetName: string): typeof SvelteComponent {
    const targetComponent = targetMap[targetName];
    if (!targetComponent) {
      throw Error(`Target component '${targetName}' not found`);
    }
    return targetComponent;
  }
</script>
