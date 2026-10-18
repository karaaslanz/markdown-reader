"use client";

import { useState, useCallback, useMemo } from "react";
import { Markdown, type PublicationResult } from "@/lib/api";
import { currentPublicationFiles } from "@/lib/publicationSelection";

interface Tab {
  id: string;
  content: string;
  filePath?: string | null;
}

interface PublicationPanelProps {
  tabs: Tab[];
  onClose: () => void;
}

export default function PublicationPanel({ tabs, onClose }: PublicationPanelProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<{ data: PublicationResult; signature: string } | null>(null);
  const selectedFiles = useMemo(() => currentPublicationFiles(selected, tabs), [selected, tabs]);
  const selectionSignature = useMemo(() => JSON.stringify(selectedFiles), [selectedFiles]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFile = (tab: Tab) => {
    setSelected((prev) => {
      if (prev.includes(tab.id)) return prev.filter((id) => id !== tab.id);
      return [...prev, tab.id];
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    setSelected((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handlePrepare = useCallback(async () => {
    if (!selectedFiles.length) return;
    setLoading(true);
    setError(null);
    try {
      const data = await Markdown.preparePublication(selectedFiles);
      setResult({ data, signature: selectionSignature });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to prepare publication");
    } finally {
      setLoading(false);
    }
  }, [selectedFiles, selectionSignature]);

  return (
    <aside className="w-96 border-l border-gray-200 bg-white dark:border-[#333] dark:bg-[#252526] flex flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-[#333]">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Publication</h2>
        <button
          onClick={onClose}
          aria-label="Close publication panel"
          className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#333]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-auto p-3 text-sm dark:text-gray-200">
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Select and order files to combine into a publication draft.
        </p>

        <ul className="mb-4 space-y-1">
          {tabs.map((tab) => {
            const idx = selected.indexOf(tab.id);
            const isSelected = idx !== -1;
            return (
              <li
                key={tab.id}
                className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50 dark:hover:bg-[#333]"
              >
                <input type="checkbox" checked={isSelected} onChange={() => toggleFile(tab)} />
                <span className="flex-1 truncate">{tab.filePath ?? `Untitled ${tab.id}`}</span>
                {isSelected && (
                  <>
                    <button
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      className="px-1 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => move(idx, 1)}
                      disabled={idx === selected.length - 1}
                      className="px-1 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>

        <button
          onClick={handlePrepare}
          disabled={!selectedFiles.length || loading}
          className="w-full rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50 hover:bg-blue-700"
        >
          {loading ? "Preparing…" : "Preview publication"}
        </button>

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        {result && result.signature === selectionSignature && (
          <div className="mt-4">
            <details open>
              <summary className="cursor-pointer text-xs font-semibold">
                Table of contents ({result.data.toc.length})
              </summary>
              <ul className="ml-3 mt-1 text-xs">
                {result.data.toc.map((h, i) => (
                  <li key={i} style={{ marginLeft: (h.level - 1) * 8 }}>
                    {h.text}
                  </li>
                ))}
              </ul>
            </details>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-semibold">Combined preview</summary>
              <pre className="mt-1 max-h-64 overflow-auto rounded bg-gray-50 p-2 text-xs dark:bg-[#1e1e1e]">
                {result.data.combined}
              </pre>
            </details>
          </div>
        )}
      </div>
    </aside>
  );
}