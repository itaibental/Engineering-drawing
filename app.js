// לוגיקת כניסה
function validateLogin() {
    const input = document.getElementById('access-code');
    const errorMsg = document.getElementById('login-error');
    const code = input.value.trim().toUpperCase();
    
    if (code === 'TAMAR.K' || code === 'IBT1234') {
        document.getElementById('login-overlay').classList.add('hidden');
    } else {
        errorMsg.classList.remove('hidden');
        input.classList.add('border-red-500');
        input.classList.remove('border-gray-300');
    }
}

document.getElementById('access-code').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        validateLogin();
    }
});

// --- מערכת קנבס ליבה ---
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const wrapper = document.getElementById('canvas-wrapper');
const rulerX = document.getElementById('ruler-x');
const rulerY = document.getElementById('ruler-y');

// מצב אפליקציה
let state = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    tool: 'select',
    isDragging: false,
    isRotating: false, 
    isPanning: false,
    startDragX: 0,
    startDragY: 0,
    
    gridOpacity: 1, // שקיפות רשת

    // הגדרות דף חדשות
    showPageBounds: false,
    pageWidth: 1000,
    pageHeight: 800,
    rulerScale: 1, // קנה מידה למספרים בסרגל

    // משתנים לחישוב סיבוב מדויק
    dragStartAngle: 0,
    initialRotation: 0,

    shapes: [],
    selectedId: null,
    tempShape: null,
    
    // העתק הדבק
    clipboard: null,

    // היסטוריה
    history: [],
    historyStep: -1
};

// הגדרת גודל קנבס
function resize() {
    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
    draw();
}
window.addEventListener('resize', resize);

// --- אינטראקציה ---

function setTool(toolName) {
    state.tool = toolName;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById('btn-' + toolName);
    if(btn) btn.classList.add('active');
    
    // איפוס בחירה כשעוברים לכלי ציור
    if (toolName !== 'select') {
        state.shapes.forEach(s => s.selected = false);
        state.selectedId = null;
        document.getElementById('properties-panel').classList.add('hidden');
        draw();
    }
}

function addComponent(type) {
    if (!type) return;
    // יצירת רכיב מיוחד במרכז המסך (בערך)
    const centerX = (-state.offsetX + canvas.width/2) / state.scale;
    const centerY = (-state.offsetY + canvas.height/2) / state.scale;
    
    const s = new Shape(type, centerX, centerY);
    s.width = 50; 
    s.height = 50;
    
    if (type === 'door' || type === 'window') { s.width = 60; s.height = 10; }
    if (type === 'cable') { s.width = 100; s.height = 50; }
    if (type === 'mic') { s.width = 20; s.height = 50; }
    if (type === 'flashlight') { s.width = 60; s.height = 30; }

    state.shapes.push(s);
    
    // חזרה לכלי בחירה
    document.getElementById('component-library').value = ""; // איפוס בחירה
    setTool('select');
    
    // בחירה אוטומטית של החדש
    state.shapes.forEach(x => x.selected = false);
    s.selected = true;
    state.selectedId = s.id;
    showProperties(s);
    
    saveHistory();
    draw();
}

function clearCanvas() {
    if (confirm("האם אתה בטוח שברצונך למחוק את כל השרטוט?")) {
        state.shapes = [];
        state.selectedId = null;
        document.getElementById('properties-panel').classList.add('hidden');
        saveHistory();
        draw();
    }
}

function togglePageBounds(isChecked) {
    state.showPageBounds = isChecked;
    const dimsPanel = document.getElementById('page-dims');
    if (isChecked) {
        dimsPanel.classList.remove('opacity-50', 'pointer-events-none');
    } else {
        dimsPanel.classList.add('opacity-50', 'pointer-events-none');
        if (state.offsetX > 0) state.offsetX = 0;
        if (state.offsetY > 0) state.offsetY = 0;
    }
    draw();
}

function updatePageSize() {
    const w = parseInt(document.getElementById('page-width').value) || 1000;
    const h = parseInt(document.getElementById('page-height').value) || 800;
    state.pageWidth = w;
    state.pageHeight = h;
    draw();
}

function updateRulerScale(val) {
    const scale = parseFloat(val);
    if (!isNaN(scale) && scale > 0) {
        state.rulerScale = scale;
        draw();
    }
}

function setGridOpacity(val) {
    state.gridOpacity = parseFloat(val);
    draw();
}

function zoom(delta) {
    setZoom(parseFloat(state.scale) + delta);
}

function setZoom(val) {
    state.scale = Math.min(Math.max(0.1, parseFloat(val)), 5);
    if (!state.showPageBounds) {
        state.offsetX = Math.min(state.offsetX, 0);
        state.offsetY = Math.min(state.offsetY, 0);
    }
    updateZoomUI();
    draw();
}

function updateZoomUI() {
    document.getElementById('zoom-slider').value = state.scale;
    document.getElementById('zoom-display').innerText = Math.round(state.scale * 100) + '%';
}

function resetView() {
    state.scale = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    if (state.showPageBounds) {
            const canvasCenter = wrapper.clientWidth / 2;
            const pageCenter = state.pageWidth / 2;
            state.offsetX = canvasCenter - pageCenter;
            state.offsetY = 50; 
    }
    updateZoomUI();
    draw();
}

// --- ניהול קבצים ושמירה ---

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        try {
            const projectData = JSON.parse(content);
            let shapesData = [];
            let settingsData = {};

            if (Array.isArray(projectData)) {
                shapesData = projectData;
            } else if (projectData.shapes) {
                shapesData = projectData.shapes;
                settingsData = projectData.settings || {};
            }

            state.shapes = rehydrateShapes(shapesData);
            
            if (settingsData.pageWidth) state.pageWidth = settingsData.pageWidth;
            if (settingsData.pageHeight) state.pageHeight = settingsData.pageHeight;
            if (settingsData.showPageBounds !== undefined) state.showPageBounds = settingsData.showPageBounds;
            if (settingsData.rulerScale !== undefined) state.rulerScale = settingsData.rulerScale;
            if (settingsData.gridOpacity !== undefined) state.gridOpacity = settingsData.gridOpacity;
            
            document.getElementById('chk-show-page').checked = state.showPageBounds;
            document.getElementById('page-width').value = state.pageWidth;
            document.getElementById('page-height').value = state.pageHeight;
            document.getElementById('ruler-scale-input').value = state.rulerScale || 1;
            
            togglePageBounds(state.showPageBounds); 
            
            state.selectedId = null;
            document.getElementById('properties-panel').classList.add('hidden');
            
            state.history = [];
            state.historyStep = -1;
            saveHistory();

            draw();
            alert("הפרויקט נטען בהצלחה!");
        } catch (err) {
            console.error(err);
            alert("שגיאה בטעינת הקובץ: פורמט לא תקין.");
        }
    };
    reader.readAsText(file);
    event.target.value = ''; 
}

function saveProject() {
    const projectData = {
        version: "3.0",
        shapes: state.shapes,
        settings: {
            pageWidth: state.pageWidth,
            pageHeight: state.pageHeight,
            showPageBounds: state.showPageBounds,
            rulerScale: state.rulerScale,
            gridOpacity: state.gridOpacity,
            scale: state.scale,
            offsetX: state.offsetX,
            offsetY: state.offsetY
        }
    };
    
    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sketch.json';
    a.click();
    URL.revokeObjectURL(url);
}

function saveDocx() {
    const originalSelection = state.selectedId;
    state.shapes.forEach(s => s.selected = false);
    draw();

    const dataUrl = canvas.toDataURL('image/png');

    if (originalSelection) {
        const s = state.shapes.find(sh => sh.id === originalSelection);
        if (s) s.selected = true;
    }
    draw();
    
    const { Document, Packer, Paragraph, ImageRun, TextRun, AlignmentType } = docx;
    
    fetch(dataUrl).then(res => res.blob()).then(blob => {
        const reader = new FileReader();
        reader.onloadend = function() {
            const base64data = reader.result;
            
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "שרטוט - שרטטוני",
                                    bold: true,
                                    size: 32, 
                                    font: "Arial"
                                }),
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 200 }
                        }),
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: base64data,
                                    transformation: {
                                        width: 600,
                                        height: 400 * (canvas.height / canvas.width) 
                                    }
                                })
                            ],
                            alignment: AlignmentType.CENTER
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "נוצר באמצעות שרטטוני - איתי בן טל",
                                    size: 20, 
                                    color: "888888"
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 200 }
                        })
                    ]
                }]
            });

            Packer.toBlob(doc).then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                document.body.appendChild(a);
                a.style = "display: none";
                a.href = url;
                a.download = "sketch.docx";
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            });
        };
        reader.readAsDataURL(blob);
    });
}

// --- פונקציות מאפיינים והיסטוריה ---

function showProperties(shape) {
    const panel = document.getElementById('properties-panel');
    panel.classList.remove('hidden');
    
    document.getElementById('prop-rotation').value = Math.round(shape.rotation % 360);
    document.getElementById('val-rotation').innerText = Math.round(shape.rotation % 360) + "°";

    document.getElementById('prop-color').value = shape.color;
    
    document.getElementById('prop-scale').value = shape.scale || 1;
    document.getElementById('val-scale').innerText = (shape.scale || 1).toFixed(1);
    
    document.getElementById('prop-y').value = Math.round(shape.y);
    document.getElementById('val-y').innerText = Math.round(shape.y);
    
    document.getElementById('prop-depth').value = shape.depth || 0;
    document.getElementById('val-depth').innerText = shape.depth || 0;

    document.getElementById('prop-opacity').value = shape.fillOpacity || 0;
    document.getElementById('val-opacity').innerText = Math.round((shape.fillOpacity || 0) * 100) + "%";

    if (shape.type === 'compass') {
        document.getElementById('prop-group-angle').classList.remove('hidden');
        document.getElementById('prop-angleSpan').value = shape.angleSpan || 60;
        document.getElementById('val-angleSpan').innerText = (shape.angleSpan || 60) + "°";
    } else {
        document.getElementById('prop-group-angle').classList.add('hidden');
    }
}

function updateSelectedProp(prop, value) {
    if (!state.selectedId) return;
    const shape = state.shapes.find(s => s.id === state.selectedId);
    if (shape) {
        if (prop === 'rotation') {
            shape.rotation = parseFloat(value);
            document.getElementById('val-rotation').innerText = value + "°";
        }
        if (prop === 'color') shape.color = value;
        if (prop === 'scale') {
            shape.scale = parseFloat(value);
            document.getElementById('val-scale').innerText = parseFloat(value).toFixed(1);
        }
        if (prop === 'y') {
            shape.y = parseFloat(value);
            document.getElementById('val-y').innerText = value;
        }
        if (prop === 'depth') {
            shape.depth = parseFloat(value);
            document.getElementById('val-depth').innerText = value;
        }
        if (prop === 'opacity') {
            shape.fillOpacity = parseFloat(value);
            document.getElementById('val-opacity').innerText = Math.round(value * 100) + "%";
        }
        if (prop === 'angleSpan') {
            shape.angleSpan = parseFloat(value);
            document.getElementById('val-angleSpan').innerText = value + "°";
        }
        
        saveHistory(); 
        draw();
    }
}

function deleteSelected() {
    if (state.selectedId) {
        state.shapes = state.shapes.filter(s => s.id !== state.selectedId);
        state.selectedId = null;
        document.getElementById('properties-panel').classList.add('hidden');
        saveHistory(); 
        draw();
    }
}

function bringToFront() {
    if (!state.selectedId) return;
    const idx = state.shapes.findIndex(s => s.id === state.selectedId);
    if (idx > -1 && idx < state.shapes.length - 1) {
        const shape = state.shapes.splice(idx, 1)[0];
        state.shapes.push(shape);
        saveHistory();
        draw();
    }
}

function sendToBack() {
    if (!state.selectedId) return;
    const idx = state.shapes.findIndex(s => s.id === state.selectedId);
    if (idx > 0) {
        const shape = state.shapes.splice(idx, 1)[0];
        state.shapes.unshift(shape);
        saveHistory();
        draw();
    }
}

function rehydrateShapes(plainShapes) {
    return plainShapes.map(s => {
        const shape = new Shape(s.type, s.x, s.y, s.color);
        Object.assign(shape, s);
        return shape;
    });
}

function saveHistory() {
    if (state.historyStep < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyStep + 1);
    }
    state.history.push(JSON.stringify(state.shapes));
    state.historyStep++;
    if (state.history.length > 50) {
        state.history.shift();
        state.historyStep--;
    }
}

function undo() {
    if (state.historyStep > 0) {
        state.historyStep--;
        const previousState = JSON.parse(state.history[state.historyStep]);
        state.shapes = rehydrateShapes(previousState);
        state.selectedId = null; 
        document.getElementById('properties-panel').classList.add('hidden');
        draw();
    }
}

function redo() {
    if (state.historyStep < state.history.length - 1) {
        state.historyStep++;
        const nextState = JSON.parse(state.history[state.historyStep]);
        state.shapes = rehydrateShapes(nextState);
        state.selectedId = null;
        document.getElementById('properties-panel').classList.add('hidden');
        draw();
    }
}

// Copy & Paste Logic
function copySelected() {
    if (state.selectedId) {
        const shape = state.shapes.find(s => s.id === state.selectedId);
        if (shape) {
            state.clipboard = JSON.stringify(shape);
        }
    }
}

function pasteShape() {
    if (!state.clipboard) return;
    try {
        const data = JSON.parse(state.clipboard);
        // Create new shape instance based on data
        const newShape = new Shape(data.type, data.x, data.y, data.color);
        Object.assign(newShape, data);
        
        // Generate new properties for copy
        newShape.id = Date.now() + Math.random();
        newShape.x += 20 / state.scale; // Offset relative to scale so it's visible
        newShape.y += 20 / state.scale;
        newShape.selected = true;

        // Deselect current
        state.shapes.forEach(s => s.selected = false);
        
        state.shapes.push(newShape);
        state.selectedId = newShape.id;
        
        showProperties(newShape);
        saveHistory();
        draw();
    } catch (e) {
        console.error("Paste failed", e);
    }
}

function getWorldPos(e) {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return {
        x: (screenX - state.offsetX) / state.scale,
        y: (screenY - state.offsetY) / state.scale,
        screenX, screenY
    };
}

canvas.addEventListener('mousedown', e => {
    const pos = getWorldPos(e);
    
    if (e.button === 2 || e.button === 1 || (state.tool === 'select' && e.ctrlKey)) {
        state.isPanning = true;
        state.startDragX = e.clientX - state.offsetX;
        state.startDragY = e.clientY - state.offsetY;
        canvas.style.cursor = 'grabbing';
        return;
    }

    if (state.tool === 'select') {
        if (state.selectedId) {
            const selectedShape = state.shapes.find(s => s.id === state.selectedId);
            if (selectedShape && selectedShape.isOverHandle(pos.x, pos.y)) {
                state.isRotating = true;
                
                const dx = pos.x - selectedShape.x;
                const dy = pos.y - selectedShape.y;
                state.dragStartAngle = Math.atan2(dy, dx) * 180 / Math.PI;
                state.initialRotation = selectedShape.rotation;
                return;
            }
        }

        let clickedShape = null;
        for (let i = state.shapes.length - 1; i >= 0; i--) {
            if (state.shapes[i].contains(pos.x, pos.y)) {
                clickedShape = state.shapes[i];
                break;
            }
        }

        if (!clickedShape && !state.isRotating) {
            state.shapes.forEach(s => s.selected = false);
            state.selectedId = null;
            document.getElementById('properties-panel').classList.add('hidden');
        } else if (clickedShape) {
            state.shapes.forEach(s => s.selected = false);
            clickedShape.selected = true;
            state.selectedId = clickedShape.id;
            state.isDragging = true;
            state.dragOffsetX = pos.x - clickedShape.x;
            state.dragOffsetY = pos.y - clickedShape.y;
            showProperties(clickedShape);
        }
    } else {
        state.isDragging = true;
        state.startX = pos.x;
        state.startY = pos.y;
        
        if (state.tool === 'text') {
            const text = prompt("הכנס טקסט:", "טקסט לדוגמה");
            if (text) {
                const s = new Shape('text', pos.x, pos.y);
                s.text = text;
                s.height = 24; 
                s.fillOpacity = 1; 
                state.shapes.push(s);
                setTool('select');
            }
            state.isDragging = false;
        } else {
            state.tempShape = new Shape(state.tool, pos.x, pos.y);
            if (state.tool === 'gear' || state.tool === 'circle') state.tempShape.width = 1; 
        }
    }
    draw();
});

canvas.addEventListener('mousemove', e => {
    const pos = getWorldPos(e);

    if (state.isPanning) {
        let newOffsetX = e.clientX - state.startDragX;
        let newOffsetY = e.clientY - state.startDragY;
        
        if (!state.showPageBounds) {
            state.offsetX = Math.min(newOffsetX, 0);
            state.offsetY = Math.min(newOffsetY, 0);
        } else {
            state.offsetX = newOffsetX;
            state.offsetY = newOffsetY;
        }
        draw();
        return;
    }

    if (state.tool === 'select' && state.selectedId && !state.isRotating && !state.isDragging) {
        const selectedShape = state.shapes.find(s => s.id === state.selectedId);
        if (selectedShape && selectedShape.isOverHandle(pos.x, pos.y)) {
            canvas.style.cursor = 'alias'; 
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }

    if (state.isRotating && state.selectedId) {
        const shape = state.shapes.find(s => s.id === state.selectedId);
        if (shape) {
            const dx = pos.x - shape.x;
            const dy = pos.y - shape.y;
            const currentAngle = Math.atan2(dy, dx) * 180 / Math.PI;
            const deltaAngle = currentAngle - state.dragStartAngle;
            shape.rotation = state.initialRotation + deltaAngle;
            
            document.getElementById('prop-rotation').value = Math.round(shape.rotation % 360);
            document.getElementById('val-rotation').innerText = Math.round(shape.rotation % 360) + "°";
            
            draw();
        }
        return;
    }

    if (state.isDragging) {
        if (state.tool === 'select' && state.selectedId) {
            const shape = state.shapes.find(s => s.id === state.selectedId);
            if (shape) {
                shape.x = pos.x - state.dragOffsetX;
                shape.y = pos.y - state.dragOffsetY;
                
                document.getElementById('prop-y').value = Math.round(shape.y);
                document.getElementById('val-y').innerText = Math.round(shape.y);
            }
        } else if (state.tempShape) {
            const dx = pos.x - state.startX;
            const dy = pos.y - state.startY;
            
            if (state.tool === 'rect' || state.tool === 'pipe' || state.tool === 'weight' || state.tool === 'triangle' || state.tool === 'right-triangle' || state.tool === 'ellipse') {
                state.tempShape.width = dx;
                state.tempShape.height = dy;
            } else if (state.tool === 'circle' || state.tool === 'gear' || state.tool === 'compass') {
                state.tempShape.width = Math.sqrt(dx*dx + dy*dy);
            } else if (state.tool === 'line' || state.tool === 'line-dashed' || state.tool === 'arrow' || state.tool === 'double-arrow') {
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                const len = Math.sqrt(dx*dx + dy*dy);
                state.tempShape.rotation = angle;
                state.tempShape.width = len;
            }
        }
        draw();
    }
});

window.addEventListener('mouseup', () => {
    state.isPanning = false;
    canvas.style.cursor = 'crosshair';
    
    if (state.isRotating) {
        state.isRotating = false;
        saveHistory();
        return;
    }

    if (state.isDragging) {
        let historyNeeded = false;

        if (state.tempShape) {
            if (state.tempShape.type === 'rect' || state.tempShape.type === 'pipe' || state.tempShape.type === 'weight' || state.tempShape.type === 'triangle' || state.tempShape.type === 'right-triangle' || state.tempShape.type === 'ellipse') {
                if (state.tempShape.width < 0) {
                    state.tempShape.x += state.tempShape.width;
                    state.tempShape.width = Math.abs(state.tempShape.width);
                }
                if (state.tempShape.height < 0) {
                    state.tempShape.y += state.tempShape.height;
                    state.tempShape.height = Math.abs(state.tempShape.height);
                }
            }
            if (state.tempShape.type === 'pipe' && state.tempShape.height < 10) state.tempShape.height = 20;

            state.shapes.push(state.tempShape);
            state.tempShape = null;
            historyNeeded = true;
        } 
        else if (state.tool === 'select' && state.selectedId) {
            historyNeeded = true;
        }

        state.isDragging = false;
        
        if (historyNeeded) {
            saveHistory();
        }

        draw();
    }
});

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(0.1, state.scale + delta), 5);
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldX = (mouseX - state.offsetX) / state.scale;
    const worldY = (mouseY - state.offsetY) / state.scale;

    state.scale = newScale;

    if (!state.showPageBounds) {
        state.offsetX = Math.min(mouseX - worldX * state.scale, 0);
        state.offsetY = Math.min(mouseY - worldY * state.scale, 0);
    } else {
        state.offsetX = mouseX - worldX * state.scale;
        state.offsetY = mouseY - worldY * state.scale;
    }

    updateZoomUI();
    draw();
}, { passive: false });

canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        copySelected();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        pasteShape();
    }
});

// --- אתחול ---
resize();
resetView();
saveHistory();
