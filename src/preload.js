const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getProcesses: (processCount, filterType) =>
    ipcRenderer.invoke("get-processes", processCount, filterType),
});
