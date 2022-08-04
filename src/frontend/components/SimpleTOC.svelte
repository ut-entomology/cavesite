<script lang="ts">
  export let tag: string;
  export let setUpdater: (updater: () => void) => void;

  interface HeaderSpec {
    id: string;
    label: string;
  }

  let element: HTMLElement;
  let specs: HeaderSpec[] = []; // initial assignment for mounting

  setUpdater(update);

  function update() {
    const headers = element.parentElement!.getElementsByTagName(tag);
    specs = []; // just need to re-assign spec
    for (const header of headers) {
      specs.push({
        id: header.id,
        label: header.innerHTML
      });
    }
  }
</script>

<ul bind:this={element}>
  {#each specs as spec}
    <li><a href="#{spec.id}">{spec.label}</a></li>
  {/each}
</ul>
