import { useRef, useState } from 'react';
import { createDoc } from '../docs';
import { fileToText, IMPORT_ACCEPT } from '../importFile';
import { navigate } from '../router';
import { parseResumeText } from '../shared/parse';

/** Import an existing resume (PDF, Word or text) into a new document. Read in the browser only. */
export function ImportButton() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="import">
      <button className="btn primary" type="button" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Reading your resume…' : '⇪ Import my resume (PDF or Word)'}
      </button>
      {err && <p className="err">{err}</p>}
      <input
        ref={input}
        type="file"
        accept={IMPORT_ACCEPT}
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setBusy(true);
          setErr(null);
          try {
            const data = parseResumeText(await fileToText(file));
            const title = file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Imported resume';
            navigate(`/edit/${createDoc({ data, title }).id}?imported=1`);
          } catch (x) {
            setErr(x instanceof Error ? x.message : 'That file could not be read.');
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
