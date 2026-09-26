// database/studentDB.js

export function initStudentDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("DarHamStudents", 1);
        request.onupgradeneeded = (e) => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains("students")) {
                db.createObjectStore("students", { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

export class StudentManager {
    constructor(db) {
        this.db = db;
    }

    getAllStudents() {
        return new Promise((resolve) => {
            const tx = this.db.transaction("students", "readonly");
            const store = tx.objectStore("students");
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    addStudent(studentData) {
        return new Promise((resolve) => {
            const tx = this.db.transaction("students", "readwrite");
            const store = tx.objectStore("students");
            studentData.totalScore = 0;
            // 🌟 عدّادا المحاولات والإجابات الصحيحة — أساس حساب نسبة الإتقان الحقيقية
            // (0-100%) في بطاقة "نظرة سريعة" بالشاشة الرئيسية، بدل استخدام totalScore
            // التراكمي (نقاط بلا سقف) كأنه نسبة مئوية
            studentData.totalAttempts = 0;
            studentData.totalCorrect = 0;
            const request = store.add(studentData);
            request.onsuccess = () => resolve(request.result);
        });
    }

    updateStudent(studentData) {
        return new Promise((resolve) => {
            const tx = this.db.transaction("students", "readwrite");
            const store = tx.objectStore("students");
            const request = store.put(studentData);
            request.onsuccess = () => resolve(request.result);
        });
    }

    deleteStudent(id) {
        return new Promise((resolve) => {
            const tx = this.db.transaction("students", "readwrite");
            const store = tx.objectStore("students");
            const request = store.delete(id);
            request.onsuccess = () => resolve();
        });
    }
}