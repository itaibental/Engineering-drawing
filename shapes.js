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
        let w = this.width * this.scale;
        let h = this.height * this.scale;
        
        let bx = 0, by = 0, bw = w, bh = h;
        
        // רכיבים מיוחדים ועיגולים שממורכזים
        if (['circle', 'gear', 'compass', 'ellipse', 'chair', 'headphones', 'mixer', 'mic', 'camera', 'flashlight', 'tripod'].includes(this.type)) {
            // לחלקם מרכז ב-0,0 ורוחב הוא רדיוס/חצי
            if (this.type === 'ellipse') {
                bx = -w/2; by = -h/2; bw = w; bh = h;
            } else if (this.type === 'circle' || this.type === 'gear' || this.type === 'compass') {
                bx = -w; by = -w; bw = w * 2; bh = w * 2;
            } else {
                // אייקונים מיוחדים - ברירת מחדל מצוירים מ-0,0
                bx = 0; by = 0; bw = w; bh = h;
            }
        } 
        else if (this.type === 'text') {
            by = -h; 
        } 
        else if (this.type === 'line' || this.type === 'line-dashed' || this.type === 'arrow' || this.type === 'double-arrow') {
            // קווים דקים מקבלים שטח תפיסה מעובה
            // מכיוון שאנו עובדים עם מערכת קואורדינטות, נרצה שה-bounding box יכסה את הקו
            // כאן זה חישוב פשוט לצרכי ציור המסגרת
            by = -5 * this.scale / state.scale;
            bh = 10 * this.scale / state.scale;
        }
        return {bx, by, bw, bh};
    }

    drawSelection(ctx) {
        if (!this.selected) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        
        const {bx, by, bw, bh} = this.getBounds();

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / state.scale;
        ctx.setLineDash([5 / state.scale, 5 / state.scale]);
        
        ctx.strokeRect(bx - 5/state.scale, by - 5/state.scale, bw + 10/state.scale, bh + 10/state.scale);
        
        // ידית סיבוב עליונה
        let handleX = bx + bw/2;
        let handleY = by - 5/state.scale;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(handleX, handleY);
        ctx.lineTo(handleX, handleY - 20/state.scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = '#3b82f6';
        ctx.arc(handleX, handleY - 20/state.scale, 4/state.scale, 0, Math.PI * 2);
        ctx.fill();

        // ידיות פינתיות לסיבוב
        const cornerRadius = 4 / state.scale;
        const corners = [
            {x: bx - 5/state.scale, y: by - 5/state.scale},
            {x: bx + bw + 5/state.scale, y: by - 5/state.scale},
            {x: bx + bw + 5/state.scale, y: by + bh + 5/state.scale},
            {x: bx - 5/state.scale, y: by + bh + 5/state.scale}
        ];

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5 / state.scale;
        
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
        const hitRadius = 8 / state.scale;

        const topHandleX = bx + bw/2;
        const topHandleY = (by - 5/state.scale) - 20/state.scale;
        if (Math.hypot(localX - topHandleX, localY - topHandleY) < hitRadius) return true;

        const corners = [
            {x: bx - 5/state.scale, y: by - 5/state.scale},
            {x: bx + bw + 5/state.scale, y: by - 5/state.scale},
            {x: bx + bw + 5/state.scale, y: by + bh + 5/state.scale},
            {x: bx - 5/state.scale, y: by + bh + 5/state.scale}
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

        const tolerance = 10 / state.scale;
        
        const s = this.scale;
        const w = this.width * s;
        const h = this.height * s;

        // בדיקות פגיעה לפי סוג
        if (this.type === 'circle' || this.type === 'gear' || this.type === 'compass') {
            return Math.sqrt(lx*lx + ly*ly) <= Math.abs(w) + tolerance;
        } 
        else if (this.type === 'ellipse') {
            // משוואת אליפסה: x^2/a^2 + y^2/b^2 <= 1
            // w/2 = a, h/2 = b
            const a = w/2 + tolerance; 
            const b = h/2 + tolerance;
            if (a === 0 || b === 0) return false;
            return (lx*lx)/(a*a) + (ly*ly)/(b*b) <= 1;
        }
        else if (this.type === 'rect' || this.type === 'pipe' || this.type === 'weight' || this.type === 'triangle' || this.type === 'right-triangle') {
            // עבור רוב הצורות המרובעות והמשולשות, נשתמש ב-AABB (מסגרת) לנוחות
            return (lx >= -tolerance && lx <= w + tolerance && ly >= -tolerance && ly <= h + tolerance);
        }
        else if (this.type === 'text') {
            ctx.font = `${Math.abs(h)}px Arial`;
            const textW = ctx.measureText(this.text || "טקסט").width;
            return (lx >= -tolerance && lx <= textW + tolerance && ly >= -h - tolerance && ly <= tolerance);
        }
        else if (this.type === 'line' || this.type === 'line-dashed' || this.type === 'arrow' || this.type === 'double-arrow') {
            return (lx >= -tolerance && lx <= w + tolerance && Math.abs(ly) <= tolerance);
        }
        // ברירת מחדל לאייקונים (0,0 עד w,h)
        return (lx >= -tolerance && lx <= w + tolerance && ly >= -tolerance && ly <= h + tolerance);
    }
}
