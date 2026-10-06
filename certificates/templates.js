// certificates/templates.js
// ==========================================================
// 🏅 قوالب الشهادات: كل قالب = صورة خلفية فارغة من النصوص المتغيرة (assets/certificates/NN.webp، A4 أفقي)
// + وصف صغير لمنطقة الكتابة والألوان. إضافة قالب جديد = وضع الصورتين (الكبيرة والمصغّرة) وإضافة سطر هنا، بلا تعديل أي كود.
//
// box: منطقة الكتابة الآمنة بنسب مئوية من عرض/ارتفاع الشهادة {x,y,w,h} (x من اليسار، y من الأعلى) — تتجنب الزخارف.
// ink: لون النص العام | title: لون العنوان | name: لون اسم الطالب | accent: لون الخطوط الفاصلة والإبراز
// font: خط العنوان والاسم ('kufi' | 'ruqaa' | 'amiri') | labelEn: الاسم بالإنجليزية
// noBasmala: البسملة مرسومة أصلاً في الصورة فلا نكررها | noTitle: عنوان الشهادة مرسوم أصلاً في الصورة (مثل «شهادة تقدير»)
// ==========================================================
export const TEMPLATES = [
    { id: '01', label: 'بنفسجي ملكي', labelEn: 'Royal Purple',   box: { x: 14, y: 9,  w: 64, h: 82 }, ink: '#3b2330', title: '#6d0b57', name: '#6d0b57', accent: '#a87f1e', font: 'ruqaa' },
    { id: '02', label: 'أزرق كلاسيكي', labelEn: 'Classic Blue',  box: { x: 14, y: 10, w: 72, h: 80 }, ink: '#1c2b44', title: '#0b2f6b', name: '#0b2f6b', accent: '#b8923a', font: 'kufi' },
    { id: '03', label: 'المصحف والرحل', labelEn: 'Mushaf & Rehl', box: { x: 33, y: 9, w: 61, h: 82 }, ink: '#3a3226', title: '#2c4a73', name: '#2c4a73', accent: '#a07a45', font: 'amiri' },
    { id: '04', label: 'زخرفة فيروزية', labelEn: 'Turquoise Ornament', box: { x: 6, y: 10, w: 56, h: 80 }, ink: '#274654', title: '#1f6f8b', name: '#1f6f8b', accent: '#7aa7b5', font: 'kufi' },
    { id: '05', label: 'محراب أخضر', labelEn: 'Green Mihrab',    box: { x: 14, y: 22, w: 72, h: 56 }, ink: '#1d3a30', title: '#0f4c3a', name: '#0f4c3a', accent: '#b98b2e', font: 'ruqaa' },
    { id: '06', label: 'القرآن الكريم', labelEn: 'The Holy Quran', box: { x: 21, y: 13, w: 66, h: 74 }, ink: '#1e4a4a', title: '#14595a', name: '#14595a', accent: '#a07a2a', font: 'ruqaa' },
    { id: '07', label: 'أخضر ذهبي', labelEn: 'Green & Gold',     box: { x: 10, y: 11, w: 80, h: 70 }, ink: '#1c3a31', title: '#14473b', name: '#14473b', accent: '#b08d2e', font: 'kufi' },
    { id: '08', label: 'ذهبي فاخر', labelEn: 'Luxury Gold',     box: { x: 8,  y: 10, w: 64, h: 80 }, ink: '#2b2416', title: '#2b2416', name: '#3a2c0c', accent: '#7a5a1c', font: 'kufi' },
    { id: '09', label: 'وسام أزرق', labelEn: 'Blue Medal',     box: { x: 14, y: 14, w: 62, h: 62 }, ink: '#1c2b44', title: '#17407f', name: '#17407f', accent: '#c19a2b', font: 'kufi' },
    { id: '10', label: 'أسود وذهبي', labelEn: 'Black & Gold',    box: { x: 19, y: 12, w: 62, h: 76 }, ink: '#222222', title: '#1a1a1a', name: '#8a6612', accent: '#b8902a', font: 'ruqaa' },
    { id: '11', label: 'موجة خضراء', labelEn: 'Green Wave',    box: { x: 45, y: 11, w: 49, h: 78 }, ink: '#23332b', title: '#14573f', name: '#14573f', accent: '#b8932e', font: 'ruqaa' },
    { id: '12', label: 'ورود زهرية', labelEn: 'Pink Roses',    box: { x: 20, y: 13, w: 57, h: 68 }, ink: '#4a3340', title: '#9b3c58', name: '#9b3c58', accent: '#c98a9a', font: 'ruqaa' },
    { id: '13', label: 'أغصان زيتون', labelEn: 'Olive Branches',   box: { x: 25, y: 16, w: 64, h: 64 }, ink: '#3b3a2a', title: '#4d6428', name: '#4d6428', accent: '#a38b4a', font: 'amiri' },
    { id: '14', label: 'نقش ومصحف', labelEn: 'Ornament & Mushaf',     box: { x: 36, y: 12, w: 56, h: 76 }, ink: '#3a2e1a', title: '#8a6420', name: '#7a5614', accent: '#b8893a', font: 'amiri' },
    { id: '15', label: 'قبة بنية', labelEn: 'Brown Dome',      box: { x: 18, y: 11, w: 64, h: 56 }, ink: '#3d2a1a', title: '#6b4326', name: '#6b4326', accent: '#b07f4a', font: 'ruqaa' },
    { id: '16', label: 'شريط زمردي', labelEn: 'Emerald Band',    box: { x: 44, y: 11, w: 50, h: 78 }, ink: '#1d3b40', title: '#1f5f6b', name: '#1f5f6b', accent: '#b0893a', font: 'kufi' },
    { id: '17', label: 'بني مزخرف', labelEn: 'Brown Ornament', box: { x: 20, y: 14, w: 60, h: 72 }, ink: '#3d2a1a', title: '#5a3420', name: '#5a3420', accent: '#a8793a', font: 'ruqaa' },
    { id: '18', label: 'مصحف مذهّب', labelEn: 'Golden Mushaf', box: { x: 36, y: 18, w: 58, h: 70 }, ink: '#3b2a22', title: '#7a5a28', name: '#6b4a1c', accent: '#b0894a', font: 'amiri', noBasmala: true },
    { id: '19', label: 'أزرق ليلي', labelEn: 'Midnight Blue', box: { x: 42, y: 21, w: 39, h: 67 }, ink: '#f3ead2', title: '#f6e08a', name: '#ffe9a8', accent: '#d4af37', font: 'ruqaa' },
    { id: '20', label: 'قوس أخضر', labelEn: 'Green Arch', box: { x: 22, y: 33, w: 56, h: 44 }, ink: '#1d3a30', title: '#0f4c3a', name: '#0f4c3a', accent: '#b89a14', font: 'ruqaa' },
    { id: '21', label: 'ليل أخضر', labelEn: 'Emerald Night', box: { x: 12, y: 50, w: 76, h: 44 }, ink: '#f2e9d0', title: '#f3d27a', name: '#ffe7a0', accent: '#d9a441', font: 'ruqaa' },
    { id: '22', label: 'شهادة تقدير', labelEn: 'Appreciation', box: { x: 8, y: 36, w: 84, h: 56 }, ink: '#2a3346', title: '#2a3b5a', name: '#2a3b5a', accent: '#b89a6a', font: 'kufi', noTitle: true, noBasmala: true },
    { id: '23', label: 'مصحف وإطار', labelEn: 'Framed Mushaf', box: { x: 10, y: 50, w: 80, h: 43 }, ink: '#3a3320', title: '#2c4a3a', name: '#2c4a3a', accent: '#b8923a', font: 'ruqaa', noBasmala: true },
    { id: '24', label: 'رحل خشبي', labelEn: 'Wooden Rehl', box: { x: 42, y: 12, w: 50, h: 76 }, ink: '#3a3226', title: '#6b4a28', name: '#5a3d1e', accent: '#b8893a', font: 'amiri' },
    { id: '25', label: 'بطاقة كحلية', labelEn: 'Navy Card', box: { x: 34, y: 9, w: 60, h: 63 }, ink: '#2b2b3a', title: '#1b2a4e', name: '#1b2a4e', accent: '#b8923a', font: 'kufi' },
    { id: '26', label: 'نصف قبة', labelEn: 'Half Dome', box: { x: 20, y: 14, w: 60, h: 50 }, ink: '#3d3a35', title: '#4a6a68', name: '#3f5f5e', accent: '#d0a070', font: 'ruqaa' },
    { id: '27', label: 'شريط فيروزي', labelEn: 'Teal Ribbon', box: { x: 33, y: 10, w: 62, h: 78 }, ink: '#3a3a30', title: '#1d5f6a', name: '#1d5f6a', accent: '#c19a4a', font: 'kufi' },
    { id: '28', label: 'مصحف أرجواني', labelEn: 'Purple Mushaf', box: { x: 36, y: 14, w: 54, h: 72 }, ink: '#3a3020', title: '#5a3d70', name: '#4b3262', accent: '#b8943a', font: 'amiri' },
    { id: '29', label: 'دفء بني', labelEn: 'Warm Brown', box: { x: 46, y: 9, w: 48, h: 56 }, ink: '#3a2a1a', title: '#5a3a1a', name: '#4a2e12', accent: '#b08a50', font: 'amiri' },
    { id: '30', label: 'جزاك الله خيراً', labelEn: 'Jazak Allahu Khayran', box: { x: 28, y: 16, w: 48, h: 60 }, ink: '#4a3a14', title: '#6b4a12', name: '#5a3d0a', accent: '#a8842a', font: 'ruqaa' },
    { id: '31', label: 'شريط ومصحف', labelEn: 'Ribbon & Mushaf', box: { x: 28, y: 10, w: 66, h: 80 }, ink: '#3a3a30', title: '#1d5f6a', name: '#1d5f6a', accent: '#c19a4a', font: 'kufi' },
    { id: '32', label: 'قوس ذهبي', labelEn: 'Golden Arch', box: { x: 18, y: 8, w: 64, h: 62 }, ink: '#3a3a3a', title: '#7a5a14', name: '#6b4c0e', accent: '#c9a43a', font: 'ruqaa' },
    { id: '33', label: 'قراءة', labelEn: 'Reading', box: { x: 38, y: 14, w: 55, h: 72 }, ink: '#2f3a30', title: '#2c4a3e', name: '#2c4a3e', accent: '#b8923a', font: 'amiri' }
];

export const templateImage = (id) => `assets/certificates/${id}.webp`;
export const templateThumb = (id) => `assets/certificates/thumbs/${id}.webp`;
export const getTemplate = (id) => TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
