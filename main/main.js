const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const createDatabase = require('../database');
const { ensureDatabase } = require('../database/initialize');

let mainWindow;
let database;

const createWindow = async () => {
  const isDev = process.env.NODE_ENV === 'development';
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'index.html'));
  }
};

const registerHandlers = () => {
  ipcMain.handle('auth:login', async (_event, credentials) => {
    return database.login(credentials);
  });

  ipcMain.handle('products:list', async (_event, filters) => {
    return database.getProducts(filters || {});
  });

  ipcMain.handle('products:save', async (_event, payload) => {
    await database.saveProduct(payload);
    return database.getProducts();
  });

  ipcMain.handle('products:delete', async (_event, id) => {
    await database.deleteProduct(id);
    return true;
  });

  ipcMain.handle('orders:create', async (_event, order) => {
    return database.createOrder(order);
  });

  ipcMain.handle('orders:list', async (_event, filters) => {
    return database.getOrders(filters || {});
  });

  ipcMain.handle('reports:summary', async () => {
    return database.getReports();
  });

  ipcMain.handle('inventory:low', async (_event, threshold) => {
    return database.getLowStock(threshold || 5);
  });

  ipcMain.handle('inventory:import', async (_event, entries) => {
    await database.importStock(entries);
    return true;
  });

  ipcMain.handle('inventory:export', async () => {
    return database.exportStock();
  });

  ipcMain.handle('users:list', async () => {
    return database.getUsers();
  });

  ipcMain.handle('users:create', async (_event, payload) => {
    return database.createUser(payload);
  });

  ipcMain.handle('print:invoice', async (_event, html) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true
      }
    });
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    return new Promise((resolve, reject) => {
      printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
          if (!success) {
            reject(new Error(failureReason));
          } else {
            resolve(true);
          }
          if (!printWindow.isDestroyed()) {
            printWindow.close();
          }
        });
      });
    });
  });
};

app.whenReady().then(async () => {
  const dbPath = await ensureDatabase();
  database = createDatabase(dbPath);
  registerHandlers();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (database) {
    database.close();
  }
});
