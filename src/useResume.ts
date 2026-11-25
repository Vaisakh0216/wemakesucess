import { useCallback, useEffect, useRef, useState } from 'react';
import { getCover, getResume, saveDoc } from './docs';
import { coverFromResume, type CoverLetter } from './shared/cover';
import { cloneResume, SAMPLE, type Resume } from './shared/resume';

const HISTORY_LIMIT = 100;

/**
 * Editing state for one document: autosaves to My Documents and keeps an
 * undo/redo history (typing in one field within a second counts as one step).
 */
export function useResume(docId: string) {
  const { value, ...rest } = useEditable<Resume>(docId, () => getResume(docId)?.data ?? cloneResume(SAMPLE));
  return { resume: value, ...rest };
}

export function useCover(docId: string) {
  const { value, ...rest } = useEditable<CoverLetter>(docId, () => getCover(docId)?.data ?? coverFromResume(null));
  return { cover: value, ...rest };
}

const clone = <T,>(v: T): T => structuredClone(v);

/** Undoable, autosaved editing state for one document's data. */
function useEditable<T extends Resume | CoverLetter>(docId: string, load: () => T) {
  const [resume, setResumeState] = useState<T>(load);
  const current = useRef(resume);
  const setResume = (r: T) => {
    current.current = r;
    setResumeState(r);
  };
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const lastKey = useRef<{ key: string; at: number } | null>(null);
  const [, bump] = useState(0);

  useEffect(() => {
    saveDoc(docId, { data: resume });
  }, [docId, resume]);

  // History lives in refs and is updated outside state updaters, so StrictMode's
  // double-invoked updaters cannot record a step twice.
  const commit = useCallback((next: (prev: T) => T, key?: string) => {
    const prev = current.current;
    const now = Date.now();
    const coalesce = key && lastKey.current?.key === key && now - lastKey.current.at < 1000;
    if (!coalesce) {
      past.current.push(prev);
      if (past.current.length > HISTORY_LIMIT) past.current.shift();
    }
    lastKey.current = key ? { key, at: now } : null;
    future.current = [];
    setResume(next(prev));
    bump((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Set a value by dotted path, e.g. "contact.name" or "experience.0.role". */
  const setPath = useCallback(
    (path: string, value: unknown) =>
      commit((prev) => {
        const next = clone(prev);
        const keys = path.split('.');
        let o: any = next;
        for (const k of keys.slice(0, -1)) o = o[k];
        o[keys[keys.length - 1]] = value;
        return next;
      }, path),
    [commit],
  );

  const update = useCallback(
    (fn: (draft: T) => void) =>
      commit((prev) => {
        const next = clone(prev);
        fn(next);
        return next;
      }),
    [commit],
  );

  const replace = useCallback((r: T) => commit(() => clone(r)), [commit]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(current.current);
    setResume(prev);
    lastKey.current = null;
    bump((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(current.current);
    setResume(next);
    lastKey.current = null;
    bump((n) => n + 1);
  }, []);

  return {
    value: resume,
    setPath,
    update,
    replace,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
