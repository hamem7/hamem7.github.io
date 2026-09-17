// database/homeworkDB.js

export function initHomeworkDB() {
    return new Promise((resolve, reject) => {
        // 🌟 رفعنا الإصدار إلى 2 لإجبار المتصفح على تحديث الهيكل وإصلاح الخطأ
        let request = indexedDB.open("DarHamHomeworks", 2); 
        
        request.onupgradeneeded = (e) => {
            let db = e.target.result;
            // إزالة autoIncrement لأننا نرسل الـ ID يدوياً كنص (مثال: HW_1234)
            if (!db.objectStoreNames.contains("homeworks")) {
                db.createObjectStore("homeworks", { keyPath: "id" }); 
            }
            if (!db.objectStoreNames.contains("submissions")) {
                db.createObjectStore("submissions", { keyPath: "id" });
            }
        };
        
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

export class HomeworkManager {
    constructor(db) {
        this.db = db;
    }

    getAllHomeworks() {
        return new Promise((resolve) => {
            const tx = this.db.transaction("homeworks", "readonly");
            const store = tx.objectStore("homeworks");
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    addHomework(hwData) {
        return new Promise((resolve) => {
            const tx = this.db.transaction("homeworks", "readwrite");
            const store = tx.objectStore("homeworks");
            const request = store.add(hwData);
            request.onsuccess = () => resolve(request.result);
        });
    }

    updateHomework(hwData) {
        return new Promise((resolve) => {
            const tx = this.db.transaction("homeworks", "readwrite");
            const store = tx.objectStore("homeworks");
            const request = store.put(hwData);
            request.onsuccess = () => resolve(request.result);
        });
    }

    deleteHomework(id) {
        return new Promise((resolve) => {
            const tx = this.db.transaction("homeworks", "readwrite");
            const store = tx.objectStore("homeworks");
            const request = store.delete(id);
            request.onsuccess = () => resolve();
        });
    }
    
    // دالة إنشاء الواجب (التي تستدعيها الشاشة)
    createHomework(hwData) {
        return this.addHomework(hwData);
    }
}