/**
 * Apply an AI Work full-document replacement through Monaco as one isolated
 * undoable editor operation. Fall back to the existing state update path when
 * no mounted editor/model is available.
 *
 * @param {{
 *   getModel?: () => {
 *     getFullModelRange: () => unknown;
 *     getValue: () => string;
 *   } | null;
 *   pushUndoStop: () => unknown;
 *   executeEdits: (source: string, edits: Array<{ range: unknown, text: string, forceMoveMarkers?: boolean }>) => boolean;
 * } | null} editor
 * @param {string} modifiedContent
 * @param {(content: string) => void} onFallback
 */
export function applyWorkResultAsEditorEdit(editor, modifiedContent, onFallback) {
  const model = editor?.getModel?.();
  if (!editor || !model) {
    onFallback(modifiedContent);
    return false;
  }

  if (model.getValue() === modifiedContent) return true;

  editor.pushUndoStop();
  const applied = editor.executeEdits("ai-work", [
    {
      range: model.getFullModelRange(),
      text: modifiedContent,
      forceMoveMarkers: true,
    },
  ]);
  editor.pushUndoStop();

  if (!applied) {
    onFallback(modifiedContent);
    return false;
  }

  return true;
}
