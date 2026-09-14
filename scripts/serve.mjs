/**
 * Servidor estático para auditoria e desenvolvimento local.
 *
 * Node puro, sem dependência: o site é servido pelo GitHub Pages como arquivo
 * estático, e qualquer servidor com mais recursos do que isso testaria algo
 * diferente do que roda em produção.
 *
 *   node scripts/serve.mjs [porta]          # auditoria do artefato gerado
 *   node scripts/serve.mjs --watch [porta]  # recompila src/ e recarrega a aba
 */
import { createServer } from 'node:http';
import { readFile, stat, watch } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { join, extname, normalize } from 'node:path';
import { clearTimeout, setTimeout } from 'node:timers';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const argumentos = process.argv.slice(2);
const modoWatch = argumentos.includes('--watch');
const PORT = Number(argumentos.find((argumento) => /^\d+$/.test(argumento))) || 4173;
const clientesDeAtualizacao = new Set();
let temporizadorDeBuild;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const scriptDeAtualizacao = `<script>(() => {
  const eventos = new EventSource('/_preview/events');
  eventos.addEventListener('reload', () => window.location.reload());
  eventos.addEventListener('build-error', (evento) => {
    const erroAnterior = document.getElementById('preview-build-error');
    if (erroAnterior) erroAnterior.remove();
    const aviso = document.createElement('aside');
    aviso.id = 'preview-build-error';
    aviso.setAttribute('role', 'alert');
    aviso.textContent = 'A prévia não foi atualizada: corrija o erro exibido no terminal.';
    Object.assign(aviso.style, { position: 'fixed', right: '1rem', bottom: '1rem', zIndex: '9999', maxWidth: '26rem', padding: '1rem', color: '#fff', background: '#8b1e1e', borderRadius: '.5rem', boxShadow: '0 4px 18px #0008' });
    document.body.append(aviso);
  });
  eventos.addEventListener('build-ok', () => document.getElementById('preview-build-error')?.remove());
})();</script>`;

function enviarEvento(tipo) {
  for (const resposta of clientesDeAtualizacao) resposta.write(`event: ${tipo}\ndata: agora\n\n`);
}

function executarBuild() {
  return new Promise((resolve) => {
    const processo = spawn(process.execPath, ['scripts/build.mjs'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let saida = '';
    processo.stdout.on('data', (dado) => (saida += dado));
    processo.stderr.on('data', (dado) => (saida += dado));
    processo.on('error', (erro) => resolve({ ok: false, saida: erro.message }));
    processo.on('close', (codigo) => resolve({ ok: codigo === 0, saida }));
  });
}

async function reconstruirEAtualizar() {
  const resultado = await executarBuild();
  if (resultado.ok) {
    process.stderr.write('Prévia atualizada.\n');
    enviarEvento('build-ok');
    enviarEvento('reload');
    return;
  }

  process.stderr.write(`Build não concluído; a prévia anterior foi mantida.\n${resultado.saida}`);
  enviarEvento('build-error');
}

function agendarReconstrucao() {
  clearTimeout(temporizadorDeBuild);
  temporizadorDeBuild = setTimeout(reconstruirEAtualizar, 150);
}

async function observar(caminho) {
  try {
    for await (const evento of watch(caminho, { recursive: true })) {
      // A escrita do próprio build acontece fora das raízes observadas.
      if (evento.filename) agendarReconstrucao();
    }
  } catch (erro) {
    process.stderr.write(`Não foi possível observar ${caminho}: ${erro.message}\n`);
  }
}

async function resolve(urlPath) {
  // normalize() impede que "../" escape da raiz do projeto.
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, clean);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    return file;
  } catch {
    return null;
  }
}

const servidor = createServer(async (req, res) => {
  if (modoWatch && req.url === '/_preview/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    });
    res.write(': connected\n\n');
    clientesDeAtualizacao.add(res);
    req.on('close', () => clientesDeAtualizacao.delete(res));
    return;
  }

  const file = await resolve(req.url || '/');
  if (!file) {
    const notFound = join(ROOT, '404.html');
    try {
      const body = await readFile(notFound);
      res.writeHead(404, { 'Content-Type': TYPES['.html'] }).end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
    return;
  }
  try {
    let body = await readFile(file);
    const tipo = TYPES[extname(file)] || 'application/octet-stream';
    if (modoWatch && extname(file) === '.html') {
      const html = body.toString('utf8');
      body = Buffer.from(html.replace('</body>', `${scriptDeAtualizacao}</body>`));
    }
    res.writeHead(200, {
      'Content-Type': tipo,
      ...(modoWatch ? { 'Cache-Control': 'no-store' } : {})
    });
    res.end(body);
  } catch {
    res.writeHead(500).end('Server error');
  }
});

if (modoWatch) {
  const resultadoInicial = await executarBuild();
  if (!resultadoInicial.ok) {
    process.stderr.write(`Não foi possível iniciar a prévia.\n${resultadoInicial.saida}`);
    process.exitCode = 1;
  } else {
    void observar(join(ROOT, 'src'));
    void observar(join(ROOT, 'scripts'));
  }
}

if (!process.exitCode) {
  servidor.listen(PORT, () => {
    console.warn(
      `Servindo ${ROOT} em http://localhost:${PORT}${modoWatch ? ' (atualização em tempo real)' : ''}`
    );
  });
}
