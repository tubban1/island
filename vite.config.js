import {defineConfig} from 'vite';
import {giftApi} from './server/gifts.js';
export default defineConfig({plugins:[{name:'gift-storage',configureServer(server){server.middlewares.use(giftApi());},configurePreviewServer(server){server.middlewares.use(giftApi());}}]});
