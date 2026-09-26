// database/quranDB.js

export const QURAN_DB_NAME = "DarHamDatabase";
export const QURAN_DB_VERSION = 1;
export const QURAN_STORE = "quran";

export function initQuranDB() { 
    return new Promise((resolve, reject) => { 
        let request = indexedDB.open(QURAN_DB_NAME, QURAN_DB_VERSION); 
        request.onupgradeneeded = (e) => { 
            let db = e.target.result; 
            if (!db.objectStoreNames.contains(QURAN_STORE)) {
                db.createObjectStore(QURAN_STORE, { keyPath: "number" }); 
            }
        }; 
        request.onsuccess = (e) => resolve(e.target.result); 
        request.onerror = (e) => reject(e.target.error); 
    }); 
}

export async function ensureQuranLoaded() { 
    const db = await initQuranDB(); 
    return new Promise((resolve, reject) => { 
        const tx = db.transaction(QURAN_STORE, "readonly"); 
        const store = tx.objectStore(QURAN_STORE); 
        const countReq = store.count(); 
        countReq.onsuccess = async () => { 
            if (countReq.result === 0) { 
                try { 
                    let response = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani'); 
                    let data = await response.json(); 
                    const writeTx = db.transaction(QURAN_STORE, "readwrite"); 
                    const writeStore = writeTx.objectStore(QURAN_STORE); 
                    data.data.surahs.forEach(surah => writeStore.put(surah)); 
                    writeTx.oncomplete = () => resolve(db); 
                } catch (error) { reject(error); } 
            } else { 
                resolve(db); 
            } 
        }; 
    }); 
}