import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildContext } from '@/utils/context';
import type { ReactNode } from 'react';

type PortalEntry = {
  target: HTMLElement;
  node: ReactNode;
};

type PortalItem = PortalEntry & {
  id: string;
};

export type EditorPortal = {
  upsertPortal: (portalId: string, entry: PortalEntry) => void;
  removePortal: (portalId: string) => void;
};

const [EditorPortalStateProvider, useEditorPortalState] = buildContext(() => {
  const [portalsById, setPortalsById] = useState<Record<string, PortalEntry>>({});
  const upsertPortal = useCallback((portalId: string, entry: PortalEntry) => {
    setPortalsById(current => {
      const existing = current[portalId];
      if (existing?.target === entry.target && existing.node === entry.node) {
        return current;
      }

      return {
        ...current,
        [portalId]: entry,
      };
    });
  }, []);

  const removePortal = useCallback((portalId: string) => {
    setPortalsById(current => {
      if (!(portalId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[portalId];
      return next;
    });
  }, []);

  const portals = useMemo<PortalItem[]>(
    () =>
      Object.entries(portalsById).map(([id, entry]) => ({
        id,
        ...entry,
      })),
    [portalsById]
  );

  return {
    portals,
    upsertPortal,
    removePortal,
  };
});

const EditorPortals = () => {
  const portals = useEditorPortalState(state => state.portals);
  return <>{portals.map(portal => createPortal(portal.node, portal.target, portal.id))}</>;
};

export const EditorPortalProvider = ({ children }: { children: ReactNode }) => (
  <EditorPortalStateProvider>
    {children}
    <EditorPortals />
  </EditorPortalStateProvider>
);

export const useEditorPortal = (): EditorPortal => {
  const upsertPortal = useEditorPortalState(state => state.upsertPortal);
  const removePortal = useEditorPortalState(state => state.removePortal);

  return useMemo(
    () => ({
      upsertPortal,
      removePortal,
    }),
    [removePortal, upsertPortal]
  );
};
