// Megabox Vanilla DOM Controller (Zero-Bloat Desktop Workspace Engine)
// Includes 440+ Recipes Catalog, Live Search, Tab Context Menu, and Hibernation
(function() {
  const tabsContainer = document.getElementById('tabs-container');
  const webviewsContainer = document.getElementById('webviews-container');
  const btnReload = document.getElementById('btn-reload');

  const btnDnd = document.getElementById('btn-dnd');
  const iconDndOff = document.getElementById('icon-dnd-off');
  const iconDndOn = document.getElementById('icon-dnd-on');
  let isDndActive = localStorage.getItem('megabox_dnd_active') === 'true';

  // Catalog Modal
  const catalogModal = document.getElementById('catalog-modal');
  const btnCatalogClose = document.getElementById('btn-catalog-close');
  const catalogSearchInput = document.getElementById('catalog-search-input');
  const catalogGrid = document.getElementById('catalog-grid');
  const btnCustomAdd = document.getElementById('btn-custom-add');
  const catalogCountBadge = document.getElementById('catalog-count-badge');

  // Configure / Custom Form Modal
  const configureModal = document.getElementById('configure-modal');
  const formModalTitle = document.getElementById('form-modal-title');
  const btnFormClose = document.getElementById('btn-form-close');
  const btnFormCancel = document.getElementById('btn-form-cancel');
  const btnFormSave = document.getElementById('btn-form-save');
  const inputServiceName = document.getElementById('input-service-name');
  const inputServiceUrl = document.getElementById('input-service-url');
  const inputServiceIcon = document.getElementById('input-service-icon');
  const inputServiceId = document.getElementById('input-service-id');

  // Custom Context Menu (Power-User Controls)
  const contextMenu = document.getElementById('context-menu');
  const ctxName = document.getElementById('ctx-name');
  const ctxBack = document.getElementById('ctx-back');
  const ctxForward = document.getElementById('ctx-forward');
  const ctxReload = document.getElementById('ctx-reload');
  const ctxHome = document.getElementById('ctx-home');
  const ctxOpenBrowser = document.getElementById('ctx-open-browser');
  const ctxHibernate = document.getElementById('ctx-hibernate');
  const ctxHibernateLabel = document.getElementById('ctx-hibernate-label');
  const ctxTile = document.getElementById('ctx-tile');
  const ctxMoveUp = document.getElementById('ctx-move-up');
  const ctxMoveDown = document.getElementById('ctx-move-down');
  const ctxEdit = document.getElementById('ctx-edit');
  const ctxDelete = document.getElementById('ctx-delete');

  let apps = [];
  let recipesCatalog = [];
  let activeAppId = null;
  let secondaryTiledAppId = null;
  let isTileModeActive = false;
  let contextTargetApp = null;
  const appLastAccessed = {};
  let HIBERNATE_TIMEOUT_MS = 15 * 60 * 1000; // Dynamic idle timeout (0 = disabled)

  const defaultUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

  async function init() {
    setupEventListeners();
    loadSystemSettings();
    await loadRecipesCatalog();
    
    loadApps();
    refreshSyncUI();
    setInterval(checkHibernation, 60000);


  }

  function setupEventListeners() {

    // Unified Shortcut Dispatcher (handles IPC from Main/Webviews as well as local Renderer keys)
    function dispatchShortcutAction(data) {
      if (!data || !data.action) return;
      const { action, dir, index } = data;

      switch (action) {
        case 'switch-tab': {
          if (typeof index === 'number' && apps[index]) {
            selectApp(apps[index].id);
          }
          break;
        }
        case 'reorder-active-app': {
          const targetApp = contextTargetApp || apps.find(a => a.id === activeAppId);
          if (targetApp && window.megabox && window.megabox.reorderApp) {
            hideContextMenu();
            window.megabox.reorderApp(targetApp.id, dir || 'up');
          }
          break;
        }
        case 'nav-history': {
          const targetId = (contextTargetApp && contextTargetApp.id) || activeAppId;
          if (targetId) {
            const wv = document.getElementById('wv-' + targetId);
            if (wv) {
              if (dir === 'back' && wv.canGoBack && wv.canGoBack()) wv.goBack();
              if (dir === 'forward' && wv.canGoForward && wv.canGoForward()) wv.goForward();
            }
          }
          hideContextMenu();
          break;
        }
        case 'reload-active': {
          if (contextTargetApp) {
            const wv = document.getElementById('wv-' + contextTargetApp.id);
            if (wv) wv.reload();
            hideContextMenu();
          } else {
            reloadActiveApp();
          }
          break;
        }
        case 'quick-switch': {
          if (quickswitchModal.style.display === 'flex') {
            closeQuickSwitcher();
          } else {
            openQuickSwitcher();
          }
          break;
        }
        case 'open-catalog': {
          openCatalog();
          break;
        }
        case 'toggle-dnd': {
          toggleDNDMode();
          break;
        }
        case 'toggle-extensions': {
          if (typeof toggleExtensionDrawer === 'function') {
            toggleExtensionDrawer();
          }
          break;
        }
        case 'toggle-split': {
          if (typeof toggleTileView === 'function') {
            toggleTileView();
          }
          break;
        }
        case 'escape': {
          catalogModal.style.display = 'none';
          configureModal.style.display = 'none';
          const settingsModal = document.getElementById('settings-modal');
          if (settingsModal) settingsModal.style.display = 'none';
          if (typeof closeQuickSwitcher === 'function') closeQuickSwitcher();
          if (typeof closeExtensionDrawer === 'function') closeExtensionDrawer();
          hideContextMenu();
          break;
        }
      }
    }
    window.dispatchShortcutAction = dispatchShortcutAction;

    // Open Service Catalog / Tambah Aplikasi via delegation on tabsContainer
    tabsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('#btn-add-open');
      if (btn) {
        catalogSearchInput.value = '';
        activeCatalogCategory = 'all';
        const categoryContainer = document.getElementById('catalog-category-pills');
        if (categoryContainer) {
          categoryContainer.querySelectorAll('.category-pill').forEach(p => p.classList.remove('is-active'));
          const firstPill = categoryContainer.querySelector('[data-cat="all"]');
          if (firstPill) firstPill.classList.add('is-active');
        }
        filterCatalog();
        catalogModal.style.display = 'flex';
        setTimeout(() => catalogSearchInput.focus(), 100);
      }
    });

    btnCatalogClose.onclick = () => { catalogModal.style.display = 'none'; };
    btnCustomAdd.onclick = () => {
      catalogModal.style.display = 'none';
      openConfigureForm('Custom Service', 'https://', 'custom');
    };

    // Catalog live search & Category filter pills delegation
    catalogSearchInput.oninput = () => {
      filterCatalog();
    };

    const categoryContainer = document.getElementById('catalog-category-pills');
    if (categoryContainer) {
      categoryContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-pill');
        if (!btn) return;
        categoryContainer.querySelectorAll('.category-pill').forEach(p => p.classList.remove('is-active'));
        btn.classList.add('is-active');
        activeCatalogCategory = btn.dataset.cat || 'all';
        filterCatalog();
      });
    }

    // Configure Form actions
    btnFormClose.onclick = () => { configureModal.style.display = 'none'; };
    btnFormCancel.onclick = () => { configureModal.style.display = 'none'; };
    btnFormSave.onclick = handleSaveService;

    // Control bar
    btnReload.onclick = reloadActiveApp;

    // Local Renderer Keyboard Shortcuts Router
    window.addEventListener('keydown', (e) => {
      const isCtrl = Boolean(e.ctrlKey || e.metaKey);
      const isAlt = Boolean(e.altKey);
      const isShift = Boolean(e.shiftKey);
      const key = e.key;

      if (isAlt && !isCtrl && !isShift && key >= '1' && key <= '9') {
        e.preventDefault();
        dispatchShortcutAction({ action: 'switch-tab', index: parseInt(key, 10) - 1 });
      } else if (isAlt && !isCtrl && !isShift && (key === 'ArrowUp' || key === 'Up')) {
        e.preventDefault();
        dispatchShortcutAction({ action: 'reorder-active-app', dir: 'up' });
      } else if (isAlt && !isCtrl && !isShift && (key === 'ArrowDown' || key === 'Down')) {
        e.preventDefault();
        dispatchShortcutAction({ action: 'reorder-active-app', dir: 'down' });
      } else if (isAlt && !isCtrl && !isShift && (key === 'ArrowLeft' || key === 'Left')) {
        e.preventDefault();
        dispatchShortcutAction({ action: 'nav-history', dir: 'back' });
      } else if (isAlt && !isCtrl && !isShift && (key === 'ArrowRight' || key === 'Right')) {
        e.preventDefault();
        dispatchShortcutAction({ action: 'nav-history', dir: 'forward' });
      } else if ((isCtrl && !isAlt && (key === 'r' || key === 'R')) || key === 'F5') {
        e.preventDefault();
        dispatchShortcutAction({ action: 'reload-active' });
      } else if (isCtrl && !isAlt && (key === 'k' || key === 'K' || key === 'p' || key === 'P')) {
        e.preventDefault();
        dispatchShortcutAction({ action: 'quick-switch' });
      } else if (isCtrl && !isAlt && (key === 'n' || key === 'N')) {
        e.preventDefault();
        dispatchShortcutAction({ action: 'open-catalog' });
      } else if (isAlt && isShift && !isCtrl && (key === 'D' || key === 'd')) {
        e.preventDefault();
        dispatchShortcutAction({ action: 'toggle-dnd' });
      } else if (isAlt && !isShift && !isCtrl && (key === 'e' || key === 'E')) {
        e.preventDefault();
        dispatchShortcutAction({ action: 'toggle-extensions' });
      } else if (isAlt && !isCtrl && (key === 's' || key === 'S')) {
        e.preventDefault();
        dispatchShortcutAction({ action: 'toggle-split' });
      } else if (key === 'Escape') {
        e.preventDefault();
        dispatchShortcutAction({ action: 'escape' });
      }
    });

    // Close context menu on outside click
    window.addEventListener('click', (e) => {
      if (contextMenu.style.display === 'block' && !contextMenu.contains(e.target)) {
        hideContextMenu();
      }
    }, true);
    window.addEventListener('mousedown', (e) => {
      if (contextMenu.style.display === 'block' && !contextMenu.contains(e.target)) {
        hideContextMenu();
      }
    }, true);

    // Context menu handlers
    if (ctxBack) {
      ctxBack.onclick = () => {
        if (contextTargetApp) {
          const wv = document.getElementById('wv-' + contextTargetApp.id);
          if (wv && wv.canGoBack()) wv.goBack();
        }
        hideContextMenu();
      };
    }

    if (ctxForward) {
      ctxForward.onclick = () => {
        if (contextTargetApp) {
          const wv = document.getElementById('wv-' + contextTargetApp.id);
          if (wv && wv.canGoForward()) wv.goForward();
        }
        hideContextMenu();
      };
    }

    if (ctxReload) {
      ctxReload.onclick = () => {
        if (contextTargetApp) {
          const wv = document.getElementById('wv-' + contextTargetApp.id);
          if (wv) wv.reload();
        }
        hideContextMenu();
      };
    }

    if (ctxHome) {
      ctxHome.onclick = () => {
        if (contextTargetApp) {
          const wv = document.getElementById('wv-' + contextTargetApp.id);
          if (wv) wv.loadURL(contextTargetApp.url);
        }
        hideContextMenu();
      };
    }

    if (ctxOpenBrowser) {
      ctxOpenBrowser.onclick = () => {
        if (contextTargetApp) {
          const wv = document.getElementById('wv-' + contextTargetApp.id);
          const currentUrl = (wv && wv.getURL && wv.getURL()) ? wv.getURL() : contextTargetApp.url;
          if (window.megabox && window.megabox.openExternal) {
            window.megabox.openExternal(currentUrl);
          }
        }
        hideContextMenu();
      };

    }
    if (ctxHibernate) {
      ctxHibernate.onclick = () => {
        if (contextTargetApp) {
          toggleHibernateApp(contextTargetApp.id);
        }
        hideContextMenu();
      };
    }

    if (ctxMoveUp) {
      ctxMoveUp.onclick = async () => {
        if (contextTargetApp && window.megabox && window.megabox.reorderApp) {
          const targetId = contextTargetApp.id;
          hideContextMenu();
          await window.megabox.reorderApp(targetId, 'up');
        } else {
          hideContextMenu();
        }
      };
    }

    if (ctxMoveDown) {
      ctxMoveDown.onclick = async () => {
        if (contextTargetApp && window.megabox && window.megabox.reorderApp) {
          const targetId = contextTargetApp.id;
          hideContextMenu();
          await window.megabox.reorderApp(targetId, 'down');
        } else {
          hideContextMenu();
        }
      };
    }

    if (ctxEdit) {
      ctxEdit.onclick = () => {
        if (contextTargetApp) {
          const target = contextTargetApp;
          hideContextMenu();
          openConfigureForm(target.name, target.url, target.icon, target.id);
        } else {
          hideContextMenu();
        }
      };
    }

    if (ctxDelete) {
      ctxDelete.onclick = () => {
        if (contextTargetApp) {
          if (confirm(`Remove "${contextTargetApp.name}" from Megabox?`)) {
            deleteAppById(contextTargetApp.id);
          }
        }
        hideContextMenu();
      };
    }

    if (window.megabox) {
      window.megabox.onAppsUpdated((updatedApps) => {
        apps = updatedApps;
        renderTabs();
      });
      window.megabox.onReloadActive(() => {
        reloadActiveApp();
      });
      if (window.megabox.onShortcutAction) {
        window.megabox.onShortcutAction((data) => {
          dispatchShortcutAction(data);
        });
      }
    }
  }

  function openCatalog() {
    catalogSearchInput.value = '';
    activeCatalogCategory = 'all';
    const categoryContainer = document.getElementById('catalog-category-pills');
    if (categoryContainer) {
      categoryContainer.querySelectorAll('.category-pill').forEach(p => p.classList.remove('is-active'));
      const firstPill = categoryContainer.querySelector('[data-cat="all"]');
      if (firstPill) firstPill.classList.add('is-active');
    }
    filterCatalog();
    catalogModal.style.display = 'flex';
    setTimeout(() => catalogSearchInput.focus(), 100);
  }

  async function loadRecipesCatalog() {
    try {
      const resp = await fetch('assets/recipes-catalog.json');
      recipesCatalog = await resp.json();
      if (catalogCountBadge) {
      catalogCountBadge.textContent = String(currentFilteredCatalog.length) + " Layanan";
      }
    } catch (e) {
      console.error('Failed to load recipes catalog:', e);
    }
  }

  let activeCatalogCategory = 'all';
  let catalogCurrentSlice = 80;
  let currentFilteredCatalog = [];

  function filterCatalog() {
    const q = (catalogSearchInput ? catalogSearchInput.value : '').toLowerCase().trim();
    
    currentFilteredCatalog = recipesCatalog.filter(item => {
      // 1. Category check
      if (activeCatalogCategory === 'featured') {
        if (!item.featured) return false;
      } else if (activeCatalogCategory !== 'all') {
        if (item.category !== activeCatalogCategory) return false;
      }

      // 2. Search query check
      if (q) {
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesCategory = item.category ? item.category.toLowerCase().includes(q) : false;
        return matchesName || matchesId || matchesCategory;
      }
      return true;
    });

    // Smart Sorting: When in "all" or category view without explicit search,
    // boost featured / essential services (WhatsApp, WA Business, Telegram, Discord, Gmail, ChatGPT, Claude) to the front!
    if (!q) {
      currentFilteredCatalog.sort((a, b) => {
        const aFeat = a.featured ? 1 : 0;
        const bFeat = b.featured ? 1 : 0;
        if (aFeat !== bFeat) return bFeat - aFeat;
        return a.name.localeCompare(b.name);
      });
    }

    catalogCurrentSlice = 80;
    renderCatalogGrid(currentFilteredCatalog, true);

    if (catalogCountBadge) {
      catalogCountBadge.textContent = String(currentFilteredCatalog.length) + " Layanan";
    }
  }

  function renderCatalogGrid(items, reset = false) {
    if (reset) {
      catalogGrid.innerHTML = '';
      catalogGrid.scrollTop = 0;
    }

    const displayItems = items.slice(0, catalogCurrentSlice);
    catalogGrid.innerHTML = '';

    if (displayItems.length === 0) {
      catalogGrid.innerHTML = `
        <div style="grid-column: 1/-1; padding: 40px 20px; text-align: center; color: #94a3b8;">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:8px;opacity:0.4;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <div style="font-size: 15px; font-weight: 600; color: #fff;">Layanan tidak ditemukan</div>
          <div style="font-size: 13px; margin-top: 4px;">Coba gunakan kata kunci lain atau tambahkan website kustom secara manual di bawah.</div>
        </div>
      `;
      return;
    }

    displayItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'service-card' + (item.featured ? ' is-featured-card' : '');

      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'service-card-icon-wrapper';
      const img = document.createElement('img');
      img.src = `assets/icons/${item.id}.svg`;
      img.alt = item.name;
      img.onerror = () => {
        img.src = 'assets/icons/chat.svg';
        img.onerror = () => {
          img.style.display = 'none';
        };
      };

      const info = document.createElement('div');
      info.className = 'service-info';

      const nameRow = document.createElement('div');
      nameRow.style.display = 'flex';
      nameRow.style.alignItems = 'center';
      nameRow.style.gap = '6px';

      const name = document.createElement('div');
      name.className = 'service-name';
      name.textContent = item.name;
      nameRow.appendChild(name);

      if (item.featured) {
        const featPill = document.createElement('span');
        featPill.className = 'featured-badge-pill';
        featPill.textContent = 'Top';
        nameRow.appendChild(featPill);
      }

      const meta = document.createElement('div');
      meta.className = 'service-meta';
      meta.textContent = item.url ? item.url.replace(/^https?:\/\//, '').split('/')[0] : 'Web Service';

      info.appendChild(nameRow);
      info.appendChild(meta);

      const btn = document.createElement('button');
      btn.className = 'btn-add-pill';
      btn.textContent = 'Pasang';
      btn.onclick = (e) => {
        e.stopPropagation();
        catalogModal.style.display = 'none';
        openConfigureForm(item.name, item.url || 'https://', item.id);
      };

      iconWrapper.appendChild(img);
      card.appendChild(iconWrapper);
      card.appendChild(info);
      card.appendChild(btn);

      card.onclick = () => {
        catalogModal.style.display = 'none';
        openConfigureForm(item.name, item.url || 'https://', item.id);
      };

      catalogGrid.appendChild(card);
    });
  }

  // Infinite Scroll Trigger on Catalog Body
  if (catalogGrid) {
    catalogGrid.addEventListener('scroll', () => {
      if (catalogGrid.scrollTop + catalogGrid.clientHeight >= catalogGrid.scrollHeight - 150) {
        if (catalogCurrentSlice < currentFilteredCatalog.length) {
          catalogCurrentSlice += 60;
          renderCatalogGrid(currentFilteredCatalog, false);
        }
      }
    });
  }

  function openConfigureForm(name, url, icon, existingId = null) {
    if (existingId) {
      formModalTitle.textContent = `Ubah Layanan ${name}`;
      if (inputServiceId) inputServiceId.value = existingId;
    } else {
      formModalTitle.textContent = `Tambah Layanan ${name}`;
      if (inputServiceId) inputServiceId.value = '';
    }
    inputServiceName.value = name;
    inputServiceUrl.value = url;
    inputServiceIcon.value = icon;
    configureModal.style.display = 'flex';
    setTimeout(() => inputServiceName.focus(), 100);
  }

  async function loadApps() {
    if (window.megabox) {
      apps = await window.megabox.getApps();
      renderTabs();
      if (apps.length > 0) {
        selectApp(apps[0].id);
      }
    }
  }

  // Single Source of Truth for resolving application icons across all views (Tabs, QuickSwitcher, Modals)
  function resolveAppIconSrc(app) {
    if (!app) return 'assets/icons/web.svg';
    const isOfficial = app.icon && app.icon !== 'custom' && app.icon !== 'globe' && app.icon !== 'web';
    if (isOfficial) {
      return `assets/icons/${app.icon}.svg`;
    }
    if (app.custom_icon) {
      return app.custom_icon;
    }
    if (app.icon && (app.icon.startsWith('http://') || app.icon.startsWith('https://') || app.icon.startsWith('data:'))) {
      return app.icon;
    }
    const lowerName = (app.name || '').toLowerCase();
    if (lowerName.includes('cctv') || lowerName.includes('cam')) return 'assets/icons/cctv.svg';
    if (lowerName.includes('github') || lowerName.includes('git')) return 'assets/icons/github.svg';
    if (lowerName.includes('password') || lowerName.includes('key')) return 'assets/icons/key.svg';
    return 'assets/icons/web.svg';
  }

  function renderTabs() {
    tabsContainer.innerHTML = '';

    // Synchronize Webviews with current apps list (cleanup orphaned webviews after import or delete)
    const validAppIds = new Set(apps.map(a => 'wv-' + a.id));
    const existingWvs = webviewsContainer.querySelectorAll('webview');
    existingWvs.forEach(wv => {
      if (!validAppIds.has(wv.id)) {
        console.log('[Megabox Cleanup] Removing orphan webview:', wv.id);
        wv.remove();
      }
    });

    apps.forEach((app, index) => {
      const tab = document.createElement('div');
      tab.id = 'tab-' + app.id;
      tab.className = 'tab-item' + (activeAppId === app.id ? ' is-active' : '');
      tab.title = `${app.name} (Alt+${index + 1})`;

      // Resolve tab icon via single source of truth
      const iconSrc = resolveAppIconSrc(app);

      const img = document.createElement('img');
      img.className = 'tab-icon';
      img.src = iconSrc;
      img.alt = app.name;
      img.onerror = () => {
        if (img.src.includes('assets/icons/') && app.icon && app.icon !== 'custom' && !img.dataset.cdnTried) {
          img.dataset.cdnTried = 'true';
          img.src = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/' + app.icon + '.svg';
          return;
        }
        if (!img.src.includes('assets/icons/')) {
          const lowerName = (app.name || '').toLowerCase();
          if (lowerName.includes('cctv') || lowerName.includes('cam')) img.src = 'assets/icons/cctv.svg';
          else if (lowerName.includes('github') || lowerName.includes('git')) img.src = 'assets/icons/github.svg';
          else if (lowerName.includes('password') || lowerName.includes('key')) img.src = 'assets/icons/key.svg';
          else img.src = 'assets/icons/web.svg';
        } else {
          img.remove();
          const fallback = document.createElement('span');
          fallback.className = 'tab-fallback';
          fallback.textContent = (app.name || 'APP').substring(0, 2);
          tab.appendChild(fallback);
        }
      };
      tab.appendChild(img);

      // Dynamic Notification Badge Controller
      const badge = document.createElement('span');
      badge.id = 'badge-' + app.id;
      badge.className = 'tab-badge';
      badge.textContent = '0';
      tab.appendChild(badge);

      // Tab Click
      tab.onclick = () => selectApp(app.id);

      // Right-click Custom Context Menu
      tab.oncontextmenu = (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, app);
      };

      tabsContainer.appendChild(tab);

      // Ensure corresponding Webview exists
      let wv = document.getElementById('wv-' + app.id);
      if (!wv) {
        wv = document.createElement('webview');
        wv.id = 'wv-' + app.id;
        wv.src = app.url;
        wv.partition = app.partition || ('persist:' + app.id);
        wv.useragent = app.user_agent || defaultUA;
        wv.setAttribute('preload', '../main/preload-webview.js');
        wv.setAttribute('allowpopups', '');
        wv.style.display = (activeAppId === app.id) ? 'flex' : 'none';

        // Auto Favicon caching handler
        const handleFaviconUpdate = (favUrl) => {
          // Jangan timpa icon jika aplikasi adalah katalog resmi bawaan
          if (app.icon && app.icon !== 'custom' && app.icon !== 'globe' && app.icon !== 'web') return;
          if (!favUrl || typeof favUrl !== 'string') return;
          if (app.custom_icon && app.custom_icon.startsWith('data:')) return;
          if (window.megabox && window.megabox.cacheFavicon) {
            window.megabox.cacheFavicon(app.id, favUrl).then(res => {
              if (res && res.success && res.dataUri) {
                app.custom_icon = res.dataUri;
                const tabImg = document.querySelector(`#tab-${app.id} img.tab-icon`);
                if (tabImg) {
                  tabImg.src = res.dataUri;
                  tabImg.style.display = 'block';
                }
                const fallback = document.querySelector(`#tab-${app.id} .tab-fallback`);
                if (fallback) fallback.remove();
              }
            }).catch(e => console.warn('[Favicon Cache Error]', e));
          }
        };

        wv.addEventListener('page-favicon-updated', (event) => {
          if (event.favicons && event.favicons.length > 0) {
            handleFaviconUpdate(event.favicons[0]);
          }
        });

        // Listen to badge events from preload-webview bridge
        wv.addEventListener('dom-ready', () => {
          if (isDndActive) {
            try { wv.setAudioMuted(true); } catch (_) {}
          }
          // If custom icon not cached as data URI, extract from page DOM
          if ((!app.custom_icon || !app.custom_icon.startsWith('data:')) && (!app.icon || app.icon === 'custom' || app.icon === 'globe' || app.icon === 'web')) {
            wv.executeJavaScript(`(() => {
              const link = document.querySelector('link[rel~="icon"]') || document.querySelector('link[rel~="apple-touch-icon"]');
              return link ? link.href : (window.location.origin + '/favicon.ico');
            })()`).then(handleFaviconUpdate).catch(() => {});
          }
        });

        wv.addEventListener('ipc-message', (event) => {
          if (event.channel === 'badge') {
            const count = parseInt(event.args[0], 10) || 0;
            updateAppBadge(app.id, count);
          }
          if (event.channel === 'notification') {
            console.log('[Megabox Notification]', app.name, event.args[0]);
            if (!isDndActive && window.megabox && typeof window.megabox.dispatchNotification === 'function') {
              const notifData = event.args[0] || {};
              window.megabox.dispatchNotification(notifData.title || app.name, notifData.options ? notifData.options.body : '', notifData.options ? notifData.options.icon : null);
            }
          }
          if (event.channel === 'translate:request') {
            const req = event.args[0] || {};
            const textToTranslate = req.text || '';
            const reqId = req.requestId;

            // Check if translation is enabled for this app partition
            const appExtKey = 'megabox_ext_' + app.id;
            let isExtEnabled = true;
            try {
              const prefs = JSON.parse(localStorage.getItem(appExtKey) || '{}');
              if (prefs['translate'] !== undefined) isExtEnabled = prefs['translate'];
            } catch (_) {}

            if (isExtEnabled && window.megabox && typeof window.megabox.performTranslation === 'function') {
              window.megabox.performTranslation(textToTranslate).then(res => {
                wv.send('translate:response', { requestId: reqId, result: res });
              }).catch(err => {
                wv.send('translate:response', { requestId: reqId, result: { success: false, error: err.message } });
              });
            }
          }
        });

        webviewsContainer.appendChild(wv);
      }
    });

    // Add Service (+) Button rendered dynamically right below the last tab item
    const addBtn = document.createElement('button');
    addBtn.id = 'btn-add-open';
    addBtn.className = 'btn-add-service';
    addBtn.title = 'Tambah Aplikasi / Buka Ruang (Ctrl+N)';
    addBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 4v16m8-8H4"/>
      </svg>
    `;
    addBtn.onclick = () => {
      catalogModal.style.display = 'flex';
      catalogSearchInput.value = '';
      activeCatalogCategory = 'all';
      const categoryContainer = document.getElementById('catalog-category-pills');
      if (categoryContainer) {
        categoryContainer.querySelectorAll('.category-pill').forEach(p => p.classList.remove('is-active'));
        const firstPill = categoryContainer.querySelector('[data-cat="all"]');
        if (firstPill) firstPill.classList.add('is-active');
      }
      filterCatalog();
      setTimeout(() => catalogSearchInput.focus(), 50);
    };
    tabsContainer.appendChild(addBtn);
  }


  window.toggleTileView = toggleTileView;
  window.toggleExtensionDrawer = toggleExtensionDrawer;
  function exitTileMode() {
    isTileModeActive = false;
    secondaryTiledAppId = null;
    webviewsContainer.classList.remove('is-tiled');
    selectApp(activeAppId);
    console.log('[Megabox Tile] Exited split tile view');
  }

  function toggleTileView(targetId) {
    if (isTileModeActive && (!targetId || secondaryTiledAppId === targetId)) {
      exitTileMode();
      return;
    }

    // Enter tile mode: active app on left, targetId on right
    if (apps.length < 2) {
      alert('Tambahkan minimal 2 aplikasi untuk menggunakan mode Split Screen 1x2.');
      return;
    }

    const secondary = targetId || (apps.find(a => a.id !== activeAppId) || {}).id;
    if (!secondary) return;

    isTileModeActive = true;
    secondaryTiledAppId = secondary;
    webviewsContainer.classList.add('is-tiled');

    // Show both webviews
    apps.forEach(app => {
      const wv = document.getElementById('wv-' + app.id);
      const tab = document.getElementById('tab-' + app.id);
      if (wv) {
        if (app.id === activeAppId || app.id === secondaryTiledAppId) {
          if (wv.dataset.hibernated === 'true') {
            wv.dataset.hibernated = 'false';
            wv.src = app.url;
            if (tab) tab.classList.remove('is-hibernated');
          }
          wv.style.display = 'flex';
        } else {
          wv.style.display = 'none';
        }
      }
      if (tab) {
        if (app.id === activeAppId || app.id === secondaryTiledAppId) {
          tab.classList.add('is-active');
        } else {
          tab.classList.remove('is-active');
        }
      }
    });

    console.log(`[Megabox Tile] 1x2 Split screen active: ${activeAppId} & ${secondaryTiledAppId}`);
  }

  if (ctxTile) {
    ctxTile.onclick = () => {
      if (contextTargetApp) {
        toggleTileView(contextTargetApp.id);
      }
      hideContextMenu();
    };
  }

    let ctxBackdrop = document.getElementById('ctx-backdrop');
  if (!ctxBackdrop) {
    ctxBackdrop = document.createElement('div');
    ctxBackdrop.id = 'ctx-backdrop';
    ctxBackdrop.style.cssText = 'position:fixed;inset:0;background:transparent;z-index:190;display:none;';
    document.body.appendChild(ctxBackdrop);
    ctxBackdrop.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      hideContextMenu();
    });
    ctxBackdrop.addEventListener('click', (e) => {
      e.stopPropagation();
      hideContextMenu();
    });
    ctxBackdrop.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      hideContextMenu();
    });
  }

  function showContextMenu(x, y, app) {
    contextTargetApp = app;
    ctxName.textContent = app.name;

    const wv = document.getElementById('wv-' + app.id);

    const isHibernated = wv ? (wv.dataset.hibernated === 'true') : false;
    if (ctxHibernateLabel) {
      ctxHibernateLabel.textContent = isHibernated ? 'Bangunkan' : 'Tidurkan';
    }

    // Tampilkan backdrop transparan agar klik di manapun (termasuk atas webview) menutup menu seketika
    if (ctxBackdrop) ctxBackdrop.style.display = 'block';

    // Position menu dynamically to fit viewport (prevents cutoff on small screens)
    contextMenu.style.visibility = 'hidden';
    contextMenu.style.display = 'block';
    contextMenu.style.zIndex = '200';
    const menuWidth = contextMenu.offsetWidth || 220;
    const menuHeight = contextMenu.offsetHeight || 380;
    contextMenu.style.visibility = 'visible';

    const safeX = Math.max(10, Math.min(x, window.innerWidth - menuWidth - 10));
    const safeY = Math.max(10, Math.min(y, window.innerHeight - menuHeight - 10));
    contextMenu.style.left = `${safeX}px`;
    contextMenu.style.top = `${safeY}px`;
  }

  function hideContextMenu() {
    contextMenu.style.display = 'none';
    if (ctxBackdrop) ctxBackdrop.style.display = 'none';
    contextTargetApp = null;
  }

  function selectApp(id) {
    if (isTileModeActive) {
      isTileModeActive = false;
      secondaryTiledAppId = null;
      webviewsContainer.classList.remove('is-tiled');
    }
    activeAppId = id;
    appLastAccessed[id] = Date.now();

    apps.forEach(app => {
      const tab = document.getElementById('tab-' + app.id);
      if (tab) {
        if (app.id === id) {
          tab.classList.add('is-active');
        } else {
          tab.classList.remove('is-active');
        }
      }

      const wv = document.getElementById('wv-' + app.id);
      if (wv) {
        if (app.id === id) {
          // Wake up immediately for active selected tab
          if (wv.dataset.hibernated === 'true') {
            console.log('[Megabox Hibernate] Immediate foreground wake up for active app:', app.id);
            wv.dataset.hibernated = 'false';
            wv.src = app.url;
            if (tab) tab.classList.remove('is-hibernated');
          }
          wv.style.display = 'flex';
          try { wv.focus(); } catch (err) {}
        } else {
          wv.style.display = 'none';
        }
      }
    });
  }

  function updateAppBadge(id, count) {
    const badge = document.getElementById('badge-' + id);
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.add('active');
    } else {
      badge.textContent = '0';
      badge.classList.remove('active');
    }
  }
  function toggleHibernateApp(id) {
    const app = apps.find(a => a.id === id);
    const wv = document.getElementById('wv-' + id);
    const tab = document.getElementById('tab-' + id);
    if (!app || !wv) return;

    if (wv.dataset.hibernated === 'true') {
      // Wake up
      wv.dataset.hibernated = 'false';
      wv.src = app.url;
      if (tab) tab.classList.remove('is-hibernated');
    } else {
      // Hibernate
      wv.dataset.hibernated = 'true';
      wv.src = 'about:blank';
      if (tab) tab.classList.add('is-hibernated');
      if (activeAppId === id) {
        wv.style.display = 'none';
      }
    }
  }

  // Staggered Splay Queue for tab wakeups (800ms debounce interval to avoid OOM freeze)
  const wakeQueue = [];
  let isProcessingWakeQueue = false;

  function queueServiceWake(app, wv, tab) {
    if (wakeQueue.some(item => item.app.id === app.id)) return;
    wakeQueue.push({ app, wv, tab });
    processWakeQueue();
  }

  function processWakeQueue() {
    if (isProcessingWakeQueue || wakeQueue.length === 0) return;
    isProcessingWakeQueue = true;

    const { app, wv, tab } = wakeQueue.shift();
    console.log('[Megabox Splay] Staggered wake-up executing for service:', app.id);

    try {
      wv.dataset.hibernated = 'false';
      wv.src = app.url;
      if (tab) tab.classList.remove('is-hibernated');
    } catch (err) {
      console.warn('[Megabox Splay] Error waking up service:', app.id, err);
    }

    setTimeout(() => {
      isProcessingWakeQueue = false;
      if (wakeQueue.length > 0) {
        processWakeQueue();
      }
    }, 800);
  }

  function checkHibernation() {
    if (HIBERNATE_TIMEOUT_MS <= 0) return; // Hibernasi dinonaktifkan
    const now = Date.now();
    apps.forEach(app => {
      if (app.id !== activeAppId) {
        const lastAccess = appLastAccessed[app.id] || now;
        if (now - lastAccess > HIBERNATE_TIMEOUT_MS) {
          const wv = document.getElementById('wv-' + app.id);
          const tab = document.getElementById('tab-' + app.id);
          
          if (wv && wv.dataset.hibernated !== 'true') {
            // Anti-Interruption Circuit: Check if audio is currently playing (active voice call / WebRTC)
            try {
              if (typeof wv.isCurrentlyAudible === 'function' && wv.isCurrentlyAudible()) {
                console.log('[Megabox Hibernate Guard] Active call or audio playing. Suppressing hibernation for:', app.id);
                return;
              }
            } catch (_) {}

            console.log('[Megabox Hibernate] Putting idle service to sleep:', app.id);
            wv.dataset.hibernated = 'true';
            wv.src = 'about:blank';
            if (tab) tab.classList.add('is-hibernated');
          }
        }
      }
    });
  }

  function reloadActiveApp() {
    if (!activeAppId) return;
    const wv = document.getElementById('wv-' + activeAppId);
    if (wv) {
      wv.reload();
    }
  }

  function updateDndUI() {
    if (!btnDnd) return;
    if (isDndActive) {
      btnDnd.classList.add('is-active');
      btnDnd.style.color = '#f43f5e';
      if (iconDndOff) iconDndOff.style.display = 'none';
      if (iconDndOn) iconDndOn.style.display = 'block';
    } else {
      btnDnd.classList.remove('is-active');
      btnDnd.style.color = '';
      if (iconDndOff) iconDndOff.style.display = 'block';
      if (iconDndOn) iconDndOn.style.display = 'none';
    }
  }

  function toggleDNDMode() {
    isDndActive = !isDndActive;
    localStorage.setItem('megabox_dnd_active', isDndActive);
    updateDndUI();

    // Mute or unmute all active webviews
    const webviews = document.querySelectorAll('webview');
    webviews.forEach(wv => {
      try {
        wv.setAudioMuted(isDndActive);
      } catch (_) {}
    });

    console.log('[Megabox DND] Concentration mode set to:', isDndActive);
  }

  if (btnDnd) {
    btnDnd.onclick = toggleDNDMode;
    updateDndUI();
  }

  async function deleteAppById(id) {
    if (window.megabox) {
      await window.megabox.deleteApp(id);
      apps = apps.filter(a => a.id !== id);
      const wv = document.getElementById('wv-' + id);
      if (wv) wv.remove();
      renderTabs();
      if (activeAppId === id && apps.length > 0) {
        selectApp(apps[0].id);
      }
    }
  }

    async function handleSaveService() {
    const name = inputServiceName.value.trim();
    let url = inputServiceUrl.value.trim();
    const icon = inputServiceIcon.value || 'custom';
    const targetId = inputServiceId ? inputServiceId.value.trim() : '';
    if (!name || !url) return;

    // Handle teamId placeholder (e.g. {teamId}.slack.com)
    if (url.includes('{teamId}')) {
      const team = prompt('Enter your Slack / Workspace team ID:', 'myteam');
      if (!team) return;
      url = url.replace('{teamId}', team.trim());
    }

    const existing = targetId ? apps.find(a => a.id === targetId) : null;
    
    // Multi-account guarantee: If not editing existing, generate unique ID
    const id = existing ? existing.id : ('app_' + icon + '_' + Date.now());
    const proxy = existing ? (existing.proxy || '') : '';
    const partType = 'private'; // Auto-default: setiap tab/aplikasi memiliki sesi pribadi terisolasi
    const partitionStr = existing ? existing.partition : ('persist:' + id);

    const newApp = {
      id: id,
      name: name,
      url: url,
      icon: icon,
      proxy: proxy,
      partition_type: partType,
      partition: partitionStr,
      order_index: existing ? existing.order_index : apps.length,
      is_enabled: 1
    };

    if (window.megabox) {
      btnFormSave.disabled = true;
      btnFormSave.textContent = 'Menyimpan...';
      try {
        await window.megabox.saveApp(newApp);
        selectApp(id);
      } finally {
        btnFormSave.disabled = false;
        btnFormSave.textContent = 'Simpan';
      }
    }

    configureModal.style.display = 'none';
  }

  // --- Additional Modules for Megabox: QuickSwitcher, WebControls, Per-Service Proxy, and Master PIN Lock ---

  // DOM Elements for New Features
  const btnExtensions = document.getElementById('btn-extensions');
  const btnQuickSwitch = document.getElementById('btn-quickswitch');
  const quickswitchModal = document.getElementById('quickswitch-modal');
  const quickswitchInput = document.getElementById('quickswitch-input');
  const quickswitchList = document.getElementById('quickswitch-list');

  let quickSwitchIndex = 0;
  let filteredQuickApps = [];


  // 2. Quick Switcher Logic (Workspace App Switcher)
  function openQuickSwitcher() {
    quickswitchModal.style.display = 'flex';
    quickswitchInput.value = '';
    quickSwitchIndex = 0;
    renderQuickSwitchList();
    setTimeout(() => quickswitchInput.focus(), 20);
  }

  function closeQuickSwitcher() {
    quickswitchModal.style.display = 'none';
    quickswitchInput.blur();
  }

  // System command palette actions
  const systemCommands = [
    { id: 'cmd:dnd', name: 'Mode Fokus', subtitle: 'Senyapkan Suara', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f1f5f9" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>', action: () => toggleDNDMode() },
    { id: 'cmd:catalog', name: 'Tambah Layanan', subtitle: 'Buka Katalog', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f1f5f9" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>', action: () => openCatalog() },
    { id: 'cmd:settings', name: 'Pengaturan Sistem', subtitle: 'Konfigurasi Sistem', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f1f5f9" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>', action: () => openSettingsModal() },
    { id: 'cmd:reload', name: 'Muat Ulang', subtitle: 'Reload Tab', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f1f5f9" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>', action: () => reloadActiveApp() }
  ];

  function renderQuickSwitchList() {
    const q = quickswitchInput.value.toLowerCase().trim();
    
    // Match apps
    const matchedApps = apps.filter(a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)).map(a => {
      const iconSrc = resolveAppIconSrc(a);
      return {
        type: 'app',
        id: a.id,
        name: a.name,
        subtitle: a.url,
        icon: iconSrc,
        action: () => selectApp(a.id)
      };
    });

    // Match system commands
    const matchedCommands = systemCommands.filter(c => c.name.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)).map(c => ({
      type: 'cmd',
      id: c.id,
      name: c.name,
      subtitle: c.subtitle,
      svg: c.svg,
      action: c.action
    }));

    filteredQuickApps = [...matchedApps, ...matchedCommands];

    quickswitchList.innerHTML = '';
    if (filteredQuickApps.length === 0) {
      quickswitchList.innerHTML = '<div style="padding:14px;text-align:center;color:#888;font-size:13px;">Tidak ada layanan atau perintah yang cocok</div>';
      return;
    }

    if (quickSwitchIndex >= filteredQuickApps.length) quickSwitchIndex = 0;
    if (quickSwitchIndex < 0) quickSwitchIndex = filteredQuickApps.length - 1;

    filteredQuickApps.forEach((app, idx) => {
      const item = document.createElement('div');
      item.className = 'quickswitch-item' + (idx === quickSwitchIndex ? ' is-selected' : '');
      
      const isCmd = app.type === 'cmd';
      const iconMarkup = (isCmd && app.svg)
        ? `<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${app.svg}</div>`
        : `<img src="${app.icon}" class="tab-icon" onerror="this.src='assets/icons/web.svg'">`;

      item.innerHTML = `
        ${iconMarkup}
        <div style="flex:1;overflow:hidden;">
          <div style="font-weight:600;font-size:14px;display:flex;align-items:center;gap:6px;">
            <span>${app.name}</span>
            ${isCmd ? '<span style="font-size:10px;background:rgba(114,102,240,0.25);color:#a5b4fc;padding:1px 5px;border-radius:3px;">Perintah</span>' : ''}
          </div>
          <div style="font-size:11px;opacity:0.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${app.subtitle}</div>
        </div>
        ${app.id === activeAppId ? '<span style="font-size:11px;background:rgba(255,255,255,0.15);padding:2px 6px;border-radius:4px;">Aktif</span>' : ''}
      `;

      item.onclick = () => {
        if (app.action) app.action();
        closeQuickSwitcher();
      };

      quickswitchList.appendChild(item);
    });

    const activeEl = quickswitchList.children[quickSwitchIndex];
    if (activeEl && activeEl.scrollIntoViewIfNeeded) {
      activeEl.scrollIntoViewIfNeeded(false);
    }
  }

  if (quickswitchInput) {
    quickswitchInput.addEventListener('input', () => {
      quickSwitchIndex = 0;
      renderQuickSwitchList();
    });

    quickswitchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      quickSwitchIndex++;
      renderQuickSwitchList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      quickSwitchIndex--;
      renderQuickSwitchList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredQuickApps[quickSwitchIndex]) {
        if (filteredQuickApps[quickSwitchIndex].action) {
          filteredQuickApps[quickSwitchIndex].action();
        }
        closeQuickSwitcher();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeQuickSwitcher();
    }
    });
  }

  if (btnExtensions) {
    btnExtensions.onclick = () => {
      if (typeof toggleExtensionDrawer === 'function') {
        toggleExtensionDrawer();
      }
    };
  }
  if (btnQuickSwitch) btnQuickSwitch.onclick = openQuickSwitcher;
  quickswitchModal.onclick = (e) => {
    if (e.target === quickswitchModal) closeQuickSwitcher();
  };
  // Note: All global keyboard shortcuts routed through unified dispatchShortcutAction

    
  // Settings & Cloud Sync UI Logic

  // Zero-bloat fast MD5 implementation for Gravatar avatar resolution
  function md5Cycle(x, k) {
    var a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }
  function cmn(q, a, b, x, s, t) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  function md51(s) {
    var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
    for (i = 64; i <= s.length; i += 64) {
      md5Cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    var tail = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
    for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5Cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5Cycle(state, tail);
    return state;
  }
  function md5blk(s) {
    var md5blks = [], i;
    for (i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  var hex_chr = '0123456789abcdef'.split('');
  function rhex(n) {
    var s = '', j = 0;
    for (; j < 4; j++) s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
    return s;
  }
  function hex(x) {
    for (var i = 0; i < x.length; i++) x[i] = rhex(x[i]);
    return x.join('');
  }
  function md5(s) { return hex(md51(s)); }
  function add32(a, b) { return (a + b) & 0xFFFFFFFF; }

  const btnSettings = document.getElementById('btn-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnSettingsClose = document.getElementById('btn-settings-close');
  const btnSettingsDone = document.getElementById('btn-settings-done');

  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // LOCAL-FIRST AVATAR CONTROLLER
  // -------------------------------------------------------------------------
  const sidebarAvatarImg = document.getElementById('avatar-user-img');
  const sidebarAvatarDefaultIcon = document.getElementById('avatar-default-icon');
  const settingsAvatarImg = document.getElementById('settings-avatar-img');
  const settingsAvatarDefaultIcon = document.getElementById('settings-avatar-default-icon');
  const btnPickAvatar = document.getElementById('btn-pick-avatar');
  const btnResetAvatar = document.getElementById('btn-reset-avatar');
  const inputAvatarFile = document.getElementById('input-avatar-file');

  const DEFAULT_MEGABOX_AVATAR = 'assets/megabox.png';

  function renderAvatar(dataUrl) {
    const avatarSrc = dataUrl || DEFAULT_MEGABOX_AVATAR;

    if (sidebarAvatarImg) {
      sidebarAvatarImg.src = avatarSrc;
      sidebarAvatarImg.style.display = 'block';
    }
    if (sidebarAvatarDefaultIcon) sidebarAvatarDefaultIcon.style.display = 'none';

    if (settingsAvatarImg) {
      settingsAvatarImg.src = avatarSrc;
      settingsAvatarImg.style.display = 'block';
    }
    if (settingsAvatarDefaultIcon) settingsAvatarDefaultIcon.style.display = 'none';
  }

  async function loadInitialAvatar() {
    if (window.megabox && window.megabox.getAvatar) {
      try {
        const res = await window.megabox.getAvatar();
        renderAvatar(res.avatar_url);
      } catch (e) {
        console.warn('[Avatar Load Failed]', e);
      }
    }
  }

  if (btnPickAvatar) {
    btnPickAvatar.onclick = async () => {
      console.log('[Avatar] btnPickAvatar clicked');
      // Primary: Trigger native OS file picker input
      if (inputAvatarFile) {
        inputAvatarFile.click();
        return;
      }

      // Secondary fallback: Electron showOpenDialog
      if (window.megabox && window.megabox.pickAndSaveAvatar) {
        btnPickAvatar.disabled = true;
        try {
          const res = await window.megabox.pickAndSaveAvatar();
          if (res && res.success && res.avatar_url) {
            renderAvatar(res.avatar_url);
          }
        } catch (err) {
          console.error('[Pick Avatar Error]', err);
        } finally {
          btnPickAvatar.disabled = false;
        }
      }
    };
  }

  // Handle instant file selection from inputAvatarFile
  if (inputAvatarFile) {
    inputAvatarFile.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target.result;
        renderAvatar(base64Data);

        // Persist via saveAvatarBase64
        if (window.megabox && window.megabox.saveAvatarBase64) {
          try {
            await window.megabox.saveAvatarBase64(base64Data);
            console.log('[Avatar] Base64 avatar saved successfully');
          } catch (err) {
            console.error('[Avatar] Failed to persist base64 avatar:', err);
          }
        }
      };
      reader.readAsDataURL(file);
      // Reset input value so user can select the same file again if desired
      inputAvatarFile.value = '';
    };
  }

  if (btnResetAvatar) {
    btnResetAvatar.onclick = async () => {
      console.log('[Avatar] btnResetAvatar clicked');
      if (!window.megabox || !window.megabox.resetAvatar) return;
      try {
        const res = await window.megabox.resetAvatar();
        if (res && res.success) {
          renderAvatar(null);
        }
      } catch (err) {
        console.error('[Reset Avatar Error]', err);
      }
    };
  }

  // Load avatar immediately upon start
  loadInitialAvatar();

  // LOCAL-FIRST BACKUP & COMMUNITY SUPPORT HANDLERS
  // -------------------------------------------------------------------------

  // Local-first no-op sync stub (mencegah ReferenceError pada panggilan legacy)
  function refreshSyncUI() {
    // Sesi cloud ruko dinonaktifkan demi privasi lokal
  }

  const btnBackupExport = document.getElementById('btn-backup-export');
  const btnBackupImport = document.getElementById('btn-backup-import');
  const backupStatusMsg = document.getElementById('backup-status-msg');
  const btnSupportQris = document.getElementById('btn-support-qris');
  const btnSupportGithub = document.getElementById('btn-support-github');
  const qrisModal = document.getElementById('qris-modal');
  const btnQrisClose = document.getElementById('btn-qris-close');
  const btnQrisDone = document.getElementById('btn-qris-done');

  if (btnBackupExport) {
    btnBackupExport.addEventListener('click', async () => {
      if (!window.megabox || !window.megabox.exportBackup) return;
      btnBackupExport.disabled = true;
      try {
        const res = await window.megabox.exportBackup();
        if (res.canceled) {
          btnBackupExport.disabled = false;
          return;
        }
        if (res.success) {
          if (backupStatusMsg) {
            backupStatusMsg.style.display = 'block';
            backupStatusMsg.style.borderColor = 'rgba(56, 189, 248, 0.4)';
            backupStatusMsg.style.color = '#38bdf8';
            backupStatusMsg.textContent = `Cadangan berhasil diekspor (${res.count} aplikasi) ke ${res.filePath}`;
          }
        } else {
          if (backupStatusMsg) {
            backupStatusMsg.style.display = 'block';
            backupStatusMsg.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            backupStatusMsg.style.color = '#f87171';
            backupStatusMsg.textContent = `Gagal ekspor: ${res.error || 'Terjadi kesalahan sistem'}`;
          }
        }
      } catch (err) {
        if (backupStatusMsg) {
          backupStatusMsg.style.display = 'block';
          backupStatusMsg.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          backupStatusMsg.style.color = '#f87171';
          backupStatusMsg.textContent = `Error: ${err.message}`;
        }
      } finally {
        btnBackupExport.disabled = false;
      }
    });
  }

  if (btnBackupImport) {
    btnBackupImport.addEventListener('click', async () => {
      if (!window.megabox || !window.megabox.importBackup) return;
      btnBackupImport.disabled = true;
      try {
        const res = await window.megabox.importBackup();
        if (res.canceled) {
          btnBackupImport.disabled = false;
          return;
        }
        if (res.success) {
          if (backupStatusMsg) {
            backupStatusMsg.style.display = 'block';
            backupStatusMsg.style.borderColor = 'rgba(34, 197, 94, 0.4)';
            backupStatusMsg.style.color = '#4ade80';
            backupStatusMsg.textContent = `Berhasil memulihkan ${res.count} aplikasi dari berkas cadangan!`;
          }
          if (apps.length > 0) {
            selectApp(apps[0].id);
          }
        } else {
          if (backupStatusMsg) {
            backupStatusMsg.style.display = 'block';
            backupStatusMsg.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            backupStatusMsg.style.color = '#f87171';
            backupStatusMsg.textContent = `Gagal impor: ${res.error || 'Format tidak didukung'}`;
          }
        }
      } catch (err) {
        if (backupStatusMsg) {
          backupStatusMsg.style.display = 'block';
          backupStatusMsg.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          backupStatusMsg.style.color = '#f87171';
          backupStatusMsg.textContent = `Error: ${err.message}`;
        }
      } finally {
        btnBackupImport.disabled = false;
      }
    });
  }

  // Donation / Sponsor Click Handlers (QRIS Modal Popup)
  if (btnSupportQris && qrisModal) {
    btnSupportQris.onclick = () => {
      qrisModal.style.display = 'flex';
    };
    if (btnQrisClose) {
      btnQrisClose.onclick = () => {
        qrisModal.style.display = 'none';
      };
    }
    if (btnQrisDone) {
      btnQrisDone.onclick = () => {
        qrisModal.style.display = 'none';
      };
    }
    qrisModal.onclick = (e) => {
      if (e.target === qrisModal) qrisModal.style.display = 'none';
    };
  }

  if (btnSupportGithub) {
    btnSupportGithub.onclick = () => {
      if (window.megabox && window.megabox.openExternal) {
        window.megabox.openExternal('https://github.com/sponsors/4ntiDandruff');
      }
    };
  }

  const tabNavGeneral = document.getElementById('tab-nav-general');
  const tabNavSync = document.getElementById('tab-nav-sync');
  const tabNavAbout = document.getElementById('tab-nav-about');
  const secGeneral = document.getElementById('section-settings-general');
  const secSync = document.getElementById('section-settings-sync');
  const secAbout = document.getElementById('section-settings-about');

  function switchSettingsTab(tabName) {
    const tabs = [
      { id: 'general', btn: tabNavGeneral, sec: secGeneral },
      { id: 'sync', btn: tabNavSync, sec: secSync },
      { id: 'about', btn: tabNavAbout, sec: secAbout }
    ];
    tabs.forEach(t => {
      if (!t.btn || !t.sec) return;
      if (t.id === tabName) {
        t.btn.classList.add('is-active');
        t.btn.style.removeProperty('background');
        t.btn.style.removeProperty('color');
        t.btn.style.removeProperty('border-color');
        t.sec.style.display = 'flex';
      } else {
        t.btn.classList.remove('is-active');
        t.btn.style.removeProperty('background');
        t.btn.style.removeProperty('color');
        t.btn.style.removeProperty('border-color');
        t.sec.style.display = 'none';
      }
    });
  }

  if (tabNavGeneral) tabNavGeneral.onclick = () => switchSettingsTab('general');
  if (tabNavSync) tabNavSync.onclick = () => switchSettingsTab('sync');
  if (tabNavAbout) tabNavAbout.onclick = () => switchSettingsTab('about');

  const settingHibernateTimeout = document.getElementById('setting-hibernate-timeout');
  const settingCloseAction = document.getElementById('setting-close-action');
  const settingAutostart = document.getElementById('setting-autostart');
  const settingsStatusSave = document.getElementById('settings-status-save');

  async function loadSystemSettings() {
    if (!window.megabox || !window.megabox.getSettings) return;
    try {
      const cfg = await window.megabox.getSettings();
      if (settingHibernateTimeout) {
        settingHibernateTimeout.value = String(cfg.hibernate_timeout_minutes ?? 15);
        const mins = parseInt(settingHibernateTimeout.value, 10);
        HIBERNATE_TIMEOUT_MS = mins > 0 ? mins * 60 * 1000 : 0;
      }
      if (settingCloseAction) {
        settingCloseAction.value = cfg.close_to_tray === false ? 'quit' : 'tray';
      }
      if (settingAutostart) {
        settingAutostart.checked = Boolean(cfg.autostart);
      }
    } catch (e) {
      console.warn('[Settings Load Failed]', e);
    }
  }

  async function persistSystemSettings() {
    if (!window.megabox || !window.megabox.saveSettings) return;
    try {
      const mins = parseInt(settingHibernateTimeout.value, 10);
      HIBERNATE_TIMEOUT_MS = mins > 0 ? mins * 60 * 1000 : 0;
      const closeToTray = settingCloseAction.value === 'tray';
      const autostart = Boolean(settingAutostart.checked);

      await window.megabox.saveSettings({
        hibernate_timeout_minutes: mins,
        close_to_tray: closeToTray,
        autostart: autostart
      });

      if (settingsStatusSave) {
        settingsStatusSave.style.display = 'inline-block';
        setTimeout(() => { settingsStatusSave.style.display = 'none'; }, 2000);
      }
    } catch (e) {
      console.warn('[Settings Save Failed]', e);
    }
  }

  if (settingHibernateTimeout) settingHibernateTimeout.onchange = persistSystemSettings;
  if (settingCloseAction) settingCloseAction.onchange = persistSystemSettings;
  if (settingAutostart) settingAutostart.onchange = persistSystemSettings;

    // Tentang / About external portfolio and links
  const btnAboutGithub = document.getElementById('btn-about-github');
  const btnAboutPortfolio = document.getElementById('btn-about-portfolio');
  const btnAboutMegapass = document.getElementById('btn-about-megapass');

  if (btnAboutGithub) {
    btnAboutGithub.onclick = () => {
      if (window.megabox && window.megabox.openExternal) {
        window.megabox.openExternal('https://github.com/4ntiDandruff/megabox');
      }
    };
  }
  if (btnAboutPortfolio) {
    btnAboutPortfolio.onclick = () => {
      if (window.megabox && window.megabox.openExternal) {
        window.megabox.openExternal('https://megapass.web.id/teknisi/');
      }
    };
  }
  if (btnAboutMegapass) {
    btnAboutMegapass.onclick = () => {
      if (window.megabox && window.megabox.openExternal) {
        window.megabox.openExternal('https://megapass.web.id');
      }
    };
  }

  const btnClearCache = document.getElementById('btn-clear-cache');
  const clearCacheMsg = document.getElementById('clear-cache-msg');

  if (btnClearCache) {
    btnClearCache.onclick = async () => {
      btnClearCache.disabled = true;
      btnClearCache.innerHTML = '<span>Membersihkan...</span>';
      try {
        const res = await window.megabox.clearCache();
        if (res.success) {
          clearCacheMsg.style.display = 'block';
          clearCacheMsg.style.color = '#22c55e';
          clearCacheMsg.textContent = '[+] Cache Chromium & GPU berhasil dikosongkan!';
        } else {
          clearCacheMsg.style.display = 'block';
          clearCacheMsg.style.color = '#ef4444';
          clearCacheMsg.textContent = '[-] Gagal: ' + res.error;
        }
      } catch (err) {
        clearCacheMsg.style.display = 'block';
        clearCacheMsg.style.color = '#ef4444';
        clearCacheMsg.textContent = '[-] Error: ' + err.message;
      } finally {
        btnClearCache.disabled = false;
        btnClearCache.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg><span>Bersihkan Cache</span>';
        // Clear cache message stays visible until modal closes
      }
    };
  }

  if (btnSettings && settingsModal) {
    btnSettings.onclick = async () => {
      settingsModal.style.display = 'flex';
      switchSettingsTab('general');
      await loadSystemSettings();
      await refreshSyncUI();
    };
    if (btnSettingsClose) {
      btnSettingsClose.onclick = () => {
        settingsModal.style.display = "none";
      };
    }
    if (btnSettingsDone) {
      btnSettingsDone.onclick = () => {
        settingsModal.style.display = "none";
      };
    }
    settingsModal.onclick = (e) => {
      if (e.target === settingsModal) settingsModal.style.display = 'none';
    };
  }

  window.addEventListener('DOMContentLoaded', init);

  // --- Contextual Right Extension Drawer Controller ---
  const extensionDrawer = document.getElementById('extension-drawer');
  const drawerOverlay = document.getElementById('drawer-overlay');
  const btnDrawerClose = document.getElementById('btn-drawer-close');
  const drawerTitle = document.getElementById('drawer-title');
  const drawerSubtitle = document.getElementById('drawer-subtitle');
  const drawerExtensionList = document.getElementById('drawer-extension-list');

  // Built-in Chromium extensions catalog for Megabox (Valid verified local SVGs)
  const extensionCatalog = [
    { id: 'translate', name: 'Terjemahan Seleksi Teks', desc: 'Tooltip instan dua arah (ID ↔ EN) saat memblok teks di chat', icon: 'assets/icons/google-translate.svg', enabledByDefault: true },
    { id: 'dark-reader', name: 'Dark Reader', desc: 'Mode gelap pelindung mata', icon: 'assets/icons/theme-light-dark.svg', enabledByDefault: false },
    { id: 'bitwarden', name: 'Bitwarden', desc: 'Pengelola sandi terenkripsi', icon: 'assets/icons/bitwarden.svg', enabledByDefault: false },
    { id: 'ublock-origin', name: 'uBlock Origin', desc: 'Pemblokir iklan & pelacak', icon: 'assets/icons/shield.svg', enabledByDefault: true }
  ];

  function openExtensionDrawer() {
    if (!extensionDrawer) return;
    extensionDrawer.style.display = 'flex';
    const currentApp = apps.find(a => a.id === activeAppId);
    const appName = currentApp ? currentApp.name : 'Layanan';

    if (drawerTitle) drawerTitle.textContent = `Ekstensi "${appName}"`;
    if (drawerSubtitle) drawerSubtitle.textContent = `Partisi: ${currentApp ? currentApp.partition || 'Pribadi' : 'Bawaan'}`;

    renderDrawerExtensions(currentApp);

    if (drawerOverlay) drawerOverlay.classList.add('is-open');
    extensionDrawer.classList.add('is-open');
  }

  function closeExtensionDrawer() {
    if (drawerOverlay) drawerOverlay.classList.remove('is-open');
    if (extensionDrawer) extensionDrawer.classList.remove('is-open');
  }

  function toggleExtensionDrawer() {
    if (extensionDrawer && extensionDrawer.classList.contains('is-open')) {
      closeExtensionDrawer();
    } else {
      openExtensionDrawer();
    }
  }

  function renderDrawerExtensions(app) {
    if (!drawerExtensionList) return;
    drawerExtensionList.innerHTML = '';

    const appExtKey = 'megabox_ext_' + (app ? app.id : 'default');
    let savedPrefs = {};
    try {
      savedPrefs = JSON.parse(localStorage.getItem(appExtKey) || '{}');
    } catch (_) {}

    extensionCatalog.forEach(ext => {
      const isEnabled = savedPrefs[ext.id] !== undefined ? savedPrefs[ext.id] : ext.enabledByDefault;
      const card = document.createElement('div');
      card.className = 'drawer-extension-card';

      card.innerHTML = `
        <div class="ext-icon-box">
          <img src="${ext.icon}" onerror="this.src='assets/icons/shield.svg'">
        </div>
        <div class="ext-info">
          <div class="ext-name">${ext.name}</div>
          <div class="ext-desc">${ext.desc}</div>
        </div>
        <label class="switch">
          <input type="checkbox" ${isEnabled ? 'checked' : ''} data-ext="${ext.id}">
          <span class="slider"></span>
        </label>
      `;

      const toggle = card.querySelector('input');
      toggle.addEventListener('change', () => {
        savedPrefs[ext.id] = toggle.checked;
        localStorage.setItem(appExtKey, JSON.stringify(savedPrefs));
        console.log(`[Megabox Extensions] ${ext.id} set to ${toggle.checked} for app ${app ? app.id : 'default'}`);

        // If Dark Reader toggled, apply immediate fast CSS injection for instant result!
        if (ext.id === 'dark-reader' && activeAppId) {
          const wv = document.getElementById('wv-' + activeAppId);
          if (wv) {
            if (toggle.checked) {
              wv.insertCSS(`
                html, body { filter: invert(90%) hue-rotate(180deg) !important; background: #121212 !important; }
                img, video, canvas, [style*="background-image"] { filter: invert(100%) hue-rotate(180deg) !important; }
              `).catch(() => {});
            } else {
              wv.reload();
            }
          }
        }
      });

      drawerExtensionList.appendChild(card);
    });
  }

  if (btnDrawerClose) btnDrawerClose.onclick = closeExtensionDrawer;
  if (drawerOverlay) drawerOverlay.onclick = closeExtensionDrawer;
})();
