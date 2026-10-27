"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import sampleJsonl from "@/data/case_IR-2026-0147.jsonl";
import { SAMPLE_CASE_ID, createSampleCase } from "./caseOps";
import type { Case } from "./types";

export { sampleJsonl };

export interface CaseState {
  case: Case | null;
  update: (fn: (c: Case) => Case) => void;
  replace: (c: Case) => void;
  resetDemo: () => void;
}

const INDEX_KEY = "tracetalk:cases";

function makeStore(id: string) {
  return create<CaseState>()(
    persist(
      (set) => ({
        case: id === SAMPLE_CASE_ID ? createSampleCase(sampleJsonl) : null,
        update: (fn) => set((s) => (s.case ? { case: fn(s.case) } : s)),
        replace: (c) => set({ case: c }),
        resetDemo: () => set({ case: createSampleCase(sampleJsonl) }),
      }),
      {
        name: `tracetalk:case:${id}`,
        version: 1,
        storage: createJSONStorage(() => localStorage),
        partialize: (s) => ({ case: s.case }),
      },
    ),
  );
}

export type CaseStore = ReturnType<typeof makeStore>;

const stores = new Map<string, CaseStore>();

/** One persisted store per case, keyed by case ID. */
export function getCaseStore(id: string): CaseStore {
  let store = stores.get(id);
  if (!store) {
    store = makeStore(id);
    stores.set(id, store);
  }
  return store;
}

export interface CaseIndexItem {
  id: string;
  title: string;
}

export function readCaseIndex(): CaseIndexItem[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addToCaseIndex(item: CaseIndexItem) {
  try {
    const list = readCaseIndex().filter((x) => x.id !== item.id);
    localStorage.setItem(INDEX_KEY, JSON.stringify([item, ...list]));
  } catch {
    /* storage unavailable: the case still works for this session */
  }
}
