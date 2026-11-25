import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AccountButton, SaveToAccountBanner } from '../components/Account';
import { useAuth } from '../cloud';
import { Modal } from '../components/Modal';
import { ResumeThumb } from '../components/ResumeThumb';
import { ImportButton } from '../components/ImportButton';
import { TemplateGallery } from '../components/TemplateGallery';
import { blankResume, createCover, createDoc, deleteDoc, duplicateDoc, listDocs, saveDoc, subscribeDocs, type Doc, type ResumeDoc } from '../docs';
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
  const [kind, setKind] = useState<Doc['kind']>(() => (new URLSearchParams(location.search).get('tab') === 'cover' ? 'cover' : 'resume'));
  const [coverFrom, setCoverFrom] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Doc | null>(null);

  useEffect(() => {
    document.title = 'My Documents · wemakesucess';
  }, []);

  const tags = useMemo(() => ['All', ...new Set(docs.flatMap((d) => d.tags))], [docs]);
  const shown = useMemo(() => {
    const list = docs.filter((d) => d.kind === kind && (tag === 'All' || d.tags.includes(tag)));
    return [...list].sort((a, b) =>
      sort === 'name' ? a.title.localeCompare(b.title) : (sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt)),
    );
  }, [docs, sort, tag, kind]);

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
        <button className="btn primary" type="button" onClick={() => (kind === 'cover' ? setCoverFrom(true) : setAdding(true))}>
          {kind === 'cover' ? '+ New cover letter' : '+ New resume'}
        </button>
        <AccountButton />
      </header>
      <SaveToAccountBanner />

      <div className="dash-bar">
        <div className="seg" role="group" aria-label="Document type">
          <button type="button" aria-pressed={kind === 'resume'} onClick={() => setKind('resume')}>
            Resumes <span className="count">{docs.filter((d) => d.kind === 'resume').length}</span>
          </button>
          <button type="button" aria-pressed={kind === 'cover'} onClick={() => setKind('cover')}>
            Cover letters <span className="count">{docs.filter((d) => d.kind === 'cover').length}</span>
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
        {kind === 'cover' ? (
          <button type="button" className="doc-card new" onClick={() => setCoverFrom(true)}>
            <span className="plus">+</span>
            <b>New cover letter</b>
            <span>Matches your resume’s design and details</span>
          </button>
        ) : (
          <button type="button" className="doc-card new" onClick={() => setAdding(true)}>
            <span className="plus">+</span>
            <b>New resume</b>
            <span>Start from a template or a blank page</span>
          </button>
        )}
        {shown.map((d) => (
          <DocCard key={d.id} doc={d} onDelete={() => setConfirmDelete(d)} />
        ))}
        {!shown.length && kind === 'cover' && (
          <p className="empty">Write a cover letter that matches your resume. Start one and AI can draft it from the job description.</p>
        )}
        {!docs.length && kind === 'resume' && (
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
              <p>Pick a template to start with example content, start blank, or import the resume you already have.</p>
            </div>
            <button className="icon-btn" type="button" aria-label="Close" onClick={() => setAdding(false)}>
              ✕
            </button>
          </div>
          <div className="mb wide-modal">
            <div className="start-row">
              <button className="btn" type="button" onClick={() => navigate(`/edit/${createDoc({ data: blankResume() }).id}`)}>
                Start with a blank resume
              </button>
              <ImportButton />
            </div>
            <TemplateGallery />
          </div>
        </Modal>
      )}

      {coverFrom && (
        <Modal onClose={() => setCoverFrom(false)} labelledBy="newcover">
          <div className="mh">
            <div style={{ flex: 1 }}>
              <h3 id="newcover">New cover letter</h3>
              <p>Pick the resume it goes with. The letter copies its design and contact details.</p>
            </div>
            <button className="icon-btn" type="button" aria-label="Close" onClick={() => setCoverFrom(false)}>
              ✕
            </button>
          </div>
          <div className="mb">
            <div className="pick-list">
              {docs
                .filter((d): d is ResumeDoc => d.kind === 'resume')
                .map((d) => (
                  <button key={d.id} type="button" className="btn" onClick={() => navigate(`/cover/${createCover({ from: d }).id}`)}>
                    {d.title}
                    <small>{d.data.contact.title}</small>
                  </button>
                ))}
              <button type="button" className="btn ghost" onClick={() => navigate(`/cover/${createCover().id}`)}>
                Start without a resume
              </button>
            </div>
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
  const open = () => navigate(doc.kind === 'cover' ? `/cover/${doc.id}` : `/edit/${doc.id}`);

  return (
    <article className="doc-card">
      <button type="button" className="doc-img" onClick={open} aria-label={`Open ${doc.title}`}>
        {doc.kind === 'cover' ? <ResumeThumb cover={doc.data} max={240} /> : <ResumeThumb resume={doc.data} max={240} />}
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
              {doc.kind === 'resume' && (
                <button role="menuitem" type="button" onClick={() => navigate(`/cover/${createCover({ from: doc }).id}`)}>
                  Write a matching cover letter
                </button>
              )}
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
