import { cloneResume, normalizeResume, SAMPLE, type Resume, type TemplateId } from './shared/resume';

/**
 * Documents saved in this browser ("My Documents"). Each document id doubles as
 * the resume id that a ₹299 purchase unlocks. Accounts and cloud sync come later.
 */
export interface Doc {
  id: string;
  kind: 'resume';
  title: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  data: Resume;
}

const KEY = 'wms.docs.v1';
const LEGACY_DRAFT = ['wms.draft.v1', 'shortlist.draft'];
const LEGACY_RID = 'wms.rid.v1';

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

let cache: Doc[] | null = null;
const listeners = new Set<() => void>();

function persist(docs: Doc[]) {
  cache = docs;
  try {
    localStorage.setItem(KEY, JSON.stringify(docs));
  } catch {
    /* storage full or blocked: keep in memory */
  }
  listeners.forEach((l) => l());
}

function normalizeDoc(x: any): Doc | null {
  if (!x || typeof x.id !== 'string') return null;
  return {
    id: x.id,
    kind: 'resume',
    title: typeof x.title === 'string' ? x.title.slice(0, 120) : 'My Resume',
    tags: Array.isArray(x.tags) ? x.tags.filter((t: unknown) => typeof t === 'string').slice(0, 10) : [],
    createdAt: typeof x.createdAt === 'string' ? x.createdAt : new Date().toISOString(),
    updatedAt: typeof x.updatedAt === 'string' ? x.updatedAt : new Date().toISOString(),
    data: normalizeResume(x.data),
  };
}

export function listDocs(): Doc[] {
  if (cache) return cache;
  let docs: Doc[] = [];
  try {
    const raw = read(KEY);
    if (raw) docs = (JSON.parse(raw) as unknown[]).map(normalizeDoc).filter((d): d is Doc => !!d);
  } catch {
    docs = [];
  }
  if (!read(KEY)) {
    // First run after the single-draft version: carry the old draft (and its paid id) over.
    const legacy = LEGACY_DRAFT.map(read).find(Boolean);
    if (legacy) {
      try {
        const now = new Date().toISOString();
        const id = read(LEGACY_RID) || crypto.randomUUID();
        docs = [{ id, kind: 'resume', title: 'My Resume', tags: [], createdAt: now, updatedAt: now, data: normalizeResume(JSON.parse(legacy)) }];
      } catch {
        /* ignore a corrupt draft */
      }
    }
    if (docs.length) persist(docs);
  }
  cache = docs;
  return docs;
}

export const getDoc = (id: string) => listDocs().find((d) => d.id === id) ?? null;

export function createDoc(opts: { template?: TemplateId; blank?: boolean; data?: Resume; title?: string } = {}): Doc {
  const now = new Date().toISOString();
  const base = opts.data ? cloneResume(opts.data) : opts.blank ? blankResume() : cloneResume(SAMPLE);
  if (opts.template) base.template = opts.template;
  const doc: Doc = {
    id: crypto.randomUUID(),
    kind: 'resume',
    title: opts.title ?? nextTitle(),
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: base,
  };
  persist([doc, ...listDocs()]);
  return doc;
}

function nextTitle() {
  const n = listDocs().length;
  return n ? `My Resume ${n + 1}` : 'My Resume';
}

export function blankResume(): Resume {
  return normalizeResume({ template: 'modern', experience: [{}], education: [{}] });
}

export function saveDoc(id: string, patch: Partial<Omit<Doc, 'id'>>) {
  persist(listDocs().map((d) => (d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d)));
}

export function duplicateDoc(id: string): Doc | null {
  const d = getDoc(id);
  return d ? createDoc({ data: d.data, title: `${d.title} (copy)` }) : null;
}

export function deleteDoc(id: string) {
  persist(listDocs().filter((d) => d.id !== id));
}

export function subscribeDocs(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
