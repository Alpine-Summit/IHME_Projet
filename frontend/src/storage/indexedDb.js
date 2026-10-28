const DB_NAME = 'move-training-db'
const DB_VERSION = 1
const STORE = 'app'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function readAppData(fallback) {
  try {
    const database = await openDatabase()
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE).objectStore(STORE).get('data')
      request.onsuccess = () => resolve(request.result || fallback)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return fallback
  }
}

export async function writeAppData(data) {
  const database = await openDatabase()
  await new Promise((resolve, reject) => {
    const request = database.transaction(STORE, 'readwrite').objectStore(STORE).put(data, 'data')
    request.onsuccess = resolve
    request.onerror = () => reject(request.error)
  })
}
