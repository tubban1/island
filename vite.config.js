import {defineConfig} from 'vite';
import {resolve} from 'node:path';
import {giftApi} from './server/gifts.js';
export default defineConfig({
  plugins: [
    {
      name: 'gift-storage',
      configureServer(server) { server.middlewares.use(giftApi()); },
      configurePreviewServer(server) { server.middlewares.use(giftApi()); }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        gift: resolve(__dirname, 'gift.html')
      }
    }
  }
});
