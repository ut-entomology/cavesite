<script lang="ts" context="module">
  import type { SvelteComponent } from 'svelte';

  import LoginDialog from './dialogs/LoginDialog.svelte';
  import LoginInfoDialog from './dialogs/LoginInfoDialog.svelte';
  import ChangePasswordDialog from './dialogs/ChangePasswordDialog.svelte';
  import ResetRequestDialog from './dialogs/ResetRequestDialog.svelte';
  import ResetPasswordDialog from './dialogs/ResetPasswordDialog.svelte';

  // Restrict to just those dialogs that can be brought up on any page.

  const targetMap: Record<string, typeof SvelteComponent> = {
    LoginDialog,
    LoginInfoDialog,
    ChangePasswordDialog,
    ResetRequestDialog,
    ResetPasswordDialog
  };

  export function toSvelteTarget(targetName: string): typeof SvelteComponent {
    const targetComponent = targetMap[targetName];
    if (!targetComponent) {
      throw Error(`Target component '${targetName}' not found`);
    }
    return targetComponent;
  }
</script>
