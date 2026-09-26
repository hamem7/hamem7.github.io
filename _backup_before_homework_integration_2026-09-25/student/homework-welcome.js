// student/homework-welcome.js
import { AppState, loadSplashScreen } from '../core/app.js';
import { loadScreen } from '../core/navigation.js';
import { getHomeworkFromCloud } from '../core/firebase.js';
// 🌟 [جديد] فك ترميز بيانات الواجب المضمّنة مباشرة داخل الرابط (راجع الشرح الكامل بجانب
// encodeHomeworkForLink/decodeHomeworkFromLink في database/homeworkDB.js)
import { decodeHomeworkFromLink } from '../database/homeworkDB.js';

let currentHwId = null;

export async function initHomeworkWelcome(hwId) {
    currentHwId = hwId;

    // 🌟🌟 [إصلاح جوهري] المسار الجديد الأول: الرابط الحديث يحمل بيانات الواجب كاملة مُرمَّزة
    // داخله (لا يحتاج أي بحث محلي ولا اتصال بالسحابة إطلاقاً — أضمن حل ممكن، لأنه مش عرضة لأي
    // مشكلة اتصال/صلاحيات/App Check). لو فك الترميز نجح، نستخدم الناتج مباشرة ونتجاوز كل
    // البحث القديم تحت بالكامل.
    let targetHomework = decodeHomeworkFromLink(hwId);

    if (targetHomework) {
        currentHwId = targetHomework.id;
    } else {
        // 🔗 مسار التوافق مع الروابط القديمة (معرّف بسيط فقط، بلا بيانات مُرمَّزة) — بنفس
        // السلوك الأصلي بالضبط: بحث محلي أولاً، ثم سحابي كخط رجوع
        const allHomeworks = await AppState.homeworkManager.getAllHomeworks();
        targetHomework = allHomeworks.find(hw => hw.id === hwId);

        if (!targetHomework) {
            console.log("الواجب غير موجود محلياً، جاري البحث في السحابة...");
            targetHomework = await getHomeworkFromCloud(hwId);
        }
    }

    if (!targetHomework) {
        alert("عذراً! هذا الواجب غير موجود أو تم حذفه من قبل المعلم.");
        loadSplashScreen();
        return;
    }

    AppState.currentHomework = targetHomework;

    if (targetHomework.assignedStudentName) {
        const students = await AppState.studentManager.getAllStudents();
        let assignedStudent = students.find(s => s.name === targetHomework.assignedStudentName);

        if (!assignedStudent) {
            console.log("جهاز جديد: جاري إنشاء ملف شخصي للطالب المخصص آلياً...");
            
            assignedStudent = {
                id: 'std_' + Date.now(),
                name: targetHomework.assignedStudentName,
                totalScore: 0,
                isHidden: false
            };
            
            try {
                if (AppState.studentManager.addStudent) {
                    await AppState.studentManager.addStudent(assignedStudent);
                }
            } catch(e) {}
        }

        AppState.currentStudent = assignedStudent;
        
        document.getElementById('hw-dropdown-section').style.display = 'none';
        document.getElementById('hw-personalized-welcome').style.display = 'block';
        
        // 🌟 تطبيق الصيغة التشجيعية الجديدة التي تناسب الجميع 🌟
        document.getElementById('hw-welcome-name').innerHTML = `مرحباً بك في تحدي الإتقان:<br>👑 <span style="color:#0f766e;">${assignedStudent.name}</span> 🚀`;

    } else {
        await populateStudentDropdown();
    }

    setupWelcomeListeners();
}

async function populateStudentDropdown() {
    const students = await AppState.studentManager.getAllStudents();
    const select = document.getElementById('hw-student-select');
    
    if (!select) return;
    
    students.filter(s => !s.isHidden).forEach(s => {
        let option = document.createElement('option');
        option.value = s.name;
        option.text = `👑 ${s.name}`; // تعديل بسيط ليناسب الصيغة العامة
        select.appendChild(option);
    });
}

function setupWelcomeListeners() {
    document.getElementById('btn-cancel-hw')?.addEventListener('click', () => {
        window.history.pushState({}, document.title, window.location.pathname);
        loadSplashScreen();
    });

    document.getElementById('btn-enter-hw')?.addEventListener('click', async () => {
        if (!AppState.currentStudent) {
            const select = document.getElementById('hw-student-select');
            const selectedName = select.value;

            if (!selectedName) {
                return alert("الرجاء اختيار اسمك أولاً حتى نسجل درجاتك! 🏅");
            }

            const students = await AppState.studentManager.getAllStudents();
            AppState.currentStudent = students.find(s => s.name === selectedName);

            if (!AppState.currentStudent) return alert("حدث خطأ في تحديد الطالب. تأكد من أن حسابك موجود في المنصة.");
        }

        import('../games/homework-play.js').then(module => {
            loadScreen({
                templateUrl: 'games/homework-play.html',
                initFunction: () => module.initHomeworkPlay()
            });
        }).catch(err => {
            console.error("شاشة اللعب غير متوفرة:", err);
            alert("حدث خطأ في تحميل ساحة التحدي. تأكد من وجود ملف games/homework-play.js");
        });
    });
}