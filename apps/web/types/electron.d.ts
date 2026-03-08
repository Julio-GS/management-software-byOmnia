/**
 * Global type declarations for Electron API
 * This file extends the Window interface to include the electron API
 */

declare global {
  interface Window {
    electron?: {
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

      // Pricing API
      pricing: {
        calculate: (params: { 
          cost: number; 
          productId?: string; 
          categoryId?: string 
        }) => Promise<{
          success: boolean;
          data?: {
            calculatedPrice: number;
            suggestedPrice: number;
            markupPercentage: number;
            markupSource: 'product' | 'category' | 'global';
          };
          error?: string;
        }>;
        updateGlobalMarkup: (params: { 
          percentage: number 
        }) => Promise<{
          success: boolean;
          error?: string;
        }>;
        recalculateCategory: (params: { 
          categoryId: string 
        }) => Promise<{
          success: boolean;
          data?: { count: number };
          error?: string;
        }>;
      };

      // Inventory API
      inventory: {
        createMovement: (params: {
          productId: string;
          type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
          quantity: number;
          reason?: string;
          reference?: string;
          notes?: string;
          userId?: string;
        }) => Promise<{
          success: boolean;
          data?: {
            id: string;
            productId: string;
            type: string;
            quantity: number;
            previousStock: number;
            newStock: number;
            reason?: string;
            reference?: string;
            notes?: string;
            userId?: string;
            createdAt: string;
          };
          error?: string;
        }>;
        getMovements: (params: { 
          productId: string; 
          type?: string; 
          limit?: number 
        }) => Promise<{
          success: boolean;
          data?: Array<{
            id: string;
            productId: string;
            type: string;
            quantity: number;
            previousStock: number;
            newStock: number;
            reason?: string;
            reference?: string;
            notes?: string;
            userId?: string;
            createdAt: string;
          }>;
          error?: string;
        }>;
      };

      // Category API
      category: {
        updateMarkup: (params: { 
          categoryId: string; 
          markup: number 
        }) => Promise<{
          success: boolean;
          error?: string;
        }>;
      };

      // Product API
      product: {
        updateMarkup: (params: { 
          productId: string; 
          markup: number 
        }) => Promise<{
          success: boolean;
          data?: { price: number };
          error?: string;
        }>;
        searchByBarcode: (params: { 
          barcode: string 
        }) => Promise<{
          success: boolean;
          data?: {
            id: string;
            name: string;
            barcode: string;
            price: number;
            cost: number;
            stock: number;
            categoryId: string;
            [key: string]: any;
          };
          error?: string;
        }>;
      };

      // Sync API
      sync: {
        getStatus: () => Promise<{
          success: boolean;
          data?: {
            connected: boolean;
            online: boolean;
            queuedItems: number;
            queue?: any;
          };
          error?: string;
        }>;
        forceSync: () => Promise<{
          success: boolean;
          error?: string;
        }>;
        clearQueue: () => Promise<{
          success: boolean;
          error?: string;
        }>;
        onStatus: (callback: (data: { 
          status: 'online' | 'offline' | 'syncing' | 'error'; 
          queuedItems: number;
          connected: boolean;
        }) => void) => void;
        onConflict: (callback: (data: { 
          entityType: string; 
          entityId: string; 
          localData: any; 
          remoteData: any 
        }) => void) => void;
      };

      // Auth API
      auth: {
        getToken: () => Promise<{ success: boolean; token?: string; error?: string }>;
        getUser: () => Promise<{ success: boolean; user?: any; error?: string }>;
        isAuthenticated: () => Promise<{ success: boolean; isAuthenticated: boolean; user?: any }>;
      };

      // Generic IPC invoke method
      invoke: (channel: string, ...args: any[]) => Promise<any>;

      // Real-time Event Listeners
      on: {
        productCreated: (callback: (product: any) => void) => void;
        productUpdated: (callback: (product: any) => void) => void;
        productDeleted: (callback: (product: any) => void) => void;
        categoryCreated: (callback: (category: any) => void) => void;
        categoryUpdated: (callback: (category: any) => void) => void;
        categoryDeleted: (callback: (category: any) => void) => void;
        inventoryMovement: (callback: (movement: any) => void) => void;
        pricingRecalculated: (callback: (data: { type: string; count: number }) => void) => void;
      };
    };
  }
}

export {};
