function drawGrid(ctx) {
    if (state.gridOpacity <= 0) return;

    const gridSize = 50;
    const startX = Math.floor(-state.offsetX / state.scale / gridSize) * gridSize;
    const startY = Math.floor(-state.offsetY / state.scale / gridSize) * gridSize;
    const endX = startX + (canvas.width / state.scale) + gridSize;
    const endY = startY + (canvas.height / state.scale) + gridSize;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(229, 231, 235, ${state.gridOpacity})`; 
    ctx.lineWidth = 1 / state.scale;

    for (let x = startX; x < endX; x += gridSize) {
        if (x < 0 && !state.showPageBounds) continue; 
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }
    for (let y = startY; y < endY; y += gridSize) {
        if (y < 0 && !state.showPageBounds) continue;
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = `rgba(75, 85, 99, ${state.gridOpacity})`; 
    ctx.lineWidth = 2 / state.scale;
    if (startX <= 0 && endX >= 0) {
        ctx.moveTo(0, startY); ctx.lineTo(0, endY);
    }
    if (startY <= 0 && endY >= 0) {
        ctx.moveTo(startX, 0); ctx.lineTo(endX, 0);
    }
    ctx.stroke();
}

function drawRulers() {
    rulerX.innerHTML = '';
    rulerY.innerHTML = '';
    
    const gridSize = 50 * state.scale;
    
    for (let i = 0; i < wrapper.clientWidth / gridSize + 1; i++) {
        const rawVal = Math.floor((-state.offsetX + (i * gridSize)) / state.scale / 50) * 50;
        const displayVal = rawVal * state.rulerScale;

        if (rawVal < 0 && !state.showPageBounds) continue;

        const mark = document.createElement('div');
        mark.style.position = 'absolute';
        const pixelX = rawVal * state.scale + state.offsetX;
        
        mark.style.left = pixelX + 'px';
        mark.style.top = '0';
        mark.style.fontSize = '10px';
        mark.style.color = '#555';
        mark.innerText = Number.isInteger(displayVal) ? displayVal : displayVal.toFixed(1);
        rulerX.appendChild(mark);
    }
     
     for (let i = 0; i < wrapper.clientHeight / gridSize + 1; i++) {
        const rawVal = Math.floor((-state.offsetY + (i * gridSize)) / state.scale / 50) * 50;
        const displayVal = rawVal * state.rulerScale;

        if (rawVal < 0 && !state.showPageBounds) continue;

        const mark = document.createElement('div');
        mark.style.position = 'absolute';
        const pixelY = rawVal * state.scale + state.offsetY;

        mark.style.top = pixelY + 'px';
        mark.style.right = '0'; 
        mark.style.fontSize = '10px';
        mark.style.color = '#555';
        mark.innerText = Number.isInteger(displayVal) ? displayVal : displayVal.toFixed(1);
        rulerY.appendChild(mark);
    }
}

function draw(ctxOverride) {
    const c = ctxOverride || ctx;
    const cvs = c.canvas;

    c.clearRect(0, 0, cvs.width, cvs.height);
    
    if (state.showPageBounds) {
        c.fillStyle = '#e5e7eb'; 
        c.fillRect(0, 0, cvs.width, cvs.height);
    }

    c.save();
    c.translate(state.offsetX, state.offsetY);
    c.scale(state.scale, state.scale);
    
    if (state.showPageBounds) {
        c.fillStyle = '#ffffff';
        c.shadowColor = 'rgba(0,0,0,0.2)';
        c.shadowBlur = 20;
        c.shadowOffsetX = 5;
        c.shadowOffsetY = 5;
        c.fillRect(0, 0, state.pageWidth, state.pageHeight);
        
        c.shadowColor = 'transparent';
        c.shadowBlur = 0;
        c.shadowOffsetX = 0;
        c.shadowOffsetY = 0;

        c.strokeStyle = '#9ca3af';
        c.lineWidth = 1 / state.scale;
        c.strokeRect(0, 0, state.pageWidth, state.pageHeight);
    }

    drawGrid(c);

    state.shapes.forEach(shape => {
        drawShape(c, shape);
    });

    if (state.tempShape) {
        drawShape(c, state.tempShape);
    }

    if (!ctxOverride) {
        state.shapes.forEach(shape => shape.drawSelection(c));
    }

    c.restore();
    if (!ctxOverride) drawRulers();
}

function getAlphaHex(opacity) {
    const val = Math.max(0, Math.min(255, Math.round(opacity * 255)));
    return val.toString(16).padStart(2, '0');
}

function drawShape(ctx, shape) {
    ctx.save();
    ctx.translate(shape.x, shape.y);
    
    if (state.isDragging && shape.selected) {
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 15 + (shape.depth || 0);
        ctx.shadowOffsetY = 10 + (shape.depth || 0);
        ctx.globalAlpha = 0.9; 
    } else if (shape.depth > 0) {
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = shape.depth * 2;
        ctx.shadowOffsetY = shape.depth * 1.5;
    }

    ctx.rotate(shape.rotation * Math.PI / 180);
    
    const s = shape.scale || 1;
    ctx.scale(s, s);

    const fillAlpha = getAlphaHex(shape.fillOpacity);
    const fillColor = shape.color + fillAlpha;

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = 2;

    // --- לוגיקת ציור לפי סוג ---
    if (shape.type === 'rect') {
        ctx.fillStyle = fillColor;
        ctx.fillRect(0, 0, shape.width, shape.height);
        ctx.strokeRect(0, 0, shape.width, shape.height);
    } 
    else if (shape.type === 'triangle') {
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(shape.width / 2, 0); 
        ctx.lineTo(shape.width, shape.height); 
        ctx.lineTo(0, shape.height); 
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    else if (shape.type === 'right-triangle') {
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, shape.height);
        ctx.lineTo(shape.width, shape.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    else if (shape.type === 'circle') {
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(0, 0, Math.abs(shape.width), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    else if (shape.type === 'ellipse') {
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.abs(shape.width)/2, Math.abs(shape.height)/2, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }
    else if (shape.type === 'compass') {
        const angleSpanRad = (shape.angleSpan || 60) * Math.PI / 180;
        const r = Math.abs(shape.width);
        
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(0, 0); 
        ctx.arc(0, 0, r, 0, angleSpanRad);
        ctx.lineTo(0, 0); 
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.fillStyle = shape.color;
        ctx.arc(0, 0, 3/s, 0, Math.PI*2);
        ctx.fill();
    }
    else if (shape.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(shape.width, shape.height);
        ctx.stroke();
    }
    else if (shape.type === 'line-dashed') {
        ctx.setLineDash([10, 10]); 
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(shape.width, shape.height);
        ctx.stroke();
        ctx.setLineDash([]); 
    }
    else if (shape.type === 'arrow') {
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(shape.width, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(shape.width, 0);
        ctx.lineTo(shape.width - 10, -5);
        ctx.lineTo(shape.width - 10, 5);
        ctx.fill();
    }
    else if (shape.type === 'double-arrow') {
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(shape.width, 0);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(shape.width, 0);
        ctx.lineTo(shape.width - 10, -5);
        ctx.lineTo(shape.width - 10, 5);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(10, -5);
        ctx.lineTo(10, 5);
        ctx.fill();
    }
    else if (shape.type === 'pipe') {
        if (Math.abs(shape.height) < 0.1) {
            ctx.fillStyle = '#555';
            ctx.fillRect(0, 0, shape.width, shape.height);
        } else {
            ctx.save();
            ctx.globalAlpha = shape.fillOpacity > 0 ? Math.max(0.2, shape.fillOpacity) : 0; 
            if (shape.fillOpacity === 0) ctx.globalAlpha = 0; 

            const grad = ctx.createLinearGradient(0, 0, 0, shape.height);
            grad.addColorStop(0, '#555');
            grad.addColorStop(0.5, '#eee');
            grad.addColorStop(1, '#555');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, shape.width, shape.height);
            ctx.restore();
        }
        
        ctx.strokeRect(0, 0, shape.width, shape.height);

        ctx.fillStyle = '#444';
        ctx.fillRect(-5, -2, 5, shape.height + 4);
        ctx.fillRect(shape.width, -2, 5, shape.height + 4);
    }
    else if (shape.type === 'gear') {
        const teeth = 12;
        const rOuter = Math.abs(shape.width);
        const rInner = rOuter * 0.8;
        const hole = rOuter * 0.3;
        
        ctx.fillStyle = '#6b7280' + fillAlpha; 
        ctx.beginPath();
        for (let i = 0; i < teeth * 2; i++) {
            const a = (Math.PI * 2 * i) / (teeth * 2);
            const r = (i % 2 === 0) ? rOuter : rInner;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(0, 0, hole, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.stroke(); 
        ctx.beginPath(); ctx.arc(0, 0, hole, 0, Math.PI * 2); ctx.stroke();
    }
    else if (shape.type === 'weight') {
        const w = shape.width;
        const h = shape.height;
        if (Math.abs(w) < 0.1) return;
        const bodyH = h * 0.75;
        const knobH = h * 0.25;
        
        ctx.save();
        ctx.globalAlpha = shape.fillOpacity > 0 ? Math.max(0.2, shape.fillOpacity) : 0;
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#374151');
        grad.addColorStop(0.3, '#9ca3af');
        grad.addColorStop(0.6, '#4b5563');
        grad.addColorStop(1, '#1f2937');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, knobH);
        ctx.lineTo(w, knobH);
        ctx.lineTo(w * 0.9, h);
        ctx.lineTo(w * 0.1, h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        ctx.beginPath();
        ctx.moveTo(0, knobH);
        ctx.lineTo(w, knobH);
        ctx.lineTo(w * 0.9, h);
        ctx.lineTo(w * 0.1, h);
        ctx.closePath();
        ctx.stroke();

        const knobW = w * 0.4;
        const knobX = (w - knobW) / 2;
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(knobX, 0, knobW, knobH);
        ctx.strokeRect(knobX, 0, knobW, knobH);
        ctx.beginPath();
        ctx.arc(w/2, 0, Math.abs(knobW/1.5), Math.PI, 0); 
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.min(Math.abs(w), Math.abs(bodyH)) * 0.25}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("M", w/2, knobH + bodyH/2);
    }
    else if (shape.type === 'text') {
        ctx.font = `${Math.abs(shape.height) || 20}px Arial`;
        ctx.fillStyle = shape.color;
        ctx.fillText(shape.text || "טקסט", 0, 0);
    }
    
    // --- רכיבים מיוחדים (ספרייה) ---
    else if (shape.type === 'chair') {
        ctx.fillStyle = fillColor || 'none';
        ctx.strokeRect(0, 0, shape.width, shape.width);
        if (fillColor) ctx.fillRect(0, 0, shape.width, shape.width);
        ctx.strokeRect(0, -10, shape.width, 10);
        if (fillColor) ctx.fillRect(0, -10, shape.width, 10);
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, shape.width/2);
        ctx.moveTo(shape.width, 0); ctx.lineTo(shape.width, shape.width/2);
        ctx.stroke();
    }
    else if (shape.type === 'window') {
        ctx.strokeRect(0, 0, shape.width, 20); 
        ctx.beginPath();
        ctx.moveTo(0, 10); ctx.lineTo(shape.width, 10); 
        ctx.moveTo(shape.width/2, 0); ctx.lineTo(shape.width/2, 20); 
        ctx.stroke();
    }
    else if (shape.type === 'door') {
        ctx.beginPath();
        ctx.moveTo(0, shape.width);
        ctx.lineTo(0, 0);
        ctx.arc(0, shape.width, shape.width, 1.5*Math.PI, 0);
        ctx.stroke();
    }
    else if (shape.type === 'headphones') {
        ctx.beginPath();
        ctx.arc(shape.width/2, shape.height/2, shape.width/2, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = shape.color;
        ctx.fillRect(0, shape.height/2 - 10, 10, 20);
        ctx.fillRect(shape.width-10, shape.height/2 - 10, 10, 20);
    }
    else if (shape.type === 'mixer') {
        ctx.strokeRect(0, 0, shape.width, shape.height);
        for(let i=1; i<4; i++) {
            let x = (shape.width/4)*i;
            ctx.beginPath();
            ctx.moveTo(x, 10); ctx.lineTo(x, shape.height-10);
            ctx.stroke();
            ctx.fillStyle = shape.color;
            ctx.fillRect(x-5, shape.height/2, 10, 10); 
        }
    }
    else if (shape.type === 'cable') {
        ctx.beginPath();
        ctx.moveTo(0, shape.height);
        ctx.bezierCurveTo(shape.width*0.3, 0, shape.width*0.7, shape.height*1.5, shape.width, 0);
        ctx.stroke();
    }
    else if (shape.type === 'mic') {
        ctx.beginPath();
        ctx.arc(10, 10, 10, 0, Math.PI*2);
        ctx.stroke();
        ctx.strokeRect(5, 20, 10, 30);
    }
    else if (shape.type === 'camera') {
        ctx.strokeRect(0, 10, shape.width, shape.height-10); 
        ctx.beginPath();
        ctx.arc(shape.width/2, (shape.height-10)/2 + 10, (shape.height-10)/3, 0, Math.PI*2); 
        ctx.stroke();
        ctx.strokeRect(shape.width - 20, 0, 10, 10); 
    }
    else if (shape.type === 'flashlight') {
        ctx.strokeRect(0, shape.height/4, shape.width*0.6, shape.height/2);
        ctx.beginPath();
        ctx.moveTo(shape.width*0.6, shape.height/4);
        ctx.lineTo(shape.width, 0);
        ctx.lineTo(shape.width, shape.height);
        ctx.lineTo(shape.width*0.6, shape.height*0.75);
        ctx.closePath();
        ctx.stroke();
    }
    else if (shape.type === 'tripod') {
        ctx.strokeRect(shape.width/2 - 5, 0, 10, 10);
        ctx.beginPath();
        ctx.moveTo(shape.width/2, 10); ctx.lineTo(shape.width/2, shape.height); 
        ctx.moveTo(shape.width/2, 10); ctx.lineTo(0, shape.height); 
        ctx.moveTo(shape.width/2, 10); ctx.lineTo(shape.width, shape.height); 
        ctx.stroke();
    }

    ctx.restore();
}
