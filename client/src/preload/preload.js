const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

contextBridge.exposeInMainWorld('api', {
  // System Info
  getSystemInfo: () => ({
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    username: os.userInfo().username
  }),
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  // Example: Send a message to main process
  sendMessage: (channel, data) => {
    // Whitelist channels
    let validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // Example: Receive message from main process
  on: (channel, func) => {
    let validChannels = ['fromMain', 'app-closing'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
