const DB_NAME = 'pdf-cache'
const STORE_NAME = 'pdfs'
const MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 天

export const usePdfCache = () => {
  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'url' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  const getCachedPdf = async (url: string): Promise<{ data: ArrayBuffer; timestamp: number } | null> => {
    try {
      const db = await openDB()
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(url)
        request.onsuccess = () => {
          const result = request.result
          if (result && Date.now() - result.timestamp < MAX_AGE) {
            resolve(result)
          } else {
            resolve(null)
          }
        }
        request.onerror = () => resolve(null)
      })
    } catch (e) {
      return null
    }
  }

  const cachePdf = async (url: string, data: ArrayBuffer): Promise<void> => {
    try {
      const db = await openDB()
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      store.put({
        url,
        data,
        timestamp: Date.now()
      })
    } catch (e) {
      console.error('Failed to cache PDF:', e)
    }
  }

  const clearOldCache = async (): Promise<void> => {
    try {
      const db = await openDB()
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          if (Date.now() - cursor.value.timestamp > MAX_AGE) {
            cursor.delete()
          }
          cursor.continue()
        }
      }
    } catch (e) {
      console.error('Failed to clear old cache:', e)
    }
  }

  return { getCachedPdf, cachePdf, clearOldCache }
}
