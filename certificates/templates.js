// certificates/templates.js
// ==========================================================
// 🏅 قوالب الشهادات (40): كل قالب = صورة خلفية فارغة من النصوص المتغيرة (assets/certificates/NN.webp، A4 أفقي)
// + وصف صغير لمنطقة الكتابة والألوان. إضافة قالب جديد = وضع الصورتين (الكبيرة والمصغّرة) وإضافة سطر هنا، بلا تعديل أي كود.
//
// box: منطقة الكتابة الآمنة بنسب مئوية من عرض/ارتفاع الشهادة {x,y,w,h} (x من اليسار، y من الأعلى) — تتجنب الزخارف.
// ink: لون النص العام | title: لون العنوان | name: لون اسم الطالب | accent: لون الخطوط الفاصلة والإبراز
// font: خط العنوان والاسم ('kufi' | 'ruqaa' | 'amiri') | labelEn: الاسم بالإنجليزية
// noBasmala: البسملة مرسومة أصلاً في الصورة فلا نكررها | noTitle: عنوان الشهادة مرسوم أصلاً في الصورة (مثل «شهادة تقدير»)
// logo: شعار المنصة في مكان فارغ من التصميم بنسب مئوية من الشهادة {x: مركز الشعار أفقياً، y: أعلاه، h: ارتفاعه، tone: color للخلفيات الفاتحة | light للداكنة | mono لون واحد غامق للخلفيات الذهبية}
// ==========================================================
export const TEMPLATES = [
    { id: '01', label: 'بنفسجي ملكي', labelEn: 'Royal Purple', box: { x: 15, y: 9, w: 62, h: 82 }, ink: '#3b2330', title: '#6d0b57', name: '#6d0b57', accent: '#a87f1e', font: 'ruqaa', logo: { x: 82, y: 5, h: 17, tone: 'color' } },
    { id: '02', label: 'أزرق كلاسيكي', labelEn: 'Classic Blue', box: { x: 15, y: 10, w: 66, h: 78 }, ink: '#1c2b44', title: '#0b2f6b', name: '#0b2f6b', accent: '#b8923a', font: 'kufi', logo: { x: 91.5, y: 5, h: 16, tone: 'color' } },
    { id: '03', label: 'المصحف والرحل', labelEn: 'Mushaf & Rehl', box: { x: 34, y: 9, w: 60, h: 82 }, ink: '#3a3226', title: '#2c4a73', name: '#2c4a73', accent: '#a07a45', font: 'amiri', logo: { x: 7.7, y: 5, h: 15, tone: 'light' } },
    { id: '04', label: 'زخرفة فيروزية', labelEn: 'Turquoise Ornament', box: { x: 5, y: 12, w: 60, h: 76 }, ink: '#274654', title: '#1f6f8b', name: '#1f6f8b', accent: '#7aa7b5', font: 'kufi', logo: { x: 78.9, y: 54, h: 22, tone: 'light' } },
    { id: '05', label: 'محراب أخضر', labelEn: 'Green Mihrab', box: { x: 16, y: 26, w: 68, h: 58 }, ink: '#1d3a30', title: '#0f4c3a', name: '#0f4c3a', accent: '#b98b2e', font: 'ruqaa', logo: { x: 26, y: 3, h: 16, tone: 'light' } },
    { id: '06', label: 'القرآن الكريم', labelEn: 'The Holy Quran', box: { x: 24, y: 17, w: 62, h: 63 }, ink: '#1e4a4a', title: '#14595a', name: '#14595a', accent: '#a07a2a', font: 'ruqaa', logo: { x: 7.7, y: 4, h: 17, tone: 'light' } },
    { id: '07', label: 'أخضر ذهبي', labelEn: 'Green & Gold', box: { x: 13, y: 14, w: 70, h: 62 }, ink: '#1c3a31', title: '#14473b', name: '#14473b', accent: '#b08d2e', font: 'kufi', logo: { x: 7.5, y: 3.5, h: 16, tone: 'color' } },
    { id: '08', label: 'ذهبي فاخر', labelEn: 'Luxury Gold', box: { x: 7, y: 10, w: 68, h: 78 }, ink: '#2b2416', title: '#2b2416', name: '#3a2c0c', accent: '#7a5a1c', font: 'kufi', logo: { x: 92.5, y: 6, h: 17, tone: 'light' } },
    { id: '09', label: 'موجة زرقاء', labelEn: 'Blue Wave', box: { x: 24, y: 10, w: 56, h: 62 }, ink: '#1c2b44', title: '#17407f', name: '#17407f', accent: '#c19a2b', font: 'kufi', logo: { x: 91, y: 5, h: 17, tone: 'color' } },
    { id: '10', label: 'أسود وذهبي', labelEn: 'Black & Gold', box: { x: 18, y: 15, w: 64, h: 73 }, ink: '#222222', title: '#1a1a1a', name: '#8a6612', accent: '#b8902a', font: 'ruqaa', logo: { x: 50, y: 3, h: 12, tone: 'color' } },
    { id: '11', label: 'موجة خضراء', labelEn: 'Green Wave', box: { x: 46, y: 24, w: 48, h: 66 }, ink: '#23332b', title: '#14573f', name: '#14573f', accent: '#b8932e', font: 'ruqaa', logo: { x: 70, y: 7, h: 14, tone: 'color' } },
    { id: '12', label: 'ورود زهرية', labelEn: 'Pink Roses', box: { x: 16, y: 14, w: 66, h: 62 }, ink: '#4a3340', title: '#9b3c58', name: '#9b3c58', accent: '#c98a9a', font: 'ruqaa', logo: { x: 11, y: 7, h: 14, tone: 'color' } },
    { id: '13', label: 'أغصان زيتون', labelEn: 'Olive Branches', box: { x: 24, y: 14, w: 64, h: 58 }, ink: '#3b3a2a', title: '#4d6428', name: '#4d6428', accent: '#a38b4a', font: 'amiri', logo: { x: 93.5, y: 19, h: 14, tone: 'color' } },
    { id: '14', label: 'نقش ومصحف', labelEn: 'Ornament & Mushaf', box: { x: 36, y: 12, w: 50, h: 76 }, ink: '#3a2e1a', title: '#8a6420', name: '#7a5614', accent: '#b8893a', font: 'amiri', logo: { x: 91, y: 11, h: 14, tone: 'color' } },
    { id: '15', label: 'قبة بنية', labelEn: 'Brown Dome', box: { x: 20, y: 11, w: 60, h: 54 }, ink: '#3d2a1a', title: '#6b4326', name: '#6b4326', accent: '#b07f4a', font: 'ruqaa', logo: { x: 8.5, y: 62, h: 18, tone: 'light' } },
    { id: '16', label: 'شريط زمردي', labelEn: 'Emerald Band', box: { x: 40, y: 10, w: 54, h: 80 }, ink: '#1d3b40', title: '#1f5f6b', name: '#1f5f6b', accent: '#b0893a', font: 'kufi', logo: { x: 22, y: 6, h: 20, tone: 'light' } },
    { id: '17', label: 'بني مزخرف', labelEn: 'Brown Ornament', box: { x: 25, y: 15, w: 50, h: 56 }, ink: '#3d2a1a', title: '#5a3420', name: '#5a3420', accent: '#a8793a', font: 'ruqaa', logo: { x: 50, y: 3, h: 11, tone: 'color' } },
    { id: '18', label: 'مصحف على لوح داكن', labelEn: 'Mushaf on Dark Panel', box: { x: 36, y: 10, w: 58, h: 78 }, ink: '#3b2a22', title: '#7a5a28', name: '#6b4a1c', accent: '#b0894a', font: 'amiri', logo: { x: 11.5, y: 9, h: 17, tone: 'light' } },
    { id: '19', label: 'أزرق ليلي', labelEn: 'Midnight Blue', box: { x: 38, y: 10, w: 56, h: 80 }, ink: '#f3ead2', title: '#f6e08a', name: '#ffe9a8', accent: '#d4af37', font: 'ruqaa', logo: { x: 20, y: 6, h: 22, tone: 'color' } },
    { id: '20', label: 'ليل أخضر', labelEn: 'Emerald Night', box: { x: 12, y: 54, w: 76, h: 40 }, ink: '#f2e9d0', title: '#f3d27a', name: '#ffe7a0', accent: '#d9a441', font: 'ruqaa', noBasmala: true, logo: { x: 15, y: 4, h: 17, tone: 'light' } },
    { id: '21', label: 'شهادة تقدير', labelEn: 'Appreciation', box: { x: 8, y: 36, w: 84, h: 55 }, ink: '#2a3346', title: '#2a3b5a', name: '#2a3b5a', accent: '#b89a6a', font: 'kufi', noTitle: true, noBasmala: true, logo: { x: 8, y: 4, h: 18, tone: 'light' } },
    { id: '22', label: 'إطار ذهبي', labelEn: 'Golden Frame', box: { x: 13, y: 8, w: 74, h: 61 }, ink: '#3a3226', title: '#7a5a28', name: '#5a3d1e', accent: '#b08a4a', font: 'amiri', logo: { x: 83, y: 74, h: 17, tone: 'color' } },
    { id: '23', label: 'مصحف وإطار', labelEn: 'Framed Mushaf', box: { x: 12, y: 18, w: 76, h: 55 }, ink: '#3a3320', title: '#2c4a3a', name: '#2c4a3a', accent: '#b8923a', font: 'ruqaa', logo: { x: 50, y: 4.5, h: 12, tone: 'color' } },
    { id: '24', label: 'راية فيروزية', labelEn: 'Teal Banner', box: { x: 34, y: 9, w: 60, h: 80 }, ink: '#1d3b40', title: '#1f5f6b', name: '#1f5f6b', accent: '#b0893a', font: 'kufi', logo: { x: 16.5, y: 3, h: 18, tone: 'light' } },
    { id: '25', label: 'مصحف بنفسجي', labelEn: 'Purple Mushaf', box: { x: 29, y: 10, w: 58, h: 82 }, ink: '#3a3020', title: '#5a3d70', name: '#4b3262', accent: '#b8943a', font: 'amiri', logo: { x: 10.8, y: 6, h: 18, tone: 'light' } },
    { id: '26', label: 'دفء بني', labelEn: 'Warm Brown', box: { x: 45, y: 12, w: 47, h: 78 }, ink: '#3a2a1a', title: '#5a3a1a', name: '#4a2e12', accent: '#b08a50', font: 'amiri', logo: { x: 9, y: 7, h: 17, tone: 'light' } },
    { id: '27', label: 'قوس ذهبي', labelEn: 'Golden Arch', box: { x: 17, y: 24, w: 66, h: 46 }, ink: '#4a3a14', title: '#6b4a12', name: '#5a3d0a', accent: '#a8842a', font: 'ruqaa', logo: { x: 8, y: 5, h: 17, tone: 'mono' } },
    { id: '28', label: 'شريط ومصحف', labelEn: 'Ribbon & Mushaf', box: { x: 28, y: 10, w: 58, h: 80 }, ink: '#3a3a30', title: '#1d5f6a', name: '#1d5f6a', accent: '#c19a4a', font: 'kufi', logo: { x: 92, y: 6, h: 15, tone: 'color' } },
    { id: '29', label: 'قبة ذهبية', labelEn: 'Golden Dome', box: { x: 18, y: 5, w: 64, h: 48 }, ink: '#3a3a3a', title: '#7a5a14', name: '#6b4c0e', accent: '#c9a43a', font: 'ruqaa', noBasmala: true, logo: { x: 8, y: 5, h: 16, tone: 'color' } },
    { id: '30', label: 'قراءة', labelEn: 'Reading', box: { x: 44, y: 11, w: 44, h: 78 }, ink: '#2f3a30', title: '#2c4a3e', name: '#2c4a3e', accent: '#b8923a', font: 'amiri', logo: { x: 91.5, y: 12, h: 14, tone: 'color' } },
    { id: '31', label: 'أشعة هادئة', labelEn: 'Soft Rays', box: { x: 30, y: 10, w: 56, h: 80 }, ink: '#2a3a36', title: '#14473b', name: '#14473b', accent: '#b08d2e', font: 'kufi', logo: { x: 91.5, y: 10, h: 14, tone: 'color' } },
    { id: '32', label: 'بسملة ذهبية', labelEn: 'Golden Basmala', box: { x: 38, y: 8, w: 49, h: 84 }, ink: '#1f2230', title: '#1b2236', name: '#1b2236', accent: '#b8923a', font: 'kufi', noBasmala: true, logo: { x: 91, y: 6, h: 16, tone: 'color' } },
    { id: '33', label: 'موجات كحلية', labelEn: 'Navy Waves', box: { x: 18, y: 11, w: 64, h: 56 }, ink: '#1c2b44', title: '#273d6f', name: '#273d6f', accent: '#c19a2b', font: 'kufi', logo: { x: 50, y: 83, h: 13, tone: 'color' } },
    { id: '34', label: 'إطار زمردي', labelEn: 'Emerald Frame', box: { x: 15, y: 14, w: 68, h: 64 }, ink: '#1c3a31', title: '#14473b', name: '#14473b', accent: '#b08d2e', font: 'ruqaa', logo: { x: 13.5, y: 10, h: 14, tone: 'color' } },
    { id: '35', label: 'نقش ذهبي', labelEn: 'Golden Pattern', box: { x: 14, y: 16, w: 64, h: 65 }, ink: '#2b2416', title: '#4a3410', name: '#3a2c0c', accent: '#a8842a', font: 'kufi', logo: { x: 13, y: 5, h: 16, tone: 'color' } },
    { id: '36', label: 'أعمدة زرقاء', labelEn: 'Blue Columns', box: { x: 24, y: 17, w: 52, h: 72 }, ink: '#1c2b44', title: '#0b3a73', name: '#0b3a73', accent: '#b8923a', font: 'kufi', logo: { x: 50, y: 4, h: 12, tone: 'color' } },
    { id: '37', label: 'ورد هادئ', labelEn: 'Soft Floral', box: { x: 22, y: 16, w: 52, h: 62 }, ink: '#3d3a40', title: '#a04a66', name: '#8f3d58', accent: '#c98a9a', font: 'ruqaa', logo: { x: 13, y: 13.5, h: 14, tone: 'color' } },
    { id: '38', label: 'زهر الكرز', labelEn: 'Cherry Blossom', box: { x: 24, y: 15, w: 50, h: 62 }, ink: '#4a3340', title: '#9b3c58', name: '#9b3c58', accent: '#d08a8a', font: 'amiri', logo: { x: 90, y: 7, h: 16, tone: 'color' } },
    { id: '39', label: 'زنبق وردي', labelEn: 'Pink Lily', box: { x: 22, y: 22, w: 54, h: 54 }, ink: '#4a3340', title: '#a2305a', name: '#a2305a', accent: '#c98a9a', font: 'ruqaa', logo: { x: 90, y: 6, h: 16, tone: 'color' } },
    { id: '40', label: 'باقة جوري', labelEn: 'Rose Bouquet', box: { x: 30, y: 21, w: 56, h: 66 }, ink: '#4a3340', title: '#b04565', name: '#a03a5a', accent: '#d79aa8', font: 'amiri', logo: { x: 91, y: 6, h: 16, tone: 'color' } }
];

export const templateImage = (id) => `assets/certificates/${id}.webp`;
export const templateThumb = (id) => `assets/certificates/thumbs/${id}.webp`;
export const getTemplate = (id) => TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
