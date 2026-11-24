import {cloudflareTest} from '@cloudflare/vitest-plugin';
import {defineConfig} from 'vitest/config';
export default defineConfig({plugins:[cloudflareTest({wrangler:{configPath:'./workers/coop/wrangler.jsonc'},miniflare:{bindings:{COOP_SECRET:'isolated-test-secret',LOCAL_TEST:'true'}}})],test:{include:['tests/coop/*.spec.mjs'],testTimeout:20000}});
