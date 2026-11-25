import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AccountButton, SaveToAccountBanner } from '../components/Account';
import { useAuth } from '../cloud';
import { Modal } from '../components/Modal';
import { ResumeThumb } from '../components/ResumeThumb';
import { TemplateGallery } from '../components/TemplateGallery';
import { blankResume, createDoc, deleteDoc, duplicateDoc, listDocs, saveDoc, subscribeDocs, type Doc } from '../docs';
import { loadUnlock } from '../payments';
import { Link, navigate } from '../router';
import { TEMPLATES } from '../shared/resume';

type Sort = 'edited' | 'created' | 'name';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function Documents() {
  const docs = useSyncExternalStore(subscribeDocs, listDocs);
  const auth = useAuth();
  const [sort, setSort] = useState<Sort>('edited');
  const [tag, setTag] = useState('All');
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Doc | null>(null);

  useEffect(() => {
    document.title = 'My Documents · wemakesucess';
  }, []);

  const tags = useMemo(() => ['All', ...new Set(docs.flatMap((d) => d.tags))], [docs]);
  const shown = useMemo(() => {
    const list = docs.filter((d) => tag === 'All' || d.tags.includes(tag));
    return [...list].sort((a, b) =>
      sort === 'name' ? a.title.localeCompare(b.title) : (sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt)),
    );
  }, [docs, sort, tag]);

  return (
    <div className="dash">
      <header className="dash-top">
        <Link href="/" className="brand" aria-label="wemakesucess home">
          <span className="mark" aria-hidden="true">
            w
          </span>
          <span className="brand-name">wemakesucess</span>
        </Link>
        <h1>My Documents</h1>
        <span className="spacer" />
        <button className="btn primary" type="button" onClick={() => setAdding(true)}>
          + New resume
        </button>
        <AccountButton />
      </header>
      <SaveToAccountBanner />

      <div className="dash-bar">
        <div className="seg" role="group" aria-label="Document type">
          <button type="button" aria-pressed="true">
            Resumes <span className="count">{docs.length}</span>
          </button>
          <button type="button" aria-pressed="false" disabled title="Cover letters are coming soon">
            Cover letters
          </button>
        </div>
        <span className="spacer" />
        <label className="sel">
          Tag
          <select value={tag} onChange={(e) => setTag(e.target.value)}>
            {tags.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="sel">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="edited">Last edited</option>
            <option value="created">Date created</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      <main className="docs">
        <button type="button" className="doc-card new" onClick={() => setAdding(true)}>
          <span className="plus">+</span>
          <b>New resume</b>
          <span>Start from a template or a blank page</span>
        </button>
        {shown.map((d) => (
          <DocCard key={d.id} doc={d} onDelete={() => setConfirmDelete(d)} />
        ))}
        {!docs.length && (
          <p className="empty">
            Your resumes are saved here, in this browser. Create your first one to get started.
          </p>
        )}
      </main>
      <p className="dash-note">
        {auth.status === 'in'
          ? 'Documents and purchases are saved to your account. Sign in on any device to open them.'
          : 'Documents are saved in this browser. Clearing site data removes them; paid PDFs can be restored with your order id.'}
      </p>

      {adding && (
        <Modal onClose={() => setAdding(false)} labelledBy="newdoc">
          <div className="mh">
            <div style={{ flex: 1 }}>
              <h3 id="newdoc">New resume</h3>
              <p>Pick a template to start with example content, or start blank.</p>
            </div>
            <button className="icon-btn" type="button" aria-label="Close" onClick={() => setAdding(false)}>
              ✕
            </button>
          </div>
          <div className="mb wide-modal">
            <button
              className="btn"
              type="button"
              onClick={() => navigate(`/edit/${createDoc({ data: blankResume() }).id}`)}
            >
              Start with a blank resume
            </button>
            <TemplateGallery />
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)} labelledBy="del">
          <div className="mb">
            <h3 id="del">Delete “{confirmDelete.title}”?</h3>
            <p className="muted">
              This removes it from this browser and cannot be undone.
              {loadUnlock(confirmDelete.id) && ' Its PDF purchase can still be restored later with the order id.'}
            </p>
            <div className="nav">
              <button className="btn" type="button" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                className="btn danger"
                type="button"
                onClick={() => {
                  deleteDoc(confirmDelete.id);
                  setConfirmDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DocCard({ doc, onDelete }: { doc: Doc; onDelete: () => void }) {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [tagInput, setTagInput] = useState<string | null>(null);
  const paid = !!loadUnlock(doc.id);
  const tpl = TEMPLATES.find((t) => t.id === doc.data.template);
  const open = () => navigate(`/edit/${doc.id}`);

  return (
    <article className="doc-card">
      <button type="button" className="doc-img" onClick={open} aria-label={`Open ${doc.title}`}>
        <ResumeThumb resume={doc.data} max={240} />
      </button>
      <div className="doc-tags">
        {doc.tags.map((t) => (
          <span key={t} className="tag">
            {t}
            <button
              type="button"
              aria-label={`Remove tag ${t}`}
              onClick={() => saveDoc(doc.id, { tags: doc.tags.filter((x) => x !== t) })}
            >
              ×
            </button>
          </span>
        ))}
        {tagInput === null ? (
          <button type="button" className="tag add-tag" onClick={() => setTagInput('')}>
            + Add tag
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = tagInput.trim().slice(0, 30);
              if (t && !doc.tags.includes(t)) saveDoc(doc.id, { tags: [...doc.tags, t] });
              setTagInput(null);
            }}
          >
            <input
              autoFocus
              className="tag-input"
              value={tagInput}
              placeholder="e.g. Fintech"
              aria-label="New tag"
              onChange={(e) => setTagInput(e.target.value)}
              onBlur={() => setTagInput(null)}
            />
          </form>
        )}
      </div>
      <div className="doc-meta">
        <div className="doc-name">
          {renaming ? (
            <input
              autoFocus
              defaultValue={doc.title}
              aria-label="Rename"
              onBlur={(e) => {
                saveDoc(doc.id, { title: e.target.value.trim() || doc.title });
                setRenaming(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          ) : (
            <b>{doc.title}</b>
          )}
          <span>
            {tpl?.name} · Edited {fmt(doc.updatedAt)}
            {paid && <span className="pill paid">PDF unlocked</span>}
          </span>
        </div>
        <div className="menu-wrap">
          <button className="icon-btn" type="button" aria-label="More actions" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            ⋯
          </button>
          {menu && (
            <div className="menu" role="menu" onMouseLeave={() => setMenu(false)}>
              <button role="menuitem" type="button" onClick={open}>
                Open
              </button>
              <button role="menuitem" type="button" onClick={() => (setRenaming(true), setMenu(false))}>
                Rename
              </button>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  duplicateDoc(doc.id);
                  setMenu(false);
                }}
              >
                Duplicate
              </button>
              <button role="menuitem" type="button" className="danger" onClick={() => (onDelete(), setMenu(false))}>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
