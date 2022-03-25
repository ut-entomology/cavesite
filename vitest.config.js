import { extractFromSvelteConfig } from "vitest-svelte-kit"

export default Object.assign(extractFromSvelteConfig(), {
  test: {
    include: ['**/*.test.ts'],
    watch: false // seems to be ignored; use 'run' on the command line
  }
});
