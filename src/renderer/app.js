function megaboxApp() {
  return {
    apps: [],
    activeAppId: null,
    badges: {},
    isMuted: false,
    showAddModal: false,
    defaultUA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    newAppForm: {
      name: '',
      url: '',
      icon: 'whatsapp'
    },

    async init() {
      if (window.megabox) {
        this.apps = await window.megabox.getApps();
        if (this.apps.length > 0) {
          this.activeAppId = this.apps[0].id;
        }

        window.megabox.onAppListUpdated((updated) => {
          this.apps = updated;
          if (!this.apps.find(a => a.id === this.activeAppId) && this.apps.length > 0) {
            this.activeAppId = this.apps[0].id;
          }
        });
      }

      // Attach IPC-to-host listener for webviews after DOM rendered
      this.(() => {
        this.setupWebviewListeners();
      });
    },

    selectApp(id) {
      this.activeAppId = id;
    },

    setupWebviewListeners() {
      document.querySelectorAll('webview').forEach(wv => {
        wv.addEventListener('ipc-message', (event) => {
          const appId = wv.id.replace('wv-', '');
          if (event.channel === 'badge') {
            this.badges[appId] = event.args[0] || 0;
          }
          if (event.channel === 'notification') {
            console.log('[Megabox Notification]', appId, event.args[0]);
          }
        });
      });
    },

    reloadActiveApp() {
      if (!this.activeAppId) return;
      const wv = document.getElementById('wv-' + this.activeAppId);
      if (wv) wv.reload();
    },

    toggleMuteActiveApp() {
      if (!this.activeAppId) return;
      const wv = document.getElementById('wv-' + this.activeAppId);
      if (wv) {
        this.isMuted = !this.isMuted;
        wv.setAudioMuted(this.isMuted);
      }
    },

    async handleAddApp() {
      if (!this.newAppForm.name || !this.newAppForm.url) return;
      const id = 'app_' + Date.now();
      const newApp = {
        id: id,
        name: this.newAppForm.name,
        url: this.newAppForm.url,
        icon: this.newAppForm.icon,
        partition: 'persist:' + id,
        order_index: this.apps.length,
        is_enabled: 1
      };

      if (window.megabox) {
        await window.megabox.saveApp(newApp);
        this.activeAppId = id;
      }
      this.showAddModal = false;
      this.newAppForm = { name: '', url: '', icon: 'whatsapp' };

      this.(() => {
        this.setupWebviewListeners();
      });
    }
  };
}
