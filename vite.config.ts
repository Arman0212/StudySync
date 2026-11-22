/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// The production build is served from GitHub Pages at https://arman0212.github.io/StudySync/,
// so asset URLs are prefixed with /StudySync/. Hosts that serve the app from the domain root
// (Netlify, Vercel) set BASE_PATH=/ (see netlify.toml and the README).
const base = normaliseBase(process.env.BASE_PATH ?? '/StudySync/');

function normaliseBase(b: string): string {
  const withLead = b.startsWith('/') ? b : `/${b}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}

/**
 * Routing is hash-based (#/timetable), so a refresh on any screen always loads index.html.
 * This 404.html only covers links typed without the hash (e.g. /StudySync/timetable): static
 * hosts serve it for unknown paths, and it redirects to the matching hash route.
 */
function spaFallback(): Plugin {
  return {
    name: 'studysync-404-fallback',
    apply: 'build',
    generateBundle() {
      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>StudySync</title>
    <meta name="robots" content="noindex" />
    <script>
      (function () {
        var base = ${JSON.stringify(base)};
        var path = window.location.pathname;
        var rest = path.indexOf(base) === 0 ? path.slice(base.length) : path.replace(/^\\//, '');
        rest = rest.replace(/^index\\.html$/, '').replace(/\\/+$/, '');
        window.location.replace(base + (rest ? '#/' + rest : '') + window.location.search);
      })();
    </script>
  </head>
  <body>
    <p>Redirecting to <a href="${base}">StudySync</a>…</p>
  </body>
</html>
`;
      this.emitFile({ type: 'asset', fileName: '404.html', source: html });
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), spaFallback()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    testTimeout: 30000,
  },
});
