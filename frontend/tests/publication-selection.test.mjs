import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const file = resolve("src/lib/publicationSelection.ts");
const transpiled = ts.transpileModule(readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = { exports: {} };
new Function("module", "exports", transpiled)(loaded, loaded.exports);
const { currentPublicationFiles } = loaded.exports;

test("selected publication uses latest tab contents and preserves order", () => {
  const ids = ["b", "a"];
  const original = [{ id: "a", filePath: "a.md", content: "old" }, { id: "b", content: "B" }];
  const updated = [{ id: "a", filePath: "renamed.md", content: "LATEST edit" }, { id: "b", content: "B2" }];
  assert.deepEqual(currentPublicationFiles(ids, original), [{ path: "untitled-b.md", content: "B" }, { path: "a.md", content: "old" }]);
  assert.deepEqual(currentPublicationFiles(ids, updated), [{ path: "untitled-b.md", content: "B2" }, { path: "renamed.md", content: "LATEST edit" }]);
});

test("closed tabs are excluded from publication", () => {
  assert.deepEqual(currentPublicationFiles(["closed", "open"], [{ id: "open", content: "present", filePath: "/draft.md" }]), [{ path: "/draft.md", content: "present" }]);
});

test("selection order is independent of tab navigation", () => {
  const tabs = [{ id: "a", content: "first" }, { id: "b", content: "second" }, { id: "c", content: "third" }];
  assert.deepEqual(currentPublicationFiles(["c", "a"], tabs).map(f => f.content), ["third", "first"]);
});
