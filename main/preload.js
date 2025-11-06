const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  getProducts: (filters) => ipcRenderer.invoke('products:list', filters),
  saveProduct: (product) => ipcRenderer.invoke('products:save', product),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  createOrder: (order) => ipcRenderer.invoke('orders:create', order),
  getOrders: (filters) => ipcRenderer.invoke('orders:list', filters),
  getReports: () => ipcRenderer.invoke('reports:summary'),
  getLowStock: (threshold) => ipcRenderer.invoke('inventory:low', threshold),
  importStock: (entries) => ipcRenderer.invoke('inventory:import', entries),
  exportStock: () => ipcRenderer.invoke('inventory:export'),
  getUsers: () => ipcRenderer.invoke('users:list'),
  createUser: (payload) => ipcRenderer.invoke('users:create', payload),
  printInvoice: (html) => ipcRenderer.invoke('print:invoice', html)
});
