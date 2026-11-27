import { defineConfig } from 'vite';

// Relative base so the built site works at a domain root or under any sub-path.
// Two pages: index.html (agencies) and agent.html (Odysseus, the agents' programme).
export default defineConfig({
  base: './',
  build: { rollupOptions: { input: { main: 'index.html', agent: 'agent.html' } } },
});
