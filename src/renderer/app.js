// Megabox Vanilla DOM Controller (Rambox + Ferdium Synthesis)
// Includes Ferdium 440+ Recipes Catalog, Live Search, Tab Context Menu, and Hibernation
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
  const HIBERNATE_TIMEOUT_MS = 15 * 60 * 1000; // 15 mins idle hibernate to free RAM

  const defaultUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

  async function init() {
    setupEventListeners();
    await loadRecipesCatalog();
    
    loadApps();
    refreshSyncUI();
    setInterval(checkHibernation, 60000);


  }

  function setupEventListeners() {
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

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        reloadActiveApp();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const btn = document.getElementById('btn-add-open');
        if (btn) btn.click();
      }
      if (e.key === 'Escape') {
        catalogModal.style.display = 'none';
        configureModal.style.display = 'none';
        if (typeof closeQuickSwitcher === 'function') closeQuickSwitcher();
        hideContextMenu();
      }
      // Alt+1 to Alt+9 switch tab
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
        if (apps[idx]) {
          e.preventDefault();
          selectApp(apps[idx].id);
        }
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
    }
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

  function renderTabs() {
    tabsContainer.innerHTML = '';

    apps.forEach((app, index) => {
      const tab = document.createElement('div');
      tab.id = 'tab-' + app.id;
      tab.className = 'tab-item' + (activeAppId === app.id ? ' is-active' : '');
      tab.title = `${app.name} (Alt+${index + 1})`;

      // Resolve tab icon
      let iconSrc = '';
      const isOfficial = app.icon && app.icon !== 'custom' && app.icon !== 'globe' && app.icon !== 'web';
      if (isOfficial) {
        iconSrc = `assets/icons/${app.icon}.svg`;
      } else if (app.custom_icon) {
        iconSrc = app.custom_icon;
      } else if (app.icon && (app.icon.startsWith('http://') || app.icon.startsWith('https://') || app.icon.startsWith('data:'))) {
        iconSrc = app.icon;
      } else {
        const lowerName = (app.name || '').toLowerCase();
        if (lowerName.includes('cctv') || lowerName.includes('cam')) iconSrc = 'assets/icons/cctv.svg';
        else if (lowerName.includes('github') || lowerName.includes('git')) iconSrc = 'assets/icons/github.svg';
        else if (lowerName.includes('password') || lowerName.includes('key')) iconSrc = 'assets/icons/key.svg';
        else iconSrc = 'assets/icons/web.svg';
      }

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

      // Notification Badge matching Ferdium
      const badge = document.createElement('span');
      badge.id = 'badge-' + app.id;
      badge.className = 'tab-badge';
      badge.textContent = '0';
      tab.appendChild(badge);

      // Tab Click
      tab.onclick = () => selectApp(app.id);

      // Right-click Custom Context Menu (Ferdium TabItem exact replica)
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
                if (tabImg) tabImg.src = res.dataUri;
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


  // 2. Quick Switcher Logic (Ferdium quickSwitch & Rambox quickSwitcher)
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
    { id: 'cmd:dnd', name: 'Mode Konsentrasi / DND (Toggle)', subtitle: 'Senyapkan notifikasi dan suara seketika', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f1f5f9" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>', action: () => toggleDNDMode() },
    { id: 'cmd:catalog', name: 'Tambah Aplikasi (Buka Katalog)', subtitle: 'Jelajahi dan pasang layanan baru', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f1f5f9" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>', action: () => openCatalog() },
    { id: 'cmd:settings', name: 'Pengaturan & Profil Akun', subtitle: 'Konfigurasi sinkronisasi cloud dan avatar', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f1f5f9" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>', action: () => openSettingsModal() },
    { id: 'cmd:reload', name: 'Muat Ulang Layanan Aktif', subtitle: 'Reload tab webview yang sedang aktif', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f1f5f9" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>', action: () => reloadActiveApp() }
  ];

  function renderQuickSwitchList() {
    const q = quickswitchInput.value.toLowerCase().trim();
    
    // Match apps
    const matchedApps = apps.filter(a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)).map(a => {
      let iconSrc = 'assets/icons/chat.svg';
      if (a.custom_icon) {
        iconSrc = a.custom_icon;
      } else if (a.icon && a.icon !== 'custom') {
        iconSrc = `assets/icons/${a.icon}.svg`;
      } else {
        const lowerName = (a.name || '').toLowerCase();
        if (lowerName.includes('cctv') || lowerName.includes('cam')) iconSrc = 'assets/icons/cctv.svg';
        else if (lowerName.includes('github') || lowerName.includes('git')) iconSrc = 'assets/icons/github.svg';
        else if (lowerName.includes('password') || lowerName.includes('key')) iconSrc = 'assets/icons/key.svg';
      }
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
        : `<img src="${app.icon}" onerror="this.src='assets/icons/web.svg'">`;

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
  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Ctrl+K or Ctrl+P -> Quick Switcher
    if (e.ctrlKey && (e.key === 'k' || e.key === 'p')) {
      e.preventDefault();
      quickswitchModal.style.display === 'flex' ? closeQuickSwitcher() : openQuickSwitcher();
    }
    // Escape -> Close Extension Drawer if open
    if (e.key === 'Escape') {
      if (extensionDrawer && extensionDrawer.classList.contains('is-open')) {
        closeExtensionDrawer();
        return;
      }
    }

    // Alt+2 -> Toggle Split Screen 1x2
    if (e.altKey && (e.key === '2' || e.key === '@')) {
      e.preventDefault();
      toggleTileView();
    }
    // Alt+E -> Toggle Contextual Extension Drawer
    if (e.altKey && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
      toggleExtensionDrawer();
    }
    // Alt+Shift+D -> Toggle DND Concentration Mode
    if (e.altKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      toggleDNDMode();
    }
  });


    
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

  const syncBadgeStatus = document.getElementById('sync-badge-status');
  const syncAuthBox = document.getElementById('sync-auth-box');
  const syncConnectedBox = document.getElementById('sync-connected-box');
  const syncInputEmail = document.getElementById('sync-input-email');
  const syncInputPassword = document.getElementById('sync-input-password');
  const btnSyncLogin = document.getElementById('btn-sync-login');
  const btnSyncRegister = document.getElementById('btn-sync-register');
  const syncAuthMsg = document.getElementById('sync-auth-msg');
  const syncUserEmail = document.getElementById('sync-user-email');
  const syncTimeInfo = document.getElementById('sync-time-info');
  const syncTierBadge = document.getElementById('sync-tier-badge');
  const btnSyncManualPush = document.getElementById('btn-sync-manual-push');
  const btnSyncManualPull = document.getElementById('btn-sync-manual-pull');
  const btnSyncLogout = document.getElementById('btn-sync-logout');
  const syncOpMsg = document.getElementById('sync-op-msg');
  const avatarDefaultIcon = document.getElementById('avatar-default-icon');
  const avatarUserImg = document.getElementById('avatar-user-img');
  const avatarUserInitials = document.getElementById('avatar-user-initials');

  function updateProfileAvatar(email) {
    if (!email) {
      if (avatarDefaultIcon) avatarDefaultIcon.style.display = 'block';
      if (avatarUserImg) avatarUserImg.style.display = 'none';
      if (avatarUserInitials) avatarUserInitials.style.display = 'none';
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const initials = cleanEmail.substring(0, 2).toUpperCase();
    const emailHash = md5(cleanEmail);
    // D=404: Hanya tampilkan foto jika user BENAR-BENAR punya foto profil asli.
    // Jika tidak punya foto atau 404, JANGAN pakai pola kristal identicon yang bikin mata lelah!
    // Langsung fallback ke ikon siluet orang minimalis atau inisial elegan.
    const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?s=96&d=404`;

    if (avatarUserImg) {
      avatarUserImg.src = gravatarUrl;
      avatarUserImg.onload = () => {
        avatarUserImg.style.display = 'block';
        if (avatarDefaultIcon) avatarDefaultIcon.style.display = 'none';
        if (avatarUserInitials) avatarUserInitials.style.display = 'none';
      };
      avatarUserImg.onerror = () => {
        avatarUserImg.style.display = 'none';
        if (avatarUserInitials) avatarUserInitials.style.display = 'none';
        if (avatarDefaultIcon) {
          avatarDefaultIcon.style.display = 'block';
          avatarDefaultIcon.style.color = 'var(--brand-primary)';
        }
      };
    }
  }

  async function refreshSyncUI() {
    if (!window.megabox || !window.megabox.getSyncStatus) return;
    try {
      const status = await window.megabox.getSyncStatus();
      if (status.logged_in && status.user) {
        updateProfileAvatar(status.user.email);
        if (syncBadgeStatus) {
          syncBadgeStatus.textContent = 'Terhubung';
          syncBadgeStatus.style.background = 'rgba(92,184,92,0.15)';
          syncBadgeStatus.style.color = 'var(--brand-success)';
          syncBadgeStatus.style.borderColor = 'rgba(92,184,92,0.3)';
        }
        if (syncAuthBox) syncAuthBox.style.display = 'none';
        if (syncConnectedBox) syncConnectedBox.style.display = 'flex';
        if (syncUserEmail) syncUserEmail.textContent = status.user.email;
        if (syncTierBadge) syncTierBadge.textContent = (status.user.tier || 'Gratis').toUpperCase();
        if (syncTimeInfo) {
          const syncDate = status.last_sync ? new Date(status.last_sync).toLocaleTimeString() : 'Baru saja';
          syncTimeInfo.textContent = 'Sinkron terakhir: ' + syncDate + ' (' + (status.device_name || 'PC Ini') + ')';
        }
      } else {
        updateProfileAvatar(null);
        if (syncBadgeStatus) {
          syncBadgeStatus.textContent = 'Belum Terhubung';
          syncBadgeStatus.style.background = 'rgba(255,255,255,0.08)';
          syncBadgeStatus.style.color = 'var(--text-muted)';
        }
        if (syncAuthBox) syncAuthBox.style.display = 'flex';
        if (syncConnectedBox) syncConnectedBox.style.display = 'none';
      }
    } catch (e) {
      console.warn('Failed to refresh sync UI:', e);
    }
  }

  if (btnSettings && settingsModal) {
    btnSettings.onclick = async () => {
      settingsModal.style.display = 'flex';
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

  if (btnSyncLogin) {
    btnSyncLogin.onclick = async () => {
      const email = syncInputEmail.value.trim();
      const password = syncInputPassword.value.trim();
      if (!email || !password) {
        syncAuthMsg.style.display = 'block';
        syncAuthMsg.style.color = '#ef4444';
        syncAuthMsg.textContent = 'Email dan password wajib diisi';
        return;
      }
      btnSyncLogin.disabled = true;
      btnSyncLogin.textContent = 'Memproses...';
      try {
        const res = await window.megabox.loginSync(email, password);
        if (res.success) {
          syncAuthMsg.style.display = 'none';
          await refreshSyncUI();
        } else {
          syncAuthMsg.style.display = 'block';
          syncAuthMsg.style.color = '#ef4444';
          syncAuthMsg.textContent = res.error || 'Gagal masuk akun';
        }
      } catch (err) {
        syncAuthMsg.style.display = 'block';
        syncAuthMsg.style.color = '#ef4444';
        syncAuthMsg.textContent = err.message;
      } finally {
        btnSyncLogin.disabled = false;
        btnSyncLogin.textContent = 'Masuk Cloud';
      }
    };
  }

  if (btnSyncRegister) {
    btnSyncRegister.onclick = async () => {
      const email = syncInputEmail.value.trim();
      const password = syncInputPassword.value.trim();
      if (!email || !password) {
        syncAuthMsg.style.display = 'block';
        syncAuthMsg.style.color = '#ef4444';
        syncAuthMsg.textContent = 'Email dan password wajib diisi';
        return;
      }
      btnSyncRegister.disabled = true;
      btnSyncRegister.textContent = 'Mendaftar...';
      try {
        const res = await window.megabox.registerSync(email, password);
        if (res.success) {
          syncAuthMsg.style.display = 'none';
          await refreshSyncUI();
        } else {
          syncAuthMsg.style.display = 'block';
          syncAuthMsg.style.color = '#ef4444';
          syncAuthMsg.textContent = res.error || 'Gagal mendaftar';
        }
      } catch (err) {
        syncAuthMsg.style.display = 'block';
        syncAuthMsg.style.color = '#ef4444';
        syncAuthMsg.textContent = err.message;
      } finally {
        btnSyncRegister.disabled = false;
        btnSyncRegister.textContent = 'Daftar Baru';
      }
    };
  }

  if (btnSyncLogout) {
    btnSyncLogout.onclick = async () => {
      await window.megabox.logoutSync();
      await refreshSyncUI();
    };
  }

  if (btnSyncManualPush) {
    btnSyncManualPush.onclick = async () => {
      btnSyncManualPush.textContent = 'Uploading...';
      try {
        const res = await window.megabox.manualPushSync();
        if (res.success) {
          syncOpMsg.textContent = 'Berhasil upload tata letak tab ke cloud!';
          syncOpMsg.style.color = 'var(--brand-success)';
          await refreshSyncUI();
        } else {
          syncOpMsg.textContent = res.error || 'Gagal upload';
          syncOpMsg.style.color = '#ef4444';
        }
      } catch (err) {
        syncOpMsg.textContent = err.message;
        syncOpMsg.style.color = '#ef4444';
      } finally {
        btnSyncManualPush.textContent = 'Upload ke Cloud';
      }
    };
  }

  if (btnSyncManualPull) {
    btnSyncManualPull.onclick = async () => {
      btnSyncManualPull.textContent = 'Downloading...';
      try {
        const res = await window.megabox.manualPullSync();
        if (res.success) {
          syncOpMsg.textContent = 'Berhasil download tatanan (' + res.count + ' tab)!';
          syncOpMsg.style.color = 'var(--brand-success)';
          await refreshSyncUI();
        } else {
          syncOpMsg.textContent = res.error || 'Gagal download';
          syncOpMsg.style.color = '#ef4444';
        }
      } catch (err) {
        syncOpMsg.textContent = err.message;
        syncOpMsg.style.color = '#ef4444';
      } finally {
        btnSyncManualPull.textContent = 'Download dari Cloud';
      }
    };
  }

  if (window.megabox && window.megabox.onSyncStatusUpdated) {
    window.megabox.onSyncStatusUpdated(() => {
      refreshSyncUI();
    });
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
    { id: 'dark-reader', name: 'Dark Reader', desc: 'Mode gelap pelindung mata', icon: 'assets/icons/theme-light-dark.svg', enabledByDefault: false },
    { id: 'bitwarden', name: 'Bitwarden', desc: 'Pengelola sandi terenkripsi', icon: 'assets/icons/bitwarden.svg', enabledByDefault: false },
    { id: 'ublock-origin', name: 'uBlock Origin', desc: 'Pemblokir iklan & pelacak', icon: 'assets/icons/shield.svg', enabledByDefault: true },
    { id: 'translate', name: 'Google Translate', desc: 'Terjemahan instan web', icon: 'assets/icons/google-translate.svg', enabledByDefault: false }
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
