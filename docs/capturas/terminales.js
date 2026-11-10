// Genera tarjetas tipo terminal con salidas REALES de las evidencias.
// No inventa texto: cada línea se valida contra el archivo de evidencia.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'docs/capturas');

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

function read(file) {
  return stripAnsi(fs.readFileSync(path.join(ROOT, file), 'utf8')).split('\n');
}

function bottomBorder(sep) {
  return sep.replace(/[┌├]/g, '└').replace(/[┐┤]/g, '┘').replace(/[┬┼]/g, '┴');
}

function tableAround(lines, needle) {
  const i = lines.findIndex((l) => l.includes(needle));
  if (i < 0) throw new Error('No se encontró: ' + needle);
  const top = lines[i - 3];
  const header = lines[i - 2];
  const sep = lines[i - 1];
  return [top, header, sep, lines[i], bottomBorder(sep)];
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function colorize(line) {
  if (/^\s*\$/.test(line)) return `<span class="c-prompt">${esc(line)}</span>`;
  if (/^Total:/.test(line)) return `<span class="c-total">${esc(line)}</span>`;
  if (/^==\s.*==$/.test(line)) return `<span class="c-res">${esc(line)}</span>`;
  if (/^\s+#\s/.test(line)) return `<span class="c-res">${esc(line)}</span>`;
  let h = esc(line);
  h = h.replace(/"([^"]*)"(\s*:)/g, '<span class="c-key">"$1"</span>$2');
  h = h.replace(/:\s*"([^"]*)"/g, ': <span class="c-str">"$1"</span>');
  h = h.replace(/\b(true|false)\b/g, '<span class="c-ok">$1</span>');
  h = h.replace(/AES256/g, '<span class="c-ok">AES256</span>');
  return h;
}

function card({ title, subtitle, lines, wrap }) {
  const body = lines.map((l) => colorize(l)).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef2f7; font-family: "DejaVu Sans Mono", ui-monospace, monospace; }
    .win {
      margin: 18px; width: 1180px; border-radius: 16px; overflow: hidden;
      background: linear-gradient(180deg, #101828 0%, #0b1220 100%);
      border: 1px solid #22304a;
      box-shadow: 0 18px 40px rgba(15, 23, 42, .28);
    }
    .bar {
      display: flex; align-items: center; gap: 14px;
      padding: 12px 18px; background: #16213a; border-bottom: 1px solid #22304a;
    }
    .dots { display: flex; gap: 7px; }
    .dots i { width: 12px; height: 12px; border-radius: 50%; display: block; }
    .d1 { background: #ff5f57; } .d2 { background: #febc2e; } .d3 { background: #28c840; }
    .title { color: #cbd5e1; font-size: 14px; letter-spacing: .02em; }
    .title b { color: #f8fafc; font-weight: 600; }
    .sub { margin-left: auto; color: #7c8db5; font-size: 12.5px; }
    pre {
      margin: 0; padding: 20px 22px 24px; color: #d6e0f5;
      font-size: 13.5px; line-height: 1.55; white-space: pre; overflow: hidden;
    }
    pre.wrap { white-space: pre-wrap; word-break: break-word; }
    .c-prompt { color: #4ade80; font-weight: 700; }
    .c-total { color: #fbbf24; font-weight: 700; }
    .c-res { color: #67e8f9; font-weight: 700; }
    .c-key { color: #93c5fd; }
    .c-str { color: #fcd34d; }
    .c-ok { color: #4ade80; font-weight: 700; }
  </style></head><body>
  <div class="win">
    <div class="bar">
      <div class="dots"><i class="d1"></i><i class="d2"></i><i class="d3"></i></div>
      <div class="title"><b>${title}</b></div>
      <div class="sub">${subtitle}</div>
    </div>
    <pre${wrap ? ' class="wrap"' : ''}>${body}</pre>
  </div></body></html>`;
}

function validate(lines, source, file) {
  const text = read(source).join('\n');
  const bad = lines.filter((l) => {
    const t = l.trim();
    if (!t || t.startsWith('$') || t === '…') return false;
    return !text.includes(t);
  });
  if (bad.length) console.warn(`AVISO ${file}: líneas no encontradas en ${source}:\n  ` + bad.join('\n  '));
}

// ---------------------------------------------------------------- contenido
const plan = read('fase1/evidencias/terraform-plan.txt');
const verif = read('fase1/evidencias/verificacion-s3.txt');
const trivy14 = read('fase2/evidencias/trivy-node14.txt');
const trivy18 = read('fase2/evidencias/trivy-node18.txt');
const curl = read('fase3/evidencias/pruebas-autorizacion.txt');

const cards = [];

// 11 · Terraform plan
const c11 = [
  '$ terraform plan -out=tfplan',
  '',
  'Terraform will perform the following actions:',
  '',
  '  # aws_s3_bucket.secure_bucket will be created',
  '      + bucket                      = "actividad3-seguro-local"',
  '',
  '  # aws_s3_bucket_public_access_block.secure_bucket_pab will be created',
  '      + block_public_acls       = true',
  '      + block_public_policy     = true',
  '      + ignore_public_acls      = true',
  '      + restrict_public_buckets = true',
  '',
  '  # aws_s3_bucket_server_side_encryption_configuration.secure_bucket_sse will be created',
  '      + rule {',
  '          + apply_server_side_encryption_by_default {',
  '              + sse_algorithm     = "AES256"',
  '            }',
  '        }',
  '',
  'Plan: 3 to add, 0 to change, 0 to destroy.',
  'Saved the plan to: tfplan'
];
validate(c11, 'fase1/evidencias/terraform-plan.txt', '11-terraform-plan');
cards.push({
  file: '11-terraform-plan.png',
  title: 'terraform plan',
  subtitle: '3 recursos · AES-256 · 4 bloqueos',
  lines: c11
});

// 12 · Verificación con AWS CLI
const c12 = [
  '$ aws --endpoint-url=http://localhost:4566 s3api get-bucket-encryption --bucket actividad3-seguro-local',
  '  "ServerSideEncryptionConfiguration": {',
  '    "Rules": [',
  '      {',
  '        "ApplyServerSideEncryptionByDefault": {',
  '          "SSEAlgorithm": "AES256"',
  '        },',
  '        "BucketKeyEnabled": false',
  '      }',
  '    ]',
  '  }',
  '',
  '$ aws --endpoint-url=http://localhost:4566 s3api get-public-access-block --bucket actividad3-seguro-local',
  '  "PublicAccessBlockConfiguration": {',
  '    "BlockPublicAcls": true,',
  '    "IgnorePublicAcls": true,',
  '    "BlockPublicPolicy": true,',
  '    "RestrictPublicBuckets": true',
  '  }'
];
validate(c12, 'fase1/evidencias/verificacion-s3.txt', '12-verificacion-s3');
cards.push({
  file: '12-verificacion-s3.png',
  title: 'aws s3api · verificación',
  subtitle: 'cifrado y bloqueo público reales',
  lines: c12
});

// 13 · Trivy antes
const t14row = tableAround(trivy14, 'act3-app:node14 (debian 10.13)');
const c13 = [
  '$ trivy image --severity CRITICAL,HIGH act3-app:node14',
  '',
  'Report Summary',
  ...t14row,
  '…',
  '',
  'act3-app:node14 (debian 10.13)',
  '==============================',
  'Total: 566 (HIGH: 545, CRITICAL: 21)',
  '',
  'Node.js (node-pkg)',
  '==================',
  'Total: 29 (HIGH: 27, CRITICAL: 2)'
];
validate(c13, 'fase2/evidencias/trivy-node14.txt', '13-trivy-antes');
cards.push({
  file: '13-trivy-antes.png',
  title: 'trivy · node:14',
  subtitle: '595 hallazgos críticos y altos',
  lines: c13
});

// 14 · Trivy después
const t18row = tableAround(trivy18, 'act3-app:node18 (alpine 3.21.3)');
const c14 = [
  '$ trivy image --severity CRITICAL,HIGH act3-app:node18',
  '',
  'Report Summary',
  ...t18row,
  '…',
  '',
  'Legend:',
  "- '-': Not scanned",
  "- '0': Clean (no security findings detected)"
];
validate(c14, 'fase2/evidencias/trivy-node18.txt', '14-trivy-despues');
cards.push({
  file: '14-trivy-despues.png',
  title: 'trivy · node:18-alpine',
  subtitle: '0 críticas · 0 altas',
  lines: c14
});

// 15 · Pruebas de autorización con curl (condensadas del archivo real)
const c15 = ['$ curl -i http://localhost:3000/api/admin …', ''];
for (const line of curl) {
  const t = line.trim();
  if (/^== /.test(t)) {
    if (c15.length > 2) c15.push('');
    c15.push(t);
  } else if (/^HTTP\/1\.1/.test(t)) {
    c15.push(t);
  } else if (t.startsWith('{')) {
    c15.push(t);
  }
}
validate(c15, 'fase3/evidencias/pruebas-autorizacion.txt', '15-pruebas-curl');
cards.push({
  file: '15-pruebas-curl.png',
  title: 'curl · matriz de autorización',
  subtitle: '200 · 401 · 403',
  lines: c15,
  wrap: true
});

// ---------------------------------------------------------------- capturas
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1220, height: 900 },
    deviceScaleFactor: 2
  });

  for (const c of cards) {
    await page.setContent(card(c), { waitUntil: 'load' });
    const win = await page.$('.win');
    await win.screenshot({ path: path.join(OUT, c.file) });
    console.log('OK ' + c.file);
  }

  await browser.close();
})();
