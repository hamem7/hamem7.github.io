// components/ui.js

export function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const targetScreen = document.getElementById(id);
    if(targetScreen) {
        targetScreen.classList.add('active');
    }
}

export function openModal(id) {
    const modal = document.getElementById(id);
    if(modal) {
        modal.style.display = 'flex';
    }
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if(modal) {
        modal.style.display = 'none';
    }
}

// 🌟 [عدّل] أضفنا معامل ثانٍ اختيارياً customMessage — لو تُرك بلا تحديد (الحالة
// الافتراضية القديمة تماماً في كل الاستخدامات الحالية) يختار التوست عبارة تشجيع
// عشوائية كما كان، ولو مُرِّر نص محدد (زي تنويه "قيد التطوير" لبطاقة جديدة) يُعرض
// هو بدل العبارات العشوائية، بنفس شكل وموضع التوست تماماً 🌟
export function showToastEncouragement(toastId = "toast-encouragement", customMessage = null) {
    const ENCOURAGEMENTS = ["ما شاء الله عليك! 🌟", "بطل! استمر 🚀", "ممتاز جداً! 👏", "بارك الله فيك! 💚", "أحسنت يا مبدع! 🎯"];
    let toast = document.getElementById(toastId);
    if(toast) {
        toast.innerText = customMessage || ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
        toast.className = "show";
        setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
    }
}

export function triggerConfetti(canvasId = "confetti") { 
    const canvas = document.getElementById(canvasId); 
    if(!canvas) return;
    const ctx = canvas.getContext('2d'); 
    canvas.style.display = 'block'; 
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
    const pts = [], colors = ['#d4af37', '#166534', '#0d5c46', '#f3e5ab']; 
    for(let i=0; i<150; i++) pts.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height-canvas.height, w: Math.random()*10+5, h: Math.random()*10+5, color: colors[Math.floor(Math.random()*colors.length)], sy: Math.random()*3+2, sx: Math.random()*2-1, r: Math.random()*360, rs: Math.random()*5-2.5 }); 
    let act = true; 
    function animate() { 
        if(!act) return; 
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        let alive = 0; 
        pts.forEach(p => { 
            p.y+=p.sy; p.x+=p.sx; p.r+=p.rs; 
            if(p.y<canvas.height) alive++; 
            ctx.save(); ctx.translate(p.x+p.w/2, p.y+p.h/2); ctx.rotate(p.r*Math.PI/180); ctx.fillStyle = p.color; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); ctx.restore(); 
        }); 
        if(alive>0) requestAnimationFrame(animate); else { act=false; canvas.style.display='none'; } 
    } 
    animate(); 
}