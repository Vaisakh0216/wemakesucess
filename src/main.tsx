import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { fontFaces } from './shared/fonts';
import { RESUME_CSS } from './shared/resumeCss';
import './app.css';
import './site.css';

// Resume sheet styles live in TS so the server-side PDF renderer can import the same string.
const style = document.createElement('style');
style.textContent = fontFaces() + RESUME_CSS;
document.head.append(style);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
