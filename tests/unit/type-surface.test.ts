'use strict';

// Pure type-declaration modules (interfaces/type aliases only, no runtime
// code) never get instrumented by c8/--all unless something imports them —
// they otherwise show up as spurious 0%-covered files in the aggregate
// report. Import them here (types only, erased at build time) so the
// coverage report reflects reality: these files have no executable surface.

import "../../lib/providers/types.ts";
import "../../lib/channels/types.ts";

import { test } from "node:test";

test("type-only modules import cleanly with no runtime side effects", () => {
  // no-op: presence of the imports above is the assertion.
});
