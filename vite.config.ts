import {defineConfig} from 'vite';
export default defineConfig({
  build:{rollupOptions:{input:{game:'index.html',birdStudy:'bird-study.html'},output:{manualChunks:{three:['three']}}}},
});
