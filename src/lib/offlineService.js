// Offline Service using IndexedDB for storing data when offline
const DB_NAME = 'ibrahim_accounting_offline';
const DB_VERSION = 1;

let db = null;

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create object stores for each table
      const tables = [
        'offline_queue',
        'invoices_in',
        'invoices_out',
        'partners',
        'customer_transactions',
        'daily_transactions',
        'inventory_items',
        'employees'
      ];

      tables.forEach(table => {
        if (!database.objectStoreNames.contains(table)) {
          const store = database.createObjectStore(table, { keyPath: 'id' });
          store.createIndex('tenant_id', 'tenant_id', { unique: false });
          store.createIndex('sync_status', 'sync_status', { unique: false });
          if (table === 'offline_queue') {
            store.createIndex('created_at', 'created_at', { unique: false });
          }
        }
      });
    };
  });
};

// Check if online
export const isOnline = () => navigator.onLine;

// Store data offline
export const storeOffline = async (table, operation, data, tenantId, userId) => {
  try {
    const database = await initDB();
    const transaction = database.transaction(['offline_queue'], 'readwrite');
    const store = transaction.objectStore('offline_queue');

    const offlineItem = {
      id: `${table}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      user_id: userId,
      operation_type: operation, // 'create', 'update', 'delete'
      table_name: table,
      record_data: data,
      record_id: data.id || null,
      sync_status: 'pending',
      error_message: null,
      retry_count: 0,
      created_at: new Date().toISOString(),
      synced_at: null
    };

    await store.add(offlineItem);
    return offlineItem;
  } catch (error) {
    console.error('Error storing offline:', error);
    throw error;
  }
};

// Get offline queue
export const getOfflineQueue = async (tenantId) => {
  try {
    const database = await initDB();
    const transaction = database.transaction(['offline_queue'], 'readonly');
    const store = transaction.objectStore('offline_queue');
    const index = store.index('tenant_id');

    return new Promise((resolve, reject) => {
      const request = index.getAll(tenantId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting offline queue:', error);
    return [];
  }
};

// Sync offline data when online
export const syncOfflineData = async (syncFn, tenantId, userId) => {
  if (!isOnline()) {
    return { synced: 0, failed: 0 };
  }

  try {
    const queue = await getOfflineQueue(tenantId);
    const pending = queue.filter(item => item.sync_status === 'pending');
    
    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        // Update status to syncing
        await updateQueueStatus(item.id, 'syncing');

        // Call sync function
        await syncFn(item);

        // Update status to synced
        await updateQueueStatus(item.id, 'synced');
        synced++;
      } catch (error) {
        console.error('Error syncing item:', error);
        await updateQueueStatus(item.id, 'failed', error.message);
        failed++;
      }
    }

    return { synced, failed };
  } catch (error) {
    console.error('Error syncing offline data:', error);
    return { synced: 0, failed: 0, error: error.message };
  }
};

// Update queue item status
const updateQueueStatus = async (id, status, errorMessage = null) => {
  try {
    const database = await initDB();
    const transaction = database.transaction(['offline_queue'], 'readwrite');
    const store = transaction.objectStore('offline_queue');

    const item = await new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (item) {
      item.sync_status = status;
      item.error_message = errorMessage;
      if (status === 'synced') {
        item.synced_at = new Date().toISOString();
      }
      await store.put(item);
    }
  } catch (error) {
    console.error('Error updating queue status:', error);
  }
};

// Clear synced items
export const clearSyncedItems = async (tenantId) => {
  try {
    const database = await initDB();
    const transaction = database.transaction(['offline_queue'], 'readwrite');
    const store = transaction.objectStore('offline_queue');
    const index = store.index('tenant_id');

    const items = await new Promise((resolve, reject) => {
      const request = index.getAll(tenantId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const synced = items.filter(item => item.sync_status === 'synced');
    
    for (const item of synced) {
      await store.delete(item.id);
    }

    return synced.length;
  } catch (error) {
    console.error('Error clearing synced items:', error);
    return 0;
  }
};

// Get pending count
export const getPendingCount = async (tenantId) => {
  try {
    const queue = await getOfflineQueue(tenantId);
    return queue.filter(item => item.sync_status === 'pending').length;
  } catch (error) {
    console.error('Error getting pending count:', error);
    return 0;
  }
};

// Initialize offline service
export const initOfflineService = () => {
  // Listen for online/offline events
  window.addEventListener('online', async () => {
    console.log('Online - starting sync...');
    // Trigger sync will be handled by the app
  });

  window.addEventListener('offline', () => {
    console.log('Offline mode activated');
  });

  // Initialize DB
  return initDB();
};

