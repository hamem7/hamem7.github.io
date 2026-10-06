// certificates/templates.js
// ==========================================================
// 🏅 قوالب الشهادات: كل قالب = صورة خلفية فارغة من النصوص المتغيرة (assets/certificates/NN.webp، A4 أفقي)
// + وصف صغير لمنطقة الكتابة والألوان. إضافة قالب جديد = وضع الصورتين (الكبيرة والمصغّرة) وإضافة سطر هنا، بلا تعديل أي كود.
//
// box: منطقة الكتابة الآمنة بنسب مئوية من عرض/ارتفاع الشهادة {x,y,w,h} (x من اليسار، y من الأعلى) — تتجنب الزخارف.
// ink: لون النص العام | title: لون العنوان | name: لون اسم الطالب | accent: لون الخطوط الفاصلة والإبراز
// font: خط العنوان والاسم ('kufi' | 'ruqaa' | 'amiri')
// ==========================================================
export const TEMPLATES = [
    { id: '01', label: 'بنفسجي ملكي',   box: { x: 14, y: 9,  w: 64, h: 82 }, ink: '#3b2330', title: '#6d0b57', name: '#6d0b57', accent: '#a87f1e', font: 'ruqaa' },
    { id: '02', label: 'أزرق كلاسيكي',  box: { x: 14, y: 10, w: 72, h: 80 }, ink: '#1c2b44', title: '#0b2f6b', name: '#0b2f6b', accent: '#b8923a', font: 'kufi' },
    { id: '03', label: 'المصحف والرحل', box: { x: 33, y: 9, w: 61, h: 82 }, ink: '#3a3226', title: '#2c4a73', name: '#2c4a73', accent: '#a07a45', font: 'amiri' },
    { id: '04', label: 'زخرفة فيروزية', box: { x: 6, y: 10, w: 56, h: 80 }, ink: '#274654', title: '#1f6f8b', name: '#1f6f8b', accent: '#7aa7b5', font: 'kufi' },
    { id: '05', label: 'محراب أخضر',    box: { x: 14, y: 22, w: 72, h: 56 }, ink: '#1d3a30', title: '#0f4c3a', name: '#0f4c3a', accent: '#b98b2e', font: 'ruqaa' },
    { id: '06', label: 'القرآن الكريم', box: { x: 21, y: 13, w: 66, h: 74 }, ink: '#1e4a4a', title: '#14595a', name: '#14595a', accent: '#a07a2a', font: 'ruqaa' },
    { id: '07', label: 'أخضر ذهبي',     box: { x: 10, y: 11, w: 80, h: 70 }, ink: '#1c3a31', title: '#14473b', name: '#14473b', accent: '#b08d2e', font: 'kufi' },
    { id: '08', label: 'ذهبي فاخر',     box: { x: 8,  y: 10, w: 64, h: 80 }, ink: '#2b2416', title: '#2b2416', name: '#3a2c0c', accent: '#7a5a1c', font: 'kufi' },
    { id: '09', label: 'وسام أزرق',     box: { x: 14, y: 14, w: 62, h: 62 }, ink: '#1c2b44', title: '#17407f', name: '#17407f', accent: '#c19a2b', font: 'kufi' },
    { id: '10', label: 'أسود وذهبي',    box: { x: 19, y: 12, w: 62, h: 76 }, ink: '#222222', title: '#1a1a1a', name: '#8a6612', accent: '#b8902a', font: 'ruqaa' },
    { id: '11', label: 'موجة خضراء',    box: { x: 45, y: 11, w: 49, h: 78 }, ink: '#23332b', title: '#14573f', name: '#14573f', accent: '#b8932e', font: 'ruqaa' },
    { id: '12', label: 'ورود زهرية',    box: { x: 20, y: 13, w: 57, h: 68 }, ink: '#4a3340', title: '#9b3c58', name: '#9b3c58', accent: '#c98a9a', font: 'ruqaa' },
    { id: '13', label: 'أغصان زيتون',   box: { x: 25, y: 16, w: 64, h: 64 }, ink: '#3b3a2a', title: '#4d6428', name: '#4d6428', accent: '#a38b4a', font: 'amiri' },
    { id: '14', label: 'نقش ومصحف',     box: { x: 36, y: 12, w: 56, h: 76 }, ink: '#3a2e1a', title: '#8a6420', name: '#7a5614', accent: '#b8893a', font: 'amiri' },
    { id: '15', label: 'قبة بنية',      box: { x: 18, y: 11, w: 64, h: 56 }, ink: '#3d2a1a', title: '#6b4326', name: '#6b4326', accent: '#b07f4a', font: 'ruqaa' },
    { id: '16', label: 'شريط زمردي',    box: { x: 44, y: 11, w: 50, h: 78 }, ink: '#1d3b40', title: '#1f5f6b', name: '#1f5f6b', accent: '#b0893a', font: 'kufi' }
];

export const templateImage = (id) => `assets/certificates/${id}.webp`;
export const templateThumb = (id) => `assets/certificates/thumbs/${id}.webp`;
export const getTemplate = (id) => TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
