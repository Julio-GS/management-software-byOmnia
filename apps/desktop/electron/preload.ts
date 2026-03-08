import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface
export interface ElectronAPI {
  // System info
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  getUserDataPath: () => Promise<string>;

  // File operations
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;

  // Dialog operations
  showOpenDialog: (options: any) => Promise<any>;
  showSaveDialog: (options: any) => Promise<any>;
  showMessageBox: (options: any) => Promise<any>;

  // Pricing operations
  pricing: {
    calculate: (params: { cost: number; productId?: string; categoryId?: string }) => Promise<any>;
    updateGlobalMarkup: (params: { percentage: number }) => Promise<any>;
    recalculateCategory: (params: { categoryId: string }) => Promise<any>;
  };

  // Inventory operations
  inventory: {
    createMovement: (params: {
      productId: string;
      type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
      quantity: number;
      reason?: string;
      reference?: string;
      notes?: string;
      userId?: string;
    }) => Promise<any>;
    getMovements: (params: { productId: string; type?: string; limit?: number }) => Promise<any>;
  };

  // Category operations
  category: {
    updateMarkup: (params: { categoryId: string; markup: number }) => Promise<any>;
  };

  // Product operations
  product: {
    updateMarkup: (params: { productId: string; markup: number }) => Promise<any>;
    searchByBarcode: (params: { barcode: string }) => Promise<any>;
  };

  // Sync operations
  sync: {
    getStatus: () => Promise<any>;
    forceSync: () => Promise<any>;
    clearQueue: () => Promise<any>;
    onStatus: (callback: (data: any) => void) => void;
    onConflict: (callback: (data: any) => void) => void;
  };

  // Auth operations
  auth: {
    getToken: () => Promise<{ success: boolean; token?: string; error?: string }>;
    getUser: () => Promise<{ success: boolean; user?: any; error?: string }>;
    isAuthenticated: () => Promise<{ success: boolean; isAuthenticated: boolean; user?: any }>;
  };

  // Real-time event listeners
  on: {
    productCreated: (callback: (data: any) => void) => void;
    productUpdated: (callback: (data: any) => void) => void;
    productDeleted: (callback: (data: any) => void) => void;
    categoryCreated: (callback: (data: any) => void) => void;
    categoryUpdated: (callback: (data: any) => void) => void;
    categoryDeleted: (callback: (data: any) => void) => void;
    inventoryMovement: (callback: (data: any) => void) => void;
    pricingRecalculated: (callback: (data: any) => void) => void;
  };
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api: ElectronAPI = {
  // System info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

  // File operations
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string) => 
    ipcRenderer.invoke('write-file', filePath, content),

  // Dialog operations
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  showMessageBox: (options: any) => ipcRenderer.invoke('show-message-box', options),

  // Pricing operations
  pricing: {
    calculate: (params) => ipcRenderer.invoke('pricing:calculate', params),
    updateGlobalMarkup: (params) => ipcRenderer.invoke('pricing:updateGlobalMarkup', params),
    recalculateCategory: (params) => ipcRenderer.invoke('pricing:recalculateCategory', params),
  },

  // Inventory operations
  inventory: {
    createMovement: (params) => ipcRenderer.invoke('inventory:createMovement', params),
    getMovements: (params) => ipcRenderer.invoke('inventory:getMovements', params),
  },

  // Category operations
  category: {
    updateMarkup: (params) => ipcRenderer.invoke('category:updateMarkup', params),
  },

  // Product operations
  product: {
    updateMarkup: (params) => ipcRenderer.invoke('product:updateMarkup', params),
    searchByBarcode: (params) => ipcRenderer.invoke('product:searchByBarcode', params),
  },

  // Sync operations
  sync: {
    getStatus: () => ipcRenderer.invoke('sync:getStatus'),
    forceSync: () => ipcRenderer.invoke('sync:forceSync'),
    clearQueue: () => ipcRenderer.invoke('sync:clearQueue'),
    onStatus: (callback) => {
      ipcRenderer.on('sync:status', (_, data) => callback(data));
    },
    onConflict: (callback) => {
      ipcRenderer.on('sync:conflict', (_, data) => callback(data));
    },
  },

  // Auth operations
  auth: {
    getToken: () => ipcRenderer.invoke('auth:getToken'),
    getUser: () => ipcRenderer.invoke('auth:getUser'),
    isAuthenticated: () => ipcRenderer.invoke('auth:isAuthenticated'),
  },

  // Real-time event listeners
  on: {
    productCreated: (callback) => {
      ipcRenderer.on('product:created', (_, data) => callback(data));
    },
    productUpdated: (callback) => {
      ipcRenderer.on('product:updated', (_, data) => callback(data));
    },
    productDeleted: (callback) => {
      ipcRenderer.on('product:deleted', (_, data) => callback(data));
    },
    categoryCreated: (callback) => {
      ipcRenderer.on('category:created', (_, data) => callback(data));
    },
    categoryUpdated: (callback) => {
      ipcRenderer.on('category:updated', (_, data) => callback(data));
    },
    categoryDeleted: (callback) => {
      ipcRenderer.on('category:deleted', (_, data) => callback(data));
    },
    inventoryMovement: (callback) => {
      ipcRenderer.on('inventory:movement', (_, data) => callback(data));
    },
    pricingRecalculated: (callback) => {
      ipcRenderer.on('pricing:recalculated', (_, data) => callback(data));
    },
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', api);
