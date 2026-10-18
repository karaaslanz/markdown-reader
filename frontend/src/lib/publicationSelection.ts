// Resolve publication selections from current editor tabs, preserving their order.
export interface PublicationTab {
  id: string;
  content: string;
  filePath?: string | null;
}

export interface PreparedFile {
  path: string;
  content: string;
}

export function currentPublicationFiles(
  selectedIds: readonly string[],
  tabs: readonly PublicationTab[]
): PreparedFile[] {
  const byId = new Map(tabs.map((tab) => [tab.id, tab]));
  return selectedIds.flatMap((id) => {
    const tab = byId.get(id);
    return tab
      ? [{ path: tab.filePath ?? `untitled-${tab.id}.md`, content: tab.content }]
      : [];
  });
}
