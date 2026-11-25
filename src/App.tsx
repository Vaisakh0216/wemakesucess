import { useEffect, useRef } from 'react';
import { createDoc, getDoc } from './docs';
import { Documents } from './pages/Documents';
import { EditorPage } from './pages/EditorPage';
import { Landing, TemplatesPage } from './pages/Landing';
import { LoginPage } from './pages/Login';
import { Link, navigate, usePath } from './router';

export default function App() {
  const path = usePath();

  useEffect(() => {
    if (!path.startsWith('/edit/') && path !== '/app') document.title = 'wemakesucess · ATS resume builder';
  }, [path]);

  if (path === '/') return <Landing />;
  if (path === '/templates') return <TemplatesPage />;
  if (path === '/app') return <Documents />;
  if (path === '/login') return <LoginPage />;
  if (path === '/new') return <Redirect to={() => `/edit/${createDoc().id}`} />;
  const m = path.match(/^\/edit\/([0-9a-f-]{36})$/i);
  if (m) return getDoc(m[1]) ? <EditorPage key={m[1]} docId={m[1]} /> : <NotFound what="That resume is not in this browser’s documents." />;
  return <NotFound />;
}

function Redirect({ to }: { to: () => string }) {
  const done = useRef(false); // StrictMode runs effects twice; create only one document
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    navigate(to(), true);
  }, [to]);
  return null;
}

function NotFound({ what = 'This page does not exist.' }: { what?: string }) {
  return (
    <div className="notfound">
      <h1>Not found</h1>
      <p>{what}</p>
      <Link href="/app" className="btn primary">
        Go to My Documents
      </Link>
    </div>
  );
}
