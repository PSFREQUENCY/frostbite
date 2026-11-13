import { packageVitestConfig } from "@repo/vitest-config";

export default packageVitestConfig({
  coverage: {
    exclude: ["src/check.ts", "src/check-coverage.ts", "src/ci-local.ts"],
    include: ["src/**/*.ts"],
  },
  // The integration suite parses every workspace source under coverage, alongside Turbo workers,
  // so it needs a bounded budget for the full scan rather than the default of five seconds. Alone the
  // scan takes about 8 seconds; in a full local CI run, with every other suite on the same machine, it
  // went past 30 (3,700 files), so the budget is set well above what a loaded run needs.
  integrationTimeoutMs: 90_000,
});
