// recitation/recitation-setup.js
// 🌟 [جديد بالكامل] منطق شاشة إعداد جلسة التسميع — نفس نمط باقي شاشات الإعداد المعزولة
// في المنصة (راجع dualtests/dual-test-setup.js وsimilarities/similarities.js من ناحية
// الأسلوب العام: استيراد AppState/t من core/app.js، وloadScreen من core/navigation.js).
import { AppState, t } from '../core/app.js';
import { loadScreen } from '../core/navigation.js';

// 🌟 [قرار صريح من المعلم]: نطاق الجلسة (من/إلى) إجباري قبل بدء التسميع، بخلاف حقل
// "أين حدث الخطأ؟" داخل شاشة التسميع نفسها والذي يبقى اختياريًا تمامًا.
export function initRecitationSetup() {
    const student = AppState.currentStudent;
    if (!student) {
        alert(t('rec_no_student_selected'));
        goBackToProfile();
        return;
    }

    const nameEl = document.getElementById('rec-setup-student-name');
    if (nameEl) nameEl.innerText = student.name;

    let selectedType = 'new'; // افتراضي: حفظ جديد (نفس ترتيب الأزرار في الشاشة)
    const btnTypeNew = document.getElementById('rec-type-new-btn');
    const btnTypeReview = document.getElementById('rec-type-review-btn');

    function selectType(type) {
        selectedType = type;
        if (btnTypeNew) btnTypeNew.classList.toggle('rec-type-selected', type === 'new');
        if (btnTypeReview) btnTypeReview.classList.toggle('rec-type-selected', type === 'review');
    }
    btnTypeNew?.addEventListener('click', () => selectType('new'));
    btnTypeReview?.addEventListener('click', () => selectType('review'));

    document.getElementById('rec-setup-back-btn')?.addEventListener('click', goBackToProfile);

    document.getElementById('rec-setup-start-btn')?.addEventListener('click', () => {
        const fromInput = document.getElementById('rec-range-from');
        const toInput = document.getElementById('rec-range-to');
        const from = fromInput ? fromInput.value.trim() : '';
        const to = toInput ? toInput.value.trim() : '';

        if (!from || !to) {
            alert(t('rec_range_required_alert'));
            return;
        }

        // 🌟 يُملأ هنا لحظة الانتقال من شاشة الإعداد، ثم يُقرأ مرة واحدة ويُفرَّغ فورًا في
        // initRecitationPlay() — نفس فكرة similarityGamePlayScope/dualTestPlayMatchId في
        // core/app.js بالضبط، حتى لا يؤثر على أي فتح لاحق للشاشة
        AppState.recitationSessionConfig = {
            studentId: student.id,
            studentName: student.name,
            sessionType: selectedType,
            rangeFrom: from,
            rangeTo: to
        };

        import('./recitation-play.js').then(module => {
            loadScreen({
                templateUrl: 'recitation/recitation-play.html',
                initFunction: () => module.initRecitationPlay()
            });
        }).catch(err => {
            console.error('تعذر تحميل شاشة التسميع المباشر:', err);
            alert('جاري تجهيز شاشة التسميع 🛠️');
        });
    });
}

function goBackToProfile() {
    // 🌟 dynamic import عمدًا لتفادي أي حلقة استيراد ثابتة مع student/student.js —
    // نفس نمط التنقل المستخدم فعليًا في reports/monthly-report.js (goBackToProfile)
    import('../student/student.js').then(m => m.loadStudentProfileScreen()).catch(err => {
        console.error('[recitation-setup.js] تعذر العودة لملف الطالب:', err);
    });
}
