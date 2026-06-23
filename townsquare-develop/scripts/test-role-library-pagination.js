const assert = require("assert");
const { hasMorePagedResults } = require("../src/utils/rolePagination");

assert.strictEqual(
  hasMorePagedResults({
    loadedCount: 50,
    receivedCount: 50,
    pageSize: 50,
    total: 0,
  }),
  true,
  "missing total should keep loading when the current page is full",
);

assert.strictEqual(
  hasMorePagedResults({
    loadedCount: 62,
    receivedCount: 12,
    pageSize: 50,
    total: 0,
  }),
  false,
  "missing total should stop when the current page is not full",
);

assert.strictEqual(
  hasMorePagedResults({
    loadedCount: 50,
    receivedCount: 50,
    pageSize: 50,
    total: 120,
  }),
  true,
  "known total should continue while loaded count is below total",
);

assert.strictEqual(
  hasMorePagedResults({
    loadedCount: 50,
    receivedCount: 50,
    pageSize: 50,
    total: 50,
  }),
  false,
  "known total should stop when loaded count reaches total",
);

assert.strictEqual(
  hasMorePagedResults({
    loadedCount: 0,
    receivedCount: 0,
    pageSize: 50,
    total: 0,
  }),
  false,
  "empty pages should not keep loading",
);

console.log("role library pagination tests passed");
