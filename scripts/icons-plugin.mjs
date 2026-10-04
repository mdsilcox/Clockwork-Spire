// Vite plugin: serves the generated icons in dev and emits them into the build output. Never writes to src/ or public/.
import { generateIcons } from './icons.mjs';

export function iconsPlugin() {
  let icons;
  const get = () => (icons ??= generateIcons());
  return {
    name: 'clockwork-icons',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '');
        const png = get()[name];
        if (!png) return next();
        res.setHeader('Content-Type', 'image/png');
        res.end(png);
      });
    },
    generateBundle() {
      for (const [name, source] of Object.entries(get())) this.emitFile({ type: 'asset', fileName: name, source });
    },
    transformIndexHtml() {
      return [
        { tag: 'link', attrs: { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }, injectTo: 'head' },
      ];
    },
  };
}
