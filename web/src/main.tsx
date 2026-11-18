import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted variable fonts: bundled by the build, so no third-party font requests.
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/instrument-sans';
import App from './App';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
