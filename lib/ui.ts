"use client";

import { create } from "zustand";
import type { ParseOutcome } from "./caseOps";
import type { SourceType } from "./types";

export type LedgerFilter = "all" | "fact" | "hypothesis" | "unknown" | "conflict";
export type DrawerTab = "summary" | "raw" | "cited";

interface UiState {
  cursorEventId: string | null; // the row open in the drawer
  pinned: string[]; // rows attached to the next note
  hoverEntryId: string | null;
  selectedEntryId: string | null;
  expandedEntryId: string | null;
  filterText: string;
  hiddenSources: SourceType[];
  hiddenHosts: string[];
  drawerOpen: boolean;
  drawerTab: DrawerTab;
  ledgerFilter: LedgerFilter;
  flash: { ids: string[]; key: number };
  lastOutcome: ParseOutcome | null;
  parsing: boolean;
  shortcutsOpen: boolean;
  importOpen: boolean;
  ledgerDrawerOpen: boolean; // narrow screens only
  railWidth: number;
  ledgerWidth: number;
  drawerHeight: number;
  set: (patch: Partial<UiState>) => void;
  togglePin: (id: string) => void;
  openEvent: (id: string) => void;
  flashEvents: (ids: string[]) => void;
  resetForCase: () => void;
}

const initial = {
  cursorEventId: null,
  pinned: [],
  hoverEntryId: null,
  selectedEntryId: null,
  expandedEntryId: null,
  filterText: "",
  hiddenSources: [],
  hiddenHosts: [],
  drawerOpen: false,
  drawerTab: "summary" as DrawerTab,
  ledgerFilter: "all" as LedgerFilter,
  flash: { ids: [], key: 0 },
  lastOutcome: null,
  parsing: false,
  shortcutsOpen: false,
  importOpen: false,
  ledgerDrawerOpen: false,
};

export const useUi = create<UiState>()((set, get) => ({
  ...initial,
  railWidth: 200,
  ledgerWidth: 380,
  drawerHeight: 280,
  set: (patch) => set(patch),
  togglePin: (id) => {
    const p = get().pinned;
    set({ pinned: p.includes(id) ? p.filter((x) => x !== id) : [...p, id] });
  },
  openEvent: (id) => set({ cursorEventId: id, drawerOpen: true }),
  flashEvents: (ids) => {
    const key = Date.now();
    set({ flash: { ids, key } });
    setTimeout(() => {
      if (get().flash.key === key) set({ flash: { ids: [], key } });
    }, 1300);
  },
  resetForCase: () => set({ ...initial }),
}));
