class Shape {
    constructor(type, x, y, color = '#000000') {
        this.id = Date.now() + Math.random();
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = 0;
        this.height = 0;
        this.rotation = 0; // במעלות
        this.scale = 1;    // קנה מידה
        this.depth = 0;    // עומק (צל)
        this.fillOpacity = 0; // שקיפות מילוי (0-1)
        this.angleSpan = 60; // מפתח זווית למחוגה
        this.color = color;
        this.selected = false;
    }

    // חישוב גבולות עבור לוגיקה מקומית (bounding box)
    getBounds() {
        // התחשבות ב-SCALE
        // הערה: משתמשים ב-state הגלובלי שמוגדר ב-app.js
        // בגלל ההפרדה לקבצים, וודא ש-app.js נטען, או ש-state מוגדר במרחב הגלובלי.
        // נשתמש בגישה פשוטה: state חייב להיות מוגדר לפני הקריאה לפונקציות אלו.
        
        let w = this.width * this.scale;
        let h = this.height * this.scale;
        
        let bx = 0, by = 0, bw = w, bh = h;
        
        if (['circle', 'gear', 'compass', 'ellipse', 'chair', 'headphones', 'mixer', 'mic', 'camera', 'flashlight', 'tripod'].includes(this.type)) {
            if (this.type === 'ellipse') {
                bx = -w/2; by = -h/2; bw = w; bh = h;
            } else if (this.type === 'circle' || this.type === 'gear' || this.type === 'compass') {
                bx = -w; by = -w; bw = w * 2; bh = w * 2;
            } else {
                bx = 0; by = 0; bw = w; bh = h;
            }
        } 
        else if (this.type === 'text') {
            by = -h; 
        } 
        else if (this.type === 'line' || this.type === 'line-dashed' || this.type === 'arrow' || this.type === 'double-arrow') {
            // גישה בטוחה למקרה ש-state עדיין לא אותחל
            const currentScale = (typeof state !== 'undefined' && state.scale) ? state.scale : 1;
            by = -5 * this.scale / currentScale;
            bh = 10 * this.scale / currentScale;
        }
        return {bx, by, bw, bh};
    }

    drawSelection(ctx) {
        if (!this.selected) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        
        const {bx, by, bw, bh} = this.getBounds();
        const currentScale = (typeof state !== 'undefined' && state.scale) ? state.scale : 1;

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / currentScale;
        ctx.setLineDash([5 / currentScale, 5 / currentScale]);
        
        ctx.strokeRect(bx - 5/currentScale, by - 5/currentScale, bw + 10/currentScale, bh + 10/currentScale);
        
        let handleX = bx + bw/2;
        let handleY = by - 5/currentScale;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(handleX, handleY);
        ctx.lineTo(handleX, handleY - 20/currentScale);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = '#3b82f6';
        ctx.arc(handleX, handleY - 20/currentScale, 4/currentScale, 0, Math.PI * 2);
        ctx.fill();

        const cornerRadius = 4 / currentScale;
        const corners = [
            {x: bx - 5/currentScale, y: by - 5/currentScale},
            {x: bx + bw + 5/currentScale, y: by - 5/currentScale},
            {x: bx + bw + 5/currentScale, y: by + bh + 5/currentScale},
            {x: bx - 5/currentScale, y: by + bh + 5/currentScale}
        ];

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5 / currentScale;
        
        corners.forEach(corner => {
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, cornerRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        ctx.restore();
    }

    isOverHandle(mx, my) {
        if (!this.selected) return false;

        const dx = mx - this.x;
        const dy = my - this.y;
        const rad = -this.rotation * Math.PI / 180;
        const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

        const {bx, by, bw, bh} = this.getBounds();
        const currentScale = (typeof state !== 'undefined' && state.scale) ? state.scale : 1;
        const hitRadius = 8 / currentScale;

        const topHandleX = bx + bw/2;
        const topHandleY = (by - 5/currentScale) - 20/currentScale;
        if (Math.hypot(localX - topHandleX, localY - topHandleY) < hitRadius) return true;

        const corners = [
            {x: bx - 5/currentScale, y: by - 5/currentScale},
            {x: bx + bw + 5/currentScale, y: by - 5/currentScale},
            {x: bx + bw + 5/currentScale, y: by + bh + 5/currentScale},
            {x: bx - 5/currentScale, y: by + bh + 5/currentScale}
        ];

        for (let corner of corners) {
             if (Math.hypot(localX - corner.x, localY - corner.y) < hitRadius) return true;
        }

        return false;
    }

    contains(mx, my) {
        const rad = -this.rotation * Math.PI / 180;
        const dx = mx - this.x;
        const dy = my - this.y;
        
        const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

        const currentScale = (typeof state !== 'undefined' && state.scale) ? state.scale : 1;
        const tolerance = 10 / currentScale;
        
        const s = this.scale;
        const w = this.width * s;
        const h = this.height * s;

        if (this.type === 'circle' || this.type === 'gear' || this.type === 'compass') {
            return Math.sqrt(lx*lx + ly*ly) <= Math.abs(w) + tolerance;
        } 
        else if (this.type === 'ellipse') {
            const a = w/2 + tolerance; 
            const b = h/2 + tolerance;
            if (a === 0 || b === 0) return false;
            return (lx*lx)/(a*a) + (ly*ly)/(b*b) <= 1;
        }
        else if (this.type === 'rect' || this.type === 'pipe' || this.type === 'weight' || this.type === 'triangle' || this.type === 'right-triangle') {
            return (lx >= -tolerance && lx <= w + tolerance && ly >= -tolerance && ly <= h + tolerance);
        }
        else if (this.type === 'text') {
            // שים לב: כאן אין גישה ל-ctx אלא אם נעביר אותו. נשתמש בהערכה גסה אם אין
            // בפועל הקריאה ל-contains נעשית ב-app.js שם יש ctx, אבל המחלקה מופרדת.
            // לפתרון פשוט: נניח רוחב ממוצע אם אין מדידה מדויקת או נסתמך על app.js שיספק.
            // לצורך הדוגמה, נשתמש בחישוב מקורב לפי מספר תווים.
            const charWidth = Math.abs(h) * 0.6;
            const estimatedWidth = (this.text || "טקסט").length * charWidth;
            return (lx >= -tolerance && lx <= estimatedWidth + tolerance && ly >= -h - tolerance && ly <= tolerance);
        }
        else if (this.type === 'line' || this.type === 'line-dashed' || this.type === 'arrow' || this.type === 'double-arrow') {
            return (lx >= -tolerance && lx <= w + tolerance && Math.abs(ly) <= tolerance);
        }
        return (lx >= -tolerance && lx <= w + tolerance && ly >= -tolerance && ly <= h + tolerance);
    }
}
