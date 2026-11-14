#!/usr/bin/env node
/**
 * chuanban-antigravity-theme-patch · 一键安装、自检、安全模式验证与回滚 CLI (install.mjs)
 *
 * 支持子命令：
 *   node install.mjs install [--channel auto|stable|insiders] [--preset high-contrast] [--scheme auto|light|dark] [--target-dir <dir>] [--sync-user] [--register-service]
 *   node install.mjs doctor  [--channel auto|stable|insiders] [--target-dir <dir>]
 *   node install.mjs verify  [--safe-mode] [--channel auto|stable|insiders] [--target-dir <dir>]
 *   node install.mjs rollback [--target-dir <dir>]
 *   node install.mjs uninstall [--target-dir <dir>]
 *   node install.mjs build-manifest
 *   node install.mjs pack
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import { execSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_DRIVE_URL = 'https://drive.google.com/drive/folders/1NX92SgVUqtSjWg6bt6sIJXy-cn7J_boC';
const NOTION_GUIDE_URL = 'https://chuanban.notion.site/chuanban-antigravity-theme-patch-db7c5846f37546be9481cd791aed0554';
const GITHUB_REPO_URL = 'https://github.com/Anarcadia/chuanban-antigravity-theme-patch';

const ALLOWED_ORIGINS = [
  'http://127.0.0.1',
  'https://127.0.0.1',
  'http://localhost',
  'https://localhost',
  'vscode-file://'
];

const args = process.argv.slice(2);
const subcommand = args.find((a) => !a.startsWith('-')) || 'help';
const hasFlag = (f) => args.some((a) => a === f || a.startsWith(f + '='));
function getArg(flag, fallback = null) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && i + 1 < args.length) return args[i + 1];
    if (args[i].startsWith(flag + '=')) return args[i].slice(flag.length + 1);
  }
  return fallback;
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function canonicalPath(p) {
  const resolved = path.resolve(p);
  try {
    return fs.realpathSync.native ? fs.realpathSync.native(resolved) : fs.realpathSync(resolved);
  } catch {
    const parent = path.dirname(resolved);
    if (parent && parent !== resolved) {
      try {
        const realParent = fs.realpathSync.native ? fs.realpathSync.native(parent) : fs.realpathSync(parent);
        return path.join(realParent, path.basename(resolved));
      } catch {}
    }
    return resolved;
  }
}

function isSameTargetPath(a, b) {
  const pa = canonicalPath(a);
  const pb = canonicalPath(b);
  return process.platform === 'win32' || process.platform === 'darwin'
    ? pa.toLowerCase() === pb.toLowerCase()
    : pa === pb;
}

// 自定义目录且未要求登记服务时，不改本机 argv、包装脚本和正在运行的守护进程。
function isCustomSandboxTarget(targetDir) {
  const defaultTarget = path.join(os.homedir(), '.gemini', 'antigravity', 'theme-patch');
  return hasFlag('--target-dir') && !isSameTargetPath(targetDir, defaultTarget) && !hasFlag('--register-service');
}

function resolveDefaultTargetDir() {
  const installed = path.join(os.homedir(), '.gemini', 'antigravity', 'theme-patch');
  if (fs.existsSync(path.join(installed, 'core', 'daemon.mjs'))) {
    return installed;
  }
  return __dirname;
}

// ============================================================================
// 1. 生成与校验 core/manifest.json
// ============================================================================
function buildManifest(baseDir = __dirname) {
  const coreDir = path.join(baseDir, 'core');
  const files = ['daemon.mjs', 'runtime.js', 'theme.css', 'i18n.json'];
  const entries = {};
  for (const name of files) {
    const p = path.join(coreDir, name);
    if (!fs.existsSync(p)) {
      throw new Error(`Missing core file: ${p}`);
    }
    const stat = fs.statSync(p);
    entries[name] = {
      sha256: sha256File(p),
      bytes: stat.size
    };
  }
  const manifest = {
    name: 'chuanban-antigravity-theme-patch',
    version: '5.0.0',
    minNodeVersion: '22.0.0',
    fullMetricsNodeVersion: '22.13.0',
    distribution: {
      notionGuide: NOTION_GUIDE_URL,
      googleDriveFullBundle: GOOGLE_DRIVE_URL,
      githubRepo: GITHUB_REPO_URL
    },
    files: entries
  };
  const manifestPath = path.join(coreDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifest;
}

function buildDistZip(baseDir = __dirname) {
  const manifest = buildManifest(baseDir);
  const distDir = path.join(baseDir, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  const zipName = `${manifest.name}-v${manifest.version}.zip`;
  const zipPath = path.join(distDir, zipName);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  const includeItems = [
    'SKILL.md',
    'README.md',
    'CHANGELOG.md',
    'install.mjs',
    '.gitattributes',
    '.gitignore',
    'core',
    'user',
    'assets'
  ].filter((item) => fs.existsSync(path.join(baseDir, item)));

  const allowedUserFiles = new Set(['config.json', 'custom.css', 'custom.js', 'i18n.override.json']);
  const skipNames = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);
  const entriesToPack = [];
  const collectEntries = (relPosix) => {
    const fullPath = path.join(baseDir, ...relPosix.split('/'));
    if (!fs.existsSync(fullPath)) return;
    const st = fs.statSync(fullPath);
    if (st.isDirectory()) {
      for (const child of fs.readdirSync(fullPath).sort()) {
        if (skipNames.has(child)) continue;
        if (relPosix === 'user' && !allowedUserFiles.has(child)) continue;
        collectEntries(`${relPosix}/${child}`);
      }
    } else if (st.isFile()) {
      entriesToPack.push({ abs: fullPath, entry: relPosix });
    }
  };
  for (const item of includeItems) {
    collectEntries(item.replace(/\\/g, '/'));
  }

  if (process.platform === 'win32') {
    const listTmpPath = path.join(os.tmpdir(), `ag-pack-entries-${process.pid}-${Date.now()}.json`);
    fs.writeFileSync(listTmpPath, JSON.stringify(entriesToPack), 'utf8');
    try {
      const psScript = [
        '$ErrorActionPreference = "Stop"',
        'Add-Type -AssemblyName System.IO.Compression',
        'Add-Type -AssemblyName System.IO.Compression.FileSystem',
        `$zipPath = '${zipPath.replace(/'/g, "''")}'`,
        `$listPath = '${listTmpPath.replace(/'/g, "''")}'`,
        '$parsed = Get-Content -LiteralPath $listPath -Raw -Encoding UTF8 | ConvertFrom-Json',
        '$items = @(foreach ($x in $parsed) { if ($null -ne $x) { $x } })',
        '$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)',
        'try {',
        '  foreach ($it in $items) {',
        '    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, [string]$it.abs, [string]$it.entry, [System.IO.Compression.CompressionLevel]::Optimal)',
        '  }',
        '} finally {',
        '  $zip.Dispose()',
        '}',
        '$zr = [System.IO.Compression.ZipFile]::OpenRead($zipPath)',
        '$sha = [System.Security.Cryptography.SHA256]::Create()',
        '$out = @{ hasBackslash = $false; core = @{} }',
        'try {',
        '  foreach ($e in $zr.Entries) {',
        '    if ($e.FullName.Contains("\\")) { $out.hasBackslash = $true }',
        '    if ($e.FullName.StartsWith("core/") -and $e.Name -ne "") {',
        '      $s = $e.Open()',
        '      $ms = New-Object System.IO.MemoryStream',
        '      try { $s.CopyTo($ms) } finally { $s.Dispose() }',
        '      $bytes = $ms.ToArray()',
        '      $ms.Dispose()',
        '      $hash = ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()',
        '      $out.core[$e.Name] = @{ sha256 = $hash; bytes = $bytes.Length }',
        '    }',
        '  }',
        '} finally {',
        '  $sha.Dispose()',
        '  $zr.Dispose()',
        '}',
        '$out | ConvertTo-Json -Compress -Depth 4'
      ].join('; ');

      const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
        cwd: baseDir,
        encoding: 'utf8',
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024
      });
      if (r.status !== 0) {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        throw new Error(`ZipArchive pack failed: ${(r.stderr || r.stdout || '').trim()}`);
      }
      const verifyData = JSON.parse(String(r.stdout || '').trim());
      if (verifyData.hasBackslash) {
        fs.unlinkSync(zipPath);
        throw new Error(`Verification failed: backslash path detected in ${zipName}`);
      }
      for (const [name, meta] of Object.entries(manifest.files)) {
        const actual = verifyData.core?.[name];
        if (!actual) {
          fs.unlinkSync(zipPath);
          throw new Error(`Verification failed: missing core/${name} in ${zipName}`);
        }
        if (actual.sha256 !== meta.sha256 || actual.bytes !== meta.bytes) {
          fs.unlinkSync(zipPath);
          throw new Error(
            `Verification failed for core/${name} in ${zipName}: expected ${meta.sha256} (${meta.bytes}B), got ${actual.sha256} (${actual.bytes}B)`
          );
        }
      }
    } finally {
      try {
        if (fs.existsSync(listTmpPath)) fs.unlinkSync(listTmpPath);
      } catch {}
    }
  } else {
    const r = spawnSync('zip', ['-q', zipPath, ...entriesToPack.map((e) => e.entry)], {
      cwd: baseDir,
      stdio: 'inherit'
    });
    if (r.status !== 0) throw new Error('zip command failed');
    // 逐文件校验 zip 内 core/* 的 SHA-256 与字节数与 manifest 完全一致，杜绝脏包发布
    for (const [name, meta] of Object.entries(manifest.files)) {
      const uz = spawnSync('unzip', ['-p', zipPath, `core/${name}`], { maxBuffer: 20 * 1024 * 1024 });
      if (uz.status !== 0) {
        fs.unlinkSync(zipPath);
        throw new Error(`Verification failed: missing core/${name} in ${zipName}`);
      }
      const actualSha = crypto.createHash('sha256').update(uz.stdout).digest('hex');
      if (actualSha !== meta.sha256 || uz.stdout.length !== meta.bytes) {
        fs.unlinkSync(zipPath);
        throw new Error(
          `Verification failed for core/${name} in ${zipName}: expected ${meta.sha256} (${meta.bytes}B), got ${actualSha} (${uz.stdout.length}B)`
        );
      }
    }
  }
  return { zipPath, version: manifest.version, filesVerified: Object.keys(manifest.files).length };
}

function verifyCoreIntegrity(baseDir = __dirname) {
  const coreDir = path.join(baseDir, 'core');
  const manifestPath = path.join(coreDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, reason: 'missing manifest.json', modified: [] };
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const modified = [];
  for (const [name, meta] of Object.entries(manifest.files || {})) {
    const p = path.join(coreDir, name);
    if (!fs.existsSync(p)) {
      modified.push({ file: name, status: 'missing' });
      continue;
    }
    const actualHash = sha256File(p);
    if (actualHash !== meta.sha256) {
      modified.push({ file: name, status: 'modified', expected: meta.sha256, actual: actualHash });
    }
  }
  return { ok: modified.length === 0, manifest, modified };
}

// ============================================================================
// 2. 环境、字体、argv.json 与实时 CDP 窗口检查
// ============================================================================
async function detectEnvironment(channel = 'auto') {
  const nodeVer = process.versions.node;
  const [major, minor] = nodeVer.split('.').map((n) => parseInt(n, 10));
  const nodeBasicOk = major >= 22;

  let sqliteAvailable = false;
  try {
    const mod = await import('node:sqlite').catch(() => null);
    sqliteAvailable = !!(mod && typeof mod.DatabaseSync === 'function');
  } catch {
    sqliteAvailable = false;
  }

  const home = os.homedir();
  const fontDirs =
    process.platform === 'darwin'
      ? [path.join(home, 'Library/Fonts'), '/Library/Fonts']
      : process.platform === 'win32'
      ? [
          path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData/Local'), 'Microsoft/Windows/Fonts'),
          'C:\\Windows\\Fonts'
        ]
      : [path.join(home, '.local/share/fonts'), '/usr/local/share/fonts', '/usr/share/fonts'];

  let allFontFiles = [];
  for (const d of fontDirs) {
    try {
      if (fs.existsSync(d)) {
        allFontFiles.push(...fs.readdirSync(d));
      }
    } catch {}
  }

  const hasAnthropicFont = allFontFiles.some((f) => /Anthropic/i.test(f));
  const hasSarasaFont = allFontFiles.some((f) => /Sarasa|更纱/i.test(f));

  const checkSingleChannel = (ch) => {
    const isInsiders = ch === 'insiders';
    const appDirName = isInsiders ? 'Antigravity - Insiders' : 'Antigravity';
    let portFile;
    let appPath;
    if (process.platform === 'darwin') {
      portFile = path.join(home, 'Library/Application Support', appDirName, 'DevToolsActivePort');
      appPath = isInsiders ? '/Applications/Antigravity - Insiders.app' : '/Applications/Antigravity.app';
    } else if (process.platform === 'win32') {
      const appData = process.env.APPDATA || path.join(home, 'AppData/Roaming');
      portFile = path.join(appData, appDirName, 'DevToolsActivePort');
      appPath = '';
    } else {
      const xdg = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
      portFile = path.join(xdg, appDirName, 'DevToolsActivePort');
      appPath = '';
    }
    return {
      channel: ch,
      appExists: appPath ? fs.existsSync(appPath) : true,
      portFile,
      portFileExists: fs.existsSync(portFile)
    };
  };

  const primaryChannel = channel === 'insiders' ? 'insiders' : 'stable';
  const chInfo = checkSingleChannel(primaryChannel);
  const insidersInfo = checkSingleChannel('insiders');
  const channels = {
    stable: checkSingleChannel('stable'),
    insiders: insidersInfo
  };

  return {
    nodeVer,
    major,
    minor,
    nodeBasicOk,
    sqliteAvailable,
    tier: sqliteAvailable
      ? 'FULL (>= 22.13, Theme + Fonts + i18n + SQLite Live Metrics)'
      : nodeBasicOk
      ? 'STANDARD (22.0~22.12, Theme + Fonts + i18n; SQLite Metrics gracefully disabled)'
      : 'UNSUPPORTED (< 22.0, requires Node 22+)',
    hasAnthropicFont,
    hasSarasaFont,
    channel,
    appExists: chInfo.appExists || insidersInfo.appExists,
    portFile: chInfo.portFileExists
      ? chInfo.portFile
      : insidersInfo.portFileExists
        ? insidersInfo.portFile
        : chInfo.portFile,
    portFileExists: chInfo.portFileExists || insidersInfo.portFileExists,
    channels
  };
}

function ensureArgvRemoteDebugging(channel = 'auto') {
  const home = os.homedir();
  // 只修补经典版。不要探测 Antigravity IDE，不要写入 ~/.antigravity-ide/argv.json。
  const dirs =
    channel === 'insiders'
      ? ['.antigravity-insiders']
      : channel === 'stable'
      ? ['.antigravity']
      : ['.antigravity', '.antigravity-insiders'];

  const results = [];
  for (const d of dirs) {
    const argvDir = path.join(home, d);
    const argvPath = path.join(argvDir, 'argv.json');
    if (!fs.existsSync(argvDir)) continue;
    try {
      if (!fs.existsSync(argvPath)) {
        fs.writeFileSync(argvPath, JSON.stringify({ 'remote-debugging-port': 9222 }, null, 2) + '\n', 'utf8');
        results.push({ path: argvPath, action: 'created' });
        continue;
      }
      const raw = fs.readFileSync(argvPath, 'utf8');
      if (/"remote-debugging-port"\s*:/.test(raw)) {
        results.push({ path: argvPath, action: 'already-present' });
        continue;
      }
      const lastBrace = raw.lastIndexOf('}');
      if (lastBrace !== -1) {
        const before = raw.slice(0, lastBrace).trimEnd();
        const needsComma = !before.endsWith('{') && !before.endsWith(',');
        const patched = `${before}${needsComma ? ',' : ''}\n\t"remote-debugging-port": 9222\n}\n`;
        fs.writeFileSync(argvPath, patched, 'utf8');
        results.push({ path: argvPath, action: 'patched' });
      }
    } catch (e) {
      results.push({ path: argvPath, action: 'skipped', error: e.message });
    }
  }
  return results;
}

function isAllowedOrigin(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  return ALLOWED_ORIGINS.some((prefix) => urlStr.startsWith(prefix));
}

function isAgentPanelUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') return false;
    return url.searchParams.get('extensionView') === 'true' || url.searchParams.has('hostTheme');
  } catch {
    return false;
  }
}

function isInjectableTarget(target) {
  if (!target || !target.webSocketDebuggerUrl) return false;
  const url = String(target.url || '');
  if (url.startsWith('devtools://')) return false;
  if (!isAllowedOrigin(url)) return false;
  if (String(target.title || '').includes('Launchpad')) return false;
  if (target.type === 'page') return true;
  return target.type === 'iframe' && isAgentPanelUrl(url);
}

function fetchTargetsFromPort(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/json/list', timeout: 1500 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => {
      req.destroy();
      resolve([]);
    });
  });
}

async function inspectLiveWindow(portFileOrEnv, fallbackPort = 9222) {
  const candidateFiles = [];
  const candidatePorts = [];

  if (portFileOrEnv && typeof portFileOrEnv === 'object' && portFileOrEnv.channels) {
    if (portFileOrEnv.portFile) candidateFiles.push(portFileOrEnv.portFile);
    if (portFileOrEnv.channels.stable?.portFile) candidateFiles.push(portFileOrEnv.channels.stable.portFile);
    if (portFileOrEnv.channels.insiders?.portFile) candidateFiles.push(portFileOrEnv.channels.insiders.portFile);
    candidatePorts.push(9222, 9223);
  } else if (typeof portFileOrEnv === 'string' && portFileOrEnv) {
    candidateFiles.push(portFileOrEnv);
    if (fallbackPort > 0) candidatePorts.push(fallbackPort);
  } else if (fallbackPort > 0) {
    candidatePorts.push(fallbackPort);
  }

  let respondedPort = null;
  let sawTargets = false;
  const found = [];
  const triedPorts = new Set();

  const takePort = async (candidate) => {
    if (!(candidate > 0) || triedPorts.has(candidate)) return;
    triedPorts.add(candidate);
    const res = await fetchTargetsFromPort(candidate);
    if (res.length === 0) return;
    sawTargets = true;
    if (!respondedPort) respondedPort = candidate;
    for (const target of res) {
      if (isInjectableTarget(target)) found.push({ port: candidate, target });
    }
  };

  for (const pf of candidateFiles) {
    if (pf && fs.existsSync(pf)) {
      const raw = fs.readFileSync(pf, 'utf8').trim();
      const parsed = parseInt(raw.split(/\r?\n/)[0], 10);
      await takePort(parsed);
    }
  }
  for (const fb of candidatePorts) {
    await takePort(fb);
  }
  if (!sawTargets) {
    return { reachable: false, reason: 'No active CDP port responded (checked DevToolsActivePort & fallback port 9222)' };
  }

  const chosen = found.find((item) => isAgentPanelUrl(item.target.url)) || found.find((item) => item.target.type === 'page');
  if (!chosen) {
    return { reachable: true, port: respondedPort, pages: 0, reason: 'No active workbench page target' };
  }

  const page = chosen.target;
  const port = chosen.port;
  const state = await new Promise((resolve) => {
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {}
      resolve(null);
    }, 2000);
    ws.addEventListener('open', () => {
      ws.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `({
              version: window.__ag_patch_version || null,
              hasStyle: !!document.getElementById('ag-custom-fonts'),
              hasUserStyle: !!document.getElementById('antigravity-user-custom-style'),
              preset: document.documentElement.getAttribute('data-ag-preset'),
              appearance: document.documentElement.getAttribute('data-ag-appearance'),
              scheme: document.documentElement.getAttribute('data-ag-scheme'),
              backgroundColor: getComputedStyle(document.body || document.documentElement).backgroundColor,
              shellBg: (() => {
                const el = document.querySelector('[aria-label="Sidebar"], .agy-inset-shell, .bg-sidebar');
                return el ? getComputedStyle(el).backgroundColor : null;
              })(),
              composerBg: (() => {
                const el = document.getElementById('antigravity.agentSidePanelInputBox');
                return el ? getComputedStyle(el).backgroundColor : null;
              })(),
              cardBg: (() => {
                const el = document.querySelector('.surface-composer-card, [id="antigravity.agentSidePanelInputBox"] .bg-card');
                return el ? getComputedStyle(el).backgroundColor : null;
              })(),
              sidebarColor: (() => {
                const el = document.querySelector('.bg-sidebar a, .bg-sidebar button, aside a, aside button');
                return el ? getComputedStyle(el).color : null;
              })(),
              waxColor: getComputedStyle(document.documentElement).getPropertyValue('--ag-wax').trim(),
              pageType: document.documentElement.getAttribute('data-ag-page-type'),
              waxSeal: document.documentElement.getAttribute('data-ag-wax-seal'),
              dictCount: window.__ag_i18n_dict ? Object.keys(window.__ag_i18n_dict).length : 0,
              protoSafe: window.__ag_i18n_dict ? Object.getPrototypeOf(window.__ag_i18n_dict) === null : false,
              pillMounted: !!document.getElementById('ag-live-metrics-pill'),
              pillText: document.getElementById('ag-live-metrics-pill')?.textContent || null
            })`,
            returnByValue: true
          }
        })
      );
    });
    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(String(ev.data));
        if (msg.id === 1) {
          clearTimeout(timer);
          ws.close();
          resolve(msg.result?.result?.value || null);
        }
      } catch {}
    });
    ws.addEventListener('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
  });

  return {
    reachable: true,
    port,
    targetId: page.id,
    title: page.title,
    state
  };
}

// ============================================================================
// 3. 子命令实现：doctor / install / verify / rollback / uninstall
// ============================================================================
async function runDoctor() {
  const channel = getArg('--channel', 'auto');
  const targetDir = path.resolve(getArg('--target-dir', resolveDefaultTargetDir()));
  const env = await detectEnvironment(channel);
  const integrity = verifyCoreIntegrity(targetDir);
  const live = isCustomSandboxTarget(targetDir)
    ? { skipped: true, reason: 'custom-target-dir' }
    : await inspectLiveWindow(env);

  const report = {
    ok: Boolean(env.nodeBasicOk && integrity.ok),
    node: {
      version: env.nodeVer,
      execPath: process.execPath,
      tier: env.tier
    },
    fonts: {
      anthropicInstalled: env.hasAnthropicFont,
      sarasaInstalled: env.hasSarasaFont,
      downloadUrl: !env.hasAnthropicFont || !env.hasSarasaFont ? GOOGLE_DRIVE_URL : null
    },
    antigravity: {
      channel: env.channel,
      appExists: env.appExists,
      portFile: env.portFile,
      portFileExists: env.portFileExists,
      channels: env.channels
    },
    coreIntegrity: {
      targetDir,
      clean: integrity.ok,
      modifiedFiles: integrity.modified
    },
    liveWindow: live
  };

  console.log(JSON.stringify(report, null, 2));
  if (!env.nodeBasicOk) {
    console.error('\n[ERROR] Node.js >= 22.0.0 is required. Current:', env.nodeVer);
    process.exit(1);
  }
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    const st = fs.statSync(s);
    if (st.isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function stopRunningDaemonProcesses() {
  const tmpDir = os.tmpdir();
  const stopped = [];
  try {
    for (const f of fs.readdirSync(tmpDir)) {
      if (f.startsWith('ag-theme-daemon-') && f.endsWith('.pid')) {
        const pidPath = path.join(tmpDir, f);
        const pid = parseInt(fs.readFileSync(pidPath, 'utf8').trim(), 10);
        if (pid > 0 && pid !== process.pid) {
          try {
            process.kill(pid, 'SIGTERM');
            stopped.push(pid);
          } catch {}
        }
        try {
          fs.unlinkSync(pidPath);
        } catch {}
      }
    }
  } catch {}
  return stopped;
}

function registerSystemService(targetDir, wrapperDaemon) {
  const home = os.homedir();
  if (process.platform === 'darwin') {
    const launchAgentsDir = path.join(home, 'Library', 'LaunchAgents');
    fs.mkdirSync(launchAgentsDir, { recursive: true });
    const existingCustomFontPlist = path.join(launchAgentsDir, 'com.antigravity.customfont.plist');
    const themePlist = path.join(launchAgentsDir, 'com.antigravity.theme.plist');
    const activePlist = fs.existsSync(existingCustomFontPlist) ? existingCustomFontPlist : themePlist;
    const label = path.basename(activePlist, '.plist');

    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${process.execPath}</string>
        <string>--disable-warning=ExperimentalWarning</string>
        <string>${wrapperDaemon}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/antigravity-font-daemon.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/antigravity-font-daemon.err</string>
</dict>
</plist>
`;
    fs.writeFileSync(activePlist, plistContent, 'utf8');
    try {
      const uid = process.getuid ? process.getuid() : 501;
      execSync(`launchctl bootout gui/${uid}/${label} 2>/dev/null || true`);
      execSync(`launchctl bootstrap gui/${uid} "${activePlist}" 2>/dev/null || launchctl load -w "${activePlist}" 2>/dev/null || true`);
      execSync(`launchctl kickstart -k gui/${uid}/${label} 2>/dev/null || true`);
    } catch {}
    return { platform: 'darwin', serviceFile: activePlist, label, runningNow: true };
  }

  if (process.platform === 'linux') {
    const systemdDir = path.join(home, '.config', 'systemd', 'user');
    fs.mkdirSync(systemdDir, { recursive: true });
    const serviceFile = path.join(systemdDir, 'antigravity-theme.service');
    const unitContent = `[Unit]
Description=Chuanban Antigravity Theme & Live Metrics Daemon
After=default.target

[Service]
ExecStart="${process.execPath}" --disable-warning=ExperimentalWarning "${wrapperDaemon}"
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
`;
    fs.writeFileSync(serviceFile, unitContent, 'utf8');
    try {
      execSync('systemctl --user daemon-reload && systemctl --user enable --now antigravity-theme.service 2>/dev/null || true');
    } catch {}
    return { platform: 'linux', serviceFile, runningNow: true };
  }

  if (process.platform === 'win32') {
    stopRunningDaemonProcesses();
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    const startupDir = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
    const vbsFile = path.join(startupDir, 'AntigravityThemeDaemon.vbs');
    const localVbsFile = path.join(targetDir, 'AntigravityThemeDaemon.vbs');
    const cmd = `""${process.execPath}"" --disable-warning=ExperimentalWarning ""${wrapperDaemon}""`;
    const vbsContent = `\uFEFFSet WshShell = CreateObject("WScript.Shell")\r\nWshShell.Run "${cmd}", 0, False\r\n`;
    try {
      // 使用 UTF-16LE (带 BOM) 写入 VBS，彻底兼容 Windows 中文用户名路径 (wscript.exe 原生支持 UTF-16LE)
      fs.writeFileSync(localVbsFile, vbsContent, 'utf16le');
      fs.mkdirSync(startupDir, { recursive: true });
      fs.writeFileSync(vbsFile, vbsContent, 'utf16le');
    } catch {}
    try {
      spawnSync(
        'reg',
        [
          'add',
          'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
          '/v',
          'AntigravityThemeDaemon',
          '/t',
          'REG_SZ',
          '/d',
          `wscript.exe //B //NoLogo "${localVbsFile}"`,
          '/f'
        ],
        { stdio: 'ignore', windowsHide: true }
      );
    } catch {}
    // 立即在后台无黑框拉起常驻守护进程（无需等待下次重启电脑）
    let spawnedPid = null;
    try {
      const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', wrapperDaemon], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.unref();
      spawnedPid = child.pid || null;
    } catch {}
    return { platform: 'win32', serviceFile: vbsFile, localVbsFile, spawnedPid, runningNow: Boolean(spawnedPid) };
  }

  return { platform: process.platform, serviceFile: null };
}

async function runInstall() {
  const cliChannel = getArg('--channel', null);
  const channel = cliChannel || 'auto';
  const preset = getArg('--preset', null);
  const schemeArg = getArg('--scheme', null);
  const scheme = schemeArg === 'light' || schemeArg === 'dark' || schemeArg === 'auto' ? schemeArg : null;
  const defaultTarget = path.join(os.homedir(), '.gemini', 'antigravity', 'theme-patch');
  const targetDir = path.resolve(getArg('--target-dir', defaultTarget));
  const syncUser = hasFlag('--sync-user');
  const sandboxTarget = isCustomSandboxTarget(targetDir);

  const env = await detectEnvironment(channel);
  if (!env.nodeBasicOk) {
    console.error(`[ERROR] Node.js >= 22.0.0 is required (current: ${env.nodeVer}).`);
    process.exit(1);
  }

  buildManifest(__dirname);

  const srcCore = path.join(__dirname, 'core');
  const srcUser = path.join(__dirname, 'user');
  const targetCore = path.join(targetDir, 'core');
  const targetPrev = path.join(targetDir, 'core.prev');
  const backupsDir = path.join(targetDir, 'backups');
  const targetUser = path.join(targetDir, 'user');

  let backupCreated = null;
  let userBackupCreated = null;
  if (path.resolve(__dirname) !== targetDir) {
    fs.mkdirSync(targetDir, { recursive: true });

    // 仅当已安装的 core/ 与当前待安装 core/ 的 manifest SHA-256 不同时才备份，防止重复 install 冲掉上一版快照
    const srcManifestPath = path.join(srcCore, 'manifest.json');
    const targetManifestPath = path.join(targetCore, 'manifest.json');
    const shouldBackup =
      fs.existsSync(targetCore) &&
      (!fs.existsSync(targetManifestPath) || sha256File(srcManifestPath) !== sha256File(targetManifestPath));

    if (shouldBackup) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const stampedBackupDir = path.join(backupsDir, stamp);
      fs.mkdirSync(backupsDir, { recursive: true });
      copyDirRecursive(targetCore, stampedBackupDir);
      fs.rmSync(targetPrev, { recursive: true, force: true });
      copyDirRecursive(targetCore, targetPrev);
      backupCreated = stampedBackupDir;
    } else if (fs.existsSync(targetCore) && !fs.existsSync(targetPrev)) {
      copyDirRecursive(targetCore, targetPrev);
      backupCreated = targetPrev;
    }

    fs.rmSync(targetCore, { recursive: true, force: true });
    copyDirRecursive(srcCore, targetCore);

    // user/ 层默认只补缺失文件。--sync-user 先整目录备份，再覆盖四个模板，不删用户多出来的文件。
    if (syncUser && fs.existsSync(targetUser)) {
      const userStamp = new Date().toISOString().replace(/[:.]/g, '-') + '-user';
      const stampedUserBackupDir = path.join(backupsDir, userStamp);
      fs.mkdirSync(backupsDir, { recursive: true });
      copyDirRecursive(targetUser, stampedUserBackupDir);
      userBackupCreated = stampedUserBackupDir;
    }
    fs.mkdirSync(targetUser, { recursive: true });
    for (const item of fs.readdirSync(srcUser)) {
      const s = path.join(srcUser, item);
      const d = path.join(targetUser, item);
      if (!fs.existsSync(d)) {
        fs.copyFileSync(s, d);
      }
    }
    if (syncUser) {
      for (const item of ['config.json', 'custom.css', 'i18n.override.json', 'custom.js']) {
        const s = path.join(srcUser, item);
        const d = path.join(targetUser, item);
        if (fs.existsSync(s)) fs.copyFileSync(s, d);
      }
    }

    for (const docFile of ['install.mjs', 'SKILL.md', 'README.md', 'CHANGELOG.md']) {
      const s = path.join(__dirname, docFile);
      const d = path.join(targetDir, docFile);
      if (fs.existsSync(s)) fs.copyFileSync(s, d);
    }
  }

  // 更新 user/config.json（仅在显式传入 CLI 参数或首次初始化时更新对应字段，保留用户自定义）
  const userConfigPath = path.join(targetUser, 'config.json');
  const currentCfg = fs.existsSync(userConfigPath)
    ? JSON.parse(fs.readFileSync(userConfigPath, 'utf8'))
    : {};
  if (typeof currentCfg.enabled !== 'boolean') currentCfg.enabled = true;
  if (cliChannel) {
    currentCfg.channel = cliChannel;
  } else if (!currentCfg.channel) {
    currentCfg.channel = 'auto';
  }
  if (preset) {
    currentCfg.preset = preset;
  } else if (!currentCfg.preset) {
    currentCfg.preset = 'high-contrast';
  }
  if (scheme) {
    currentCfg.scheme = scheme;
  } else if (currentCfg.scheme !== 'light' && currentCfg.scheme !== 'dark' && currentCfg.scheme !== 'auto') {
    currentCfg.scheme = 'auto';
  }
  // 字体 id 缺失或非法才写入默认值。已有布尔 modules.i18n 不在这里改写。
  const UI_FONT_IDS = ['wenyuan-serif', 'wenyuan-sans', 'anthropic', 'system'];
  const CODE_FONT_IDS = ['maple-bright', 'maple-mono', 'anthropic', 'sarasa'];
  if (!currentCfg.fonts || typeof currentCfg.fonts !== 'object' || Array.isArray(currentCfg.fonts)) {
    currentCfg.fonts = { ui: 'wenyuan-serif', code: 'maple-bright' };
  } else {
    if (UI_FONT_IDS.indexOf(currentCfg.fonts.ui) === -1) currentCfg.fonts.ui = 'wenyuan-serif';
    if (CODE_FONT_IDS.indexOf(currentCfg.fonts.code) === -1) currentCfg.fonts.code = 'maple-bright';
  }
  fs.writeFileSync(userConfigPath, JSON.stringify(currentCfg, null, 2) + '\n', 'utf8');

  const realDaemon = path.join(targetCore, 'daemon.mjs');
  let argvStatus = { skipped: true, reason: 'custom-target-dir' };
  let serviceInfo = { skipped: true, reason: 'custom-target-dir' };
  let live = { skipped: true, reason: 'custom-target-dir' };
  if (!sandboxTarget) {
    // 自动检查并修补 ~/.antigravity/argv.json (remote-debugging-port)
    argvStatus = ensureArgvRemoteDebugging(currentCfg.channel);

    // 创建兼容包装脚本 ~/.gemini/antigravity/scripts/antigravity-font-daemon.mjs（使用 pathToFileURL 兼容 Windows C:\ 路径）
    const scriptsDir = path.join(os.homedir(), '.gemini', 'antigravity', 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });
    const wrapperDaemon = path.join(scriptsDir, 'antigravity-font-daemon.mjs');
    const realDaemonUrl = pathToFileURL(realDaemon).href;
    fs.writeFileSync(
      wrapperDaemon,
      `#!/usr/bin/env node\n// Auto-generated wrapper -> ${realDaemon}\nawait import(${JSON.stringify(realDaemonUrl)});\n`,
      { encoding: 'utf8', mode: 0o755 }
    );

    // 注册/更新跨平台自启服务
    serviceInfo = registerSystemService(targetDir, wrapperDaemon);

    // 立即执行一次 --once 同步注入
    spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', realDaemon, '--once'], {
      stdio: 'inherit'
    });

    live = await inspectLiveWindow(env);
  }
  console.log(
    '\n[Install Complete]',
    JSON.stringify(
      {
        ok: true,
        targetDir,
        backupCreated,
        userSynced: syncUser,
        userBackupCreated,
        argvStatus,
        serviceInfo,
        config: currentCfg,
        liveWindow: live
      },
      null,
      2
    )
  );
}

async function runVerify() {
  const safeMode = hasFlag('--safe-mode');
  const channel = getArg('--channel', 'auto');
  const targetDir = path.resolve(getArg('--target-dir', resolveDefaultTargetDir()));
  const sandboxTarget = isCustomSandboxTarget(targetDir);
  const daemonPath = path.join(targetDir, 'core', 'daemon.mjs');

  const daemonArgs = ['--disable-warning=ExperimentalWarning', daemonPath, '--once'];
  if (safeMode) daemonArgs.push('--safe-mode');
  if (channel && channel !== 'auto') daemonArgs.push('--channel', channel);

  let live = { skipped: true, reason: 'custom-target-dir' };
  if (!sandboxTarget) {
    spawnSync(process.execPath, daemonArgs, { stdio: 'inherit' });
    const env = await detectEnvironment(channel);
    live = await inspectLiveWindow(env);
  }
  const ok = sandboxTarget ? true : Boolean(live.reachable && (live.state?.hasStyle || live.pages === 0));
  console.log(
    JSON.stringify(
      {
        ok,
        version: live.state?.version || null,
        themeStyle: Boolean(live.state?.hasStyle),
        safeMode,
        channel,
        live
      },
      null,
      2
    )
  );
}

async function runRollback() {
  const targetDir = path.resolve(getArg('--target-dir', resolveDefaultTargetDir()));
  const sandboxTarget = isCustomSandboxTarget(targetDir);
  const targetCore = path.join(targetDir, 'core');
  const targetPrev = path.join(targetDir, 'core.prev');
  const backupsDir = path.join(targetDir, 'backups');

  const isValidCoreBackup = (dir) =>
    fs.existsSync(path.join(dir, 'daemon.mjs')) && fs.existsSync(path.join(dir, 'runtime.js'));

  let restoreSource = null;
  if (isValidCoreBackup(targetPrev)) {
    restoreSource = targetPrev;
  } else if (fs.existsSync(backupsDir)) {
    const stamps = fs
      .readdirSync(backupsDir)
      .filter((name) => !name.endsWith('-user') && isValidCoreBackup(path.join(backupsDir, name)))
      .sort()
      .reverse();
    if (stamps.length > 0) {
      restoreSource = path.join(backupsDir, stamps[0]);
    }
  }

  if (!restoreSource) {
    console.error(`[ERROR] No valid core backup found at ${targetPrev} or ${backupsDir}`);
    process.exit(1);
  }

  fs.rmSync(targetCore, { recursive: true, force: true });
  copyDirRecursive(restoreSource, targetCore);

  // 重启守护进程并立即执行一次 --once 重新注入。自定义沙箱不碰本机服务。
  const realDaemon = path.join(targetCore, 'daemon.mjs');
  const wrapperDaemon = path.join(os.homedir(), '.gemini', 'antigravity', 'scripts', 'antigravity-font-daemon.mjs');
  let live = { skipped: true, reason: 'custom-target-dir' };
  if (!sandboxTarget) {
    if (process.platform === 'darwin') {
      const uid = process.getuid ? process.getuid() : 501;
      try {
        execSync(`launchctl kickstart -k gui/${uid}/com.antigravity.customfont 2>/dev/null || launchctl kickstart -k gui/${uid}/com.antigravity.theme 2>/dev/null || true`);
      } catch {}
    } else if (process.platform === 'linux') {
      try {
        execSync('systemctl --user restart antigravity-theme.service 2>/dev/null || true');
      } catch {}
    } else if (process.platform === 'win32') {
      stopRunningDaemonProcesses();
      try {
        const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', fs.existsSync(wrapperDaemon) ? wrapperDaemon : realDaemon], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        });
        child.unref();
      } catch {}
    }
    spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', realDaemon, '--once'], {
      stdio: 'inherit'
    });
    const env = await detectEnvironment('auto');
    live = await inspectLiveWindow(env);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        restoredFrom: restoreSource,
        restoredTo: targetCore,
        live
      },
      null,
      2
    )
  );
}

function runInstallFonts() {
  const fromDir = getArg('--from', null);
  if (!fromDir || !fs.existsSync(fromDir)) {
    console.error('Usage: node install.mjs install-fonts --from <font-folder-path>');
    process.exit(1);
  }
  const home = os.homedir();
  const destDir =
    process.platform === 'darwin'
      ? path.join(home, 'Library', 'Fonts')
      : process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Microsoft', 'Windows', 'Fonts')
      : path.join(home, '.local', 'share', 'fonts');

  fs.mkdirSync(destDir, { recursive: true });
  const installed = [];

  const walkFonts = (dir) => {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const st = fs.statSync(full);
      if (st.isDirectory()) {
        walkFonts(full);
      } else if (/\.(ttf|otf|ttc)$/i.test(entry)) {
        const destPath = path.join(destDir, entry);
        fs.copyFileSync(full, destPath);
        if (process.platform === 'win32') {
          const fontTitle = entry.replace(/\.(ttf|otf|ttc)$/i, '') + ' (TrueType)';
          try {
            spawnSync(
              'reg',
              [
                'add',
                'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts',
                '/v',
                fontTitle,
                '/t',
                'REG_SZ',
                '/d',
                destPath,
                '/f'
              ],
              { stdio: 'ignore', windowsHide: true }
            );
          } catch {}
        }
        installed.push(destPath);
      }
    }
  };

  walkFonts(path.resolve(fromDir));
  let fontBroadcastOk = process.platform !== 'win32';
  let fontRegisteredCount = 0;
  if (process.platform === 'win32' && installed.length > 0) {
    fontBroadcastOk = false;
    try {
      const fontListJson = JSON.stringify(Array.from(new Set(installed)));
      const listTmp = path.join(os.tmpdir(), `ag-fonts-${process.pid}-${Date.now()}.json`);
      fs.writeFileSync(listTmp, fontListJson, 'utf8');
      try {
        const psNotify = [
          '$ErrorActionPreference = "Stop"',
          'Add-Type -TypeDefinition @"',
          'using System; using System.Runtime.InteropServices;',
          'public static class AgFontBroadcast {',
          '  [DllImport("gdi32.dll", CharSet = CharSet.Unicode)] public static extern int AddFontResource(string lpFileName);',
          '  [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern bool SendNotifyMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);',
          '}',
          '"@',
          `$parsed = Get-Content -LiteralPath '${listTmp.replace(/'/g, "''")}' -Raw -Encoding UTF8 | ConvertFrom-Json`,
          '$paths = @(foreach ($x in $parsed) { if ($null -ne $x) { [string]$x } })',
          '$added = 0',
          'foreach ($fp in $paths) { if ($fp -and ([AgFontBroadcast]::AddFontResource($fp) -gt 0)) { $added++ } }',
          '$notified = [AgFontBroadcast]::SendNotifyMessage([IntPtr]0xffff, 0x001D, [IntPtr]::Zero, [IntPtr]::Zero)',
          '@{ added = $added; notified = [bool]$notified } | ConvertTo-Json -Compress'
        ].join('\n');
        const psRes = spawnSync(
          'powershell',
          ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psNotify],
          {
            encoding: 'utf8',
            windowsHide: true,
            timeout: 25000
          }
        );
        if (psRes.status === 0) {
          const notifyData = JSON.parse(String(psRes.stdout || '').trim() || '{}');
          fontRegisteredCount = Number(notifyData.added) || 0;
          fontBroadcastOk = fontRegisteredCount > 0 && Boolean(notifyData.notified);
        }
      } finally {
        try {
          if (fs.existsSync(listTmp)) fs.unlinkSync(listTmp);
        } catch {}
      }
    } catch {}
  } else if (process.platform === 'linux') {
    try {
      execSync('fc-cache -f 2>/dev/null || true');
    } catch {}
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        platform: process.platform,
        destDir,
        installedCount: installed.length,
        fontRegisteredCount,
        fontBroadcastOk,
        installed
      },
      null,
      2
    )
  );
}

async function runUninstall() {
  const home = os.homedir();
  const targetDir = path.resolve(getArg('--target-dir', resolveDefaultTargetDir()));
  if (isCustomSandboxTarget(targetDir)) {
    const localVbs = path.join(targetDir, 'AntigravityThemeDaemon.vbs');
    try {
      if (fs.existsSync(localVbs)) fs.unlinkSync(localVbs);
    } catch {}
    console.log(`[Uninstall] Cleaned custom sandbox target (${targetDir}); global daemon and services were left untouched.`);
    return;
  }
  stopRunningDaemonProcesses();
  if (process.platform === 'darwin') {
    const uid = process.getuid ? process.getuid() : 501;
    for (const label of ['com.antigravity.customfont', 'com.antigravity.theme']) {
      try {
        execSync(`launchctl bootout gui/${uid}/${label} 2>/dev/null || true`);
      } catch {}
    }
  } else if (process.platform === 'linux') {
    try {
      execSync('systemctl --user disable --now antigravity-theme.service 2>/dev/null || true');
    } catch {}
  } else if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    const vbsFile = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'AntigravityThemeDaemon.vbs');
    const localVbs = path.join(resolveDefaultTargetDir(), 'AntigravityThemeDaemon.vbs');
    try {
      if (fs.existsSync(vbsFile)) fs.unlinkSync(vbsFile);
      if (fs.existsSync(localVbs)) fs.unlinkSync(localVbs);
    } catch {}
    try {
      spawnSync('reg', ['delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', 'AntigravityThemeDaemon', '/f'], {
        stdio: 'ignore',
        windowsHide: true
      });
    } catch {}
  }
  console.log('[Uninstall] Stopped background daemon services. User config in ~/.gemini/antigravity/theme-patch/user/ is preserved.');
}

// ============================================================================
// 4. 路由分发
// ============================================================================
switch (subcommand) {
  case 'build-manifest': {
    const m = buildManifest(__dirname);
    console.log('Built core/manifest.json:', m.version, 'files:', Object.keys(m.files).length);
    break;
  }
  case 'pack': {
    const packed = buildDistZip(__dirname);
    console.log('Packed & verified dist archive:', packed.zipPath, `(verified ${packed.filesVerified} core files)`);
    break;
  }
  case 'doctor':
    await runDoctor();
    break;
  case 'install':
    await runInstall();
    break;
  case 'install-fonts':
    runInstallFonts();
    break;
  case 'verify':
    await runVerify();
    break;
  case 'rollback':
    await runRollback();
    break;
  case 'uninstall':
    await runUninstall();
    break;
  default:
    console.log(`Usage:
  node install.mjs install       [--channel auto|stable|insiders] [--preset high-contrast] [--scheme auto|light|dark] [--sync-user] [--target-dir <dir>] [--register-service]
  node install.mjs install-fonts --from <font-folder-path>
  node install.mjs doctor        [--channel auto|stable|insiders] [--target-dir <dir>]
  node install.mjs verify        [--safe-mode] [--channel auto|stable|insiders] [--target-dir <dir>]
  node install.mjs rollback      [--target-dir <dir>]
  node install.mjs uninstall     [--target-dir <dir>]
  node install.mjs build-manifest
  node install.mjs pack`);
    break;
}
