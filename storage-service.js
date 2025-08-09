class StorageService {
    constructor(config) {
        this.config = config;
        this.prefix = config.storage.prefix;
        this.db = null;
        this.initIndexedDB();
    }

    async initIndexedDB() {
        if (!window.indexedDB) {
            Logger.warn('IndexedDB not supported');
            return;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ITMonitorDB', 1);

            request.onerror = () => {
                Logger.error('Failed to open IndexedDB', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                Logger.info('IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('metrics')) {
                    const metricsStore = db.createObjectStore('metrics', { keyPath: 'timestamp' });
                    metricsStore.createIndex('type', 'type', { unique: false });
                }

                if (!db.objectStoreNames.contains('alerts')) {
                    const alertsStore = db.createObjectStore('alerts', { keyPath: 'id' });
                    alertsStore.createIndex('severity', 'severity', { unique: false });
                    alertsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('services')) {
                    const servicesStore = db.createObjectStore('services', { keyPath: 'id' });
                    servicesStore.createIndex('status', 'status', { unique: false });
                }

                if (!db.objectStoreNames.contains('performance')) {
                    const perfStore = db.createObjectStore('performance', { keyPath: 'id', autoIncrement: true });
                    perfStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    set(key, value, useIndexedDB = false) {
        try {
            if (useIndexedDB && this.db) {
                return this.setIndexedDB(key, value);
            }

            const serialized = JSON.stringify(value);
            
            if (this.config.storage.encryption) {
                // In production, implement proper encryption
                localStorage.setItem(this.prefix + key, btoa(serialized));
            } else {
                localStorage.setItem(this.prefix + key, serialized);
            }

            this.checkStorageQuota();
            return true;
        } catch (error) {
            Logger.error('Storage set failed', { key, error: error.message });
            return false;
        }
    }

    get(key, useIndexedDB = false) {
        try {
            if (useIndexedDB && this.db) {
                return this.getIndexedDB(key);
            }

            const item = localStorage.getItem(this.prefix + key);
            if (!item) return null;

            const decrypted = this.config.storage.encryption ? atob(item) : item;
            return JSON.parse(decrypted);
        } catch (error) {
            Logger.error('Storage get failed', { key, error: error.message });
            return null;
        }
    }

    async setIndexedDB(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(true);
            request.onerror = () => {
                Logger.error('IndexedDB set failed', request.error);
                reject(request.error);
            };
        });
    }

    async getIndexedDB(storeName, query = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = query ? store.get(query) : store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                Logger.error('IndexedDB get failed', request.error);
                reject(request.error);
            };
        });
    }

    async getHistoricalData(storeName, startTime, endTime) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index('timestamp');
            const range = IDBKeyRange.bound(startTime, endTime);
            const request = index.getAll(range);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            Logger.error('Storage remove failed', { key, error: error.message });
            return false;
        }
    }

    clear(prefix = true) {
        try {
            if (prefix) {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(this.prefix)) {
                        localStorage.removeItem(key);
                    }
                });
            } else {
                localStorage.clear();
            }
            return true;
        } catch (error) {
            Logger.error('Storage clear failed', error);
            return false;
        }
    }

    checkStorageQuota() {
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(estimate => {
                const percentUsed = (estimate.usage / estimate.quota) * 100;
                if (percentUsed > 90) {
                    Logger.warn('Storage quota warning', { percentUsed: percentUsed.toFixed(2) });
                    this.cleanupOldData();
                }
            });
        }
    }

    async cleanupOldData() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.monitoring.historicalDataDays);
        
        if (this.db) {
            const stores = ['metrics', 'alerts', 'performance'];
            for (const storeName of stores) {
                await this.deleteOldRecords(storeName, cutoffDate.getTime());
            }
        }

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix + 'temp_')) {
                localStorage.removeItem(key);
            }
        });
    }

    async deleteOldRecords(storeName, cutoffTime) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const index = store.index('timestamp');
            const range = IDBKeyRange.upperBound(cutoffTime);
            const request = index.openCursor(range);

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    exportData() {
        const data = {
            localStorage: {},
            timestamp: new Date().toISOString()
        };

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                data.localStorage[key] = localStorage.getItem(key);
            }
        });

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monitoring-data-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    Object.entries(data.localStorage).forEach(([key, value]) => {
                        localStorage.setItem(key, value);
                    });
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}