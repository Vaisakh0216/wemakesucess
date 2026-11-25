import { useRef, useState } from 'react';
import { MAX_PHOTO } from '../shared/resume';

/** Downscale to a 240px square JPEG so the photo stays small in storage and the PDF. */
async function toSquareJpeg(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 240;
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 240, 240);
  bmp.close();
  for (const q of [0.85, 0.7, 0.55]) {
    const url = canvas.toDataURL('image/jpeg', q);
    if (url.length <= MAX_PHOTO) return url;
  }
  throw new Error('That photo is too large.');
}

export function PhotoField({ photo, onChange }: { photo: string; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="photo-field">
      {photo ? <img src={photo} alt="Your photo" /> : <span className="photo-empty" aria-hidden="true">👤</span>}
      <div>
        <b>Photo (optional)</b>
        <p className="hint">
          Many Indian employers like one; ATS ignore it, and some international recruiters prefer none.
        </p>
        <div className="row-btns">
          <button className="btn small" type="button" onClick={() => input.current?.click()}>
            {photo ? 'Change photo' : 'Add photo'}
          </button>
          {photo && (
            <button className="btn ghost small" type="button" onClick={() => onChange('')}>
              Remove
            </button>
          )}
        </div>
        {err && <p className="err">{err}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setErr(null);
          try {
            onChange(await toSquareJpeg(file));
          } catch (x) {
            setErr(x instanceof Error ? x.message : 'Could not read that image.');
          }
        }}
      />
    </div>
  );
}
