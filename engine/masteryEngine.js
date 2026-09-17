// engine/masteryEngine.js

export class MasteryEngine {
    constructor() {
        // الأوزان النسبية للأنشطة المختلفة (كل نشاط ومدى قياسه لعمق الحفظ)
        this.activityWeights = {
            'recite': 1.0,         // التسميع المباشر (أساسي)
            'previous': 1.3,       // ماذا قبلها (يتطلب حفظاً عميقاً جداً)
            'next': 1.1,           // ماذا بعدها
            'between': 1.2,        // الآية بين آيتين
            'order': 1.2,          // ترتيب الآيات
            'mistake': 1.4,        // اكتشاف الخطأ (إتقان عالي)
            'complete_ayah': 1.1,  // أكمل الآية
            'similarity': 1.5,     // المتشابهات (أعلى درجات التمكين)
            'kids_catch': 1.0,
            'kids_next': 1.0,
            'kids_tf': 0.9,
            'kids_word_order': 1.1,
            'kids_recite': 1.0
        };
    }

    // حساب درجة الإتقان المركبة لجلسة معينة
    calculateSessionMastery(sessionDetails = []) {
        if (!sessionDetails || sessionDetails.length === 0) return { score: 100, level: this.getLevel(100) };

        let totalWeightedPoints = 0;
        let earnedWeightedPoints = 0;

        sessionDetails.forEach(item => {
            let weight = this.activityWeights[item.type] || 1.0;
            totalWeightedPoints += (10 * weight);
            if (item.isCorrect) {
                earnedWeightedPoints += (10 * weight);
            }
        });

        let finalPercentage = totalWeightedPoints > 0 ? Math.round((earnedWeightedPoints / totalWeightedPoints) * 100) : 100;
        return {
            score: finalPercentage,
            level: this.getLevel(finalPercentage),
            details: {
                totalQuestions: sessionDetails.length,
                correctCount: sessionDetails.filter(d => d.isCorrect).length,
                errorCount: sessionDetails.filter(d => !d.isCorrect).length
            }
        };
    }

    // تقييم الإتقان التراكمي الشامل للبطل من كل تاريخه
    calculateOverallStudentMastery(studentHistory = [], currentWeaknesses = []) {
        if (!studentHistory || studentHistory.length === 0) {
            return {
                overallScore: 0,
                level: this.getLevel(0),
                statusText: "بانتظار أول تقييم 🎯"
            };
        }

        // متوسط آخر 5 اختبارات
        let recentTests = studentHistory.slice(-5);
        let sumScores = recentTests.reduce((acc, curr) => acc + (curr.score || 0), 0);
        let baseAverage = sumScores / recentTests.length;

        // خصم بسيط إذا كان لديه أخطاء متراكمة غير معالجة
        let weaknessPenalty = Math.min(15, (currentWeaknesses?.length || 0) * 2);
        let finalOverall = Math.max(0, Math.round(baseAverage - weaknessPenalty));

        return {
            overallScore: finalOverall,
            level: this.getLevel(finalOverall),
            activeWeaknessesCount: currentWeaknesses?.length || 0,
            testsCount: studentHistory.length
        };
    }

    // تصنيف المستويات حسب السلم المعتمد
    getLevel(percentage) {
        if (percentage >= 95) return { name: "إتقان ممتاز 🏆", badgeClass: "badge-excellent", color: "#15803d" };
        if (percentage >= 90) return { name: "إتقان متقدم 🌟", badgeClass: "badge-advanced", color: "#16a34a" };
        if (percentage >= 80) return { name: "إتقان جيد 👍", badgeClass: "badge-good", color: "#2563eb" };
        if (percentage >= 70) return { name: "إتقان متوسط ⚖️", badgeClass: "badge-medium", color: "#d97706" };
        if (percentage >= 50) return { name: "إتقان ضعيف ⚠️", badgeClass: "badge-weak", color: "#ea580c" };
        return { name: "يحتاج إلى تأسيس وتثبيت 🛠️", badgeClass: "badge-foundation", color: "#dc2626" };
    }
}