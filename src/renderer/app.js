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
  const ctxCopyUrl = document.getElementById('ctx-copy-url');
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

  // ============================================================================
  // Megabox Discrete Zoom System & Cupertino Crystal HUD OSD
  // Standard scale: 30%, 50%, 67%, 75%, 80%, 90%, 100%, 110%, 125%, 150%, 175%, 200%, 250%, 300%
  // ============================================================================
  const ZOOM_PERCENT_STEPS = [30, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300];

  function percentToZoomFactor(pct) {
    return pct / 100;
  }

  function zoomFactorToPercent(factor) {
    return Math.round((factor || 1) * 100);
  }

  // Find nearest discrete zoom step
  function findClosestStepIndex(currentPct) {
    let closestIdx = 6; // default 100%
    let minDiff = 9999;
    ZOOM_PERCENT_STEPS.forEach((step, idx) => {
      const diff = Math.abs(step - currentPct);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    return closestIdx;
  }

  let zoomHudTimer = null;

  function showZoomHud(percent) {
    const hud = document.getElementById('zoom-hud-pill');
    const txtPercent = document.getElementById('zoom-hud-percent');
    const btnReset = document.getElementById('zoom-hud-btn-reset');
    if (!hud || !txtPercent) return;

    txtPercent.textContent = percent + '%';
    if (btnReset) {
      btnReset.style.display = (percent !== 100) ? 'inline-block' : 'none';
    }

    hud.style.display = 'flex';
    requestAnimationFrame(() => {
      hud.style.opacity = '1';
      hud.style.transform = 'translateX(-50%) translateY(0)';
    });

    if (zoomHudTimer) clearTimeout(zoomHudTimer);
    zoomHudTimer = setTimeout(() => {
      hud.style.opacity = '0';
      hud.style.transform = 'translateX(-50%) translateY(-6px)';
      setTimeout(() => {
        if (hud.style.opacity === '0') hud.style.display = 'none';
      }, 220);
    }, 1600);
  }

  // Megabox Active Webview Zoom Controller with per-app persistence
  async function zoomActiveApp(dir) {
    if (!activeAppId) return;
    const wv = document.getElementById('wv-' + activeAppId);
    if (!wv || typeof wv.getZoomFactor !== 'function') return;

    try {
      const currentFactor = await wv.getZoomFactor();
      const currentPct = zoomFactorToPercent(currentFactor);
      let stepIdx = findClosestStepIndex(currentPct);

      if (dir === 'in') {
        if (ZOOM_PERCENT_STEPS[stepIdx] <= currentPct) {
          stepIdx = Math.min(stepIdx + 1, ZOOM_PERCENT_STEPS.length - 1);
        }
      } else if (dir === 'out') {
        if (ZOOM_PERCENT_STEPS[stepIdx] >= currentPct) {
          stepIdx = Math.max(stepIdx - 1, 0);
        }
      } else if (dir === 'reset') {
        stepIdx = 6; // 100%
      }

      const nextPercent = ZOOM_PERCENT_STEPS[stepIdx];
      const nextFactor = percentToZoomFactor(nextPercent);

      wv.setZoomFactor(nextFactor);
      try { wv.send('zoom:set-factor', nextFactor); } catch (_) {}
      
      // Persist zoom setting for this service
      localStorage.setItem('megabox_zoom_' + activeAppId, String(nextPercent));
      console.log('[Megabox Zoom]', activeAppId, dir, `${currentPct}% -> ${nextPercent}%`);

      // Trigger visual feedback
      showZoomHud(nextPercent);
    } catch (err) {
      console.warn('[Megabox Zoom Error]', err);
    }
  }

  // Apply persisted zoom to a webview
  function restoreWebviewZoom(appId, wv) {
    if (!appId || !wv || typeof wv.setZoomFactor !== 'function') return;
    try {
      const savedPct = parseInt(localStorage.getItem('megabox_zoom_' + appId), 10);
      if (!isNaN(savedPct) && savedPct > 0) {
        const factor = percentToZoomFactor(savedPct);
        // Only set if different from current zoom factor to prevent Chromium layout flash
        if (typeof wv.getZoomFactor === 'function') {
          wv.getZoomFactor((currentFactor) => {
            if (Math.abs(currentFactor - factor) > 0.01) {
              wv.setZoomFactor(factor);
              try { wv.send('zoom:set-factor', factor); } catch (_) {}
            }
          });
        } else {
          wv.setZoomFactor(factor);
          try { wv.send('zoom:set-factor', factor); } catch (_) {}
        }
      }
    } catch (_) {}
  }

  async function init() {
    setupEventListeners();
    loadSystemSettings();
    await loadRecipesCatalog();
    
    loadApps();
    setInterval(checkHibernation, 60000);


  }

  function setupEventListeners() {




    // Unified Shortcut Dispatcher (handles IPC from Main/Webviews as well as local Renderer keys)
    function dispatchShortcutAction(data) {
      if (!data || !data.action) return;
      const { action, dir, index } = data;

      switch (action) {
                case "zoom-in": {
          zoomActiveApp("in");
          break;
        }
        case "zoom-out": {
          zoomActiveApp("out");
          break;
        }
        case "zoom-reset": {
          zoomActiveApp("reset");
          break;
        }
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
        case 'home-active': {
          const targetId = (contextTargetApp && contextTargetApp.id) || activeAppId;
          if (targetId) {
            const currentApp = apps.find(a => a.id === targetId);
            const wv = document.getElementById('wv-' + targetId);
            if (wv && currentApp && currentApp.url) {
              wv.loadURL(currentApp.url);
            }
          }
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
          const dlPopover = document.getElementById("download-history-popover");
          if (dlPopover) dlPopover.style.display = "none";
          const qrisModal = document.getElementById("qris-modal");
          if (qrisModal) qrisModal.style.display = "none";
          if (typeof closeQuickSwitcher === 'function') closeQuickSwitcher();
          if (typeof closeExtensionDrawer === 'function') closeExtensionDrawer();
          hideContextMenu();
          break;
        }
      }
    }
    window.dispatchShortcutAction = dispatchShortcutAction;
    // Wire Zoom HUD OSD Buttons
    const btnZoomHudIn = document.getElementById('zoom-hud-btn-in');
    const btnZoomHudOut = document.getElementById('zoom-hud-btn-out');
    const btnZoomHudReset = document.getElementById('zoom-hud-btn-reset');
    if (btnZoomHudIn) btnZoomHudIn.onclick = () => zoomActiveApp('in');
    if (btnZoomHudOut) btnZoomHudOut.onclick = () => zoomActiveApp('out');
    if (btnZoomHudReset) btnZoomHudReset.onclick = () => zoomActiveApp('reset');


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

            // Megabox Webview Zoom Shortcuts
      if (isCtrl && !isAlt && (key === "+" || key === "=" || e.code === "NumpadAdd" || e.code === "Equal")) {
        e.preventDefault();
        dispatchShortcutAction({ action: "zoom-in" });
      } else if (isCtrl && !isAlt && (key === "-" || key === "_" || e.code === "NumpadSubtract" || e.code === "Minus")) {
        e.preventDefault();
        dispatchShortcutAction({ action: "zoom-out" });
      } else if (isCtrl && !isAlt && !isShift && (key === "0" || e.code === "Numpad0" || e.code === "Digit0")) {
        e.preventDefault();
        dispatchShortcutAction({ action: "zoom-reset" });
      } else if (isAlt && !isCtrl && !isShift && key >= '1' && key <= '9') {
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

    if (ctxCopyUrl) {
      ctxCopyUrl.onclick = async () => {
        if (contextTargetApp) {
          const wv = document.getElementById('wv-' + contextTargetApp.id);
          let urlToCopy = '';
          try {
            if (wv && typeof wv.getURL === 'function') {
              urlToCopy = wv.getURL();
            }
          } catch (_) {}

          if (!urlToCopy || urlToCopy === 'about:blank') {
            urlToCopy = (wv && wv.src) || contextTargetApp.url || '';
          }

          if (urlToCopy && urlToCopy !== 'about:blank') {
            let copied = false;
            if (window.megabox && typeof window.megabox.copyToClipboard === 'function') {
              const res = await window.megabox.copyToClipboard(urlToCopy);
              copied = res && res.success;
            }
            if (!copied && navigator.clipboard) {
              try {
                await navigator.clipboard.writeText(urlToCopy);
                copied = true;
              } catch (_) {}
            }
            if (typeof showGlobalToast === 'function') {
              showGlobalToast('URL berhasil disalin: ' + urlToCopy, 'success');
            }
          } else {
            if (typeof showGlobalToast === 'function') {
              showGlobalToast('Gagal menyalin: Halaman belum memuat URL valid', 'danger');
            }
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
      if (window.megabox.onShowToast) {
        window.megabox.onShowToast(({ message, type }) => {
          if (typeof showGlobalToast === 'function') {
            showGlobalToast(message, type || 'info');
          }
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
    if (lowerName.includes('router') || lowerName.includes('agy') || lowerName.includes('clash') || lowerName.includes('zevai')) return 'assets/icons/openrouter.svg';
    if (lowerName.includes('panel') || lowerName.includes('megapass') || lowerName.includes('cloud')) return 'assets/icons/cloudflare.svg';
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
        const preloadUrl = (window.megabox && window.megabox.webviewPreloadUrl) ? window.megabox.webviewPreloadUrl : '../main/preload-webview.js';
        wv.setAttribute('preload', preloadUrl);
        wv.setAttribute('allowpopups', '');
        if (activeAppId === app.id) wv.classList.add('is-active-wv');

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
          restoreWebviewZoom(app.id, wv);
          // Sync translate & sponsorblock toggle states to webview
          try {
            const appExtKey = 'megabox_ext_' + app.id;
            const prefs = JSON.parse(localStorage.getItem(appExtKey) || '{}');
            const isTranslateEnabled = prefs['translate'] !== undefined ? prefs['translate'] : true;
            wv.send('translate:toggle-state', isTranslateEnabled);
            const isSponsorBlockEnabled = prefs['sponsorblock'] !== undefined ? prefs['sponsorblock'] : true;
            wv.send('sponsorblock:toggle-state', isSponsorBlockEnabled);
            const isAdblockThingEnabled = prefs['adblock-thing'] !== undefined ? prefs['adblock-thing'] : true;
            wv.send('adblock-thing:toggle-state', isAdblockThingEnabled);
          } catch (_) {}
          // Proactively send credentials to webview on dom-ready
          if (window.megabox && typeof window.megabox.vaultFindForUrl === 'function') {
            const checkUrl = wv.src || app.url;
            window.megabox.vaultFindForUrl(checkUrl).then(res => {
              if (res && res.success && res.matches && res.matches.length > 0) {
                wv.send('megawarden:autofill-data', res.matches);
                console.log('[Megawarden] Proactively sent', res.matches.length, 'credentials on dom-ready to', app.name);
              }
            }).catch(() => {});
          }
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
                    if (event.channel === "webview-zoom") {
            const dir = event.args[0] || "in";
            zoomActiveApp(dir);
          }
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
          if (event.channel === 'megawarden:request-credentials') {
            const data = event.args[0] || {};
            const reqUrl = data.url || wv.src || app.url || '';
            if (window.megabox && typeof window.megabox.vaultFindForUrl === 'function') {
              window.megabox.vaultFindForUrl(reqUrl).then(res => {
                const matches = (res && res.success && res.matches) ? res.matches : [];
                wv.send('megawarden:autofill-data', matches);
                console.log('[Megawarden] Sent', matches.length, 'matched credentials to', app.name);
              }).catch(err => {
                console.warn('[Megawarden] Autofill query failed:', err.message);
              });
            }
          }
          if (event.channel === 'megawarden:save-prompt') {
            const data = event.args[0] || {};
            if (typeof window.handleMegawardenPrompt === 'function') {
              window.handleMegawardenPrompt(data);
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
    // Clear secondary active tab styles
    apps.forEach(app => {
      const tab = document.getElementById('tab-' + app.id);
      if (tab) tab.classList.remove('is-secondary-active');
    });
    selectApp(activeAppId);
    console.log('[Megabox Tile] Exited split tile view');
  }

  function triggerWebviewRelayout() {
    // Force Chromium/Electron Webview render bounds synchronization
    requestAnimationFrame(() => {
      const activeWvs = document.querySelectorAll('webview.is-active-wv');
      activeWvs.forEach(wv => {
        // Trigger resize layout cycle in webview
        if (typeof wv.focus === 'function') {
          try {
            // Dispatch resize event inside webview guest if accessible
            wv.executeJavaScript('window.dispatchEvent(new Event("resize"));').catch(() => {});
          } catch (_) {}
        }
      });
      // Global window resize trigger for bounds refresh
      window.dispatchEvent(new Event('resize'));
    });
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

    // Show both webviews and hide inactive from layout flow
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
          wv.classList.add('is-active-wv');
        } else {
          wv.classList.remove('is-active-wv');
        }
      }
      if (tab) {
        if (app.id === activeAppId) {
          tab.classList.add('is-active');
          tab.classList.remove('is-secondary-active');
        } else if (app.id === secondaryTiledAppId) {
          tab.classList.remove('is-active');
          tab.classList.add('is-secondary-active');
        } else {
          tab.classList.remove('is-active');
          tab.classList.remove('is-secondary-active');
        }
      }
    });

    triggerWebviewRelayout();
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
    const menuWidth = contextMenu.offsetWidth || 240;
    const menuHeight = contextMenu.offsetHeight || 470;
    contextMenu.style.visibility = 'visible';

    const safeX = Math.max(8, Math.min(x, window.innerWidth - menuWidth - 12));
    const safeY = Math.max(8, Math.min(y, window.innerHeight - menuHeight - 12));
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
      if (id === activeAppId || id === secondaryTiledAppId) {
        // Swap primary/secondary active focus within tile mode without breaking split view
        if (id === secondaryTiledAppId) {
          const prevActive = activeAppId;
          activeAppId = secondaryTiledAppId;
          secondaryTiledAppId = prevActive;
        }
        appLastAccessed[activeAppId] = Date.now();

        apps.forEach(app => {
          const tab = document.getElementById('tab-' + app.id);
          if (tab) {
            if (app.id === activeAppId) {
              tab.classList.add('is-active');
              tab.classList.remove('is-secondary-active');
            } else if (app.id === secondaryTiledAppId) {
              tab.classList.remove('is-active');
              tab.classList.add('is-secondary-active');
            } else {
              tab.classList.remove('is-active');
              tab.classList.remove('is-secondary-active');
            }
          }
        });

        const targetWv = document.getElementById('wv-' + activeAppId);
        if (targetWv && typeof targetWv.focus === 'function') {
          try { targetWv.focus(); } catch (_) {}
        }
        return;
      } else {
        // Clicked external 3rd app -> exit tile mode cleanly
        isTileModeActive = false;
        secondaryTiledAppId = null;
        webviewsContainer.classList.remove('is-tiled');
        apps.forEach(app => {
          const tab = document.getElementById('tab-' + app.id);
          if (tab) tab.classList.remove('is-secondary-active');
        });
      }
    }
    activeAppId = id;
    appLastAccessed[id] = Date.now();

    apps.forEach(app => {
      const tab = document.getElementById('tab-' + app.id);
      if (tab) {
        tab.classList.remove('is-secondary-active');
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
            // If the webview was set to about:blank previously, restore app.url; otherwise keep loaded DOM intact
            if (wv.src === 'about:blank' || !wv.src) {
              wv.src = app.url;
            }
            if (!isDndActive) {
              try { if (typeof wv.setAudioMuted === 'function') wv.setAudioMuted(false); } catch (_) {}
            }
            if (tab) tab.classList.remove('is-hibernated');
          }
          wv.classList.add('is-active-wv');
          // Sync current translate & sponsorblock extension states on tab switch
          try {
            const appExtKey = 'megabox_ext_' + app.id;
            const prefs = JSON.parse(localStorage.getItem(appExtKey) || '{}');
            const isTranslateEnabled = prefs['translate'] !== undefined ? prefs['translate'] : true;
            wv.send('translate:toggle-state', isTranslateEnabled);
            const isSponsorBlockEnabled = prefs['sponsorblock'] !== undefined ? prefs['sponsorblock'] : true;
            wv.send('sponsorblock:toggle-state', isSponsorBlockEnabled);
            const isAdblockThingEnabled = prefs['adblock-thing'] !== undefined ? prefs['adblock-thing'] : true;
            wv.send('adblock-thing:toggle-state', isAdblockThingEnabled);
          } catch (_) {}
          // Only restore zoom if not already 100% or explicitly customized to avoid re-rendering layout jump
          const savedPct = parseInt(localStorage.getItem('megabox_zoom_' + app.id), 10);
          if (!isNaN(savedPct) && savedPct !== 100) {
            restoreWebviewZoom(app.id, wv);
          }
          try { wv.focus(); } catch (err) {}
        } else {
          wv.classList.remove('is-active-wv');
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
      if (wv.src === 'about:blank' || !wv.src) {
        wv.src = app.url;
      }
      if (!isDndActive) {
        try { if (typeof wv.setAudioMuted === 'function') wv.setAudioMuted(false); } catch (_) {}
      }
      if (tab) tab.classList.remove('is-hibernated');
    } else {
      // Hibernate
      wv.dataset.hibernated = 'true';
      try {
        if (typeof wv.setAudioMuted === 'function') wv.setAudioMuted(true);
      } catch (_) {}
      if (tab) tab.classList.add('is-hibernated');
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

            console.log('[Megabox Hibernate] Putting idle service to sleep (suspending background tasks):', app.id);
            wv.dataset.hibernated = 'true';
            // Electron/Chromium Background Throttling without destroying the DOM tree (prevents viewport flicker)
            try {
              if (typeof wv.setAudioMuted === 'function') wv.setAudioMuted(true);
            } catch (_) {}
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
      btnDnd.style.color = '#5E5CE6';
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

  // --- Additional Modules for Megabox: QuickSwitcher, WebControls, Per-Service Proxy ---

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
    
    // Pure workspace application switcher (clean, high-speed, zero-distraction)
    filteredQuickApps = apps.filter(a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)).map(a => {
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

    quickswitchList.innerHTML = '';
    if (filteredQuickApps.length === 0) {
      quickswitchList.innerHTML = '<div style="padding:20px;text-align:center;color:#8E8E93;font-size:13px;font-weight:500;">Tidak ada layanan yang cocok</div>';
      return;
    }

    if (quickSwitchIndex >= filteredQuickApps.length) quickSwitchIndex = 0;
    if (quickSwitchIndex < 0) quickSwitchIndex = filteredQuickApps.length - 1;

    filteredQuickApps.forEach((app, idx) => {
      const item = document.createElement('div');
      item.className = 'quickswitch-item' + (idx === quickSwitchIndex ? ' is-selected' : '');

      const isCurrentActive = (app.id === activeAppId);

      item.innerHTML = `
        <img src="${app.icon}" class="quickswitch-icon" alt="${app.name}" onerror="this.src='assets/icons/web.svg'">
        <div class="quickswitch-item-info">
          <div class="quickswitch-item-name">
            <span>${app.name}</span>
          </div>
          <div class="quickswitch-item-sub">${app.subtitle}</div>
        </div>
        ${isCurrentActive ? '<span class="quickswitch-badge-active">Aktif</span>' : ''}
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

// Local-First architecture: zero-cloud overhead

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
            backupStatusMsg.style.color = '#0071E3';
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
        window.megabox.openExternal('https://github.com/4ntiDandruff/megabox');
      }
    };
  }

  const tabNavGeneral = document.getElementById('tab-nav-general');
  const tabNavVault = document.getElementById('tab-nav-vault');
  const tabNavSync = document.getElementById('tab-nav-sync');
  const tabNavAbout = document.getElementById('tab-nav-about');
  const secGeneral = document.getElementById('section-settings-general');
  const secVault = document.getElementById('section-settings-vault');
  const secSync = document.getElementById('section-settings-sync');
  const secAbout = document.getElementById('section-settings-about');

  function switchSettingsTab(tabName) {
    const tabs = [
      { id: 'general', btn: tabNavGeneral, sec: secGeneral },
      { id: 'vault', btn: tabNavVault, sec: secVault },
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
  if (tabNavVault) tabNavVault.onclick = () => {
    switchSettingsTab('vault');
    loadMegawardenVault();
  };
  if (tabNavSync) tabNavSync.onclick = () => switchSettingsTab('sync');
  if (tabNavAbout) tabNavAbout.onclick = () => switchSettingsTab('about');

  const settingHibernateTimeout = document.getElementById('setting-hibernate-timeout');
  const settingCloseAction = document.getElementById('setting-close-action');
  const settingAutostart = document.getElementById('setting-autostart');
  const settingAutoupdate = document.getElementById('setting-autoupdate');
  const settingsStatusSave = document.getElementById('settings-status-save');

  // Update Notifier DOM Elements
  const updateBanner = document.getElementById('update-banner');
  const updateBannerText = document.getElementById('i18n-update-banner-text');
  const btnUpdateDownload = document.getElementById('btn-update-download');
  const btnUpdateLater = document.getElementById('btn-update-later');
  const btnUpdateClose = document.getElementById('btn-update-close');
  const btnCheckUpdates = document.getElementById('btn-check-updates');
  const updateCheckStatusMsg = document.getElementById('update-check-status-msg');
  let currentAvailableUpdate = null;


  // ==========================================
  // MEGABOX DUAL-LANGUAGE (EN / ID) I18N ENGINE
  // ==========================================
  // Megabox Zero-Bloat Reactive i18n Dictionary
  // Single Source of Truth for EN and ID
  // ==========================================
  const I18N = {
    en: {
      // Sidebar tooltips
      add_service_title: "Add App (Ctrl+N)",
      btn_settings_title: "Workspace Settings",
      btn_reload_title: "Reload App (Ctrl+R)",
      btn_dnd_quiet: "Focus Mode (Mute Notifications)",
      btn_dnd_active: "Focus Mode Active",

      // Context Menu
      ctx_back: "Back",
      ctx_forward: "Forward",
      ctx_reload: "Reload",
      ctx_home: "Home",
      ctx_browser: "Open in Browser",
      ctx_split: "Split Screen",
      ctx_hibernate: "Hibernate",
      ctx_wake: "Wake Up",
      ctx_move_up: "Move Up",
      ctx_move_down: "Move Down",
      ctx_edit: "Edit App",
      ctx_delete: "Delete App",

      // Settings Header & Navigation
      settings_header_title: "Megabox Settings",
      settings_header_subtitle: "System Preferences, Backup, and Architecture",
      tab_nav_general: "General & System",
      tab_nav_sync: "Backup & Data",
      tab_nav_about: "About",
      btn_settings_done: "Done",
      settings_status_save: "Saved automatically",

      // Section 1: General & System
      heading_system: "Host Performance & System Behavior",
      card_lang_title: "Interface Language",
      card_lang_desc: "Select English (Default) or Bahasa Indonesia for the interface.",
      card_avatar_title: "Workspace Profile Avatar",
      card_avatar_desc: "Display custom photo on bottom-left sidebar (100% local on this device).",
      btn_pick_avatar: "Choose Photo",
      btn_reset_avatar: "Remove",
      row_hibernate_title: "Memory Saver (Auto-Hibernation)",
      row_hibernate_desc: "Put inactive tabs to sleep to reduce host RAM. Tabs playing audio stay awake.",
      opt_5m: "5 Minutes",
      opt_15m: "15 Minutes (Default)",
      opt_30m: "30 Minutes",
      opt_60m: "1 Hour",
      opt_0m: "Disabled (Always Awake)",
      row_close_title: "Close Button Action [x]",
      row_close_desc: "Specify whether close button minimizes window to System Tray or quits application.",
      opt_tray: "Minimize to Tray",
      opt_quit: "Quit Application",
      row_autostart_title: "Start Automatically at Login",
      row_autostart_desc: "Launch Megabox quietly in the background when logging into desktop session.",
      card_cache_title: "Storage & Cache Cleaner",
      card_cache_desc: "Clear temporary HTTP cache and GPU shader cache. Active logins remain intact.",
      btn_clear_cache: "Clear Cache",
      clear_cache_done: "Cache cleared successfully!",

      // Section 2: Backup & Data
      heading_backup: "Local-First Storage & Data Sovereignty",
      badge_private_local: "100% Private Local",
      card_privacy_title: "Zero External Server Privacy",
      card_privacy_desc: "All app workspaces, tabs, and preferences are saved exclusively on this PC. No data is sent to cloud servers. To transfer to another PC, export configuration as a JSON file and import it on the target device.",
      card_backup_ops_title: "Backup File Operations (.json)",
      btn_backup_export: "Export Backup",
      btn_backup_import: "Import Backup",
      backup_export_ok: "Backup successfully exported ({count} apps) to {path}",
      backup_import_ok: "Successfully restored {count} apps from backup file!",
      backup_op_failed: "Operation failed: ",

      // Section 3: About
      about_hero_sub: "Zero-Bloat & Local-First Multi-App Desktop Workspace",
      card_arch_label: "Architecture",
      card_arch_val: "Local-First JSON",
      card_resilience_label: "Resilience",
      card_resilience_val: "Atomic File Write",
      card_license_label: "License",
      card_license_val: "MIT Open Source",
      heading_support: "Community Support",
      badge_no_ads: "Ad-Free & Tracker-Free",
      card_support_desc: "Megabox is engineered for daily workstation efficiency. If this software streamlines your daily routine, your support is deeply appreciated.",
      btn_support_qris: "Donate via QRIS",
      btn_support_github: "Star on GitHub",
      card_dev_sub: "MEGAPASS Intra Solusindo • Sidoarjo, East Java",
      card_dev_desc: "Engineered from a certified hardware technician workbench: fusing physical machine resilience (power-loss resistance), Linux kernel efficiency, and zero-bloat interface.",
      btn_about_portfolio: "Portfolio & Certificates",
      btn_about_megapass: "megapass.web.id",

      // Quick Switcher & Catalog
      quick_placeholder: "Type a command or service name...",
      catalog_badge_suffix: "Apps",

      // Update Notifier & Controls
      row_autoupdate_title: "New Version Notifications",
      row_autoupdate_desc: "Check GitHub releases in background and notify when updates are ready.",
      btn_check_update_manual: "Check for Updates",
      update_banner_text: "Megabox {version} is available — Update to enjoy the latest features.",
      btn_update_download: "Download",
      btn_update_later: "Later",
      update_checking: "Checking for updates...",
      update_latest_already: "You are using the latest version ({version}).",
      update_new_found: "New version {version} is available for download!",
      update_check_failed: "Failed to check for updates: "
    },
    id: {
      // Sidebar tooltips
      add_service_title: "Tambah Aplikasi (Ctrl+N)",
      btn_settings_title: "Pengaturan Workspace",
      btn_reload_title: "Muat Ulang Aplikasi (Ctrl+R)",
      btn_dnd_quiet: "Mode Fokus (Senyapkan Notifikasi)",
      btn_dnd_active: "Mode Fokus Aktif",

      // Context Menu
      ctx_back: "Kembali",
      ctx_forward: "Maju",
      ctx_reload: "Muat Ulang",
      ctx_home: "Beranda",
      ctx_browser: "Buka di Browser",
      ctx_split: "Bagi Layar",
      ctx_hibernate: "Tidurkan",
      ctx_wake: "Bangunkan",
      ctx_move_up: "Pindah Naik",
      ctx_move_down: "Pindah Turun",
      ctx_edit: "Ubah Aplikasi",
      ctx_delete: "Hapus Aplikasi",

      // Settings Header & Navigation
      settings_header_title: "Pengaturan Megabox",
      settings_header_subtitle: "Preferensi Sistem, Cadangan Data, dan Arsitektur",
      tab_nav_general: "Umum & Sistem",
      tab_nav_sync: "Cadangan & Data",
      tab_nav_about: "Tentang",
      btn_settings_done: "Selesai",
      settings_status_save: "Tersimpan otomatis",

      // Section 1: General & System
      heading_system: "Performa Host & Perilaku Sistem",
      card_lang_title: "Bahasa Antarmuka",
      card_lang_desc: "Pilih antara Bahasa Inggris (Bawaan) dan Bahasa Indonesia untuk antarmuka.",
      card_avatar_title: "Foto Profil Workspace",
      card_avatar_desc: "Tampilkan foto kustom di sidebar kiri bawah (100% lokal di perangkat ini).",
      btn_pick_avatar: "Pilih Foto",
      btn_reset_avatar: "Hapus",
      row_hibernate_title: "Hemat Memori (Hibernasi Otomatis)",
      row_hibernate_desc: "Tidurkan tab nonaktif untuk menghemat RAM host. Tab yang memutar audio tetap aktif.",
      opt_5m: "5 Menit",
      opt_15m: "15 Menit (Bawaan)",
      opt_30m: "30 Menit",
      opt_60m: "1 Jam",
      opt_0m: "Nonaktifkan (Selalu Aktif)",
      row_close_title: "Perilaku Tombol Tutup [x]",
      row_close_desc: "Tentukan apakah tombol tutup menyembunyikan jendela ke System Tray atau menutup aplikasi.",
      opt_tray: "Sembunyikan ke Tray",
      opt_quit: "Keluar dari Aplikasi",
      row_autostart_title: "Mulai Otomatis Saat Login",
      row_autostart_desc: "Jalankan Megabox di latar belakang secara otomatis saat login ke desktop.",
      card_cache_title: "Pembersih Penyimpanan & Cache",
      card_cache_desc: "Kosongkan cache HTTP dan GPU shader sementara. Sesi login akun tetap aman.",
      btn_clear_cache: "Bersihkan Cache",
      clear_cache_done: "Cache berhasil dibersihkan!",

      // Section 2: Backup & Data
      heading_backup: "Penyimpanan & Cadangan Mandiri (Local-First)",
      badge_private_local: "100% Privat Lokal",
      card_privacy_title: "Privasi Tanpa Server Luar",
      card_privacy_desc: "Semua daftar aplikasi, urutan workspace, dan preferensi disimpan sepenuhnya di komputer Anda. Tidak ada data yang dikirim ke server cloud mana pun. Untuk berpindah ke PC lain, ekspor konfigurasi menjadi berkas JSON dan impor di PC tujuan.",
      card_backup_ops_title: "Operasi Berkas Cadangan (.json)",
      btn_backup_export: "Ekspor Cadangan",
      btn_backup_import: "Impor Cadangan",
      backup_export_ok: "Cadangan berhasil diekspor ({count} aplikasi) ke {path}",
      backup_import_ok: "Berhasil memulihkan {count} aplikasi dari berkas cadangan!",
      backup_op_failed: "Gagal operasi: ",

      // Section 3: About
      about_hero_sub: "Ruang Kerja Multi-Aplikasi Zero-Bloat & Local-First",
      card_arch_label: "Arsitektur",
      card_arch_val: "Local-First JSON",
      card_resilience_label: "Ketahanan",
      card_resilience_val: "Atomic File Write",
      card_license_label: "Lisensi",
      card_license_val: "MIT Open Source",
      heading_support: "Dukungan Sukarela",
      badge_no_ads: "Bebas Iklan & Pelacak",
      card_support_desc: "Megabox dibangun untuk efisiensi meja kerja sehari-hari. Jika perangkat lunak ini bermanfaat bagi rutinitas Anda, dukungan Anda sangat diapresiasi.",
      btn_support_qris: "Donasi via QRIS",
      btn_support_github: "Bintang di GitHub",
      card_dev_sub: "MEGAPASS Intra Solusindo • Sidoarjo, Jawa Timur",
      card_dev_desc: "Dirancang dari meja kerja teknisi perangkat keras bersertifikasi: memadukan keandalan fisik mesin (power-loss resistance), efisiensi kernel Linux, dan antarmuka zero-bloat.",
      btn_about_portfolio: "Portofolio & Sertifikat",
      btn_about_megapass: "megapass.web.id",

      // Quick Switcher & Catalog
      quick_placeholder: "Ketik perintah atau nama aplikasi...",
      catalog_badge_suffix: "Aplikasi",

      // Update Notifier & Controls
      row_autoupdate_title: "Pemberitahuan Versi Baru",
      row_autoupdate_desc: "Periksa rilis GitHub di latar belakang dan beri tahu saat versi baru siap diunduh.",
      btn_check_update_manual: "Periksa Pembaruan",
      update_banner_text: "Megabox {version} telah tersedia — Perbarui untuk menikmati fitur terbaru.",
      btn_update_download: "Unduh",
      btn_update_later: "Nanti",
      update_checking: "Memeriksa pembaruan...",
      update_latest_already: "Anda sudah menggunakan versi terbaru ({version}).",
      update_new_found: "Versi baru {version} telah tersedia untuk diunduh!",
      update_check_failed: "Gagal memeriksa pembaruan: "
    }
  };

  let currentLang = 'en';

  function applyLanguage(lang) {
    if (!I18N[lang]) lang = 'en';
    currentLang = lang;
    const t = I18N[lang];

    // 1. Language pill toggle UI styling
    const btnEn = document.getElementById('btn-lang-en');
    const btnId = document.getElementById('btn-lang-id');
    if (btnEn && btnId) {
      if (lang === 'en') {
        btnEn.style.background = '#0071E3';
        btnEn.style.color = '#FFFFFF';
        btnEn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
        btnId.style.background = 'transparent';
        btnId.style.color = '#86868B';
        btnId.style.boxShadow = 'none';
      } else {
        btnId.style.background = '#0071E3';
        btnId.style.color = '#FFFFFF';
        btnId.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
        btnEn.style.background = 'transparent';
        btnEn.style.color = '#86868B';
        btnEn.style.boxShadow = 'none';
      }
    }

    // 2. Settings Modal Header & Nav Tabs
    const setHeaderTitle = document.getElementById('i18n-settings-title');
    if (setHeaderTitle) setHeaderTitle.textContent = t.settings_header_title;
    const setHeaderSub = document.getElementById('i18n-settings-subtitle');
    if (setHeaderSub) setHeaderSub.textContent = t.settings_header_subtitle;

    const navGeneral = document.getElementById('tab-nav-general');
    if (navGeneral && navGeneral.querySelector('span')) navGeneral.querySelector('span').textContent = t.tab_nav_general;
    const navSync = document.getElementById('tab-nav-sync');
    if (navSync && navSync.querySelector('span')) navSync.querySelector('span').textContent = t.tab_nav_sync;
    const navAbout = document.getElementById('tab-nav-about');
    if (navAbout && navAbout.querySelector('span')) navAbout.querySelector('span').textContent = t.tab_nav_about;

    const btnDone = document.getElementById('btn-settings-done');
    if (btnDone) btnDone.textContent = t.btn_settings_done;
    const statusSave = document.getElementById('settings-status-save');
    if (statusSave && statusSave.querySelector('span')) statusSave.querySelector('span').textContent = t.settings_status_save;

    // 3. Section 1: General & System
    const cardLangTitle = document.getElementById('i18n-card-lang-title');
    if (cardLangTitle) cardLangTitle.textContent = t.card_lang_title;
    const cardLangDesc = document.getElementById('i18n-card-lang-desc');
    if (cardLangDesc) cardLangDesc.textContent = t.card_lang_desc;

    const avatarTitle = document.getElementById('i18n-card-avatar-title');
    if (avatarTitle) avatarTitle.textContent = t.card_avatar_title;
    const avatarDesc = document.getElementById('i18n-card-avatar-desc');
    if (avatarDesc) avatarDesc.textContent = t.card_avatar_desc;

    const btnPick = document.getElementById('btn-pick-avatar');
    if (btnPick && btnPick.querySelector('span')) btnPick.querySelector('span').textContent = t.btn_pick_avatar;
    const btnReset = document.getElementById('btn-reset-avatar');
    if (btnReset && btnReset.querySelector('span')) btnReset.querySelector('span').textContent = t.btn_reset_avatar;

    const headingSystem = document.getElementById('i18n-heading-system');
    if (headingSystem) headingSystem.textContent = t.heading_system;

    const r1Title = document.getElementById('i18n-row-hibernate-title');
    if (r1Title) r1Title.textContent = t.row_hibernate_title;
    const r1Desc = document.getElementById('i18n-row-hibernate-desc');
    if (r1Desc) r1Desc.textContent = t.row_hibernate_desc;
    const selHib = document.getElementById('setting-hibernate-timeout');
    if (selHib && selHib.options.length >= 5) {
      selHib.options[0].text = t.opt_5m;
      selHib.options[1].text = t.opt_15m;
      selHib.options[2].text = t.opt_30m;
      selHib.options[3].text = t.opt_60m;
      selHib.options[4].text = t.opt_0m;
    }

    const r2Title = document.getElementById('i18n-row-close-title');
    if (r2Title) r2Title.textContent = t.row_close_title;
    const r2Desc = document.getElementById('i18n-row-close-desc');
    if (r2Desc) r2Desc.textContent = t.row_close_desc;
    const selClose = document.getElementById('setting-close-action');
    if (selClose && selClose.options.length >= 2) {
      selClose.options[0].text = t.opt_tray;
      selClose.options[1].text = t.opt_quit;
    }

    const r3Title = document.getElementById('i18n-row-autostart-title');
    if (r3Title) r3Title.textContent = t.row_autostart_title;
    const r3Desc = document.getElementById('i18n-row-autostart-desc');
    if (r3Desc) r3Desc.textContent = t.row_autostart_desc;

    const cardCacheTitle = document.getElementById('i18n-card-cache-title');
    if (cardCacheTitle) cardCacheTitle.textContent = t.card_cache_title;
    const cardCacheDesc = document.getElementById('i18n-card-cache-desc');
    if (cardCacheDesc) cardCacheDesc.textContent = t.card_cache_desc;
    const btnClear = document.getElementById('btn-clear-cache');
    if (btnClear && btnClear.querySelector('span')) btnClear.querySelector('span').textContent = t.btn_clear_cache;

    // 4. Section 2: Backup & Data
    const headingBackup = document.getElementById('i18n-heading-backup');
    if (headingBackup) headingBackup.textContent = t.heading_backup;
    const badgeLocal = document.getElementById('i18n-badge-private-local');
    if (badgeLocal) badgeLocal.textContent = t.badge_private_local;

    const privacyTitle = document.getElementById('i18n-card-privacy-title');
    if (privacyTitle) privacyTitle.textContent = t.card_privacy_title;
    const privacyDesc = document.getElementById('i18n-card-privacy-desc');
    if (privacyDesc) privacyDesc.textContent = t.card_privacy_desc;

    const backupOpsTitle = document.getElementById('i18n-card-backup-ops-title');
    if (backupOpsTitle) backupOpsTitle.textContent = t.card_backup_ops_title;
    const btnExport = document.getElementById('btn-backup-export');
    if (btnExport && btnExport.querySelector('span')) btnExport.querySelector('span').textContent = t.btn_backup_export;
    const btnImport = document.getElementById('btn-backup-import');
    if (btnImport && btnImport.querySelector('span')) btnImport.querySelector('span').textContent = t.btn_backup_import;

    // 5. Section 3: About
    const heroSub = document.getElementById('i18n-about-hero-sub');
    if (heroSub) heroSub.textContent = t.about_hero_sub;

    const archLabel = document.getElementById('i18n-card-arch-label');
    if (archLabel) archLabel.textContent = t.card_arch_label;
    const resilienceLabel = document.getElementById('i18n-card-resilience-label');
    if (resilienceLabel) resilienceLabel.textContent = t.card_resilience_label;
    const licenseLabel = document.getElementById('i18n-card-license-label');
    if (licenseLabel) licenseLabel.textContent = t.card_license_label;

    const supportHeading = document.getElementById('i18n-heading-support');
    if (supportHeading) supportHeading.textContent = t.heading_support;
    const badgeNoAds = document.getElementById('i18n-badge-no-ads');
    if (badgeNoAds) badgeNoAds.textContent = t.badge_no_ads;
    const supportDesc = document.getElementById('i18n-card-support-desc');
    if (supportDesc) supportDesc.textContent = t.card_support_desc;

    const btnQris = document.getElementById('btn-support-qris');
    if (btnQris && btnQris.querySelector('span')) btnQris.querySelector('span').textContent = t.btn_support_qris;
    const btnStar = document.getElementById('btn-support-github');
    if (btnStar && btnStar.querySelector('span')) btnStar.querySelector('span').textContent = t.btn_support_github;

    const devSub = document.getElementById('i18n-card-dev-sub');
    if (devSub) devSub.textContent = t.card_dev_sub;
    const devDesc = document.getElementById('i18n-card-dev-desc');
    if (devDesc) devDesc.textContent = t.card_dev_desc;
    const btnPort = document.getElementById('btn-about-portfolio');
    if (btnPort && btnPort.querySelector('span')) btnPort.querySelector('span').textContent = t.btn_about_portfolio;

    // 6. Context Menu labels
    const ctxBack = document.querySelector('#ctx-back span:first-child');
    if (ctxBack) ctxBack.textContent = t.ctx_back;
    const ctxForward = document.querySelector('#ctx-forward span:first-child');
    if (ctxForward) ctxForward.textContent = t.ctx_forward;
    const ctxReload = document.querySelector('#ctx-reload span:first-child');
    if (ctxReload) ctxReload.textContent = t.ctx_reload;
    const ctxHome = document.querySelector('#ctx-home span:first-child');
    if (ctxHome) ctxHome.textContent = t.ctx_home;
    const ctxBrowser = document.querySelector('#ctx-browser span:first-child');
    if (ctxBrowser) ctxBrowser.textContent = t.ctx_browser;
    const ctxSplit = document.querySelector('#ctx-split span:first-child');
    if (ctxSplit) ctxSplit.textContent = t.ctx_split;
    const ctxHibernate = document.querySelector('#ctx-hibernate span:first-child');
    if (ctxHibernate) ctxHibernate.textContent = t.ctx_hibernate;
    const ctxMoveUp = document.querySelector('#ctx-move-up span:first-child');
    if (ctxMoveUp) ctxMoveUp.textContent = t.ctx_move_up;
    const ctxMoveDown = document.querySelector('#ctx-move-down span:first-child');
    if (ctxMoveDown) ctxMoveDown.textContent = t.ctx_move_down;
    const ctxEdit = document.querySelector('#ctx-edit span:first-child');
    if (ctxEdit) ctxEdit.textContent = t.ctx_edit;
    const ctxDelete = document.querySelector('#ctx-delete span:first-child');
    if (ctxDelete) ctxDelete.textContent = t.ctx_delete;

    // 7. Quick Switcher Input Placeholder
    const quickInput = document.getElementById('quickswitch-input');
    if (quickInput) quickInput.placeholder = t.quick_placeholder;

    // 8. Sidebar tooltips
    const addBtn = document.getElementById('btn-add-open');
    if (addBtn) addBtn.title = t.add_service_title;
    const btnReloadSidebar = document.getElementById('btn-reload');
    if (btnReloadSidebar) btnReloadSidebar.title = t.btn_reload_title;
    const btnSettingsSidebar = document.getElementById('btn-settings');
    if (btnSettingsSidebar) btnSettingsSidebar.title = t.btn_settings_title;


    // 9. Update Notifier & Settings Elements
    const autoUpdateTitle = document.getElementById('i18n-row-autoupdate-title');
    if (autoUpdateTitle) autoUpdateTitle.textContent = t.row_autoupdate_title;
    const autoUpdateDesc = document.getElementById('i18n-row-autoupdate-desc');
    if (autoUpdateDesc) autoUpdateDesc.textContent = t.row_autoupdate_desc;

    const btnCheckUpdateSpan = document.getElementById('i18n-btn-check-updates');
    if (btnCheckUpdateSpan) btnCheckUpdateSpan.textContent = t.btn_check_update_manual;
    const btnUpdateDlSpan = document.getElementById('i18n-btn-update-download');
    if (btnUpdateDlSpan) btnUpdateDlSpan.textContent = t.btn_update_download;
    const btnUpdateLaterSpan = document.getElementById('i18n-btn-update-later');
    if (btnUpdateLaterSpan) btnUpdateLaterSpan.textContent = t.btn_update_later;

    if (updateBannerText && currentAvailableUpdate) {
      updateBannerText.textContent = (t.update_banner_text || "Megabox {version} is available").replace('{version}', currentAvailableUpdate.version);
    }

    console.log('[Megabox i18n] Language applied:', lang);
  }

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
      if (settingAutoupdate) {
        settingAutoupdate.checked = cfg.auto_check_updates !== false;
      }
      if (cfg.language) {
        applyLanguage(cfg.language);
      } else {
        applyLanguage('en');
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

      const autoCheckUpdates = settingAutoupdate ? Boolean(settingAutoupdate.checked) : true;
      await window.megabox.saveSettings({
        language: currentLang,
        hibernate_timeout_minutes: mins,
        close_to_tray: closeToTray,
        autostart: autostart,
        auto_check_updates: autoCheckUpdates
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
  if (settingAutoupdate) settingAutoupdate.onchange = persistSystemSettings;

  // ==========================================
  // MEGABOX UPDATE NOTIFIER CONTROLLER
  // Floating Top Banner & Manual Check Engine
  // ==========================================
  function showUpdateBanner(data) {
    if (!updateBanner || !data || !data.version) return;
    currentAvailableUpdate = data;
    const t = I18N[currentLang] || I18N.en;
    if (updateBannerText) {
      updateBannerText.textContent = (t.update_banner_text || "Megabox {version} is available").replace('{version}', data.version);
    }
    updateBanner.style.display = 'flex';
  }

  function hideUpdateBanner() {
    if (!updateBanner) return;
    updateBanner.style.display = 'none';
  }

  if (btnUpdateDownload) {
    btnUpdateDownload.onclick = () => {
      const url = (currentAvailableUpdate && currentAvailableUpdate.url) || 'https://github.com/4ntiDandruff/megabox/releases';
      if (window.megabox && window.megabox.openExternal) {
        window.megabox.openExternal(url);
      }
      hideUpdateBanner();
    };
  }

  async function dismissActiveUpdate() {
    hideUpdateBanner();
    if (currentAvailableUpdate && window.megabox && window.megabox.dismissUpdate) {
      await window.megabox.dismissUpdate(currentAvailableUpdate.version);
    }
  }

  if (btnUpdateLater) {
    btnUpdateLater.onclick = dismissActiveUpdate;
  }
  if (btnUpdateClose) {
    btnUpdateClose.onclick = dismissActiveUpdate;
  }

  if (window.megabox && window.megabox.onUpdateAvailable) {
    window.megabox.onUpdateAvailable((data) => {
      console.log('[Megabox Updater] Update available event received:', data);
      showUpdateBanner(data);
    });
  }

  if (btnCheckUpdates) {
    btnCheckUpdates.onclick = async () => {
      const t = I18N[currentLang] || I18N.en;
      if (updateCheckStatusMsg) {
        updateCheckStatusMsg.style.display = 'block';
        updateCheckStatusMsg.style.background = 'rgba(56, 189, 248, 0.1)';
        updateCheckStatusMsg.style.color = '#0071E3';
        updateCheckStatusMsg.style.border = '1px solid rgba(56, 189, 248, 0.2)';
        updateCheckStatusMsg.textContent = t.update_checking;
      }
      btnCheckUpdates.disabled = true;

      try {
        if (window.megabox && window.megabox.checkUpdatesManual) {
          const res = await window.megabox.checkUpdatesManual();
          if (res.hasUpdate) {
            showUpdateBanner(res);
            if (updateCheckStatusMsg) {
              updateCheckStatusMsg.style.background = 'rgba(16, 185, 129, 0.1)';
              updateCheckStatusMsg.style.color = '#34d399';
              updateCheckStatusMsg.style.border = '1px solid rgba(16, 185, 129, 0.2)';
              updateCheckStatusMsg.textContent = (t.update_new_found || "New version {version} is available!").replace('{version}', res.version);
            }
          } else if (res.error) {
            if (updateCheckStatusMsg) {
              updateCheckStatusMsg.style.background = 'rgba(239, 68, 68, 0.1)';
              updateCheckStatusMsg.style.color = '#f87171';
              updateCheckStatusMsg.style.border = '1px solid rgba(239, 68, 68, 0.2)';
              updateCheckStatusMsg.textContent = (t.update_check_failed || "Failed to check: ") + res.error;
            }
          } else {
            if (updateCheckStatusMsg) {
              updateCheckStatusMsg.style.background = 'rgba(255, 255, 255, 0.04)';
              updateCheckStatusMsg.style.color = '#94a3b8';
              updateCheckStatusMsg.style.border = '1px solid rgba(255, 255, 255, 0.08)';
              updateCheckStatusMsg.textContent = (t.update_latest_already || "You are using the latest version ({version}).").replace('{version}', res.version || 'v1.7.0');
            }
          }
        }
      } catch (err) {
        if (updateCheckStatusMsg) {
          updateCheckStatusMsg.style.background = 'rgba(239, 68, 68, 0.1)';
          updateCheckStatusMsg.style.color = '#f87171';
          updateCheckStatusMsg.style.border = '1px solid rgba(239, 68, 68, 0.2)';
          updateCheckStatusMsg.textContent = (t.update_check_failed || "Failed: ") + err.message;
        }
      } finally {
        btnCheckUpdates.disabled = false;
        setTimeout(() => {
          if (updateCheckStatusMsg) updateCheckStatusMsg.style.display = 'none';
        }, 6000);
      }
    };
  }


  // Language Switcher Event Listeners
  const btnLangEn = document.getElementById('btn-lang-en');
  const btnLangId = document.getElementById('btn-lang-id');
  if (btnLangEn) {
    btnLangEn.onclick = async () => {
      applyLanguage('en');
      await persistSystemSettings();
    };
  }
  if (btnLangId) {
    btnLangId.onclick = async () => {
      applyLanguage('id');
      await persistSystemSettings();
    };
  }


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
        btnClearCache.innerHTML = '<img src="assets/icons8/clean_cache.png" style="width: 14px; height: 14px; object-fit: contain;" alt="Clean"><span>Bersihkan Cache</span>';
        // Clear cache message stays visible until modal closes
      }
    };
  }

  if (btnSettings && settingsModal) {
    btnSettings.onclick = async () => {
      settingsModal.style.display = 'flex';
      switchSettingsTab('general');
      await loadSystemSettings();
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
  window._megabox_applyLanguage = applyLanguage;
  window._megabox_showUpdateBanner = showUpdateBanner;
  window._megabox_hideUpdateBanner = hideUpdateBanner;

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
    { id: 'sponsorblock', name: 'YouTube SponsorBlock', desc: 'Lewati otomatis segmen sponsor, intro, dan promosi video YouTube', icon: 'assets/icons/youtube.svg', enabledByDefault: true },
    { id: 'adblock-thing', name: 'YouTube Anti-Adblock Shield', desc: 'Bypass popup adblock YouTube & lewati iklan video otomatis (RemoveAdblockThing)', icon: 'assets/icons/shield.svg', enabledByDefault: true },
    { id: 'dark-reader', name: 'Dark Reader', desc: 'Mode gelap pelindung mata', icon: 'assets/icons/theme-light-dark.svg', enabledByDefault: false },
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
        <label class="apple-switch-mint">
          <input type="checkbox" ${isEnabled ? 'checked' : ''} data-ext="${ext.id}">
          <span class="apple-slider-mint"></span>
        </label>
      `;

      const toggle = card.querySelector('input');
      toggle.addEventListener('change', () => {
        savedPrefs[ext.id] = toggle.checked;
        localStorage.setItem(appExtKey, JSON.stringify(savedPrefs));
        console.log(`[Megabox Extensions] ${ext.id} set to ${toggle.checked} for app ${app ? app.id : 'default'}`);

        // If Translate toggled, broadcast instantly to the active webview
        if (ext.id === 'translate' && activeAppId) {
          const wv = document.getElementById('wv-' + activeAppId);
          if (wv) {
            try { wv.send('translate:toggle-state', toggle.checked); } catch (_) {}
          }
        }

        // If SponsorBlock toggled, broadcast instantly to the active webview
        if (ext.id === 'sponsorblock' && activeAppId) {
          const wv = document.getElementById('wv-' + activeAppId);
          if (wv) {
            try { wv.send('sponsorblock:toggle-state', toggle.checked); } catch (_) {}
          }
        }

        // If YouTube Anti-Adblock Shield toggled, broadcast instantly to active webview
        if (ext.id === 'adblock-thing' && activeAppId) {
          const wv = document.getElementById('wv-' + activeAppId);
          if (wv) {
            try { wv.send('adblock-thing:toggle-state', toggle.checked); } catch (_) {}
          }
        }

        // If uBlock Origin toggled, notify main process network blocker
        if (ext.id === 'ublock-origin') {
          try {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('ublock:toggle-state', toggle.checked);
          } catch (_) {}
        }

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


  // ==========================================================
  // MEGAWARDEN CONTROLLER (Local-First Password Vault Engine)
  // ==========================================================
  let pendingVaultPrompt = null;
  let cachedVaultItems = [];

  window.handleMegawardenPrompt = handleMegawardenPrompt;
  if (window.megabox && typeof window.megabox.onVaultSavePrompt === 'function') {
    window.megabox.onVaultSavePrompt((data) => {
      console.log('[Megawarden] Received popup save prompt relay:', data.url);
      handleMegawardenPrompt(data);
    });
  }
  async function handleMegawardenPrompt(data) {
    if (!data || !data.password || !data.username) return;

    const toast = document.getElementById("megawarden-save-toast");
    const titleEl = document.getElementById("toast-vault-title");
    const domainEl = document.getElementById("toast-vault-domain");
    const userEl = document.getElementById("toast-vault-user");
    const btnSaveEl = document.getElementById("toast-vault-btn-save");
    if (!toast) return;

    // Check existing vault credentials to prevent redundant/illogical save prompts
    let isUpdate = false;
    if (window.megabox && typeof window.megabox.vaultFindForUrl === "function") {
      try {
        const res = await window.megabox.vaultFindForUrl(data.url);
        const matches = (res && res.success && Array.isArray(res.matches)) ? res.matches : [];
        
        const cleanUser = (data.username || "").trim().toLowerCase();
        const existing = matches.find(m => (m.username || "").trim().toLowerCase() === cleanUser);

        if (existing) {
          // If username AND password are identical, already saved! Skip prompt silently.
          if (existing.password === data.password) {
            console.log("[Megawarden] Kredensial untuk " + data.username + " sudah tersimpan dan identik di vault. Abaikan prompt.");
            return;
          }
          // Same username but password changed -> offer to update
          isUpdate = true;
        }
      } catch (err) {
        console.warn("[Megawarden] Gagal mengecek status duplikasi vault:", err.message);
      }
    }

    pendingVaultPrompt = data;

    let displayDomain = data.url;
    try {
      const u = new URL(data.url);
      displayDomain = u.hostname.replace(/^www\./, "");
    } catch (_) {}

    if (titleEl) {
      titleEl.textContent = isUpdate ? "Perbarui sandi di Megawarden?" : "Simpan sandi ke Megawarden?";
    }
    if (btnSaveEl) {
      btnSaveEl.textContent = isUpdate ? "Perbarui Sandi" : "Simpan Sandi";
    }
    if (domainEl) domainEl.textContent = displayDomain;
    if (userEl) userEl.textContent = data.username;

    toast.style.display = "block";
  }

  const toastDismiss = document.getElementById("toast-vault-btn-dismiss");
  const toastIgnore = document.getElementById("toast-vault-btn-ignore");
  const toastSave = document.getElementById("toast-vault-btn-save");

  function hideVaultToast() {
    const toast = document.getElementById("megawarden-save-toast");
    if (toast) toast.style.display = "none";
    pendingVaultPrompt = null;
  }

  if (toastDismiss) toastDismiss.onclick = hideVaultToast;
  if (toastIgnore) toastIgnore.onclick = hideVaultToast;
  if (toastSave) {
    toastSave.onclick = async () => {
      if (!pendingVaultPrompt || !window.megabox || typeof window.megabox.vaultSave !== "function") {
        hideVaultToast();
        return;
      }
      try {
        let domain = pendingVaultPrompt.url;
        try { domain = new URL(pendingVaultPrompt.url).hostname.replace(/^www\./, ""); } catch(_) {}
        
        await window.megabox.vaultSave({
          name: domain,
          url: pendingVaultPrompt.url,
          username: pendingVaultPrompt.username,
          password: pendingVaultPrompt.password
        });
        showGlobalToast("Sandi berhasil disimpan ke Megawarden", "success");
      } catch (err) {
        showGlobalToast("Gagal menyimpan sandi: " + err.message, "danger");
      } finally {
        hideVaultToast();
      }
    };
  }

  // Megawarden Vault Manager UI (Auto-Icons, Multi-Layer Brand Resolving, Category & Sorting)
  const vaultListContainer = document.getElementById("vault-items-list");
  const vaultSearchInput = document.getElementById("vault-search-input");
  const vaultCounter = document.getElementById("vault-items-counter");
  const vaultSortSelect = document.getElementById("vault-sort-select");
  const vaultFilterIndicator = document.getElementById("vault-filter-indicator");
  const btnVaultAdd = document.getElementById("btn-vault-add-entry");
  const btnVaultImportCsv = document.getElementById("btn-vault-import-csv");
  const btnVaultExportCsv = document.getElementById("btn-vault-export-csv");
  const vaultFileInput = document.getElementById("vault-csv-file-input");

  const vaultModal = document.getElementById("vault-entry-modal");
  const vaultModalTitle = document.getElementById("vault-modal-title");
  const vaultModalClose = document.getElementById("btn-vault-modal-close");
  const vaultModalCancel = document.getElementById("btn-vault-modal-cancel");
  const vaultModalSave = document.getElementById("btn-vault-modal-save");

  const vFormId = document.getElementById("vault-form-id");
  const vFormName = document.getElementById("vault-form-name");
  const vFormUrl = document.getElementById("vault-form-url");
  const vFormUsername = document.getElementById("vault-form-username");
  const vFormPassword = document.getElementById("vault-form-password");
  const vFormNote = document.getElementById("vault-form-note");
  const vBtnGenPass = document.getElementById("btn-vault-form-gen");
  const vBtnTogglePass = document.getElementById("btn-vault-form-toggle-pwd");

  let currentVaultCategory = "all";
  let currentVaultSort = "name-asc";

  // Brand Mapping to local 499 SVG Icons
  const VAULT_BRAND_ICONS = {
    // 1. Ecosystem Raksasa (Samsung, Apple, Xiaomi, Google, Microsoft)
    "samsung": "samsung.svg",
    "xiaomi": "xiaomi.svg",
    "apple": "apple.svg",
    "id.apple": "apple.svg",
    "idmsa.apple": "apple.svg",
    "icloud": "apple.svg",
    "google": "google-gemini.svg",
    "passwords.google": "google-passwords.svg",
    "accounts.google": "google-gemini.svg",
    "mail.google": "gmail.svg",
    "gmail": "gmail.svg",
    "microsoft": "microsoft-copilot.svg",
    "azure": "azure-portal.svg",
    "office": "microsoft-copilot.svg",
    "outlook": "outlook.svg",
    "yahoo": "yahoo-mail.svg",

    // 2. E-Commerce & Belanja Indonesia / Global
    "bukalapak": "bukalapak.svg",
    "tokopedia": "tokopedia.png",
    "shopee": "shopee.svg",
    "lazada": "lazada.png",
    "alfagift": "alfagift.png",
    "alfamart": "alfagift.png",
    "jakartanotebook": "shopping-bag",
    "amazon": "amazon-web-services.svg",
    "ebay": "shopping-bag",
    "gojek": "gojek.svg",
    "grab": "grab.svg",

    // 3. Bank & Finansial Indonesia
    "jenius": "jenius.png",
    "bca": "bca.png",
    "mybca": "bca.png",
    "aladin": "credit-card",
    "flip": "dollar-sign",
    "bareksa": "trending-up",
    "tokocrypto": "binance.svg",
    "binance": "binance.svg",
    "paypal": "paypal.svg",
    "pajak": "pajak.png",
    "bpjs": "bpjs.png",
    "bpjstku": "bpjs.png",

    // 4. Developer, AI, Cloud & Infra
    "github": "github.svg",
    "gitlab": "gitlab.svg",
    "bitbucket": "bitbucket.svg",
    "digitalocean": "digitalocean.svg",
    "cloudflare": "cloudflare.svg",
    "ubiquiti": "ubiquiti.svg",
    "ui.com": "ubiquiti.svg",
    "openai": "chatgpt.svg",
    "chatgpt": "chatgpt.svg",
    "claude": "chatllm.svg",
    "huggingface": "huggingface.svg",
    "aws": "amazon-web-services.svg",
    "envato": "box.svg",
    "linktree": "link.svg",
    "linktr.ee": "link.svg",

    // 5. Servis HW, Chipset, BIOS & Flashing
    "samfw": "samfw.png",
    "sammobile": "samsung.svg",
    "vinafix": "vinafix.png",
    "badcaps": "badcaps.png",
    "fixbios": "cpu",
    "repairlap": "cpu",
    "borneoschematic": "cpu",
    "teknisi-laptop": "cpu",
    "kfunlocker": "smartphone",
    "flyme": "smartphone",
    "palm.tech": "smartphone",
    "tecno": "smartphone",

    // 6. Jaringan, Router, CCTV & IoT
    "adguard": "adguard-home.svg",
    "ruijie": "network.svg",
    "tendawifi": "wifi",
    "ezviz": "cctv.svg",
    "bardi": "wifi",
    "cctv": "cctv.svg",
    "cam": "cctv.svg",
    "camscanner": "camscanner.png",
    "virustotal": "virustotal.svg",
    "speedtest": "speedtest.svg",

    // 7. Kolaborasi & Remote Ops
    "teamviewer": "teamviewer.svg",
    "anydesk": "anydesk.svg",
    "rustdesk": "rustdesk.svg",
    "notion": "notion.svg",
    "trello": "trello.svg",
    "figma": "figma.svg",
    "slack": "slack.svg",
    "asana": "asana.svg",
    "airtable": "airtable.svg",
    "canva": "canva.svg",
    "basecamp": "basecamp.svg",
    "dropbox": "dropbox.svg",
    "mega.nz": "mega.svg",
    "mega": "mega.svg",
    "box.com": "box.svg",

    // 8. Komunikasi & Media Sosial
    "whatsapp": "whatsapp.svg",
    "telegram": "telegram.svg",
    "discord": "discord.svg",
    "facebook": "facebook.svg",
    "instagram": "instagram.svg",
    "twitter": "twitter.svg",
    "x.com": "twitter.svg",
    "linkedin": "linkedin.svg",
    "reddit": "reddit.svg",
    "pinterest": "pinterest.svg",
    "tiktok": "tiktok.svg",
    "twitch": "twitch.svg",
    "youtube": "youtube.svg",
    "kaskus": "kaskus.png",
    "zoom": "zoom.svg",

    // 9. Entertainment & Games
    "netflix": "netflix.svg",
    "spotify": "spotify.svg",
    "steam": "steam.svg",
    "roblox": "roblox.svg",
    "crunchyroll": "crunchyroll.svg",
    "vimeo": "vimeo.svg",
    "deviantart": "deviantart.svg",
    "freepik": "freepik.svg",

    // 10. Keamanan & Antivirus
    "bitwarden": "bitwarden.svg",
    "lastpass": "lastpass.svg",
    "1password": "1password.svg",
    "proton": "proton-pass.svg",
    "bitdefender": "bitdefender.svg",
    "kaspersky": "kaspersky.svg",
    "norton": "shield",
    "avira": "shield",

    // 11. Edukasi
    "umsida": "umsida.png"
  };

  function resolveVaultItemIcon(item) {
    const name = (item.name || "").toLowerCase();
    const domain = (item.domain || "").toLowerCase().replace(/^www\./, "").split(":")[0];
    const url = (item.url || "").toLowerCase();
    const combined = `${name} ${domain} ${url}`;

    // 1. Hardware, Router & LAN Subnets (IP addresses & Local network)
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(domain)) {
      if (domain.startsWith("192.168.") || domain.startsWith("10.") || domain.startsWith("172.16.")) {
        return { type: "router", category: "network" };
      }
      if (domain.startsWith("100.")) {
        return { type: "server", category: "network" };
      }
      return { type: "network", category: "network" };
    }

    if (domain.includes(".ts.net") || domain.includes("router") || name.includes("router") || name.includes("mikrotik") || domain.includes("ruijie") || domain.includes("tenda")) {
      return { type: "router", category: "network" };
    }

    // 2. Check explicitly mapped brand catalog (both SVG & PNG)
    for (const [key, iconFile] of Object.entries(VAULT_BRAND_ICONS)) {
      if (domain.includes(key) || name.includes(key)) {
        if (iconFile.endsWith(".svg") || iconFile.endsWith(".png")) {
          // If it's a known service, classify category
          let cat = "web";
          if (["samsung", "xiaomi", "apple", "badcaps", "vinafix", "samfw", "fixbios", "repairlap", "borneoschematic", "kfunlocker", "flyme", "tecno"].includes(key)) {
            cat = "servicing";
          } else if (["tokopedia", "bukalapak", "shopee", "lazada", "alfagift", "alfamart", "amazon", "ebay", "bca", "jenius", "aladin", "flip", "bareksa", "paypal", "pajak", "bpjs", "tokocrypto", "binance"].includes(key)) {
            cat = "finance";
          } else if (key.includes("google") || key.includes("gmail")) {
            cat = "google";
          } else if (["cctv", "ezviz", "tendawifi", "ruijie", "bardi", "speedtest", "virustotal"].includes(key)) {
            cat = "network";
          }
          return { type: "local", src: `assets/icons/${iconFile}`, category: cat };
        } else if (iconFile === "router") {
          return { type: "router", category: "network" };
        } else if (iconFile === "cpu") {
          return { type: "chip", category: "servicing" };
        } else if (iconFile === "smartphone") {
          return { type: "phone", category: "servicing" };
        } else if (iconFile === "credit-card") {
          return { type: "finance", category: "finance" };
        } else if (iconFile === "shopping-bag") {
          return { type: "ecommerce", category: "finance" };
        }
      }
    }

    // 3. CCTV & Streams
    if (combined.includes("cctv") || combined.includes("ezviz") || combined.includes("cam") || combined.includes("camera")) {
      return { type: "cctv", category: "network" };
    }

    // 4. Hardware Repair & Schematic Forums
    if (combined.includes("schematic") || combined.includes("bios") || combined.includes("badcaps") || combined.includes("vinafix") || combined.includes("repairlap") || combined.includes("teknisi")) {
      return { type: "chip", category: "servicing" };
    }

    // 5. Smartphones & Devices
    if (combined.includes("samfw") || combined.includes("sammobile") || combined.includes("xiaomi") || combined.includes("samsung") || combined.includes("flyme") || combined.includes("kfunlocker")) {
      return { type: "phone", category: "servicing" };
    }

    // 6. Finance & Banking
    if (combined.includes("bca") || combined.includes("jenius") || combined.includes("btpn") || combined.includes("bank") || combined.includes("pajak") || combined.includes("flip") || combined.includes("paypal") || combined.includes("aladin")) {
      return { type: "finance", category: "finance" };
    }

    // 7. E-Commerce
    if (combined.includes("tokopedia") || combined.includes("shopee") || combined.includes("lazada") || combined.includes("bukalapak") || combined.includes("alfagift") || combined.includes("jakartanotebook")) {
      return { type: "ecommerce", category: "finance" };
    }

    // 8. Remote Web Favicon via Google S2 Engine (with graceful inline SVG fallback)
    if (domain && domain.includes(".")) {
      return {
        type: "favicon",
        src: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        domain: domain,
        category: "web"
      };
    }

    return { type: "key", category: "web" };
  }

  async function loadMegawardenVault() {
    if (!window.megabox || typeof window.megabox.vaultList !== "function") return;
    try {
      const res = await window.megabox.vaultList();
      cachedVaultItems = (res && res.items) ? res.items : [];
      applyVaultFilterAndRender();
    } catch (err) {
      console.error("[Megawarden] Load vault failed:", err);
    }
  }

  function applyVaultFilterAndRender() {
    let items = [...cachedVaultItems];
    const q = (vaultSearchInput ? vaultSearchInput.value : "").toLowerCase().trim();

    // 1. Search Query Filter
    if (q) {
      items = items.filter(i => 
        (i.name || "").toLowerCase().includes(q) ||
        (i.domain || "").toLowerCase().includes(q) ||
        (i.username || "").toLowerCase().includes(q) ||
        (i.url || "").toLowerCase().includes(q)
      );
    }

    // 2. Category Tab Filter
    if (currentVaultCategory !== "all") {
      items = items.filter(i => {
        const meta = resolveVaultItemIcon(i);
        if (currentVaultCategory === "network") return meta.category === "network";
        if (currentVaultCategory === "servicing") return meta.category === "servicing";
        if (currentVaultCategory === "finance") return meta.category === "finance" || meta.category === "ecommerce";
        if (currentVaultCategory === "google") return meta.category === "google";
        if (currentVaultCategory === "web") return meta.category === "web";
        return true;
      });
    }

    // 3. Sorting
    if (currentVaultSort === "name-asc") {
      items.sort((a, b) => (a.name || a.domain || "").localeCompare(b.name || b.domain || "", undefined, { numeric: true, sensitivity: "base" }));
    } else if (currentVaultSort === "name-desc") {
      items.sort((a, b) => (b.name || b.domain || "").localeCompare(a.name || a.domain || "", undefined, { numeric: true, sensitivity: "base" }));
    } else if (currentVaultSort === "domain-asc") {
      items.sort((a, b) => (a.domain || a.name || "").localeCompare(b.domain || b.name || "", undefined, { numeric: true, sensitivity: "base" }));
    } else if (currentVaultSort === "recent") {
      items.sort((a, b) => (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0));
    }

    if (vaultFilterIndicator) {
      if (q) {
        vaultFilterIndicator.textContent = `Menemukan ${items.length} dari ${cachedVaultItems.length} akun`;
      } else if (currentVaultCategory !== "all") {
        vaultFilterIndicator.textContent = `Filter ${currentVaultCategory.toUpperCase()}: ${items.length} akun`;
      } else {
        vaultFilterIndicator.textContent = `Total ${items.length} akun kredensial`;
      }
    }

    renderVaultItems(items);
  }

  function renderVaultItems(items) {
    if (!vaultListContainer) return;
    vaultListContainer.innerHTML = "";

    if (vaultCounter) {
      vaultCounter.textContent = `${items.length} Kredensial`;
    }

    if (items.length === 0) {
      vaultListContainer.innerHTML = `
        <div style="padding: 32px 16px; text-align: center; color: #86868B; font-size: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#86868B" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <span>Tidak ada kredensial yang sesuai dengan filter atau pencarian.</span>
        </div>
      `;
      return;
    }

    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "vault-item-row";

      const left = document.createElement("div");
      left.style.cssText = "display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;";

      // Resolve icon
      const iconMeta = resolveVaultItemIcon(item);
      const iconBox = document.createElement("div");
      iconBox.style.cssText = "width: 32px; height: 32px; border-radius: 8px; background: #F2F2F7; border: 1px solid #E5E5EA; display: flex; align-items: center; justify-content: center; flex-shrink: 0; user-select: none; overflow: hidden; padding: 4px;";

      if (iconMeta.type === "local") {
        const img = document.createElement("img");
        img.src = iconMeta.src;
        img.style.cssText = "width: 20px; height: 20px; object-fit: contain;";
        img.onerror = () => {
          iconBox.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#48484A" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
        };
        iconBox.appendChild(img);
      } else if (iconMeta.type === "router") {
        iconBox.style.color = "#0071E3";
        iconBox.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 18h.01"/><path d="M10 18h.01"/><path d="M15 10v4"/><path d="M17.8 8A6 6 0 0 0 6.2 8"/><path d="M20.5 5a10 10 0 0 0-17 0"/></svg>`;
      } else if (iconMeta.type === "server") {
        iconBox.style.color = "#5E5CE6";
        iconBox.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>`;
      } else if (iconMeta.type === "network") {
        iconBox.style.color = "#34C759";
        iconBox.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>`;
      } else if (iconMeta.type === "cctv") {
        iconBox.style.color = "#FF9F0A";
        iconBox.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 8 3.5-3.5a1 1 0 0 0-1.4-1.4L18 6"/><path d="M2 10a8 8 0 0 1 11.3-7.3l2.8 2.8A8 8 0 0 1 14 17l-4 4-2-2 2-2a4 4 0 0 0-5.7-5.7L4.5 13"/><circle cx="10" cy="9" r="2"/></svg>`;
      } else if (iconMeta.type === "chip") {
        iconBox.style.color = "#FF375F";
        iconBox.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="5" y="5" rx="2"/><path d="M9 2v3"/><path d="M15 2v3"/><path d="M9 19v3"/><path d="M15 19v3"/><path d="M2 9h3"/><path d="M2 15h3"/><path d="M19 9h3"/><path d="M19 15h3"/><circle cx="12" cy="12" r="2"/></svg>`;
      } else if (iconMeta.type === "phone") {
        iconBox.style.color = "#30B0C7";
        iconBox.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`;
      } else if (iconMeta.type === "finance") {
        iconBox.style.color = "#34C759";
        iconBox.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;
      } else if (iconMeta.type === "ecommerce") {
        iconBox.style.color = "#FF9500";
        iconBox.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
      } else if (iconMeta.type === "favicon") {
        const img = document.createElement("img");
        img.src = iconMeta.src;
        img.style.cssText = "width: 20px; height: 20px; object-fit: contain; border-radius: 4px;";
        img.loading = "lazy";
        img.onerror = () => {
          const initChar = (item.name || item.domain || "W").charAt(0).toUpperCase();
          iconBox.innerHTML = `<span style="font-size:12px; font-weight:600; color:#48484A;">${initChar}</span>`;
        };
        iconBox.appendChild(img);
      } else {
        iconBox.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#48484A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`;
      }

      const textCol = document.createElement("div");
      textCol.style.cssText = "min-width: 0; flex: 1;";

      const titleLine = document.createElement("div");
      titleLine.style.cssText = "display: flex; align-items: baseline; gap: 6px; min-width: 0;";

      const nameSpan = document.createElement("span");
      nameSpan.style.cssText = "font-size: 12.5px; font-weight: 600; color: #1D1D1F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
      nameSpan.textContent = item.name || item.domain || "Akun";
      titleLine.appendChild(nameSpan);

      if (item.domain && item.domain !== item.name) {
        const domSpan = document.createElement("span");
        domSpan.style.cssText = "font-size: 11px; color: #86868B; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
        domSpan.textContent = item.domain;
        titleLine.appendChild(domSpan);
      }

      const userLine = document.createElement("div");
      userLine.style.cssText = "font-size: 11px; color: #636366; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 400; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;";
      userLine.textContent = item.username || "(tanpa username)";

      textCol.appendChild(titleLine);
      textCol.appendChild(userLine);
      left.appendChild(iconBox);
      left.appendChild(textCol);

      // Actions right (Cupertino subtle buttons)
      const right = document.createElement("div");
      right.style.cssText = "display: flex; align-items: center; gap: 6px; flex-shrink: 0;";

      // Copy username
      const btnCopyUser = document.createElement("button");
      btnCopyUser.type = "button";
      btnCopyUser.title = "Salin Nama Pengguna";
      btnCopyUser.className = "vault-action-btn copy-user";
      btnCopyUser.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
      btnCopyUser.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(item.username);
        showGlobalToast("Nama pengguna disalin", "info");
      };

      // Copy password (Key icon)
      const btnCopyPass = document.createElement("button");
      btnCopyPass.type = "button";
      btnCopyPass.title = "Salin Kata Sandi";
      btnCopyPass.className = "vault-action-btn copy-pass";
      btnCopyPass.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`;
      btnCopyPass.onclick = (e) => {
        e.stopPropagation();
        const pwdToCopy = item.password;
        navigator.clipboard.writeText(pwdToCopy).then(() => {
          showGlobalToast("Kata sandi disalin (aman dlm 30d)", "success");
          if (window._megawarden_clear_timer) clearTimeout(window._megawarden_clear_timer);
          window._megawarden_clear_timer = setTimeout(async () => {
            try {
              const current = await navigator.clipboard.readText();
              if (current === pwdToCopy) {
                await navigator.clipboard.writeText("");
                console.log("[Megawarden] Clipboard otomatis dibersihkan.");
              }
            } catch (_) {}
          }, 30000);
        });
      };

      // Edit item
      const btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.title = "Edit Akun";
      btnEdit.className = "vault-action-btn edit-entry";
      btnEdit.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
      btnEdit.onclick = (e) => {
        e.stopPropagation();
        openVaultModal(item);
      };

      // Delete item
      const btnDelete = document.createElement("button");
      btnDelete.type = "button";
      btnDelete.title = "Hapus Akun";
      btnDelete.className = "vault-action-btn danger";
      btnDelete.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
      btnDelete.onclick = async (e) => {
        e.stopPropagation();
        if (confirm(`Hapus kredensial "${item.name || item.domain}" dari Megawarden?`)) {
          await window.megabox.vaultDelete(item.id);
          loadMegawardenVault();
          showGlobalToast("Kredensial dihapus", "info");
        }
      };

      right.appendChild(btnCopyUser);
      right.appendChild(btnCopyPass);
      right.appendChild(btnEdit);
      right.appendChild(btnDelete);

      row.appendChild(left);
      row.appendChild(right);
      vaultListContainer.appendChild(row);
    });
  }

  // Filter vault search input
  if (vaultSearchInput) {
    vaultSearchInput.oninput = () => {
      applyVaultFilterAndRender();
    };
  }

  // Sort dropdown change
  if (vaultSortSelect) {
    vaultSortSelect.onchange = (e) => {
      currentVaultSort = e.target.value;
      applyVaultFilterAndRender();
    };
  }

  // Category filter buttons
  const catButtons = [
    { id: "vault-filter-all", cat: "all" },
    { id: "vault-filter-web", cat: "web" },
    { id: "vault-filter-network", cat: "network" },
    { id: "vault-filter-servicing", cat: "servicing" },
    { id: "vault-filter-finance", cat: "finance" },
    { id: "vault-filter-google", cat: "google" }
  ];

  catButtons.forEach(({ id, cat }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.onclick = () => {
        catButtons.forEach(b => {
          const el = document.getElementById(b.id);
          if (el) {
            el.classList.remove("is-active", "neo-tab-active");
            el.style.removeProperty("background");
            el.style.removeProperty("color");
            el.style.removeProperty("font-weight");
            el.style.removeProperty("box-shadow");
            el.style.removeProperty("border");
          }
        });
        btn.classList.add("is-active", "neo-tab-active");
        btn.style.removeProperty("background");
        btn.style.removeProperty("color");
        btn.style.removeProperty("font-weight");
        btn.style.removeProperty("box-shadow");
        btn.style.removeProperty("border");
        currentVaultCategory = cat;
        applyVaultFilterAndRender();
      };
    }
  });

  // Add / Edit Modal Logic
  function openVaultModal(item = null) {
    if (!vaultModal) return;
    if (item) {
      if (vaultModalTitle) vaultModalTitle.textContent = "Edit Akun Megawarden";
      if (vFormId) vFormId.value = item.id || "";
      if (vFormName) vFormName.value = item.name || "";
      if (vFormUrl) vFormUrl.value = item.url || "";
      if (vFormUsername) vFormUsername.value = item.username || "";
      if (vFormPassword) vFormPassword.value = item.password || "";
      if (vFormNote) vFormNote.value = item.note || "";
    } else {
      if (vaultModalTitle) vaultModalTitle.textContent = "Tambah Akun Megawarden";
      if (vFormId) vFormId.value = "";
      if (vFormName) vFormName.value = "";
      if (vFormUrl) vFormUrl.value = "";
      if (vFormUsername) vFormUsername.value = "";
      if (vFormPassword) vFormPassword.value = "";
      if (vFormNote) vFormNote.value = "";
    }
    if (vFormPassword) vFormPassword.type = "password";
    vaultModal.style.display = "flex";
  }

  function closeVaultModal() {
    if (vaultModal) vaultModal.style.display = "none";
  }

  if (btnVaultAdd) btnVaultAdd.onclick = () => openVaultModal();
  if (vaultModalClose) vaultModalClose.onclick = closeVaultModal;
  if (vaultModalCancel) vaultModalCancel.onclick = closeVaultModal;

  if (vBtnTogglePass) {
    vBtnTogglePass.onclick = () => {
      if (!vFormPassword) return;
      vFormPassword.type = vFormPassword.type === "password" ? "text" : "password";
    };
  }

  if (vBtnGenPass) {
    vBtnGenPass.onclick = async () => {
      if (!window.megabox || typeof window.megabox.vaultGeneratePassword !== "function") return;
      const res = await window.megabox.vaultGeneratePassword({ length: 18 });
      if (res && res.password && vFormPassword) {
        vFormPassword.value = res.password;
        vFormPassword.type = "text";
        showGlobalToast("Sandi acak kuat digenerate", "info");
      }
    };
  }

  if (vaultModalSave) {
    vaultModalSave.onclick = async () => {
      const username = (vFormUsername ? vFormUsername.value : "").trim();
      const password = (vFormPassword ? vFormPassword.value : "").trim();
      const name = (vFormName ? vFormName.value : "").trim();
      const url = (vFormUrl ? vFormUrl.value : "").trim();
      const note = (vFormNote ? vFormNote.value : "").trim();
      const id = vFormId ? vFormId.value : "";

      if (!username || !password) {
        alert("Nama pengguna dan kata sandi wajib diisi!");
        return;
      }

      try {
        await window.megabox.vaultSave({ id, name, url, username, password, note });
        closeVaultModal();
        loadMegawardenVault();
        showGlobalToast("Kredensial berhasil disimpan", "success");
      } catch (err) {
        alert("Gagal menyimpan: " + err.message);
      }
    };
  }

  // Import Google CSV (Uses OS Native Dialog with Fallback)
  if (btnVaultImportCsv) {
    btnVaultImportCsv.onclick = async () => {
      if (window.megabox && typeof window.megabox.vaultPickAndImportCsv === "function") {
        try {
          const res = await window.megabox.vaultPickAndImportCsv();
          if (res && res.canceled) return;
          if (res && res.success) {
            let msg = '';
            if (res.imported > 0 && res.updated > 0) {
              msg = `Berhasil mengimpor ${res.imported} akun baru & memperbarui ${res.updated} akun! (Total ${res.total} akun)`;
            } else if (res.imported > 0) {
              msg = `Berhasil mengimpor ${res.imported} akun dari Google Password Manager! (Total ${res.total} akun)`;
            } else if (res.updated > 0) {
              msg = `Berhasil memperbarui ${res.updated} akun yang sudah ada! (Total ${res.total} akun)`;
            } else {
              msg = `Semua akun (${res.total}) sudah sinkron dan mutakhir.`;
            }
            showGlobalToast(msg, "success");
            loadMegawardenVault();
          } else {
            alert("Gagal impor CSV: " + (res.error || "Format berkas tidak valid"));
          }
        } catch (err) {
          alert("Gagal membuka file dialog: " + err.message);
        }
      } else if (vaultFileInput) {
        vaultFileInput.click();
      }
    };

    if (vaultFileInput) {
      vaultFileInput.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
          const text = evt.target.result;
          try {
            const res = await window.megabox.vaultImportCsv(text);
            if (res && res.success) {
              let msg = '';
              if (res.imported > 0 && res.updated > 0) {
                msg = `Berhasil mengimpor ${res.imported} akun baru & memperbarui ${res.updated} akun! (Total ${res.total} akun)`;
              } else if (res.imported > 0) {
                msg = `Berhasil mengimpor ${res.imported} akun dari Google Password Manager! (Total ${res.total} akun)`;
              } else if (res.updated > 0) {
                msg = `Berhasil memperbarui ${res.updated} akun yang sudah ada! (Total ${res.total} akun)`;
              } else {
                msg = `Semua akun (${res.total}) sudah sinkron dan mutakhir.`;
              }
              showGlobalToast(msg, "success");
              loadMegawardenVault();
            } else {
              alert("Gagal impor CSV: " + (res.error || "Format tidak valid"));
            }
          } catch (err) {
            alert("Gagal membaca berkas CSV: " + err.message);
          } finally {
            vaultFileInput.value = "";
          }
        };
        reader.readAsText(file);
      };
    }
  }

  // Export CSV (Uses OS Native Save Dialog with Fallback)
  if (btnVaultExportCsv) {
    btnVaultExportCsv.onclick = async () => {
      if (window.megabox && typeof window.megabox.vaultExportCsvToFile === "function") {
        try {
          const res = await window.megabox.vaultExportCsvToFile();
          if (res && res.canceled) return;
          if (res && res.success) {
            showGlobalToast("Cadangan sandi CSV berhasil disimpan ke disk!", "success");
          } else {
            alert("Gagal menyimpan berkas: " + (res.error || "Terjadi kesalahan"));
          }
        } catch (err) {
          alert("Gagal mengekspor: " + err.message);
        }
      } else if (window.megabox && typeof window.megabox.vaultExportCsv === "function") {
        try {
          const res = await window.megabox.vaultExportCsv();
          if (res && res.success && res.csv) {
            const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `megawarden-passwords-${new Date().toISOString().slice(0,10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            showGlobalToast("Ekspor berkas CSV berhasil diunduh", "success");
          }
        } catch (err) {
          alert("Gagal ekspor: " + err.message);
        }
      }
    };
  }


  // ==========================================
  // Download Manager Client Logic (Zero-Bloat)
  // ==========================================
  const btnDownloads = document.getElementById('btn-downloads');
  const badgeDlCount = document.getElementById('badge-downloads-count');
  const dlProgressPill = document.getElementById('download-progress-pill');
  const dlPillFilename = document.getElementById('dl-pill-filename');
  const dlPillMeta = document.getElementById('dl-pill-meta');
  const dlPillPercent = document.getElementById('dl-pill-percent');
  const dlPillBar = document.getElementById('dl-pill-bar');
  const dlPillBtnCancel = document.getElementById('dl-pill-btn-cancel');
  const dlHistoryPopover = document.getElementById('download-history-popover');
  const dlHistoryList = document.getElementById('dl-history-list');
  const btnCloseDlPopover = document.getElementById('btn-close-dl-popover');
  const btnClearDlHistory = document.getElementById('btn-clear-dl-history');

  let activeDownloadId = null;
  let activeDownloadCount = 0;

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatTimestamp(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
           d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function updateDownloadBadge() {
    if (!badgeDlCount) return;
    if (activeDownloadCount > 0) {
      badgeDlCount.textContent = activeDownloadCount;
      badgeDlCount.style.display = 'flex';
    } else {
      badgeDlCount.style.display = 'none';
    }
  }

  async function renderDownloadHistory() {
    if (!dlHistoryList || !window.megabox || typeof window.megabox.getDownloadHistory !== 'function') return;
    try {
      const res = await window.megabox.getDownloadHistory();
      const list = (res && res.downloads) ? res.downloads : [];

      if (list.length === 0) {
        dlHistoryList.innerHTML = `
          <div style="text-align: center; padding: 24px 10px; color: #86868B;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#86868B" stroke-width="1.8" style="margin: 0 auto 8px auto; display: block; opacity: 0.6;">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <div style="font-size: 12px; font-weight: 500;">Belum ada riwayat unduhan</div>
            <div style="font-size: 10.5px; opacity: 0.8; margin-top: 2px;">Berkas yang diunduh dari webview akan tercatat di sini</div>
          </div>
        `;
        return;
      }

      dlHistoryList.innerHTML = list.map(item => {
        const isSuccess = item.state === 'completed';
        const stateColor = isSuccess ? '#34C759' : '#FF3B30';
        const stateText = isSuccess ? 'Selesai' : (item.state === 'cancelled' ? 'Dibatalkan' : 'Gagal');

        return `
          <div class="vault-item-row" style="padding: 10px 12px; flex-direction: column; align-items: stretch; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1;">
                <div style="width: 24px; height: 24px; border-radius: 6px; background: rgba(0, 113, 227, 0.08); border: 1px solid rgba(0, 113, 227, 0.16); display: flex; align-items: center; justify-content: center; color: #0071E3; flex-shrink: 0;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                </div>
                <div style="overflow: hidden; flex: 1;">
                  <div style="font-size: 12px; font-weight: 600; color: #1D1D1F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.filename}">${item.filename}</div>
                  <div style="font-size: 10.5px; color: #86868B; display: flex; align-items: center; gap: 6px; margin-top: 1px;">
                    <span>${formatBytes(item.total_bytes || item.received_bytes)}</span>
                    <span>&bull;</span>
                    <span style="color: ${stateColor}; font-weight: 500;">${stateText}</span>
                    <span>&bull;</span>
                    <span>${formatTimestamp(item.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 6px; border-top: 1px solid rgba(0, 0, 0, 0.05); padding-top: 6px;">
              <button type="button" class="crystal-btn-secondary btn-dl-open-file" data-path="${item.path.replace(/"/g, '&quot;')}" style="padding: 3px 8px; font-size: 10.5px;">Buka Berkas</button>
              <button type="button" class="crystal-btn-secondary btn-dl-show-folder" data-path="${item.path.replace(/"/g, '&quot;')}" style="padding: 3px 8px; font-size: 10.5px;">Tampilkan di Folder</button>
            </div>
          </div>
        `;
      }).join('');

      // Attach file and folder open handlers
      dlHistoryList.querySelectorAll('.btn-dl-open-file').forEach(btn => {
        btn.onclick = async () => {
          const filePath = btn.dataset.path;
          if (window.megabox && typeof window.megabox.openDownloadFile === 'function') {
            const res = await window.megabox.openDownloadFile(filePath);
            if (!res || !res.success) {
              alert(res && res.error ? res.error : 'Gagal membuka berkas.');
            }
          }
        };
      });

      dlHistoryList.querySelectorAll('.btn-dl-show-folder').forEach(btn => {
        btn.onclick = async () => {
          const filePath = btn.dataset.path;
          if (window.megabox && typeof window.megabox.showDownloadInFolder === 'function') {
            const res = await window.megabox.showDownloadInFolder(filePath);
            if (!res || !res.success) {
              alert(res && res.error ? res.error : 'Gagal membuka folder.');
            }
          }
        };
      });
    } catch (err) {
      console.error('[Download History Render Error]', err);
    }
  }

  // Sidebar Button Toggle Popover
  if (btnDownloads && dlHistoryPopover) {
    btnDownloads.onclick = (e) => {
      e.stopPropagation();
      const isVisible = dlHistoryPopover.style.display === 'flex';
      if (isVisible) {
        dlHistoryPopover.style.display = 'none';
      } else {
        dlHistoryPopover.style.display = 'flex';
        renderDownloadHistory();
      }
    };

    if (btnCloseDlPopover) {
      btnCloseDlPopover.onclick = () => {
        dlHistoryPopover.style.display = 'none';
      };
    }

    if (btnClearDlHistory) {
      btnClearDlHistory.onclick = async () => {
        if (confirm('Bersihkan seluruh daftar riwayat unduhan? (Berkas fisik di folder Anda tidak akan terhapus)')) {
          if (window.megabox && typeof window.megabox.clearDownloadHistory === 'function') {
            await window.megabox.clearDownloadHistory();
            renderDownloadHistory();
          }
        }
      };
    }

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (dlHistoryPopover.style.display === 'flex' && !dlHistoryPopover.contains(e.target) && !btnDownloads.contains(e.target)) {
        dlHistoryPopover.style.display = 'none';
      }
    });
  }

  // Floating Pill Cancel Button
  if (dlPillBtnCancel) {
    dlPillBtnCancel.onclick = async () => {
      if (activeDownloadId && window.megabox && typeof window.megabox.cancelDownload === 'function') {
        await window.megabox.cancelDownload(activeDownloadId);
        if (dlProgressPill) dlProgressPill.style.display = 'none';
        activeDownloadId = null;
        activeDownloadCount = Math.max(0, activeDownloadCount - 1);
        updateDownloadBadge();
      }
    };
  }

  // Electron IPC Listeners for Downloads
  if (window.megabox) {
    if (typeof window.megabox.onDownloadStarted === 'function') {
      window.megabox.onDownloadStarted((data) => {
        activeDownloadId = data.id;
        activeDownloadCount++;
        updateDownloadBadge();

        if (dlProgressPill) {
          dlProgressPill.style.display = 'block';
          if (dlPillFilename) dlPillFilename.textContent = data.filename || 'Mengunduh...';
          if (dlPillMeta) dlPillMeta.textContent = `0 B / ${formatBytes(data.totalBytes)}`;
          if (dlPillPercent) dlPillPercent.textContent = '0%';
          if (dlPillBar) dlPillBar.style.width = '0%';
        }
      });
    }

    if (typeof window.megabox.onDownloadProgress === 'function') {
      window.megabox.onDownloadProgress((data) => {
        if (dlProgressPill && dlProgressPill.style.display !== 'none') {
          if (dlPillFilename && data.filename) dlPillFilename.textContent = data.filename;
          if (dlPillMeta) dlPillMeta.textContent = `${formatBytes(data.receivedBytes)} / ${formatBytes(data.totalBytes)}`;
          const p = data.percent || 0;
          if (dlPillPercent) dlPillPercent.textContent = `${p}%`;
          if (dlPillBar) dlPillBar.style.width = `${p}%`;
        }
      });
    }

    if (typeof window.megabox.onDownloadCompleted === 'function') {
      window.megabox.onDownloadCompleted((data) => {
        activeDownloadCount = Math.max(0, activeDownloadCount - 1);
        updateDownloadBadge();

        if (dlProgressPill) {
          const isSuccess = data.state === 'completed';
          if (dlPillFilename) dlPillFilename.textContent = isSuccess ? `Selesai: ${data.filename}` : `Unduhan ${data.state}`;
          if (dlPillPercent) dlPillPercent.textContent = isSuccess ? '100%' : 'Batal';
          if (dlPillBar) {
            dlPillBar.style.width = '100%';
            dlPillBar.style.background = isSuccess ? '#34C759' : '#FF3B30';
          }

          // Auto-hide pill after 2.5 seconds
          setTimeout(() => {
            if (activeDownloadCount === 0) {
              dlProgressPill.style.display = 'none';
              if (dlPillBar) dlPillBar.style.background = '#0071E3';
            }
          }, 2500);
        }

        // Auto refresh history popover if open
        if (dlHistoryPopover && dlHistoryPopover.style.display === 'flex') {
          renderDownloadHistory();
        }
      });
    }
  }



  // Global Toast Notification Helper (Apple Liquid Crystal Style)
  function showGlobalToast(message, type = 'info') {
    let container = document.getElementById('global-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'global-toast-container';
      container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 999999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'global-toast-pill';
    toast.style.cssText = 'pointer-events: auto; min-width: 260px; max-width: 420px; padding: 10px 14px; border-radius: 12px; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 10px; backdrop-filter: blur(24px) saturate(190%); -webkit-backdrop-filter: blur(24px) saturate(190%); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); opacity: 0; transform: translateY(12px); box-shadow: 0 16px 36px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04);';

    let iconSvg = '';
    if (type === 'success') {
      toast.style.background = 'rgba(255, 255, 255, 0.94)';
      toast.style.border = '1px solid rgba(52, 199, 89, 0.35)';
      toast.style.color = '#1D1D1F';
      iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34C759" stroke-width="2.2"><path d="M20 6L9 17l-5-5"></path></svg>';
    } else if (type === 'danger') {
      toast.style.background = 'rgba(255, 255, 255, 0.94)';
      toast.style.border = '1px solid rgba(255, 59, 48, 0.35)';
      toast.style.color = '#1D1D1F';
      iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      toast.style.background = 'rgba(255, 255, 255, 0.94)';
      toast.style.border = '1px solid rgba(0, 113, 227, 0.35)';
      toast.style.color = '#1D1D1F';
      iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0071E3" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = '<div style="width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">' + iconSvg + '</div><div style="flex: 1; line-height: 1.4;">' + message + '</div>';

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3200);
  }
  window.showGlobalToast = showGlobalToast;

