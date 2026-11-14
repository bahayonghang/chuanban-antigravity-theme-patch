/**
 * chuanban-antigravity-theme-patch · Browser Runtime Engine (core/runtime.js)
 * 纯正浏览器端注入脚本（零模板字符串双重转义）。
 * 由 core/daemon.mjs 读取并将文件末尾的启动载荷占位符替换为实时配置与资源对象。
 */
((boot) => {
  // 非顶层只放行本机 Agent 面板。Artifact / HTML 预览等子 iframe 仍不注入。
  const isAgentPanelWindow = () => {
    try {
      const loc = window.location;
      if (!loc || (loc.protocol !== 'http:' && loc.protocol !== 'https:')) return false;
      if (loc.hostname !== '127.0.0.1' && loc.hostname !== 'localhost') return false;
      const q = new URLSearchParams(loc.search || '');
      return q.get('extensionView') === 'true' || q.has('hostTheme');
    } catch (e) {
      return false;
    }
  };
  if (window.top !== window && !isAgentPanelWindow()) return;
  if (!boot || typeof boot !== 'object') return;

  const PATCH_VERSION = boot.version || '20261104-v5.0.0';
  const ENABLED = boot.enabled !== false;
  const CSS_TEXT = boot.cssText || '';
  const CUSTOM_CSS_TEXT = boot.customCss || '';
  const THEME_VARS = boot.themeVars && typeof boot.themeVars === 'object' ? boot.themeVars : {};
  const RAW_MODULES = Object.assign({}, boot.features || {}, boot.modules || {});
  if (typeof RAW_MODULES.metricsCapsule === 'boolean' && typeof RAW_MODULES.metrics !== 'boolean') {
    RAW_MODULES.metrics = RAW_MODULES.metricsCapsule;
  }
  const MODULES = Object.assign(
    {
      i18n: false,
      metrics: true,
      composerWaxSeal: true,
      deadlockHealer: true,
      customCss: true,
      customJs: true
    },
    RAW_MODULES
  );
  MODULES.metricsCapsule = MODULES.metrics;

  const DEFAULT_PRESET = boot.preset || 'high-contrast';
  const BOOT_SCHEME = boot.scheme === 'light' || boot.scheme === 'dark' || boot.scheme === 'auto' ? boot.scheme : 'auto';
  const METRICS_LANG =
    boot.metricsLang === 'zh' || boot.metricsLang === 'en' || boot.metricsLang === 'auto' ? boot.metricsLang : 'auto';
  const UI_FONT_IDS = ['wenyuan-serif', 'wenyuan-sans', 'anthropic', 'system'];
  const CODE_FONT_IDS = ['maple-bright', 'maple-mono', 'anthropic', 'sarasa'];
  const rawFontConfig = boot.fonts && typeof boot.fonts === 'object' && !Array.isArray(boot.fonts) ? boot.fonts : {};
  const FONT_UI = UI_FONT_IDS.indexOf(rawFontConfig.ui) !== -1 ? rawFontConfig.ui : 'wenyuan-serif';
  const FONT_CODE = CODE_FONT_IDS.indexOf(rawFontConfig.code) !== -1 ? rawFontConfig.code : 'maple-bright';
  const SELECTORS = Object.assign(
    {
      inputBoxId: 'antigravity.agentSidePanelInputBox',
      branchPillInBox:
        '#antigravity\\.agentSidePanelInputBox [data-testid="branch-pill-trigger"], [id="antigravity.agentSidePanelInputBox"] [data-testid="branch-pill-trigger"], #antigravity\\.agentSidePanelInputBox [aria-label^="Select project"], [id="antigravity.agentSidePanelInputBox"] [aria-label^="Select project"], #antigravity\\.agentSidePanelInputBox [aria-label^="选择项目"], [id="antigravity.agentSidePanelInputBox"] [aria-label^="选择项目"], #antigravity\\.agentSidePanelInputBox [data-testid="project-branch-picker"], [id="antigravity.agentSidePanelInputBox"] [data-testid="project-branch-picker"], #antigravity\\.agentSidePanelInputBox [data-testid="project-selector-trigger"], [id="antigravity.agentSidePanelInputBox"] [data-testid="project-selector-trigger"], #antigravity\\.agentSidePanelInputBox [data-testid="location-selector-trigger"], [id="antigravity.agentSidePanelInputBox"] [data-testid="location-selector-trigger"]',
      homeGreeting: '[data-testid="home-greeting"], [data-testid="home-splash-content"]',
      excludeI18n:
        'code, pre, kbd, samp, textarea, input, style, script, noscript, [contenteditable="true"], .prose, .markdown, [class*="chat-message"], [class*="group/file-title"], [data-testid="conversation-row-sidebar"] a[href^="/c/"], [data-testid="conversation-row-sidebar"] span.truncate, #ag-live-metrics-pill, #ag-live-metrics-tooltip, [data-markdown-root], [data-testid="user-message-content"], .agy-user-bubble, .monaco-editor, .monaco-diff-editor, .xterm, [class*="onyx-key"], [data-testid="conversation-navigator-turn"], .msg-body, #raw, [data-testid="swarm-raw"], #swarm-title'
    },
    boot.selectors || {}
  );

  // 全局持久化的原始英文文本映射表（支持 i18n.override.json 热重载增删改与一键还原）
  if (!window.__ag_orig_text_map) {
    window.__ag_orig_text_map = new WeakMap();
  }
  const origTextMap = window.__ag_orig_text_map;

  function restoreAllTranslations(root = document.body) {
    if (!root) return;
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const rec = origTextMap.get(node);
        if (rec && node.nodeValue === rec.lastVal) {
          node.nodeValue = rec.origRaw;
          origTextMap.delete(node);
        }
      }
      const attrEls = root.querySelectorAll
        ? root.querySelectorAll('[data-ag-orig-title], [data-ag-orig-placeholder], [data-ag-orig-aria-label]')
        : [];
      for (let i = 0; i < attrEls.length; i++) {
        const el = attrEls[i];
        if (el.hasAttribute('data-ag-orig-title')) {
          el.setAttribute('title', el.getAttribute('data-ag-orig-title'));
          el.removeAttribute('data-ag-orig-title');
        }
        if (el.hasAttribute('data-ag-orig-placeholder')) {
          el.setAttribute('placeholder', el.getAttribute('data-ag-orig-placeholder'));
          el.removeAttribute('data-ag-orig-placeholder');
        }
        if (el.hasAttribute('data-ag-orig-aria-label')) {
          el.setAttribute('aria-label', el.getAttribute('data-ag-orig-aria-label'));
          el.removeAttribute('data-ag-orig-aria-label');
        }
      }
    } catch (e) {}
  }

  const NON_COLOR_THEME_VARS = new Set(['--ag-chat-font-size']);

  function applyThemeVars(varsObj, allowColorVars = true) {
    const rawVars = varsObj && typeof varsObj === 'object' ? varsObj : {};
    const effectiveVars = {};
    const rawKeys = Object.keys(rawVars);
    for (let i = 0; i < rawKeys.length; i++) {
      const k = rawKeys[i];
      if (allowColorVars || NON_COLOR_THEME_VARS.has(k)) {
        effectiveVars[k] = rawVars[k];
      }
    }

    const styleEl = document.documentElement.style;
    const prevKeys = Array.isArray(window.__ag_applied_theme_vars) ? window.__ag_applied_theme_vars : [];
    const prevValMap =
      window.__ag_applied_theme_var_values && typeof window.__ag_applied_theme_var_values === 'object'
        ? window.__ag_applied_theme_var_values
        : {};
    const nextKeys = [];
    const nextValMap = {};
    let mutatedStyle = false;

    for (let i = 0; i < prevKeys.length; i++) {
      const k = prevKeys[i];
      if (!(k in effectiveVars)) {
        const cur = styleEl.getPropertyValue(k).trim();
        if (cur !== '' && (!(k in prevValMap) || cur === prevValMap[k])) {
          styleEl.removeProperty(k);
          mutatedStyle = true;
        }
      }
    }

    const effKeys = Object.keys(effectiveVars);
    for (let i = 0; i < effKeys.length; i++) {
      const k = effKeys[i];
      const v = effectiveVars[k];
      const trimmed = v !== null && v !== undefined ? String(v).trim() : '';
      if (trimmed !== '') {
        if (styleEl.getPropertyValue(k).trim() !== trimmed) {
          styleEl.setProperty(k, trimmed);
          mutatedStyle = true;
        }
        nextKeys.push(k);
        nextValMap[k] = trimmed;
      } else {
        const cur = styleEl.getPropertyValue(k).trim();
        if (cur !== '' && (!(k in prevValMap) || cur === prevValMap[k])) {
          styleEl.removeProperty(k);
          mutatedStyle = true;
        }
      }
    }

    if (effectiveVars['--ag-chat-font-size']) {
      if (document.documentElement.getAttribute('data-ag-custom-font-size') !== 'true') {
        document.documentElement.setAttribute('data-ag-custom-font-size', 'true');
      }
    } else if (document.documentElement.hasAttribute('data-ag-custom-font-size')) {
      document.documentElement.removeAttribute('data-ag-custom-font-size');
    }

    window.__ag_applied_theme_vars = nextKeys;
    window.__ag_applied_theme_var_values = nextValMap;

    // 同步排空由补丁自身写 style 产生的观察记录，防止 style 监听自触发循环
    if (mutatedStyle && window.__ag_scheme_observer) {
      try {
        window.__ag_scheme_observer.takeRecords();
      } catch (e) {}
    }
  }

  // 类名与内联外观变量变化要重判 scheme 与默认外观。再次注入和卸载都先断开，避免叠 observer。
  function disconnectSchemeObservers() {
    if (window.__ag_scheme_observer) {
      try {
        window.__ag_scheme_observer.disconnect();
      } catch (e) {}
      window.__ag_scheme_observer = null;
    }
    if (window.__ag_scheme_body_wait) {
      try {
        window.__ag_scheme_body_wait.disconnect();
      } catch (e) {}
      window.__ag_scheme_body_wait = null;
    }
    window.__ag_ns_on_patch_fn = null;
  }

  // 若用户在 user/config.json 中将 enabled 设为 false，执行无损卸载还原
  if (!ENABLED) {
    const s1 = document.getElementById('ag-custom-fonts');
    if (s1) s1.remove();
    const s2 = document.getElementById('antigravity-user-custom-style');
    if (s2) s2.remove();
    const pill = document.getElementById('ag-live-metrics-pill');
    if (pill) pill.remove();
    const tt = document.getElementById('ag-live-metrics-tooltip');
    if (tt) tt.remove();
    if (window.__ag_i18n_observer) {
      try {
        window.__ag_i18n_observer.disconnect();
      } catch (e) {}
      window.__ag_i18n_observer = null;
    }
    if (window.__ag_metrics_route_watcher) {
      try {
        clearInterval(window.__ag_metrics_route_watcher);
      } catch (e) {}
      window.__ag_metrics_route_watcher = null;
    }
    if (window.__ag_metrics_ro) {
      try {
        window.__ag_metrics_ro.disconnect();
      } catch (e) {}
      window.__ag_metrics_ro = null;
      window.__ag_metrics_ro_target = null;
    }
    applyThemeVars({});
    disconnectSchemeObservers();
    document.documentElement.removeAttribute('data-ag-preset');
    document.documentElement.removeAttribute('data-ag-appearance');
    document.documentElement.removeAttribute('data-ag-scheme');
    document.documentElement.removeAttribute('data-ag-page-type');
    document.documentElement.removeAttribute('data-ag-wax-seal');
    document.documentElement.removeAttribute('data-ag-font-ui');
    document.documentElement.removeAttribute('data-ag-font-code');
    restoreAllTranslations(document.body);
    window.__ag_patch_version = PATCH_VERSION + '-disabled';
    return;
  }

  if (document.documentElement.getAttribute('data-ag-font-ui') !== FONT_UI) {
    document.documentElement.setAttribute('data-ag-font-ui', FONT_UI);
  }
  if (document.documentElement.getAttribute('data-ag-font-code') !== FONT_CODE) {
    document.documentElement.setAttribute('data-ag-font-code', FONT_CODE);
  }

  // ============================================================================
  // 1. 注入更纱黑体与主题样式（#ag-custom-fonts 与独立 #antigravity-user-custom-style）
  // ============================================================================
  const headTarget = document.head || document.getElementsByTagName('head')[0] || document.documentElement;

  let style = document.getElementById('ag-custom-fonts');
  if (!style) {
    style = document.createElement('style');
    style.id = 'ag-custom-fonts';
    if (headTarget) headTarget.appendChild(style);
  }
  if (style && style.textContent !== CSS_TEXT) {
    style.textContent = CSS_TEXT;
  }

  let userStyle = document.getElementById('antigravity-user-custom-style');
  if (MODULES.customCss && CUSTOM_CSS_TEXT.trim()) {
    if (!userStyle) {
      userStyle = document.createElement('style');
      userStyle.id = 'antigravity-user-custom-style';
      if (headTarget) headTarget.appendChild(userStyle);
    }
    if (userStyle.textContent !== CUSTOM_CSS_TEXT) {
      userStyle.textContent = CUSTOM_CSS_TEXT;
    }
  } else if (userStyle) {
    userStyle.remove();
  }

  document.documentElement.setAttribute('data-ag-wax-seal', MODULES.composerWaxSeal === false ? 'off' : 'on');
  const detectedOs =
    boot.platform || (/Win/i.test(navigator.platform || '') ? 'win32' : /Mac/i.test(navigator.platform || '') ? 'darwin' : 'linux');
  document.documentElement.setAttribute('data-ag-os', detectedOs);

  // ============================================================================
  // 2. 防死锁守护：Antigravity 原生 TanStack Router 缺陷修复（支持热重载更新回调）
  // ============================================================================
  window.__ag_settings_click_fn = (e) => {
    if (MODULES.deadlockHealer === false) return;
    const btn = e.target && e.target.closest && e.target.closest('[data-testid="settings-button"]');
    if (!btn) return;

    const hasDialog = !!document.querySelector('[role="dialog"]');
    const urlHasSettings = window.location.search.includes('settingsOpen=true');

    if (!hasDialog && urlHasSettings) {
      const url = new URL(window.location.href);
      url.searchParams.delete('settingsOpen');
      url.searchParams.delete('settingsScreen');
      window.history.replaceState(window.history.state, '', url.toString());
    }
  };

  if (!window.__ag_settings_guard_installed) {
    window.__ag_settings_guard_installed = true;
    document.addEventListener(
      'click',
      (e) => {
        if (typeof window.__ag_settings_click_fn === 'function') {
          window.__ag_settings_click_fn(e);
        }
      },
      true
    );
  }

  // ============================================================================
  // 2.1 缩放快捷键原生缺陷修复（macOS: Cmd + -/=/0，Windows/Linux: Ctrl + -/=/0）
  // ============================================================================
  window.__ag_zoom_keydown_fn = (e) => {
    if (MODULES.deadlockHealer === false) return;
    const isMac = detectedOs === 'darwin';
    const modKey = isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
    if (modKey && !e.altKey) {
      if (!e.shiftKey && (e.key === '-' || e.code === 'Minus' || e.code === 'NumpadSubtract' || e.keyCode === 189)) {
        e.preventDefault();
        e.stopPropagation();
        window.electronNative?.zoomOut?.();
      } else if (e.key === '=' || e.key === '+' || e.code === 'Equal' || e.code === 'NumpadAdd' || e.keyCode === 187) {
        e.preventDefault();
        e.stopPropagation();
        window.electronNative?.zoomIn?.();
      } else if (!e.shiftKey && (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0' || e.keyCode === 48)) {
        e.preventDefault();
        e.stopPropagation();
        window.electronNative?.zoomReset?.();
      }
    }
  };

  if (!window.__ag_zoom_guard_installed) {
    window.__ag_zoom_guard_installed = true;
    window.addEventListener(
      'keydown',
      (e) => {
        if (typeof window.__ag_zoom_keydown_fn === 'function') {
          window.__ag_zoom_keydown_fn(e);
        }
      },
      true
    );
  }

  // ============================================================================
  // 3. 专属色彩预设状态联动（仅在默认 Appearance 下接管主题色，零轮询实时退让非默认主题）
  // ============================================================================
  const PRESETS = {
    HIGH_CONTRAST: 'high-contrast',
    CLAUDE_PUREWHITE: 'claude-desktop-purewhite',
    VINTAGE_DEEP: 'vintage-deep',
    LEGACY_WARM_WHITE: 'chuanban-warm-white',
    LEGACY_OFFICIAL: 'claude-desktop-official',
    LEGACY_CHUANBAN: 'absoulutely-chuanban'
  };

  const ALL_CUSTOM_PRESET_NAMES = new Set(Object.values(PRESETS));

  const STOCK_SEEDS = {
    light: {
      '--background': new Set(['#ffffff', '#f9f9f9']),
      '--foreground': new Set(['#0a0a0c', '#000000', '#101010']),
      '--primary': new Set(['#2f75c3', '#2560a3', '#007acc'])
    },
    dark: {
      '--background': new Set(['#070708', '#050507', '#101010']),
      '--foreground': new Set(['#ffffff', '#cccccc']),
      '--primary': new Set(['#2f71e3', '#007acc'])
    }
  };

  if (!window.__ag_ns_presets) {
    window.__ag_ns_presets = Object.create(null);
  }

  // 当用户在 user/config.json 中修改了 preset 时，同步刷新 localStorage 中的 theme-color-flavor
  if (DEFAULT_PRESET && window.__ag_last_boot_preset !== DEFAULT_PRESET) {
    window.__ag_last_boot_preset = DEFAULT_PRESET;
    try {
      Storage.prototype.setItem.call(localStorage, 'theme-color-flavor', DEFAULT_PRESET);
    } catch (e) {}
  }

  function resolveHostScheme() {
    try {
      const hostTheme = new URLSearchParams(window.location.search || '').get('hostTheme');
      if (hostTheme === 'dark' || hostTheme === 'light') return hostTheme;
    } catch (e) {}
    const body = document.body;
    const root = document.documentElement;
    if ((body && body.classList.contains('theme-dark')) || root.classList.contains('theme-dark')) return 'dark';
    if ((body && body.classList.contains('theme-light')) || root.classList.contains('theme-light')) return 'light';
    try {
      const stored = Storage.prototype.getItem.call(localStorage, 'theme-mode');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch (e) {}
    return 'light';
  }

  function resolveAgScheme() {
    if (BOOT_SCHEME === 'light' || BOOT_SCHEME === 'dark') return BOOT_SCHEME;
    return resolveHostScheme();
  }

  function isStockPresetName(name, hostScheme) {
    if (name === undefined || name === null || name === '' || name === 'Default') return true;
    if (ALL_CUSTOM_PRESET_NAMES.has(name)) return true;
    return hostScheme === 'dark' ? name === 'Default Dark' : name === 'Default Light';
  }

  function isDefaultAppearance(hostScheme) {
    try {
      const body = document.body;
      if (window.top !== window && isAgentPanelWindow() && (!body || !body.hasAttribute('data-agy-theme'))) {
        return true;
      }
      // Legacy Light / Legacy Dark 在 NewUX 下会移除 data-agy-home-glow
      if (body && body.hasAttribute('data-agy-theme') && !body.hasAttribute('data-agy-home-glow')) {
        return false;
      }

      const seedSets = hostScheme === 'dark' ? STOCK_SEEDS.dark : STOCK_SEEDS.light;
      const seedProps = ['--background', '--foreground', '--primary'];
      const styleEl = document.documentElement.style;
      let checkedLiveSeeds = 0;

      for (let i = 0; i < seedProps.length; i++) {
        const prop = seedProps[i];
        if (
          Object.prototype.hasOwnProperty.call(THEME_VARS, prop) &&
          THEME_VARS[prop] !== null &&
          THEME_VARS[prop] !== undefined &&
          String(THEME_VARS[prop]).trim() !== ''
        ) {
          continue;
        }
        const raw = styleEl.getPropertyValue(prop).trim().toLowerCase();
        if (!raw || raw.startsWith('var(')) continue;
        checkedLiveSeeds++;
        if (!seedSets[prop].has(raw)) {
          return false;
        }
      }

      if (checkedLiveSeeds === 3) {
        return true;
      }

      const presetKey = hostScheme === 'dark' ? 'theme-preset-dark' : 'theme-preset-light';
      let storedPreset;
      if (window.__ag_ns_presets && presetKey in window.__ag_ns_presets) {
        storedPreset = window.__ag_ns_presets[presetKey];
      } else {
        try {
          storedPreset = Storage.prototype.getItem.call(localStorage, presetKey);
        } catch (e) {}
      }
      return isStockPresetName(storedPreset, hostScheme);
    } catch (e) {
      return true;
    }
  }

  function resolveTargetPreset() {
    let flavor = DEFAULT_PRESET || PRESETS.HIGH_CONTRAST;
    try {
      const stored = Storage.prototype.getItem.call(localStorage, 'theme-preset-light');
      if (ALL_CUSTOM_PRESET_NAMES.has(stored)) {
        try {
          Storage.prototype.setItem.call(localStorage, 'theme-preset-light', 'Default Light');
        } catch (e) {}
      }
      flavor = Storage.prototype.getItem.call(localStorage, 'theme-color-flavor') || flavor;
    } catch (e) {}

    if (flavor === PRESETS.CLAUDE_PUREWHITE || flavor === PRESETS.LEGACY_OFFICIAL || flavor === 'ClaudeDesktop 净白') {
      return PRESETS.CLAUDE_PUREWHITE;
    }
    if (flavor === PRESETS.VINTAGE_DEEP || flavor === PRESETS.LEGACY_CHUANBAN || flavor === '复古深色') {
      return PRESETS.VINTAGE_DEEP;
    }
    return PRESETS.HIGH_CONTRAST;
  }

  function syncChuanbanScheme() {
    try {
      const next = resolveAgScheme();
      if (document.documentElement.getAttribute('data-ag-scheme') !== next) {
        document.documentElement.setAttribute('data-ag-scheme', next);
      }
    } catch (e) {}
  }

  function syncChuanbanPreset() {
    try {
      const hostScheme = resolveHostScheme();
      const effectiveScheme = BOOT_SCHEME === 'light' || BOOT_SCHEME === 'dark' ? BOOT_SCHEME : hostScheme;
      if (document.documentElement.getAttribute('data-ag-scheme') !== effectiveScheme) {
        document.documentElement.setAttribute('data-ag-scheme', effectiveScheme);
      }

      const isDefault = isDefaultAppearance(hostScheme);
      const nextAppearance = isDefault ? 'default' : 'custom';
      if (document.documentElement.getAttribute('data-ag-appearance') !== nextAppearance) {
        document.documentElement.setAttribute('data-ag-appearance', nextAppearance);
      }

      if (isDefault) {
        const targetPreset = resolveTargetPreset();
        if (document.documentElement.getAttribute('data-ag-preset') !== targetPreset) {
          document.documentElement.setAttribute('data-ag-preset', targetPreset);
        }
        applyThemeVars(THEME_VARS, true);
      } else {
        if (document.documentElement.hasAttribute('data-ag-preset')) {
          document.documentElement.removeAttribute('data-ag-preset');
        }
        applyThemeVars(THEME_VARS, false);
      }
    } catch (e) {}
  }

  function installSchemeObserver() {
    disconnectSchemeObservers();
    const root = document.documentElement;
    if (!root || typeof MutationObserver !== 'function') return;
    const obs = new MutationObserver(() => {
      syncChuanbanPreset();
    });
    window.__ag_scheme_observer = obs;
    try {
      obs.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
    } catch (e) {}
    const bodyAttrFilter = ['class', 'data-agy-theme', 'data-agy-home-glow'];
    if (document.body) {
      try {
        obs.observe(document.body, { attributes: true, attributeFilter: bodyAttrFilter });
      } catch (e) {}
      return;
    }
    const wait = new MutationObserver(() => {
      if (!document.body) return;
      try {
        wait.disconnect();
      } catch (e) {}
      if (window.__ag_scheme_body_wait !== wait) return;
      window.__ag_scheme_body_wait = null;
      try {
        obs.observe(document.body, { attributes: true, attributeFilter: bodyAttrFilter });
      } catch (e) {}
      syncChuanbanPreset();
    });
    window.__ag_scheme_body_wait = wait;
    try {
      wait.observe(root, { childList: true });
    } catch (e) {
      window.__ag_scheme_body_wait = null;
    }
  }

  window.__ag_sync_preset_fn = syncChuanbanPreset;
  window.__ag_ns_on_patch_fn = (patch) => {
    if (!patch || typeof patch !== 'object') return;
    let touched = false;
    if ('theme-preset-light' in patch) {
      window.__ag_ns_presets['theme-preset-light'] = patch['theme-preset-light'];
      touched = true;
    }
    if ('theme-preset-dark' in patch) {
      window.__ag_ns_presets['theme-preset-dark'] = patch['theme-preset-dark'];
      touched = true;
    }
    if (touched && typeof window.__ag_sync_preset_fn === 'function') {
      window.__ag_sync_preset_fn();
    }
  };

  if (!window.__ag_ns_hook_installed && window.nativeStorage) {
    window.__ag_ns_hook_installed = true;
    try {
      if (typeof window.nativeStorage.onChanged === 'function') {
        window.nativeStorage.onChanged((patch) => {
          if (typeof window.__ag_ns_on_patch_fn === 'function') {
            window.__ag_ns_on_patch_fn(patch);
          }
        });
      }
      if (typeof window.nativeStorage.updateItems === 'function') {
        const origUpdate = window.nativeStorage.updateItems.bind(window.nativeStorage);
        window.nativeStorage.updateItems = function (patch) {
          try {
            if (typeof window.__ag_ns_on_patch_fn === 'function') {
              window.__ag_ns_on_patch_fn(patch);
            }
          } catch (e) {}
          return origUpdate(patch);
        };
      }
    } catch (e) {}
  }

  if (window.nativeStorage && typeof window.nativeStorage.getItems === 'function') {
    try {
      Promise.resolve(window.nativeStorage.getItems())
        .then((items) => {
          if (!items || typeof items !== 'object') return;
          if ('theme-preset-light' in items) {
            window.__ag_ns_presets['theme-preset-light'] = items['theme-preset-light'];
          }
          if ('theme-preset-dark' in items) {
            window.__ag_ns_presets['theme-preset-dark'] = items['theme-preset-dark'];
          }
          if (typeof window.__ag_sync_preset_fn === 'function') {
            window.__ag_sync_preset_fn();
          }
        })
        .catch(() => {});
    } catch (e) {}
  }

  if (!window.__ag_preset_hook_installed) {
    window.__ag_preset_hook_installed = true;
    try {
      const origGetItem = localStorage.getItem.bind(localStorage);
      localStorage.getItem = function (key) {
        const val = origGetItem(key);
        if (key === 'theme-preset-light' && ALL_CUSTOM_PRESET_NAMES.has(val)) {
          return 'Default Light';
        }
        return val;
      };

      const origSetItem = localStorage.setItem.bind(localStorage);
      localStorage.setItem = function (key, val) {
        if (key === 'theme-preset-light' && ALL_CUSTOM_PRESET_NAMES.has(val)) {
          val = 'Default Light';
        }
        origSetItem(key, val);
        if (
          key === 'theme-preset-light' ||
          key === 'theme-preset-dark' ||
          key === 'theme-mode' ||
          key === 'theme-color-flavor'
        ) {
          setTimeout(() => {
            if (typeof window.__ag_sync_preset_fn === 'function') window.__ag_sync_preset_fn();
          }, 50);
        }
      };
    } catch (e) {}
  }

  syncChuanbanPreset();
  installSchemeObserver();
  window.__ag_patch_version = PATCH_VERSION;

  // ============================================================================
  // 3.5 模型名称同行实时指标胶囊 (Scheme C: TPS · TTFT · Ctx/256k · Out + Hover 详情卡)
  // 严格保证「左(模型) - 中(指标胶囊) - 右(模式与发送)」三栏结构；中间过窄(<150px)时物理跳至下方第二行。
  // ============================================================================
  const MIDDLE_MIN_WIDTH_PX = 150;

  function extractCascadeId() {
    try {
      const m = window.location.pathname.match(/\/c\/([0-9a-f-]{36})/i);
      if (m) return m[1];
      const q = new URLSearchParams(window.location.search).get('cascadeId');
      if (q && /^[0-9a-f-]{36}$/i.test(q)) return q;
      const selected = document.querySelector('[data-testid=conversation-row-sidebar][data-selected=true]');
      if (selected) {
        const cid = selected.getAttribute('data-cascade-id');
        if (cid && /^[0-9a-f-]{36}$/i.test(cid)) return cid;
      }
    } catch (e) {}
    return '';
  }

  function ensureMetricsTooltip() {
    let tt = document.getElementById('ag-live-metrics-tooltip');
    if (!tt && document.body) {
      tt = document.createElement('div');
      tt.id = 'ag-live-metrics-tooltip';
      document.body.appendChild(tt);
    } else if (tt && tt.parentElement !== document.body && document.body) {
      document.body.appendChild(tt);
    }
    if (tt && tt.getAttribute('role') !== 'tooltip') {
      tt.setAttribute('role', 'tooltip');
    }
    return tt;
  }

  function showMetricsTooltip(pill) {
    if (!pill) return;
    const tt = ensureMetricsTooltip();
    if (!tt || !tt.innerHTML) return;
    const r = pill.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    const ttWidth = Math.min(456, Math.max(368, tt.offsetWidth || 410));
    const left = Math.max(12, Math.min(r.left, window.innerWidth - ttWidth - 16));
    const bottomPx = Math.min(window.innerHeight - r.top + 8, window.innerHeight - (tt.offsetHeight || 220) - 12);
    tt.style.left = left + 'px';
    tt.style.bottom = Math.max(8, bottomPx) + 'px';
    tt.setAttribute('data-visible', '1');
  }

  function hideMetricsTooltip() {
    const tt = document.getElementById('ag-live-metrics-tooltip');
    if (tt) tt.removeAttribute('data-visible');
  }

  window.__ag_show_metrics_tooltip = showMetricsTooltip;
  window.__ag_hide_metrics_tooltip = hideMetricsTooltip;

  function findFooterRow(box) {
    if (!box) return null;
    const rows = box.querySelectorAll('div.flex.w-full.items-center.justify-between');
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      if (r.querySelector('[data-testid="model-selector-trigger"], [data-testid="send-button"]')) {
        return r;
      }
    }
    return rows[rows.length - 1] || null;
  }

  function measureNaturalLeftWidth(leftGroup) {
    let w = 0;
    for (let i = 0; i < leftGroup.children.length; i++) {
      const ch = leftGroup.children[i];
      if (ch.id === 'ag-live-metrics-pill') continue;
      const cw = Math.max(ch.offsetWidth || 0, ch.scrollWidth || 0);
      if (cw > 0) w += cw;
    }
    return w;
  }

  function ensureMetricsPill(forceLayout = false) {
    // 清理旧版残留的 ResizeObserver，防止新旧 Observer 互相抢夺 DOM 节点引发高度震荡
    if (window.__ag_pill_resize_observer) {
      try {
        window.__ag_pill_resize_observer.disconnect();
      } catch (e) {}
      window.__ag_pill_resize_observer = null;
    }
    if (!MODULES.metrics) {
      const existing = document.getElementById('ag-live-metrics-pill');
      if (existing) existing.style.display = 'none';
      return null;
    }
    const box = document.getElementById(SELECTORS.inputBoxId);
    if (!box) return null;
    const bottomRow = findFooterRow(box);
    if (!bottomRow || !bottomRow.children[0]) return null;
    const leftGroup = bottomRow.children[0];
    const rightGroup = bottomRow.children[1] || null;

    // 清理旧版残留类名与内联 flex 样式
    if (bottomRow.classList.contains('ag-footer-row-wrap')) {
      bottomRow.classList.remove('ag-footer-row-wrap');
    }
    if (leftGroup.style.flex) leftGroup.style.removeProperty('flex');
    if (rightGroup && rightGroup.style.flex) rightGroup.style.removeProperty('flex');

    let pill = document.getElementById('ag-live-metrics-pill');
    if (pill && (pill.classList.contains('ag-pill-middle') || pill.classList.contains('ag-pill-wrapped'))) {
      pill.classList.remove('ag-pill-middle', 'ag-pill-wrapped');
    }
    let isNewPill = false;
    let preservedHtml = '';
    let preservedDisplay = '';
    if (pill && pill.getAttribute('data-v') !== '4') {
      const oldText = pill.querySelector('#ag-live-metrics-text');
      preservedHtml = oldText ? oldText.innerHTML : '';
      preservedDisplay = pill.style.display || '';
      const fresh = document.createElement('div');
      pill.replaceWith(fresh);
      pill = fresh;
      isNewPill = true;
    } else if (!pill) {
      pill = document.createElement('div');
      isNewPill = true;
    }
    if (isNewPill) {
      pill.id = 'ag-live-metrics-pill';
      pill.setAttribute('data-v', '4');
      pill.tabIndex = 0;
      pill.setAttribute('role', 'status');
      pill.setAttribute('aria-live', 'off');
      pill.setAttribute('aria-label', 'Session live metrics');
      pill.setAttribute('aria-describedby', 'ag-live-metrics-tooltip');
      pill.innerHTML = '<span id="ag-live-metrics-text"></span>';
      if (preservedHtml) {
        const textNode = pill.querySelector('#ag-live-metrics-text');
        if (textNode) textNode.innerHTML = preservedHtml;
      }
      if (preservedDisplay) {
        pill.style.display = preservedDisplay;
      }
      pill.addEventListener('mouseenter', () => {
        if (typeof window.__ag_show_metrics_tooltip === 'function') {
          window.__ag_show_metrics_tooltip(pill);
        }
      });
      pill.addEventListener('mouseleave', () => {
        if (document.activeElement === pill) return;
        if (typeof window.__ag_hide_metrics_tooltip === 'function') {
          window.__ag_hide_metrics_tooltip();
        }
      });
      pill.addEventListener('focus', () => {
        if (typeof window.__ag_show_metrics_tooltip === 'function') {
          window.__ag_show_metrics_tooltip(pill);
        }
      });
      pill.addEventListener('blur', () => {
        if (typeof window.__ag_hide_metrics_tooltip === 'function') {
          window.__ag_hide_metrics_tooltip();
        }
      });
      pill.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' || ev.key === 'Esc') {
          const tt = document.getElementById('ag-live-metrics-tooltip');
          if (tt && tt.getAttribute('data-visible') === '1') {
            ev.stopPropagation();
            if (typeof window.__ag_hide_metrics_tooltip === 'function') {
              window.__ag_hide_metrics_tooltip();
            }
          }
        }
      });
    }

    if (
      typeof ResizeObserver !== 'undefined' &&
      (window.__ag_metrics_ro_target !== bottomRow || window.__ag_metrics_ro_ver !== PATCH_VERSION)
    ) {
      if (window.__ag_metrics_ro) {
        try {
          window.__ag_metrics_ro.disconnect();
        } catch (e) {}
      }
      window.__ag_metrics_ro_target = bottomRow;
      window.__ag_metrics_ro_ver = PATCH_VERSION;
      window.__ag_last_row_width = -1;
      window.__ag_metrics_ro = new ResizeObserver(() => {
        if (window.__ag_metrics_raf) return;
        window.__ag_metrics_raf = requestAnimationFrame(() => {
          window.__ag_metrics_raf = 0;
          const w = bottomRow.clientWidth || 0;
          if (w > 0 && Math.abs(w - (window.__ag_last_row_width || 0)) >= 1) {
            window.__ag_last_row_width = w;
            if (typeof window.__ag_ensure_metrics_pill_fn === 'function') {
              window.__ag_ensure_metrics_pill_fn(true);
            }
          }
        });
      });
      window.__ag_metrics_ro.observe(bottomRow);
    }

    const isMountedHere =
      pill.parentElement === leftGroup || (bottomRow.parentElement && pill.parentElement === bottomRow.parentElement);
    if (!forceLayout && !isNewPill && isMountedHere) {
      return pill;
    }

    const rowW = bottomRow.clientWidth || 0;
    window.__ag_last_row_width = rowW;
    const leftW = measureNaturalLeftWidth(leftGroup);
    const rightW = rightGroup ? rightGroup.offsetWidth || 0 : 0;
    const availMiddleW = rowW - leftW - rightW - 14;
    const useBottomRow = rowW > 0 && availMiddleW < MIDDLE_MIN_WIDTH_PX;
    const rowMode = useBottomRow ? 'bottom' : 'middle';

    if (bottomRow.getAttribute('data-ag-row-mode') !== rowMode) {
      bottomRow.setAttribute('data-ag-row-mode', rowMode);
    }
    if (pill.getAttribute('data-ag-row-mode') !== rowMode) {
      pill.setAttribute('data-ag-row-mode', rowMode);
    }

    if (useBottomRow) {
      const cardParent = bottomRow.parentElement;
      if (cardParent && (pill.parentElement !== cardParent || pill.previousElementSibling !== bottomRow)) {
        bottomRow.after(pill);
      }
    } else {
      if (pill.parentElement !== leftGroup) {
        leftGroup.appendChild(pill);
      }
    }

    return pill;
  }

  window.__ag_ensure_metrics_pill_fn = ensureMetricsPill;

  function resolveMetricsLang() {
    if (METRICS_LANG === 'zh' || METRICS_LANG === 'en') return METRICS_LANG;
    if (MODULES.i18n) return 'zh';
    const docLang = (document.documentElement && document.documentElement.lang) || '';
    return /^zh\b/i.test(docLang) ? 'zh' : 'en';
  }

  window.__ag_render_metrics = function (payload) {
    try {
      if (!MODULES.metrics) return;
      window.__ag_last_metrics = payload;
      const currentId = extractCascadeId();
      const pill = ensureMetricsPill(false);
      const ttEl = ensureMetricsTooltip();
      if (!pill) return;
      if (!currentId || !payload || !payload.hasData || payload.cascadeId !== currentId) {
        if (pill.style.display !== 'none') pill.style.display = 'none';
        if (ttEl) ttEl.removeAttribute('data-visible');
        return;
      }
      const lang = resolveMetricsLang();
      const localized = payload.i18n && payload.i18n[lang] ? payload.i18n[lang] : payload;
      const nextInlineHtml = localized.inlineHtml || payload.inlineHtml || '';
      const nextTooltipHtml = localized.tooltipHtml || payload.tooltipHtml || '';
      const nextAriaLabel = lang === 'zh' ? '会话实时遥测指标' : 'Session live metrics';
      if (pill.getAttribute('aria-label') !== nextAriaLabel) {
        pill.setAttribute('aria-label', nextAriaLabel);
      }
      const ctxState = payload.ctxState || 'ok';
      if (pill.getAttribute('data-ctx-state') !== ctxState) {
        pill.setAttribute('data-ctx-state', ctxState);
      }
      if (ttEl && ttEl.getAttribute('data-ctx-state') !== ctxState) {
        ttEl.setAttribute('data-ctx-state', ctxState);
      }
      const textEl = pill.querySelector('#ag-live-metrics-text');
      let textChanged = false;
      if (textEl && textEl.innerHTML !== nextInlineHtml) {
        textEl.innerHTML = nextInlineHtml;
        textChanged = true;
      }
      if (ttEl && ttEl.innerHTML !== nextTooltipHtml) {
        ttEl.innerHTML = nextTooltipHtml;
      }
      if (pill.style.display !== 'inline-flex') {
        pill.style.display = 'inline-flex';
        textChanged = true;
      }
      if (textChanged) {
        ensureMetricsPill(true);
      }
      if (ttEl && ttEl.getAttribute('data-visible') === '1' && typeof window.__ag_show_metrics_tooltip === 'function') {
        window.__ag_show_metrics_tooltip(pill);
      }
    } catch (e) {}
  };

  window.__ag_update_live_metrics = window.__ag_render_metrics;
  if (window.__ag_last_metrics && window.__ag_last_metrics.hasData) {
    window.__ag_render_metrics(window.__ag_last_metrics);
  }

  function checkRouteAndMountMetrics() {
    try {
      if (document.hidden) return;
      const box = document.getElementById(SELECTORS.inputBoxId);
      const hasBranchPillInBox = !!(box && box.querySelector(SELECTORS.branchPillInBox));
      const isHome =
        hasBranchPillInBox ||
        !!document.querySelector(SELECTORS.homeGreeting) ||
        window.location.pathname === '/' ||
        !window.location.pathname.startsWith('/c/');
      const pageType = isHome ? 'home' : 'chat';
      if (document.documentElement.getAttribute('data-ag-page-type') !== pageType) {
        document.documentElement.setAttribute('data-ag-page-type', pageType);
      }
      if (document.body && document.body.hasAttribute('data-ag-page-type')) {
        document.body.removeAttribute('data-ag-page-type');
      }

      if (!MODULES.metrics) {
        const existing = document.getElementById('ag-live-metrics-pill');
        if (existing) existing.style.display = 'none';
        return;
      }

      const cid = extractCascadeId();
      if (!cid) {
        window.__ag_watched_cascade_id = '';
        const pill = document.getElementById('ag-live-metrics-pill');
        if (pill && pill.style.display !== 'none') {
          pill.style.display = 'none';
        }
        const ttEl = document.getElementById('ag-live-metrics-tooltip');
        if (ttEl) ttEl.removeAttribute('data-visible');
        return;
      }

      if (cid !== window.__ag_watched_cascade_id) {
        window.__ag_watched_cascade_id = cid;
        const pill = document.getElementById('ag-live-metrics-pill');
        if (pill && (!window.__ag_last_metrics || window.__ag_last_metrics.cascadeId !== cid)) {
          pill.style.display = 'none';
        }
        if (typeof window.__agRequestMetrics === 'function') {
          try {
            window.__agRequestMetrics(cid);
          } catch (e) {}
        }
        if (typeof window.__ag_on_session_change === 'function') {
          try {
            window.__ag_on_session_change(cid);
          } catch (e) {}
        }
      } else if (window.__ag_last_metrics && window.__ag_last_metrics.cascadeId === cid) {
        const pill = ensureMetricsPill(false);
        if (pill && window.__ag_last_metrics.hasData && pill.style.display === 'none') {
          window.__ag_render_metrics(window.__ag_last_metrics);
        }
      }
    } catch (e) {}
  }

  if (!window.__ag_history_hook_installed) {
    window.__ag_history_hook_installed = true;
    const triggerRouteCheck = () => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (typeof window.__ag_check_route_fn === 'function') window.__ag_check_route_fn();
        }, 0);
      });
      setTimeout(() => {
        if (typeof window.__ag_check_route_fn === 'function') window.__ag_check_route_fn();
      }, 120);
    };
    const wrapHistory = (type) => {
      const orig = history[type];
      if (typeof orig !== 'function') return;
      history[type] = function (...args) {
        const ret = orig.apply(this, args);
        triggerRouteCheck();
        return ret;
      };
    };
    wrapHistory('pushState');
    wrapHistory('replaceState');
    window.addEventListener('popstate', triggerRouteCheck);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && typeof window.__ag_check_route_fn === 'function') {
        window.__ag_check_route_fn();
      }
    });
  }

  window.__ag_check_route_fn = checkRouteAndMountMetrics;

  if (window.__ag_metrics_route_watcher) {
    try {
      clearInterval(window.__ag_metrics_route_watcher);
    } catch (e) {}
    window.__ag_metrics_route_watcher = null;
  }
  window.__ag_metrics_route_watcher = setInterval(checkRouteAndMountMetrics, 1500);
  checkRouteAndMountMetrics();

  // ============================================================================
  // 4. 高性能界面汉化引擎（无原型词典 + WeakMap 热重载还原 + 单遍扫描 + 首字符分流）
  // ============================================================================
  if (window.__ag_i18n_observer) {
    try {
      window.__ag_i18n_observer.disconnect();
    } catch (e) {}
    window.__ag_i18n_observer = null;
  }

  const DICT = Object.assign(Object.create(null), boot.i18nDict || {});
  window.__ag_i18n_dict = DICT;

  if (MODULES.i18n) {
    const EXCLUDE_SELECTOR = SELECTORS.excludeI18n;

    // 预编译模块级正则常量，消除热路径重复编译与二次匹配
    const RE_HAS_CJK = /[\u4e00-\u9fa5]/;
    const RE_PURE_ALPHA = /^\s*[a-zA-Z]+\s*$/;
    const RE_HAS_ALPHA = /[a-zA-Z]/;
    const RE_FILES_CHANGED = /^(\d+)\s+files?\s+changed$/i;
    const RE_TOOLS = /^(\d+)\s+tools?$/i;
    const RE_DEMOTED = /^(\d+)\s+demoted$/i;
    const RE_EXCLUDED = /^(\d+)\s+excluded$/i;
    const RE_TOOLS_EXCLUDED = /^(\d+)\s+tools?\s+excluded$/i;
    const RE_ACTIVE_CONVS = /^(\d+)\s+active\s+conversations$/i;
    const RE_SEE_ALL = /^See all\s*\((\d+)\)$/i;
    const RE_SHOW_BREAKDOWNS = /^Show\s+(\d+)\s+breakdowns?$/i;
    const RE_PERM_DELETE = /^Permanently delete\s+(.*)\s+including\s+(\d+)\s+active\s+conversations\.?$/i;
    const RE_WORKED_FOR = /^Worked for\s+(\d+[smhd])$/i;
    const RE_THOUGHT_FOR = /^Thought for\s+(\d+[smhd])$/i;
    const RE_USED_LIMIT = /^You have used (some|all|most) of your (weekly|5-hour|five-hour|daily) limit,?\s*it will fully refresh in (.*)\.?$/i;
    const RE_NOT_USED_LIMIT = /^You have not used any of your (weekly|5-hour|five-hour|daily) limit\.?$/i;
    const RE_ARIA_BRANCH = /^Branch, current:\s*(.*)$/i;
    const RE_ARIA_PROJECT = /^Select project, current:\s*(.*)$/i;

    // 上游新增动态模板。本地已有正则的字面量不在这里重声明。
    const RE_CURLY_APOS = /[\u2018\u2019]/g;
    const RE_REL_TIME = /^(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs|d|w|mo|y|yr|yrs)\s+ago$/i;
    const REL_UNIT_MAP = {
      s: '秒',
      sec: '秒',
      secs: '秒',
      m: '分钟',
      min: '分钟',
      mins: '分钟',
      h: '小时',
      hr: '小时',
      hrs: '小时',
      d: '天',
      w: '周',
      mo: '个月',
      y: '年',
      yr: '年',
      yrs: '年'
    };
    const UNIT_MAP_SHORT = { s: '秒', m: '分钟', h: '小时', d: '天', w: '周', mo: '个月', y: '年', yr: '年' };
    const NAMED_PERIOD_MAP = { weekly: '每周', daily: '每日', monthly: '每月' };
    const MONTH_SHORT_MAP = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12
    };
    const RE_PCT_LEFT = /^(\d+(?:\.\d+)?)%\s*left$/i;
    const RE_WINDOW_LIMIT_COMBINED = /^(\d+)\s*([smhd])\s+limit,\s*resets in\s+(.+)$/i;
    const RE_WINDOW_LIMIT = /^(\d+)\s*([smhd])\s+limit$/i;
    const RE_NAMED_LIMIT_RESETS = /^(Weekly|Daily|Monthly)\s+limit,\s*resets in\s+(.+)$/i;
    const RE_RESETS_IN = /^Resets in\s+(.+)$/i;
    const RE_SEARCH_GOOGLE = /^Search Google for "(.+)"$/;
    const RE_UPDATED_AT =
      /^Updated\s+(?:((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}|\d{1,2}月\d{1,2}日),\s*)?((?:上午|下午)?\s*\d{1,2}:\d{2}(?:\s*[AP]M)?)$/;

    const RE_ARCHIVED_CONVS = /^(\d+)\s+archived\s+conversations?$/i;
    const RE_PINNED_COUNT = /^(\d+)\s+pinned(?:\s+tabs?)?$/i;
    const RE_MODELS_SELECTED = /^(\d+)\s+models?\s+selected$/i;
    const RE_BROWSER_STEPS = /^(\d+)\s+browser\s+steps?$/i;
    const RE_MEDIA_ATTACHMENTS = /^(\d+)\s+(image|audio|video)\s+attachments?$/i;
    const RE_ATTACHMENTS_COUNT = /^(\d+)\s+attachments?$/i;
    const RE_COMMENTS_COUNT = /^(\d+)\s+comments?$/i;
    const RE_INSTALLED_COUNT = /^(\d+)\s+installed$/i;
    const RE_ACCOUNTS_COUNT = /^(\d+)\s+accounts?$/i;
    const RE_UPDATES_COUNT = /^(\d+)\s+updates?$/i;
    const RE_PROJECTS_COUNT = /^(\d+)\s+projects?$/i;
    const RE_CALLS_MB = /^(\d+)\s+calls?\s*·\s*([\d.]+\s*MB)$/i;
    const RE_TASKS_DONE = /^(\d+)\s+of\s+(\d+)\s+tasks?\s+done$/i;
    const RE_POSTS_COUNT = /^(\d+)\s+posts?$/i;
    const RE_MEMBERS_COUNT = /^(\d+)\s+members?$/i;
    const RE_MCP_FAILED_START = /^(\d+)\s+MCP servers?\s+failed to start$/i;
    const RE_UP_NEXT_COUNT = /^Up next\s*·\s*(\d+)$/i;
    const RE_USES_LOCAL_CLONE = /^Uses your local clone,\s+([^\r\n]{1,100})$/;
    const RE_PLUS_ATTACHMENTS = /^\+(\d+)\s+attachments?$/i;
    const RE_PLUS_MORE = /^\+(\d+)\s+more(\s*\(Show all\))?$/i;
    const RE_SHOW_MORE_SUBAGENTS = /^Show\s+(\d+)\s+more\s+subagents?$/i;
    const RE_SHOW_EARLIER_STEPS = /^Show\s+(\d+)\s+earlier\s+steps?$/i;
    const RE_SORT_FILTER_ACTIVE = /^Sort and filter conversations\s*\((\d+)\s+active\)$/i;
    const RE_STILL_THINKING_SEC = /^Still thinking,\s*(\d+)\s*seconds?$/i;
    const RE_MARKED_READ = /^Marked\s+(\d+)\s+conversations?\s+as\s+read$/i;
    const RE_ZIPPING_FOLDER = /^Zipping\s+(.+?)(?:…|\.\.\.)$/i;
    const RE_WORKED_FOR_UPDATES = /^Worked for\s+([<0-9smhd\s]+?)\s*·\s*(\d+)\s+updates?$/i;
    const RE_WAITING_CMD_SEC = /^Waiting for command completion\s*\(up to\s+(\d+)\s+seconds?\)$/i;
    const RE_HOME_HEY_NAME = /^Hey\s+([^\r\n]{1,40}?),\s+what should we build today\?$/i;
    const RE_HOME_WELCOME_NAME = /^Welcome back,\s*([^\r\n]{1,40}?)\.\s+Where should we pick up\?$/i;
    const RE_HOME_GOOD_SEE_NAME = /^Good to see you,\s*([^\r\n]{1,40}?)\.\s+What['\u2019]s next\?$/i;
    const RE_WORK_LOCALLY_ON = /^Work locally on\s+([^\r\n]{1,80})$/;
    const RE_WORK_IN_TARGET = /^Work in\s+(?!a New Worktree$)([^\r\n]{1,80})$/;
    const RE_WORKTREE_FROM = /^Worktree from\s+([^\r\n,]{1,80}?)(?:,\s*and reuse\s+([^\r\n]{1,80}))?$/;
    const RE_AUTO_FIG_WORKSPACE =
      /^Automatically create a new\s+(Fig|Piper|JJ)\s+workspace when the conversation starts(?:,\s*Worktree from\s+([^\r\n,]{1,80}?))?(?:,\s*and reuse\s+([^\r\n]{1,80}))?$/;
    const RE_THINKING_FOR = /^Thinking for\s+([<0-9smhd]+(?:\s+\d+[smhd])*)$/i;
    const RE_USING_BROWSER_SEC = /^Using browser\s*\((\d+)s\)$/i;
    const RE_RUNNING_FOR = /^Running\s+for\s+([<0-9smhd]+(?:\s+\d+[smhd])*)$/i;
    const RE_KEY_QUEUES_AFTER = /^(\S+)\s+Queues after the turn$/i;
    const RE_KEY_SENDS_IMMEDIATELY = /^(\S+)\s+Sends immediately$/i;
    const RE_KEY_EMPTY_NEXT_QUEUE = /^(\S+)\s+On empty prompt,\s*sends next in queue$/i;
    const RE_EPHEMERAL_SUMMARY =
      /^(Explored(?:\s+(?:\d+\s+)?(?:files?|artifacts?)(?:\s+and\s+(?:\d+\s+)?(?:files?|artifacts?))?)?|Ran\s+(?:\d+\s+)?commands?|Edited(?:\s+(?:\d+\s+)?(?:files?|artifacts?)(?:\s+and\s+(?:\d+\s+)?(?:files?|artifacts?))?)?)(?:,\s*(explored(?:\s+(?:\d+\s+)?(?:files?|artifacts?)(?:\s+and\s+(?:\d+\s+)?(?:files?|artifacts?))?)?|ran\s+(?:\d+\s+)?commands?|edited(?:\s+(?:\d+\s+)?(?:files?|artifacts?)(?:\s+and\s+(?:\d+\s+)?(?:files?|artifacts?))?)?))*$/i;
    const EPHEMERAL_CLAUSE_MAP = {
      explored: '已探索',
      'explored file': '已探索文件',
      'explored files': '已探索文件',
      'explored artifact': '已探索 Artifact',
      'explored artifacts': '已探索 Artifact',
      'explored file and artifact': '已探索文件与 Artifact',
      'explored files and artifact': '已探索文件与 Artifact',
      'explored file and artifacts': '已探索文件与 Artifact',
      'explored files and artifacts': '已探索文件与 Artifact',
      'ran command': '已运行命令',
      'ran commands': '已运行命令',
      edited: '已编辑',
      'edited file': '已编辑文件',
      'edited files': '已编辑文件',
      'edited artifact': '已编辑 Artifact',
      'edited artifacts': '已编辑 Artifact',
      'edited file and artifact': '已编辑文件与 Artifact',
      'edited files and artifact': '已编辑文件与 Artifact',
      'edited file and artifacts': '已编辑文件与 Artifact',
      'edited files and artifacts': '已编辑文件与 Artifact'
    };
    const RE_EPHEMERAL_COUNT_CLAUSE = /^(explored|edited|ran)\s+(\d+)\s+(files?|artifacts?|commands?)$/i;
    function translateEphemeralClause(clause) {
      const low = clause.trim().toLowerCase();
      if (EPHEMERAL_CLAUSE_MAP[low]) return EPHEMERAL_CLAUSE_MAP[low];
      const mCount = low.match(RE_EPHEMERAL_COUNT_CLAUSE);
      if (mCount) {
        const vMap = { explored: '已探索', edited: '已编辑', ran: '已运行' };
        const nMap = {
          file: '个文件',
          files: '个文件',
          artifact: '个 Artifact',
          artifacts: '个 Artifact',
          command: '条命令',
          commands: '条命令'
        };
        return vMap[mCount[1]] + ' ' + mCount[2] + ' ' + nMap[mCount[3]];
      }
      return clause.trim();
    }
    const RE_EPHEMERAL_ACTIVE = /^(Editing|Reading|Listing|Searching)\s+(.+)$/;
    const EPHEMERAL_VERB_MAP = {
      Editing: '正在编辑',
      Reading: '正在读取',
      Listing: '正在列出',
      Searching: '正在搜索'
    };
    const EPHEMERAL_NOUN_MAP = {
      file: '文件',
      files: '文件',
      artifact: 'Artifact',
      artifacts: 'Artifact',
      'file and artifact': '文件与 Artifact',
      'files and artifact': '文件与 Artifact',
      'file and artifacts': '文件与 Artifact',
      'files and artifacts': '文件与 Artifact'
    };
    function joinZhVerbNoun(verbZh, nounZh) {
      return /^[A-Za-z0-9]/.test(nounZh) ? verbZh + ' ' + nounZh : verbZh + nounZh;
    }
    const RE_RUNNING_CMD = /^Running\s+(?!commands?\b|processes\b|for\b|\(Dev\b)(.+)$/;
    const RE_DELETED_RECORDINGS = /^Deleted\s+(\d+)\s+recordings?\s*\(([\d.]+\s*MB)\)$/i;
    const RE_DELETE_RECORDINGS_CONFIRM =
      /^This deletes\s+(\d+)\s+call recordings?\s*\(([\d.]+\s*MB)\)\s+from your machine\.\s*You can't undo this\.$/i;
    const RE_ORCHESTRATOR_MODEL = /^Orchestrator\s*\(([^)]+)\)$/i;
    const RE_MODEL_OFFLOAD_DESC =
      /^([A-Za-z0-9 .+-]+?)\s+that may offload routine steps to\s+([A-Za-z0-9 .+-]+?)\.\s*Same\s+([A-Za-z0-9 .+-]+?)-level quality,\s*fewer tokens used\.?$/i;
    const RE_MODEL_REMOVED_ON = /^(.+?)\s+will be removed from Antigravity on\s+(.+?)\.?$/i;
    const RE_MODEL_PERIOD_LIMIT =
      /^(Gemini\b[\w .+-]*|Claude\b[\w .+-]*|GPT\b[\w .+-]*|Orchestrator\b[\w .+()-]*)\s+(Weekly|Daily|Monthly)\s+Limit$/i;
    const RE_QUOTA_RESET_SWITCH =
      /^Your quota for\s+(.+?)\s+will reset on\s+(.+?)\.\s*Switch to another available model to continue\.?$/i;
    const RE_QUOTA_REACHED_SWITCH =
      /^Your quota for\s+(.+?)\s+has been reached\.\s*Switch to another available model to continue\.?$/i;
    const RE_NEED_CREDITS_MODEL =
      /^You need\s+(?:at least\s+(\d+)|more)\s+AI Credits to send messages\.\s*To continue using\s+(.+?)\s+now,\s*purchase more AI Credits\.(?:\s*Your plan's baseline quota will refresh on\s+(.+?)\.)?(?:\s*To continue using this model now,\s*enable AI Credit overages\.)?$/i;
    const RE_BASELINE_QUOTA_REFRESH = /^Your plan's baseline quota will refresh on\s+(.+?)\.?$/i;
    const RE_ARIA_LOCATION = /^(?:Where the agent runs, current|Select location(?:, current)?):\s*(.*)$/i;
    const RE_ARIA_VERSION = /^Version\s+(\d+(?:\.\d+)+(?:-[0-9A-Za-z.-]+)?(?:\s*·\s*[^\r\n]{1,32})?)$/i;
    const RE_ARIA_MODEL = /^(?:Select model|Model(?:\s+selector)?)(?:,\s*current)?:\s*(.*)$/i;
    const RE_ARIA_PERM_SEL =
      /^(?:(?:Permission mode|Agent permissions preset)\s+selector(?:,\s*current)?|(?:Permission mode|Agent permissions preset),\s*current):\s*(.*)$/i;
    const RE_ARIA_PERM_FIXED =
      /^(?:Permission mode|Agent permissions preset):\s*(.+?)(?:\s*,\s*(.+?)|\s+\((cannot be changed[^)]*)\))?$/i;
    const RE_ARIA_TURN = /^(?:Conversation turn\s+(\d+)\s+by\s+(User|Agent|Assistant)|Turn\s+(\d+)\s+of\s+(\d+))$/i;
    const RE_ARIA_GOTO_TURN = /^Go to turn\s+(\d+)\s+of\s+(\d+)$/i;
    const RE_ARIA_LOAD_OLDER = /^(?:Load\s+(\d+)\s+older\s+turns?.*|(Load|No more) older messages,\s*showing\s+(\d+)\s+of\s+(\d+))$/i;
    const RE_EFFORT_SUFFIX =
      /^(.*?)\s*(?:\((Extra\s+High|Low|Medium|High|Extra|XHigh|Max)(?:\s+thinking)?\)|\b(Extra\s+High|Low|Medium|High|Extra|XHigh|Max))(?:\s*·\s*(.+))?\s*$/i;
    const EFFORT_MAP = { low: '低', medium: '中', high: '高', extra: '超高', 'extra high': '超高', xhigh: '超高', max: '最高' };
    const MONTH_FULL_MAP = {
      january: 1,
      february: 2,
      march: 3,
      april: 4,
      may: 5,
      june: 6,
      july: 7,
      august: 8,
      september: 9,
      october: 10,
      november: 11,
      december: 12
    };

    function formatEnglishDateZh(dateStr) {
      const s = String(dateStr || '').trim().replace(/\.$/, '');
      const m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
      if (m) {
        const mon = MONTH_FULL_MAP[m[1].toLowerCase()] || MONTH_SHORT_MAP[m[1].slice(0, 3).toLowerCase()];
        if (mon) return m[3] + ' 年 ' + mon + ' 月 ' + m[2] + ' 日';
      }
      return s + ' ';
    }

    function formatCompactDurationZh(str) {
      const s = String(str || '').trim();
      if (s === '<1m' || s === '< 1m') return '不到 1 分钟';
      return s
        .replace(/(\d+)\s*d\b/gi, '$1 天')
        .replace(/(\d+)\s*h\b/gi, '$1 小时')
        .replace(/(\d+)\s*m\b/gi, '$1 分钟')
        .replace(/(\d+)\s*s\b/gi, '$1 秒')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function formatUpdatedAtZh(datePart, timePart) {
      if (!datePart) return '更新于 ' + timePart.trim();
      const mEnDate = datePart.trim().match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
      if (mEnDate) {
        const mNum = MONTH_SHORT_MAP[mEnDate[1].toLowerCase()];
        if (mNum) {
          return '更新于 ' + mNum + '月' + mEnDate[2] + '日 ' + timePart.trim();
        }
      }
      return '更新于 ' + datePart.trim() + ' ' + timePart.trim();
    }
    function isInHeaderOrBreadcrumb(el) {
      return !!(el && el.closest && el.closest('header, [data-testid="breadcrumb-segment"]'));
    }

    function isExcludedElement(el) {
      if (!el || el.nodeType !== 1) return true;
      return !!el.closest(EXCLUDE_SELECTOR);
    }

    // 精确命中失败后才把弯引号折成直引号。不做大小写不敏感索引。
    function dictExactFold(text) {
      if (!text) return null;
      if (typeof DICT[text] === 'string') return DICT[text];
      if (text.indexOf('\u2018') === -1 && text.indexOf('\u2019') === -1) return null;
      RE_CURLY_APOS.lastIndex = 0;
      const folded = text.replace(RE_CURLY_APOS, "'");
      if (folded === text || typeof DICT[folded] !== 'string') return null;
      return DICT[folded];
    }

    function computeTextTranslation(raw, contextEl) {
      if (!raw) return null;
      const trimmed = raw.trim();
      if (!trimmed) return null;

      // 1. 无原型静态词典 O(1) 精确匹配（附句尾句号自动回退）
      let replacement = DICT[trimmed];
      if (typeof replacement !== 'string' && trimmed.endsWith('.')) {
        const withoutDot = DICT[trimmed.slice(0, -1)];
        if (typeof withoutDot === 'string') {
          replacement = withoutDot.endsWith('。') ? withoutDot : withoutDot + '。';
        }
      }
      if (typeof replacement !== 'string' && (trimmed.indexOf('\u2018') !== -1 || trimmed.indexOf('\u2019') !== -1)) {
        RE_CURLY_APOS.lastIndex = 0;
        const foldedKey = trimmed.replace(RE_CURLY_APOS, "'");
        if (foldedKey !== trimmed) {
          replacement = DICT[foldedKey];
          if (typeof replacement !== 'string' && foldedKey.endsWith('.')) {
            const foldedWithoutDot = DICT[foldedKey.slice(0, -1)];
            if (typeof foldedWithoutDot === 'string') {
              replacement = foldedWithoutDot.endsWith('。') ? foldedWithoutDot : foldedWithoutDot + '。';
            }
          }
        }
      }
      if (typeof replacement === 'string') {
        if (RE_HAS_CJK.test(replacement) && RE_PURE_ALPHA.test(raw)) {
          return replacement;
        }
        return raw.replace(trimmed, replacement);
      }

      // 2. 快速短路：不含任何英文字母直接跳过动态正则
      if (!RE_HAS_ALPHA.test(trimmed)) return null;

      // 3. 首字符 O(1) 分流动态正则匹配
      const c0 = trimmed.charCodeAt(0);
      if (c0 >= 48 && c0 <= 57) {
        // 以数字 '0'-'9' 开头
        if (RE_FILES_CHANGED.test(trimmed)) return raw.replace(RE_FILES_CHANGED, '$1 个文件变更');
        if (RE_TOOLS.test(trimmed)) return raw.replace(RE_TOOLS, '$1 个工具');
        if (RE_DEMOTED.test(trimmed)) return raw.replace(RE_DEMOTED, '$1 项已降级');
        if (RE_EXCLUDED.test(trimmed)) return raw.replace(RE_EXCLUDED, '$1 项已排除');
        if (RE_TOOLS_EXCLUDED.test(trimmed)) return raw.replace(RE_TOOLS_EXCLUDED, '$1 个工具已排除');
        if (RE_ACTIVE_CONVS.test(trimmed)) return raw.replace(RE_ACTIVE_CONVS, '$1 个进行中的会话');
        if (RE_PCT_LEFT.test(trimmed)) return raw.replace(RE_PCT_LEFT, '$1% 剩余');
        const mWinComb = trimmed.match(RE_WINDOW_LIMIT_COMBINED);
        if (mWinComb) {
          const u = UNIT_MAP_SHORT[mWinComb[2].toLowerCase()] || mWinComb[2];
          return raw.replace(trimmed, () => mWinComb[1] + ' ' + u + '限额，' + formatCompactDurationZh(mWinComb[3]) + '后重置');
        }
        const mWin = trimmed.match(RE_WINDOW_LIMIT);
        if (mWin) {
          const u = UNIT_MAP_SHORT[mWin[2].toLowerCase()] || mWin[2];
          return raw.replace(trimmed, () => mWin[1] + ' ' + u + '限额');
        }
        const mRel = trimmed.match(RE_REL_TIME);
        if (mRel) {
          const unit = REL_UNIT_MAP[mRel[2].toLowerCase()] || mRel[2];
          return raw.replace(trimmed, () => mRel[1] + ' ' + unit + '前');
        }
        if (RE_UPDATES_COUNT.test(trimmed)) return raw.replace(RE_UPDATES_COUNT, '$1 条进展');
        if (RE_ARCHIVED_CONVS.test(trimmed)) return raw.replace(RE_ARCHIVED_CONVS, '$1 个已归档对话');
        if (RE_PINNED_COUNT.test(trimmed)) return raw.replace(RE_PINNED_COUNT, '$1 个已固定标签页');
        if (RE_MODELS_SELECTED.test(trimmed)) return raw.replace(RE_MODELS_SELECTED, '已选择 $1 个模型');
        if (RE_BROWSER_STEPS.test(trimmed)) return raw.replace(RE_BROWSER_STEPS, '$1 个浏览器步骤');
        const mMediaAtt = trimmed.match(RE_MEDIA_ATTACHMENTS);
        if (mMediaAtt) {
          const mediaMap = { image: '图片', audio: '音频', video: '视频' };
          const mediaZh = mediaMap[mMediaAtt[2].toLowerCase()] || mMediaAtt[2];
          return raw.replace(trimmed, () => mMediaAtt[1] + ' 个' + mediaZh + '附件');
        }
        if (RE_ATTACHMENTS_COUNT.test(trimmed)) return raw.replace(RE_ATTACHMENTS_COUNT, '$1 个附件');
        if (RE_COMMENTS_COUNT.test(trimmed)) return raw.replace(RE_COMMENTS_COUNT, '$1 条评论');
        if (RE_INSTALLED_COUNT.test(trimmed)) return raw.replace(RE_INSTALLED_COUNT, '已安装 $1 项');
        if (RE_ACCOUNTS_COUNT.test(trimmed)) return raw.replace(RE_ACCOUNTS_COUNT, '$1 个账号');
        if (RE_PROJECTS_COUNT.test(trimmed)) return raw.replace(RE_PROJECTS_COUNT, '$1 个项目');
        if (RE_CALLS_MB.test(trimmed)) return raw.replace(RE_CALLS_MB, '$1 次通话 · $2');
        if (RE_TASKS_DONE.test(trimmed)) return raw.replace(RE_TASKS_DONE, '已完成 $1 / $2 项任务');
        if (RE_POSTS_COUNT.test(trimmed)) return raw.replace(RE_POSTS_COUNT, '$1 条发言');
        if (RE_MEMBERS_COUNT.test(trimmed)) return raw.replace(RE_MEMBERS_COUNT, '$1 名成员');
        if (RE_MCP_FAILED_START.test(trimmed)) return raw.replace(RE_MCP_FAILED_START, '$1 个 MCP 服务器启动失败');
        return null;
      }
      if (c0 === 43) {
        if (RE_PLUS_ATTACHMENTS.test(trimmed)) return raw.replace(RE_PLUS_ATTACHMENTS, '+$1 个附件');
        const mPlusMore = trimmed.match(RE_PLUS_MORE);
        if (mPlusMore) {
          return raw.replace(trimmed, () => (mPlusMore[2] ? '+' + mPlusMore[1] + ' 更多（显示全部）' : '+' + mPlusMore[1] + ' 更多'));
        }
        return null;
      }

      const firstUpper = trimmed[0].toUpperCase();
      if (firstUpper === 'S') {
        if (RE_SEE_ALL.test(trimmed)) return raw.replace(RE_SEE_ALL, '查看全部 ($1)');
        if (RE_SHOW_BREAKDOWNS.test(trimmed)) return raw.replace(RE_SHOW_BREAKDOWNS, '展开明细 ($1 项)');
        if (RE_SHOW_MORE_SUBAGENTS.test(trimmed)) return raw.replace(RE_SHOW_MORE_SUBAGENTS, '显示另外 $1 个子 Agent');
        if (RE_SHOW_EARLIER_STEPS.test(trimmed)) return raw.replace(RE_SHOW_EARLIER_STEPS, '展开前 $1 个步骤');
        if (RE_SORT_FILTER_ACTIVE.test(trimmed)) return raw.replace(RE_SORT_FILTER_ACTIVE, '排序与筛选对话（已启用 $1 项）');
        if (RE_STILL_THINKING_SEC.test(trimmed)) return raw.replace(RE_STILL_THINKING_SEC, '仍在思考（$1 秒）');
        if (RE_SEARCH_GOOGLE.test(trimmed)) return raw.replace(RE_SEARCH_GOOGLE, (_, q) => '使用 Google 搜索“' + q + '”');
        if (!isInHeaderOrBreadcrumb(contextEl)) {
          const mSearch = trimmed.match(RE_EPHEMERAL_ACTIVE);
          if (mSearch) {
            const noun = EPHEMERAL_NOUN_MAP[mSearch[2].toLowerCase()];
            const out = noun ? joinZhVerbNoun(EPHEMERAL_VERB_MAP[mSearch[1]], noun) : EPHEMERAL_VERB_MAP[mSearch[1]] + ' ' + mSearch[2];
            return raw.replace(trimmed, () => out);
          }
        }
      } else if (firstUpper === 'P') {
        if (RE_PERM_DELETE.test(trimmed)) {
          return raw.replace(RE_PERM_DELETE, '永久删除 $1 及 $2 个进行中的会话。');
        }
      } else if (firstUpper === 'W') {
        if (RE_WORKED_FOR_UPDATES.test(trimmed)) {
          return raw.replace(RE_WORKED_FOR_UPDATES, (_, dur, cnt) => '已工作 ' + dur.trim() + ' · ' + cnt + ' 条进展');
        }
        if (RE_WORKED_FOR.test(trimmed)) return raw.replace(RE_WORKED_FOR, '已工作 $1');
        const mNamedW = trimmed.match(RE_NAMED_LIMIT_RESETS);
        if (mNamedW) {
          const pZh = NAMED_PERIOD_MAP[mNamedW[1].toLowerCase()] || mNamedW[1];
          return raw.replace(trimmed, () => pZh + '限额，' + formatCompactDurationZh(mNamedW[2]) + '后重置');
        }
        if (RE_WAITING_CMD_SEC.test(trimmed)) {
          return raw.replace(RE_WAITING_CMD_SEC, '正在等待命令完成（最多 $1 秒）');
        }
        const mWel = trimmed.match(RE_HOME_WELCOME_NAME);
        if (mWel) {
          return raw.replace(trimmed, () => '欢迎回来，' + mWel[1].trim() + '。我们从哪里继续？');
        }
        const mWorkLocal = trimmed.match(RE_WORK_LOCALLY_ON);
        if (mWorkLocal) {
          return raw.replace(trimmed, () => '在本地 ' + mWorkLocal[1].trim() + ' 中工作');
        }
        const mWorkFrom = trimmed.match(RE_WORKTREE_FROM);
        if (mWorkFrom) {
          return raw.replace(
            trimmed,
            () =>
              mWorkFrom[2]
                ? '从 ' + mWorkFrom[1].trim() + ' 创建 Worktree，并复用 ' + mWorkFrom[2].trim()
                : '从 ' + mWorkFrom[1].trim() + ' 创建 Worktree'
          );
        }
        const mWorkIn = trimmed.match(RE_WORK_IN_TARGET);
        if (mWorkIn) {
          return raw.replace(trimmed, () => '在 ' + mWorkIn[1].trim() + ' 中工作');
        }
      } else if (firstUpper === 'T') {
        if (RE_THOUGHT_FOR.test(trimmed)) return raw.replace(RE_THOUGHT_FOR, '已思考 $1');
        if (RE_THINKING_FOR.test(trimmed)) return raw.replace(RE_THINKING_FOR, '已思考 $1');
        if (RE_DELETE_RECORDINGS_CONFIRM.test(trimmed)) {
          return raw.replace(
            RE_DELETE_RECORDINGS_CONFIRM,
            '这将从您的设备中删除 $1 条通话录音（$2），此操作无法撤销。'
          );
        }
      } else if (firstUpper === 'Y') {
        const mUsed = trimmed.match(RE_USED_LIMIT);
        if (mUsed) {
          const degreeMap = { some: '部分', all: '全部', most: '大部分' };
          const typeMap = { weekly: '每周', '5-hour': '5 小时', 'five-hour': '5 小时', daily: '每日' };
          const degree = degreeMap[mUsed[1].toLowerCase()] || mUsed[1];
          const type = typeMap[mUsed[2].toLowerCase()] || mUsed[2];
          const timeStr = mUsed[3]
            .replace(/\.$/, '')
            .replace(/(\d+)\s*days?/gi, '$1 天')
            .replace(/(\d+)\s*hours?/gi, '$1 小时')
            .replace(/(\d+)\s*minutes?/gi, '$1 分钟')
            .replace(/(\d+)\s*seconds?/gi, '$1 秒')
            .replace(/,\s*/g, ' ')
            .trim();
          return '您已消耗' + degree + type + '额度，将在 ' + timeStr + ' 后完全重置。';
        }
        const mNotUsed = trimmed.match(RE_NOT_USED_LIMIT);
        if (mNotUsed) {
          const typeMap = { weekly: '每周', '5-hour': '5 小时', 'five-hour': '5 小时', daily: '每日' };
          const type = typeMap[mNotUsed[1].toLowerCase()] || mNotUsed[1];
          return '您尚未消耗任何' + type + '额度。';
        }
        if (RE_QUOTA_RESET_SWITCH.test(trimmed)) {
          return raw.replace(RE_QUOTA_RESET_SWITCH, (_, m, dt) => '您的 ' + (dictExactFold(m.trim()) || m.trim()) + ' 配额将于 ' + dt + ' 重置，请切换至其他可用模型以继续。');
        }
        if (RE_QUOTA_REACHED_SWITCH.test(trimmed)) {
          return raw.replace(RE_QUOTA_REACHED_SWITCH, (_, m) => '您的 ' + (dictExactFold(m.trim()) || m.trim()) + ' 配额已用尽，请切换至其他可用模型以继续。');
        }
        const mNeedCred = trimmed.match(RE_NEED_CREDITS_MODEL);
        if (mNeedCred) {
          const amtPart = mNeedCred[1] ? '至少 ' + mNeedCred[1] + ' 点' : '更多';
          const modName = mNeedCred[2].trim() === 'this model' ? '该模型' : dictExactFold(mNeedCred[2].trim()) || mNeedCred[2].trim();
          let out = '发送消息需要' + amtPart + ' AI 点数。若需立即继续使用 ' + modName + '，请购买更多 AI 点数。';
          if (mNeedCred[3]) out += ' 您套餐的基础配额将于 ' + mNeedCred[3] + ' 刷新。';
          if (/enable AI Credit overages/i.test(trimmed)) out += ' 若需立即继续使用该模型，请开启 AI 点数超额使用。';
          return out;
        }
        if (RE_BASELINE_QUOTA_REFRESH.test(trimmed)) {
          return raw.replace(RE_BASELINE_QUOTA_REFRESH, '您套餐的基础配额将于 $1 刷新。');
        }
      } else if (firstUpper === 'E' || firstUpper === 'R' || firstUpper === 'L') {
        if (firstUpper === 'R') {
          const mResets = trimmed.match(RE_RESETS_IN);
          if (mResets) {
            return raw.replace(trimmed, () => formatCompactDurationZh(mResets[1]) + '后重置');
          }
        }
        if (RE_EPHEMERAL_SUMMARY.test(trimmed)) {
          const translatedSummary = trimmed
            .split(/,\s*/)
            .map((part) => translateEphemeralClause(part))
            .join('、');
          return raw.replace(trimmed, () => translatedSummary);
        }
        const inHdr = isInHeaderOrBreadcrumb(contextEl);
        if (!inHdr) {
          const mActive = trimmed.match(RE_EPHEMERAL_ACTIVE);
          if (mActive) {
            const noun = EPHEMERAL_NOUN_MAP[mActive[2].toLowerCase()];
            const out = noun ? joinZhVerbNoun(EPHEMERAL_VERB_MAP[mActive[1]], noun) : EPHEMERAL_VERB_MAP[mActive[1]] + ' ' + mActive[2];
            return raw.replace(trimmed, () => out);
          }
        }
        if (firstUpper === 'R') {
          if (RE_RUNNING_FOR.test(trimmed)) {
            return raw.replace(RE_RUNNING_FOR, '已运行 $1');
          }
          if (!inHdr && RE_RUNNING_CMD.test(trimmed)) {
            return raw.replace(RE_RUNNING_CMD, (_, cmd) => '正在运行 ' + cmd);
          }
        }
      } else if (firstUpper === 'D') {
        const mNamedD = trimmed.match(RE_NAMED_LIMIT_RESETS);
        if (mNamedD) {
          const pZh = NAMED_PERIOD_MAP[mNamedD[1].toLowerCase()] || mNamedD[1];
          return raw.replace(trimmed, () => pZh + '限额，' + formatCompactDurationZh(mNamedD[2]) + '后重置');
        }
        if (RE_DELETED_RECORDINGS.test(trimmed)) {
          return raw.replace(RE_DELETED_RECORDINGS, '已删除 $1 条录音 ($2)');
        }
      } else if (firstUpper === 'M') {
        const mNamedM = trimmed.match(RE_NAMED_LIMIT_RESETS);
        if (mNamedM) {
          const pZh = NAMED_PERIOD_MAP[mNamedM[1].toLowerCase()] || mNamedM[1];
          return raw.replace(trimmed, () => pZh + '限额，' + formatCompactDurationZh(mNamedM[2]) + '后重置');
        }
        if (RE_MARKED_READ.test(trimmed)) {
          return raw.replace(RE_MARKED_READ, '已将 $1 个对话标为已读');
        }
      } else if (firstUpper === 'U') {
        if (RE_USING_BROWSER_SEC.test(trimmed)) {
          return raw.replace(RE_USING_BROWSER_SEC, '正在操作浏览器 ($1s)');
        }
        if (RE_UP_NEXT_COUNT.test(trimmed)) {
          return raw.replace(RE_UP_NEXT_COUNT, '接下来 · $1');
        }
        const mLocalClone = trimmed.match(RE_USES_LOCAL_CLONE);
        if (mLocalClone) {
          return raw.replace(trimmed, () => '使用本地克隆：' + mLocalClone[1].trim());
        }
        const mUpd = trimmed.match(RE_UPDATED_AT);
        if (mUpd) {
          return raw.replace(trimmed, () => formatUpdatedAtZh(mUpd[1], mUpd[2]));
        }
      } else if (firstUpper === 'V') {
        const mVer = trimmed.match(RE_ARIA_VERSION);
        if (mVer) {
          return raw.replace(trimmed, () => '版本 ' + mVer[1].trim());
        }
      } else if (firstUpper === 'Z') {
        if (RE_ZIPPING_FOLDER.test(trimmed)) {
          return raw.replace(RE_ZIPPING_FOLDER, (_, folder) => '正在打包 ' + folder + '…');
        }
      } else if (firstUpper === 'H') {
        const mHey = trimmed.match(RE_HOME_HEY_NAME);
        if (mHey) {
          return raw.replace(trimmed, () => '嗨，' + mHey[1].trim() + '，今天想做点什么？');
        }
      } else if (firstUpper === 'G') {
        const mGood = trimmed.match(RE_HOME_GOOD_SEE_NAME);
        if (mGood) {
          return raw.replace(trimmed, () => '很高兴见到你，' + mGood[1].trim() + '。接下来做什么？');
        }
      } else if (firstUpper === 'A') {
        const mAutoFig = trimmed.match(RE_AUTO_FIG_WORKSPACE);
        if (mAutoFig) {
          return raw.replace(
            trimmed,
            () =>
              '对话开始时自动新建 ' +
              mAutoFig[1] +
              ' 工作区' +
              (mAutoFig[2] ? '，从 ' + mAutoFig[2].trim() + ' 创建 Worktree' : '') +
              (mAutoFig[3] ? '，并复用 ' + mAutoFig[3].trim() : '')
          );
        }
      } else if (firstUpper === 'O') {
        if (RE_ORCHESTRATOR_MODEL.test(trimmed)) {
          return raw.replace(RE_ORCHESTRATOR_MODEL, '编排器 ($1)');
        }
      }

      if (trimmed.length < 220 && trimmed.includes('offload routine steps')) {
        const mOffload = trimmed.match(RE_MODEL_OFFLOAD_DESC);
        if (mOffload) {
          return raw.replace(
            trimmed,
            () =>
              '可将常规步骤分流至 ' +
              mOffload[2] +
              ' 执行的 ' +
              mOffload[1] +
              ' 编排模型。保持 ' +
              mOffload[3] +
              ' 同等质量，消耗更少 Token。'
          );
        }
      }
      if (trimmed.length < 160 && trimmed.includes('removed from Antigravity')) {
        const mRemoved = trimmed.match(RE_MODEL_REMOVED_ON);
        if (mRemoved) {
          return raw.replace(
            trimmed,
            () => mRemoved[1].trim() + ' 将于 ' + formatEnglishDateZh(mRemoved[2]) + '从 Antigravity 下线。'
          );
        }
      }
      if (trimmed.length < 80 && (firstUpper === 'G' || firstUpper === 'C' || firstUpper === 'O')) {
        const mPeriodLim = trimmed.match(RE_MODEL_PERIOD_LIMIT);
        if (mPeriodLim) {
          const pZh = NAMED_PERIOD_MAP[mPeriodLim[2].toLowerCase()] || mPeriodLim[2];
          return raw.replace(trimmed, () => mPeriodLim[1].trim() + ' ' + pZh + '限额');
        }
      }
      if (trimmed.length < 64) {
        if (RE_KEY_QUEUES_AFTER.test(trimmed)) {
          return raw.replace(RE_KEY_QUEUES_AFTER, '$1 当前轮次结束后排队发送');
        }
        if (RE_KEY_SENDS_IMMEDIATELY.test(trimmed)) {
          return raw.replace(RE_KEY_SENDS_IMMEDIATELY, '$1 立即发送');
        }
        if (RE_KEY_EMPTY_NEXT_QUEUE.test(trimmed)) {
          return raw.replace(RE_KEY_EMPTY_NEXT_QUEUE, '$1 输入为空时发送队列下一条');
        }
      }

      return null;
    }

    function translateTextNode(node) {
      const currentVal = node.nodeValue;
      if (!currentVal) return;

      const rec = origTextMap.get(node);
      if (rec && rec.lastVal === currentVal && rec.ver === PATCH_VERSION) {
        return;
      }
      const origRaw = rec && rec.lastVal === currentVal ? rec.origRaw : currentVal;

      const nextVal = computeTextTranslation(origRaw, node.parentElement);
      if (nextVal !== null) {
        origTextMap.set(node, { origRaw, lastVal: nextVal, ver: PATCH_VERSION });
        if (node.nodeValue !== nextVal) {
          node.nodeValue = nextVal;
        }
      } else if (rec && rec.lastVal === currentVal) {
        node.nodeValue = origRaw;
        origTextMap.delete(node);
      }
    }

    function translateSingleAttr(el, attrName, origDataAttr, customResolver) {
      const cur = el.getAttribute(attrName);
      if (!cur) return;
      const savedOrig = el.getAttribute(origDataAttr);
      const savedLast = el.getAttribute(origDataAttr + '-last');
      const origVal = savedOrig && savedLast === cur ? savedOrig : cur;
      const trimmed = origVal.trim();
      const nextVal = customResolver ? customResolver(trimmed) : typeof DICT[trimmed] === 'string' ? DICT[trimmed] : null;
      if (typeof nextVal === 'string') {
        el.setAttribute(origDataAttr, origVal);
        el.setAttribute(origDataAttr + '-last', nextVal);
        if (cur !== nextVal) {
          el.setAttribute(attrName, nextVal);
        }
      } else if (savedOrig && savedLast === cur) {
        el.setAttribute(attrName, savedOrig);
        el.removeAttribute(origDataAttr);
        el.removeAttribute(origDataAttr + '-last');
      }
    }

    function translateElementAttrs(el) {
      if (!el || el.nodeType !== 1) return;
      translateSingleAttr(el, 'title', 'data-ag-orig-title', null);
      translateSingleAttr(el, 'placeholder', 'data-ag-orig-placeholder', null);
      translateSingleAttr(el, 'aria-label', 'data-ag-orig-aria-label', (atrim) => {
        if (typeof DICT[atrim] === 'string') return DICT[atrim];
        if (atrim.indexOf('\u2018') !== -1 || atrim.indexOf('\u2019') !== -1) {
          RE_CURLY_APOS.lastIndex = 0;
          const foldedAria = atrim.replace(RE_CURLY_APOS, "'");
          if (foldedAria !== atrim && typeof DICT[foldedAria] === 'string') return DICT[foldedAria];
        }
        const mBranch = atrim.match(RE_ARIA_BRANCH);
        if (mBranch) {
          const bName = mBranch[1].trim();
          return '分支，当前：' + (bName === 'Select branch' ? '选择分支' : bName);
        }
        const mProj = atrim.match(RE_ARIA_PROJECT);
        if (mProj) {
          const pName = mProj[1].trim();
          return '选择项目，当前：' + (pName === 'No project' ? '未关联项目' : pName);
        }
        const mModel = atrim.match(RE_ARIA_MODEL);
        if (mModel) {
          let mName = mModel[1].trim();
          if (mName === 'Select model' || mName === 'Select Model') return '模型，当前：选择模型';
          const directModelZh = dictExactFold(mName) || computeTextTranslation(mName, el);
          if (directModelZh) {
            mName = directModelZh;
          } else {
            const mEff = mName.match(RE_EFFORT_SUFFIX);
            if (mEff) {
              const effRaw = mEff[2] || mEff[3];
              const effZh = EFFORT_MAP[effRaw.replace(/\s+/g, ' ').toLowerCase()] || effRaw;
              const baseRaw = mEff[1].trim();
              const baseZh = dictExactFold(baseRaw) || computeTextTranslation(baseRaw, el) || baseRaw;
              const ctxTail = mEff[4] ? ' · ' + mEff[4].trim() : '';
              mName = baseZh + (mEff[2] ? ' (' + effZh + ')' : ' · ' + effZh) + ctxTail;
            }
          }
          return '模型，当前：' + mName;
        }
        const lookupPerm = (s) => dictExactFold(s) || dictExactFold(s.charAt(0).toUpperCase() + s.slice(1)) || s;
        const mPermSel = atrim.match(RE_ARIA_PERM_SEL);
        if (mPermSel) {
          const pMode = mPermSel[1].trim();
          return '权限模式，当前：' + lookupPerm(pMode);
        }
        const mPermFixed = atrim.match(RE_ARIA_PERM_FIXED);
        if (mPermFixed) {
          const pMode = mPermFixed[1].trim();
          const rawNote = (mPermFixed[2] || mPermFixed[3] || '').trim();
          if (!rawNote) {
            return '权限模式：' + lookupPerm(pMode);
          }
          const mappedNote =
            rawNote.toLowerCase() === 'cannot be changed mid-conversation'
              ? '对话中途无法更改'
              : dictExactFold(rawNote) || computeTextTranslation(rawNote, el) || rawNote;
          return '权限模式：' + lookupPerm(pMode) + '（' + mappedNote + '）';
        }
        const mGoTurn = atrim.match(RE_ARIA_GOTO_TURN);
        if (mGoTurn) {
          return '跳转至第 ' + mGoTurn[1] + ' / ' + mGoTurn[2] + ' 轮对话';
        }
        const mTurn = atrim.match(RE_ARIA_TURN);
        if (mTurn) {
          if (mTurn[3] && mTurn[4]) {
            return '第 ' + mTurn[3] + ' / ' + mTurn[4] + ' 轮对话';
          }
          const roleZh = mTurn[2].toLowerCase() === 'user' ? '用户' : 'Agent';
          return '第 ' + mTurn[1] + ' 轮对话（' + roleZh + '）';
        }
        const mOlder = atrim.match(RE_ARIA_LOAD_OLDER);
        if (mOlder) {
          if (mOlder[3] && mOlder[4]) {
            return (/^no/i.test(mOlder[2]) ? '没有更早的消息' : '加载更早的消息') + '（当前显示 ' + mOlder[3] + ' / ' + mOlder[4] + '）';
          }
          return '加载更早的 ' + mOlder[1] + ' 轮对话';
        }
        const mLoc = atrim.match(RE_ARIA_LOCATION);
        if (mLoc) {
          const locName = mLoc[1].trim();
          const mappedLoc =
            locName === 'This Computer' ? '本机' : locName === 'Remote' ? '远程' : dictExactFold(locName) || locName;
          return 'Agent 运行位置，当前：' + mappedLoc;
        }
        const mVer = atrim.match(RE_ARIA_VERSION);
        if (mVer) {
          return '版本 ' + mVer[1].trim();
        }
        return null;
      });
    }

    const walkerFilter = {
      acceptNode(node) {
        if (node.nodeType === 1) {
          if (node.matches && node.matches(EXCLUDE_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (
            node.hasAttribute &&
            (node.hasAttribute('title') || node.hasAttribute('aria-label') || node.hasAttribute('placeholder'))
          ) {
            translateElementAttrs(node);
          }
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    };

    function scanAndTranslate(root = document.body) {
      if (!root) return;
      if (root.nodeType === 3) {
        if (root.parentElement && !isExcludedElement(root.parentElement)) {
          translateTextNode(root);
        }
        return;
      }
      if (root.nodeType !== 1 || isExcludedElement(root)) return;

      if (
        root.hasAttribute &&
        (root.hasAttribute('title') || root.hasAttribute('aria-label') || root.hasAttribute('placeholder'))
      ) {
        translateElementAttrs(root);
      }

      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        walkerFilter
      );
      while (walker.nextNode()) {
        translateTextNode(walker.currentNode);
      }
    }

    scanAndTranslate(document.body);

    const dirtyRoots = new Set();
    let pending = false;
    let fallbackTimer = null;

    function flushTranslations() {
      pending = false;
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      if (dirtyRoots.size === 0) return;

      if (dirtyRoots.size > 200) {
        dirtyRoots.clear();
        try {
          scanAndTranslate(document.body);
        } catch (e) {}
        return;
      }

      const roots = Array.from(dirtyRoots);
      const rootSet = new Set(roots);
      dirtyRoots.clear();

      for (let i = 0; i < roots.length; i++) {
        const r = roots[i];
        if (!r || !r.isConnected) continue;
        let covered = false;
        for (let p = r.parentNode; p; p = p.parentNode) {
          if (rootSet.has(p)) {
            covered = true;
            break;
          }
        }
        if (!covered) {
          try {
            scanAndTranslate(r);
          } catch (e) {}
        }
      }
    }

    function scheduleFlush() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(flushTranslations);
      fallbackTimer = setTimeout(flushTranslations, 80);
    }

    window.__ag_i18n_observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type === 'characterData') {
          const t = m.target;
          if (t && t.parentElement && !isExcludedElement(t.parentElement)) {
            dirtyRoots.add(t);
          }
        } else if (m.type === 'attributes') {
          const el = m.target;
          if (el && el.nodeType === 1 && !isExcludedElement(el)) {
            try {
              translateElementAttrs(el);
            } catch (e) {}
          }
        } else if (m.type === 'childList' && m.addedNodes.length > 0) {
          if (m.target && m.target.nodeType === 1 && isExcludedElement(m.target)) {
            continue;
          }
          for (let j = 0; j < m.addedNodes.length; j++) {
            const n = m.addedNodes[j];
            if (n.nodeType === 1 || n.nodeType === 3) {
              dirtyRoots.add(n);
            }
          }
        }
      }
      if (dirtyRoots.size > 0) {
        scheduleFlush();
      }
    });

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      window.__ag_i18n_observer.observe(targetNode, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['title', 'aria-label', 'placeholder']
      });
    }
  } else {
    // 若用户在配置中关闭了 i18n 模块，实时将已翻译的文本与属性还原为原始英文
    restoreAllTranslations(document.body);
  }

  // ============================================================================
  // 5. 开放用户自定义前端脚本钩子 (user/custom.js，沙箱异常隔离，同时提供 ctx 与 boot)
  // ============================================================================
  window.__AG_PATCH_CTX__ = {
    version: PATCH_VERSION,
    preset: DEFAULT_PRESET,
    get appearance() {
      return document.documentElement.getAttribute('data-ag-appearance') || 'default';
    },
    config: boot.config || {},
    modules: MODULES,
    features: MODULES,
    themeVars: THEME_VARS,
    dict: DICT,
    get metrics() {
      return window.__ag_last_metrics || null;
    },
    syncPreset: syncChuanbanPreset,
    ensureMetricsPill
  };

  if (MODULES.customJs && boot.customJs && typeof boot.customJs === 'string' && boot.customJs.trim()) {
    try {
      const fn = new Function('ctx', 'boot', boot.customJs);
      fn(window.__AG_PATCH_CTX__, window.__AG_PATCH_CTX__);
    } catch (err) {
      console.error('[Antigravity Patch] Error in user/custom.js:', err);
    }
  }
})(__AG_BOOT_PAYLOAD__);
