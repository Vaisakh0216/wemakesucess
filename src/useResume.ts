import { useCallback, useEffect, useState } from 'react';
import { cloneResume, normalizeResume, SAMPLE, type Resume } from './shared/resume';

const KEY = 'wms.draft.v1';
const LEGACY_KEY = 'shortlist.draft'; // prototype

function load(): Resume {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (raw) return normalizeResume(JSON.parse(raw));
  } catch {
    /* storage blocked or corrupt: start from the sample */
  }
  return cloneResume(SAMPLE);
}

/** Resume draft state, autosaved to this browser. Accounts and cloud save come in a later PR. */
export function useResume() {
  const [resume, setResume] = useState<Resume>(load);

  // Saving is cheap (a few KB of JSON), so save on every change; no debounce to lose on reload.
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(resume));
    } catch {
      /* storage blocked: the draft lives only in memory */
    }
  }, [resume]);

  /** Set a value by dotted path, e.g. "contact.name" or "experience.0.role". */
  const setPath = useCallback((path: string, value: unknown) => {
    setResume((prev) => {
      const next = cloneResume(prev);
      const keys = path.split('.');
      let o: any = next;
      for (const k of keys.slice(0, -1)) o = o[k];
      o[keys[keys.length - 1]] = value;
      return next;
    });
  }, []);

  const update = useCallback((fn: (draft: Resume) => void) => {
    setResume((prev) => {
      const next = cloneResume(prev);
      fn(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => setResume(cloneResume(SAMPLE)), []);

  return { resume, setPath, update, reset };
}
