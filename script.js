const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 1000;
canvas.height = 700;

// خلفية بيضاء ظاهرية (CSS فقط)
// الكانفس نفسه شفاف 100%

let drawing = false;
let currentTool = "brush";
let brushSize = 13;
let currentColor = "#00aaff";
let opacity = 1;

// ====== طبقات ======
let layers = [];
let activeLayer = 0;

function addLayer() {
    let layer = document.createElement("canvas");
    layer.width = canvas.width;
    layer.height = canvas.height;
    layer.getContext("2d").clearRect(0, 0, layer.width, layer.height);
    layers.push(layer);
    activeLayer = layers.length - 1;
    refreshLayersUI();
}
addLayer();

// تحديث قائمة الطبقات
function refreshLayersUI() {
    const container = document.getElementById("layers");
    container.innerHTML = "";
    layers.forEach((l, i) => {
        let btn = document.createElement("button");
        btn.textContent = "طبقة " + (i + 1);
        btn.style.display = "block";
        btn.style.marginTop = "5px";
        btn.onclick = () => {
            activeLayer = i;
        };
        container.appendChild(btn);
    });
}

// =========================
// الرسم الجديد (فرشاة + ممحاة)
// =========================

let lastX = 0, lastY = 0;

canvas.addEventListener("mousedown", e => {
    drawing = true;

    let rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;

    draw(e); // يرسم أول نقطة
});

canvas.addEventListener("mousemove", e => {
    if (!drawing) return;

    if (currentTool === "brush" || currentTool === "eraser") {
        let rect = canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        let layer = layers[activeLayer].getContext("2d");

        layer.lineCap = "round";
        layer.lineJoin = "round";
        layer.lineWidth = brushSize;

        if (currentTool === "eraser") {
            layer.globalCompositeOperation = "destination-out"; // مسح
        } else {
            layer.globalCompositeOperation = "source-over"; // رسم
            layer.strokeStyle = currentColor;
            layer.globalAlpha = opacity;
        }

        layer.beginPath();
        layer.moveTo(lastX, lastY);
        layer.lineTo(x, y);
        layer.stroke();

        lastX = x;
        lastY = y;

        renderAllLayers();
    }
});

canvas.addEventListener("mouseup", () => {
    drawing = false;
});
canvas.addEventListener("mouseleave", () => {
    drawing = false;
});

// ====== أداة الدلو ======
function bucketFill(x, y) {
    let layer = layers[activeLayer];
    let ctxTemp = layer.getContext("2d");

    let img = ctxTemp.getImageData(0, 0, layer.width, layer.height);
    let data = img.data;

    let targetPos = (y * layer.width + x) * 4;
    let targetColor = [
        data[targetPos],
        data[targetPos + 1],
        data[targetPos + 2],
        data[targetPos + 3]
    ];

    let fillColor = hexToRGBA(currentColor, opacity);

    function match(px) {
        return px[0] === targetColor[0] &&
               px[1] === targetColor[1] &&
               px[2] === targetColor[2] &&
               px[3] === targetColor[3];
    }

    let stack = [[x, y]];

    while (stack.length) {
        let [cx, cy] = stack.pop();
        let pos = (cy * layer.width + cx) * 4;

        let px = [
            data[pos],
            data[pos + 1],
            data[pos + 2],
            data[pos + 3]
        ];

        if (!match(px)) continue;

        data[pos] = fillColor[0];
        data[pos + 1] = fillColor[1];
        data[pos + 2] = fillColor[2];
        data[pos + 3] = fillColor[3];

        if (cx + 1 < layer.width) stack.push([cx + 1, cy]);
        if (cx - 1 >= 0) stack.push([cx - 1, cy]);
        if (cy + 1 < layer.height) stack.push([cx, cy + 1]);
        if (cy - 1 >= 0) stack.push([cx, cy - 1]);
    }

    ctxTemp.putImageData(img, 0, 0);
}

canvas.addEventListener("click", e => {
    if (currentTool !== "bucket") return;

    let rect = canvas.getBoundingClientRect();
    let x = Math.floor(e.clientX - rect.left);
    let y = Math.floor(e.clientY - rect.top);

    bucketFill(x, y);
    renderAllLayers();
});

// تحويل HEX → RGBA
function hexToRGBA(hex, alpha) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, alpha * 255];
}

// ====== دمج الطبقات في الكانفس الرئيسي ======
function renderAllLayers() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    layers.forEach(layer => {
        ctx.drawImage(layer, 0, 0);
    });
}

// ====== حفظ شفاف ======
document.getElementById("saveBtn").onclick = () => {
    let link = document.createElement("a");
    link.download = "drawing.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
};

// ====== أدوات ======
document.querySelectorAll(".tool").forEach(btn => {
    btn.onclick = () => {
        currentTool = btn.dataset.tool;
    };
});

document.getElementById("colorPicker").oninput = e => currentColor = e.target.value;
document.getElementById("brushSize").oninput = e => brushSize = e.target.value;
document.getElementById("opacity").oninput = e => opacity = e.target.value / 100;

document.getElementById("addLayer").onclick = addLayer;

// ====== سلايد بار ======
const sidebar = document.getElementById("sidebar");
const canvasContainer = document.getElementById("canvasContainer");

document.getElementById("toggleSidebar").onclick = () => {
    sidebar.classList.toggle("open");
    canvasContainer.classList.toggle("canvas-shift");
};