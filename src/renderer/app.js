// Megabox Vanilla DOM Controller (Rambox + Ferdium Synthesis)
// Includes Ferdium 440+ Recipes Catalog, Live Search, Tab Context Menu, and Hibernation
(function() {
  const tabsContainer = document.getElementById('tabs-container');
  const webviewsContainer = document.getElementById('webviews-container');
  const btnAddOpen = document.getElementById('btn-add-open');
  const btnReload = document.getElementById('btn-reload');
  const btnMute = document.getElementById('btn-mute');
  const iconMuteUnmuted = document.getElementById('icon-mute-unmuted');
  const iconMuteMuted = document.getElementById('icon-mute-muted');

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

  // Custom Context Menu
  const contextMenu = document.getElementById('context-menu');
  const ctxName = document.getElementById('ctx-name');
  const ctxReload = document.getElementById('ctx-reload');
  const ctxMute = document.getElementById('ctx-mute');
  const ctxMuteLabel = document.getElementById('ctx-mute-label');
  const ctxHibernate = document.getElementById('ctx-hibernate');
  const ctxHibernateLabel = document.getElementById('ctx-hibernate-label');
  const ctxDelete = document.getElementById('ctx-delete');

  let apps = [];
  let recipesCatalog = [];
  let activeAppId = null;
  let isGlobalMuted = false;
  let contextTargetApp = null;
  const appLastAccessed = {};
  const HIBERNATE_TIMEOUT_MS = 15 * 60 * 1000; // 15 mins idle hibernate to free RAM

  const defaultUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

  async function init() {
    setupEventListeners();
    await loadRecipesCatalog();
    await loadApps();
    setInterval(checkHibernation, 60000);
  }

  function setupEventListeners() {
    // Open Ferdium Catalog
    btnAddOpen.onclick = () => {
      catalogSearchInput.value = '';
      renderCatalogGrid(recipesCatalog);
      catalogModal.style.display = 'flex';
      setTimeout(() => catalogSearchInput.focus(), 100);
    };

    btnCatalogClose.onclick = () => { catalogModal.style.display = 'none'; };
    btnCustomAdd.onclick = () => {
      catalogModal.style.display = 'none';
      openConfigureForm('Custom Service', 'https://', 'custom');
    };

    // Catalog live search
    catalogSearchInput.oninput = () => {
      const q = catalogSearchInput.value.toLowerCase().trim();
      const filtered = recipesCatalog.filter(r => 
        r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
      );
      renderCatalogGrid(filtered);
    };

    // Configure Form actions
    btnFormClose.onclick = () => { configureModal.style.display = 'none'; };
    btnFormCancel.onclick = () => { configureModal.style.display = 'none'; };
    btnFormSave.onclick = handleSaveService;

    // Control bar
    btnReload.onclick = reloadActiveApp;
    btnMute.onclick = toggleGlobalMute;

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        reloadActiveApp();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        btnAddOpen.click();
      }
      if (e.key === 'Escape') {
        catalogModal.style.display = 'none';
        configureModal.style.display = 'none';
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
    window.addEventListener('click', () => hideContextMenu());

    // Context menu handlers
    ctxReload.onclick = () => {
      if (contextTargetApp) {
        const wv = document.getElementById('wv-' + contextTargetApp.id);
        if (wv) wv.reload();
      }
      hideContextMenu();
    };

    ctxMute.onclick = () => {
      if (contextTargetApp) {
        toggleMuteApp(contextTargetApp.id);
      }
      hideContextMenu();
    };

    ctxHibernate.onclick = () => {
      if (contextTargetApp) {
        toggleHibernateApp(contextTargetApp.id);
      }
      hideContextMenu();
    };

    ctxDelete.onclick = () => {
      if (contextTargetApp) {
        if (confirm(`Remove "${contextTargetApp.name}" from Megabox?`)) {
          deleteAppById(contextTargetApp.id);
        }
      }
      hideContextMenu();
    };

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
        catalogCountBadge.textContent = `${recipesCatalog.length} Available`;
      }
    } catch (e) {
      console.error('Failed to load recipes catalog:', e);
    }
  }

  function renderCatalogGrid(items) {
    catalogGrid.innerHTML = '';
    const displayItems = items.slice(0, 80); // Fast initial virtual slice

    displayItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'service-card';

      const img = document.createElement('img');
      img.src = `assets/icons/${item.id}.svg`;
      img.alt = item.name;
      img.onerror = () => {
        img.src = 'assets/icons/custom.svg';
        img.onerror = () => {
          img.style.display = 'none';
        };
      };

      const info = document.createElement('div');
      info.className = 'service-info';

      const name = document.createElement('div');
      name.className = 'service-name';
      name.textContent = item.name;

      const meta = document.createElement('div');
      meta.className = 'service-meta';
      meta.textContent = item.url ? item.url.replace(/^https?:\/\//, '').split('/')[0] : 'Web Service';

      info.appendChild(name);
      info.appendChild(meta);

      const btn = document.createElement('button');
      btn.className = 'btn-add-pill';
      btn.textContent = 'Add';
      btn.onclick = (e) => {
        e.stopPropagation();
        catalogModal.style.display = 'none';
        openConfigureForm(item.name, item.url || 'https://', item.id);
      };

      card.appendChild(img);
      card.appendChild(info);
      card.appendChild(btn);

      card.onclick = () => {
        catalogModal.style.display = 'none';
        openConfigureForm(item.name, item.url || 'https://', item.id);
      };

      catalogGrid.appendChild(card);
    });
  }

  function openConfigureForm(name, url, icon) {
    formModalTitle.textContent = `Add ${name}`;
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

      // Render tab icon using official SVG
      const iconPath = `assets/icons/${app.icon || 'whatsapp'}.svg`;
      const img = document.createElement('img');
      img.className = 'tab-icon';
      img.src = iconPath;
      img.alt = app.name;
      img.onerror = () => {
        img.remove();
        const fallback = document.createElement('span');
        fallback.className = 'tab-fallback';
        fallback.textContent = (app.name || 'APP').substring(0, 2);
        tab.appendChild(fallback);
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

        // Listen to badge events from preload-webview bridge
        wv.addEventListener('ipc-message', (event) => {
          if (event.channel === 'badge') {
            const count = parseInt(event.args[0], 10) || 0;
            updateAppBadge(app.id, count);
          }
          if (event.channel === 'notification') {
            console.log('[Megabox Notification]', app.name, event.args[0]);
          }
        });

        webviewsContainer.appendChild(wv);
      }
    });
  }

  function showContextMenu(x, y, app) {
    contextTargetApp = app;
    ctxName.textContent = app.name;

    const wv = document.getElementById('wv-' + app.id);
    const isMuted = wv ? wv.isAudioMuted() : false;
    ctxMuteLabel.textContent = isMuted ? 'Unmute Audio' : 'Mute Audio';

    const isHibernated = wv ? (wv.dataset.hibernated === 'true') : false;
    ctxHibernateLabel.textContent = isHibernated ? 'Wake Up Service' : 'Hibernate Service';

    // Position menu
    contextMenu.style.left = `${Math.min(x, window.innerWidth - 200)}px`;
    contextMenu.style.top = `${Math.min(y, window.innerHeight - 180)}px`;
    contextMenu.style.display = 'block';
  }

  function hideContextMenu() {
    contextMenu.style.display = 'none';
    contextTargetApp = null;
  }

  function selectApp(id) {
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
          // Wake up if hibernated
          if (wv.dataset.hibernated === 'true') {
            console.log('[Megabox Hibernate] Waking up app:', app.id);
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

  function toggleMuteApp(id) {
    const wv = document.getElementById('wv-' + id);
    const tab = document.getElementById('tab-' + id);
    if (wv) {
      const current = wv.isAudioMuted();
      wv.setAudioMuted(!current);
      if (tab) {
        if (!current) tab.classList.add('is-muted');
        else tab.classList.remove('is-muted');
      }
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

  function checkHibernation() {
    const now = Date.now();
    apps.forEach(app => {
      if (app.id !== activeAppId) {
        const lastAccess = appLastAccessed[app.id] || now;
        if (now - lastAccess > HIBERNATE_TIMEOUT_MS) {
          const wv = document.getElementById('wv-' + app.id);
          const tab = document.getElementById('tab-' + app.id);
          if (wv && wv.dataset.hibernated !== 'true') {
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

  function toggleGlobalMute() {
    if (!activeAppId) return;
    const wv = document.getElementById('wv-' + activeAppId);
    if (wv) {
      isGlobalMuted = !isGlobalMuted;
      wv.setAudioMuted(isGlobalMuted);
      if (isGlobalMuted) {
        btnMute.classList.add('is-muted');
        iconMuteUnmuted.style.display = 'none';
        iconMuteMuted.style.display = 'block';
      } else {
        btnMute.classList.remove('is-muted');
        iconMuteUnmuted.style.display = 'block';
        iconMuteMuted.style.display = 'none';
      }
    }
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
    if (!name || !url) return;

    // Handle teamId placeholder (e.g. {teamId}.slack.com)
    if (url.includes('{teamId}')) {
      const team = prompt('Enter your Slack / Workspace team ID:', 'myteam');
      if (!team) return;
      url = url.replace('{teamId}', team.trim());
    }

    const id = icon !== 'custom' && !apps.some(a => a.id === icon) ? icon : ('app_' + Date.now());
    const newApp = {
      id: id,
      name: name,
      url: url,
      icon: icon,
      partition: 'persist:' + id,
      order_index: apps.length,
      is_enabled: 1
    };

    if (window.megabox) {
      await window.megabox.saveApp(newApp);
      apps.push(newApp);
      renderTabs();
      selectApp(id);
    }

    configureModal.style.display = 'none';
  }

  window.addEventListener('DOMContentLoaded', init);
})();
