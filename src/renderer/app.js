// Native Vanilla JS Controller for Megabox (Zero-Dependency & Immune to CDN/Evaluation race conditions)
(function() {
  let apps = [];
  let activeAppId = null;
  let isMuted = false;
  const defaultUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

  const appsContainer = document.getElementById('apps-list');
  const webviewsContainer = document.getElementById('webviews-container');
  const addModal = document.getElementById('add-modal');
  const btnAddOpen = document.getElementById('btn-add-open');
  const btnAddCancel = document.getElementById('btn-add-cancel');
  const btnAddSave = document.getElementById('btn-add-save');
  const btnReload = document.getElementById('btn-reload');
  const btnMute = document.getElementById('btn-mute');

  const inputName = document.getElementById('input-name');
  const inputUrl = document.getElementById('input-url');
  const selectPreset = document.getElementById('select-preset');

  async function init() {
    console.log('[Megabox Native] Booting controller...');
    if (window.megabox) {
      apps = await window.megabox.getApps();
      console.log('[Megabox Native] Loaded apps:', apps);
      renderTabs();
      if (apps.length > 0) {
        selectApp(apps[0].id);
      }
    }

    // Modal controls
    if (btnAddOpen) btnAddOpen.onclick = () => addModal.style.display = 'flex';
    if (btnAddCancel) btnAddCancel.onclick = () => addModal.style.display = 'none';
    if (btnAddSave) btnAddSave.onclick = handleAddApp;

    // Tab toolbar controls
    if (btnReload) btnReload.onclick = reloadActiveApp;
    if (btnMute) btnMute.onclick = toggleMuteActiveApp;
  }

  function getIconSvg(icon) {
    if (icon === 'whatsapp') {
      return '<svg class="w-6 h-6 text-emerald-400 pointer-events-none" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>';
    }
    if (icon === 'telegram') {
      return '<svg class="w-6 h-6 text-sky-400 pointer-events-none" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>';
    }
    if (icon === 'discord') {
      return '<svg class="w-6 h-6 text-indigo-400 pointer-events-none" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>';
    }
    if (icon === 'gmail') {
      return '<svg class="w-6 h-6 text-red-400 pointer-events-none" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>';
    }
    return '<span class="text-xs font-bold text-slate-300 uppercase pointer-events-none">' + (icon || 'APP').substring(0, 2) + '</span>';
  }

  function renderTabs() {
    appsContainer.innerHTML = '';
    apps.forEach(app => {
      const btn = document.createElement('button');
      btn.id = 'tab-' + app.id;
      btn.className = 'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 relative shadow-sm cursor-pointer mb-3 ' +
                      (activeAppId === app.id ? 'bg-slate-800 ring-2 ring-cyan-500/50 text-white' : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200');
      btn.title = app.name;
      btn.innerHTML = getIconSvg(app.icon);
      btn.onclick = () => selectApp(app.id);
      appsContainer.appendChild(btn);

      // Create webview if not exists
      let wv = document.getElementById('wv-' + app.id);
      if (!wv) {
        wv = document.createElement('webview');
        wv.id = 'wv-' + app.id;
        wv.src = app.url;
        wv.partition = app.partition;
        wv.useragent = app.user_agent || defaultUA;
        wv.setAttribute('preload', '../main/preload-webview.js');
        wv.setAttribute('allowpopups', '');
        wv.className = 'w-full h-full bg-slate-950 absolute inset-0';
        wv.style.display = (activeAppId === app.id) ? 'flex' : 'none';
        webviewsContainer.appendChild(wv);
      }
    });
  }

  function selectApp(id) {
    activeAppId = id;
    console.log('[Megabox Native] Selected tab:', id);

    // Update buttons
    apps.forEach(app => {
      const btn = document.getElementById('tab-' + app.id);
      if (btn) {
        if (app.id === id) {
          btn.className = 'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 relative shadow-sm cursor-pointer mb-3 bg-slate-800 ring-2 ring-cyan-500/50 text-white';
        } else {
          btn.className = 'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 relative shadow-sm cursor-pointer mb-3 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200';
        }
      }

      const wv = document.getElementById('wv-' + app.id);
      if (wv) {
        wv.style.display = (app.id === id) ? 'flex' : 'none';
      }
    });
  }

  function reloadActiveApp() {
    if (!activeAppId) return;
    const wv = document.getElementById('wv-' + activeAppId);
    if (wv) {
      console.log('[Megabox Native] Reloading active webview:', activeAppId);
      wv.reload();
    }
  }

  function toggleMuteActiveApp() {
    if (!activeAppId) return;
    const wv = document.getElementById('wv-' + activeAppId);
    if (wv) {
      isMuted = !isMuted;
      wv.setAudioMuted(isMuted);
      console.log('[Megabox Native] Audio muted state:', isMuted);
      if (btnMute) {
        btnMute.className = isMuted ? 'w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center cursor-pointer' : 'w-9 h-9 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center cursor-pointer';
      }
    }
  }

  async function handleAddApp() {
    const name = inputName.value.trim();
    const url = inputUrl.value.trim();
    const icon = selectPreset.value;
    if (!name || !url) return;

    const id = 'app_' + Date.now();
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

    addModal.style.display = 'none';
    inputName.value = '';
    inputUrl.value = '';
  }

  window.addEventListener('DOMContentLoaded', init);
})();
