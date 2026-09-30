import { test } from "node:test";
import assert from "node:assert/strict";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";

import { applyWorkResultAsEditorEdit } from "../src/lib/work-result-apply.mjs";

function getModelValue(model) {
  return model.getValue(monaco.editor.EndOfLinePreference.LF);
}

function appendWithoutUndoStop(model, text) {
  const lineCount = model.getLineCount();
  const maxColumn = model.getLineMaxColumn(lineCount);
  model.pushEditOperations(
    [],
    [
      {
        range: {
          startLineNumber: lineCount,
          startColumn: maxColumn,
          endLineNumber: lineCount,
          endColumn: maxColumn,
        },
        text,
      },
    ],
    () => null
  );
}

function createEditorAdapter(model) {
  const sources = [];
  return {
    sources,
    getModel: () => model,
    pushUndoStop: () => {
      model.pushStackElement();
      return true;
    },
    executeEdits: (source, edits) => {
      sources.push(source);
      model.pushEditOperations([], edits, () => null);
      return true;
    },
  };
}

test("AI Work replacement is one isolated undoable edit", () => {
  const model = monaco.editor.createModel("# Draft", "markdown");
  appendWithoutUndoStop(model, "\nUser typing");
  assert.strictEqual(getModelValue(model), "# Draft\nUser typing");

  const editor = createEditorAdapter(model);
  let fallbackCalls = 0;

  const applied = applyWorkResultAsEditorEdit(
    editor,
    "# AI revision\n\nUpdated body.",
    () => {
      fallbackCalls += 1;
    }
  );

  assert.strictEqual(applied, true);
  assert.deepStrictEqual(editor.sources, ["ai-work"]);
  assert.strictEqual(fallbackCalls, 0);
  assert.strictEqual(getModelValue(model), "# AI revision\n\nUpdated body.");

  model.undo();
  assert.strictEqual(getModelValue(model), "# Draft\nUser typing");

  model.undo();
  assert.strictEqual(getModelValue(model), "# Draft");

  model.redo();
  assert.strictEqual(getModelValue(model), "# Draft\nUser typing");

  model.redo();
  assert.strictEqual(getModelValue(model), "# AI revision\n\nUpdated body.");

  model.dispose();
});

test("AI Work replacement falls back when no mounted editor is available", () => {
  let fallbackContent = null;

  const applied = applyWorkResultAsEditorEdit(null, "Replacement", (content) => {
    fallbackContent = content;
  });

  assert.strictEqual(applied, false);
  assert.strictEqual(fallbackContent, "Replacement");
});

test("AI Work replacement falls back when the editor has no model", () => {
  let fallbackContent = null;
  let executeCalls = 0;
  const editor = {
    getModel: () => null,
    pushUndoStop: () => true,
    executeEdits: () => {
      executeCalls += 1;
      return true;
    },
  };

  const applied = applyWorkResultAsEditorEdit(editor, "Replacement", (content) => {
    fallbackContent = content;
  });

  assert.strictEqual(applied, false);
  assert.strictEqual(executeCalls, 0);
  assert.strictEqual(fallbackContent, "Replacement");
});
