import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/index.css';
import { App } from './App';
import { applyTokens } from './styles/tokens';
import { defaultStore } from './storage/storage';
import { applyTheme, readThemePref } from './ui/theme';
import './styles/app.css';

applyTokens(document);
applyTheme(readThemePref(defaultStore()));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
