// OpenLens Archy - Diagram & Rules Exporter
// Handles Canvas rasterization, Clipboard API, SVG export, and JSON rule compilation

export class DiagramExporter {
  constructor(app) {
    this.app = app;
  }

  // Generate an offscreen canvas containing the entire diagram
  async renderToCanvas(format = 'image/png', bgColor = null) {
    const activeData = this.app.currentPreset;
    const theme = document.body.getAttribute('data-theme') || 'dark';

    // Determine dimensions to encompass all nodes and boundaries
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    activeData.boundaries.forEach(b => {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    });

    activeData.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const padding = 60;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = maxX + padding;
    maxY = maxY + padding;

    const exportWidth = maxX - minX;
    const exportHeight = maxY - minY;

    // Retina resolution multiplier
    const dpr = 2;
    const canvas = document.createElement('canvas');
    canvas.width = exportWidth * dpr;
    canvas.height = exportHeight * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Theme background colors
    const themeBgs = {
      dark: '#05140e',
      light: '#fbf9ef',
      funk: '#0b1a1c'
    };
    ctx.fillStyle = bgColor || themeBgs[theme] || '#05140e';
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    // Draw dot matrix grid
    const dotColor = theme === 'light' ? 'rgba(10, 51, 35, 0.16)' : (theme === 'funk' ? '#839958' : 'rgba(131, 153, 88, 0.22)');
    ctx.fillStyle = dotColor;
    for (let x = 0; x < exportWidth; x += 24) {
      for (let y = 0; y < exportHeight; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Offset translation
    ctx.save();
    ctx.translate(-minX, -minY);

    // 1. Draw Subsystem Boundaries
    activeData.boundaries.forEach(b => {
      ctx.save();
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([8, 6]);
      ctx.fillStyle = b.fill || 'transparent';
      
      this.drawRoundedRect(ctx, b.x, b.y, b.width, b.height, 10);
      ctx.fill();
      ctx.stroke();

      // Boundary Label pill
      ctx.fillStyle = themeBgs[theme];
      ctx.setLineDash([]);
      ctx.font = 'bold 11px monospace';
      const labelText = b.label.toUpperCase();
      const textMetrics = ctx.measureText(labelText);
      const pillWidth = textMetrics.width + 16;
      const pillHeight = 20;
      
      this.drawRoundedRect(ctx, b.x + 14, b.y - 10, pillWidth, pillHeight, 8);
      ctx.fill();
      ctx.strokeStyle = b.color;
      ctx.stroke();

      ctx.fillStyle = theme === 'light' ? '#0A3323' : '#F7F4D5';
      ctx.fillText(labelText, b.x + 22, b.y + 4);
      ctx.restore();
    });

    // 2. Draw Connection Lines & Arrows
    activeData.connections.forEach(conn => {
      const source = activeData.nodes.find(n => n.id === conn.from);
      const target = activeData.nodes.find(n => n.id === conn.to);
      if (!source || !target) return;

      const p1 = this.app.getNodeEdgePoint(source, target);
      const p2 = this.app.getNodeEdgePoint(target, source);

      ctx.save();
      ctx.strokeStyle = conn.color || '#839958';
      ctx.lineWidth = 1.8;
      if (conn.style === 'dashed') {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      // Calculate cubic Bezier curve or segmented orthogonal line
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
      ctx.stroke();

      // Draw arrowhead
      const angle = Math.atan2(p2.y - midY, p2.x - midX);
      const arrowLength = 9;
      ctx.fillStyle = conn.color || '#839958';
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(
        p2.x - arrowLength * Math.cos(angle - Math.PI / 7),
        p2.y - arrowLength * Math.sin(angle - Math.PI / 7)
      );
      ctx.lineTo(
        p2.x - arrowLength * Math.cos(angle + Math.PI / 7),
        p2.y - arrowLength * Math.sin(angle + Math.PI / 7)
      );
      ctx.closePath();
      ctx.fill();

      // Draw Connection Label Pill
      if (conn.label) {
        ctx.font = '500 10px monospace';
        const labelW = ctx.measureText(conn.label).width + 12;
        ctx.fillStyle = theme === 'light' ? '#ffffff' : '#0a2117';
        ctx.strokeStyle = theme === 'light' ? '#d9dbbe' : 'rgba(131, 153, 88, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        this.drawRoundedRect(ctx, midX - labelW / 2, midY - 9, labelW, 18, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = theme === 'light' ? '#0A3323' : '#F7F4D5';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(conn.label, midX, midY);
      }

      ctx.restore();
    });

    // 3. Draw Node Cards
    const layerColors = {
      frontend: '#38bdf8',
      backend: '#10b981',
      database: '#a855f7',
      security: '#f43f5e',
      external: '#94a3b8'
    };

    activeData.nodes.forEach(node => {
      ctx.save();
      const nodeBg = theme === 'light' ? '#ffffff' : (theme === 'funk' ? '#102d33' : '#0a2117');
      const borderColor = theme === 'funk' ? '#D3968C' : (theme === 'light' ? '#d9dbbe' : '#164632');
      
      ctx.fillStyle = nodeBg;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.4;
      this.drawRoundedRect(ctx, node.x, node.y, node.width, node.height, 6);
      ctx.fill();
      ctx.stroke();

      // Layer Stripe indicator on the left
      ctx.fillStyle = layerColors[node.layer] || '#839958';
      this.drawLeftRoundedStrip(ctx, node.x, node.y, 4, node.height, 6);
      ctx.fill();

      // Node Icon / Type
      ctx.fillStyle = theme === 'light' ? '#0A3323' : '#F7F4D5';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('<>', node.x + 10, node.y + 10);

      // Node Title
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(node.label, node.x + 28, node.y + 9);

      // Node File / Meta
      ctx.fillStyle = theme === 'light' ? '#2d5543' : 'rgba(247, 244, 213, 0.65)';
      ctx.font = '10px monospace';
      ctx.fillText(node.file || '', node.x + 10, node.y + 32);

      ctx.restore();
    });

    ctx.restore();
    return canvas;
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  drawLeftRoundedStrip(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Copy diagram directly to clipboard
  async copyToClipboard() {
    try {
      const canvas = await this.renderToCanvas('image/png');
      canvas.toBlob(async blob => {
        if (!blob) {
          this.app.showToast('Unable to export image for clipboard.');
          return;
        }
        if (navigator.clipboard && navigator.clipboard.write) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            this.app.showToast('Diagram image copied to clipboard!');
            return;
          } catch (clipErr) {
            console.warn('ClipboardItem error, falling back:', clipErr);
          }
        }
        // Fallback for environments where ClipboardItem is restricted
        const dataUrl = canvas.toDataURL('image/png');
        await navigator.clipboard.writeText(dataUrl);
        this.app.showToast('Diagram Data URL copied to clipboard!');
      }, 'image/png');
    } catch (e) {
      console.error(e);
      this.app.showToast('Failed to copy diagram to clipboard.');
    }
  }

  // Save as PNG
  async saveAsPNG() {
    const canvas = await this.renderToCanvas('image/png');
    const link = document.createElement('a');
    link.download = `${this.app.currentPreset.id}-architecture.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    this.app.showToast('Architecture diagram saved as PNG.');
  }

  // Save as JPEG
  async saveAsJPEG() {
    const canvas = await this.renderToCanvas('image/jpeg', '#05140e');
    const link = document.createElement('a');
    link.download = `${this.app.currentPreset.id}-architecture.jpeg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
    this.app.showToast('Architecture diagram saved as JPEG.');
  }

  // Save as SVG
  saveAsSVG() {
    const svgEl = document.getElementById('connections-layer');
    if (!svgEl) return;
    const svgClone = svgEl.cloneNode(true);
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgClone);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${this.app.currentPreset.id}-architecture.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    this.app.showToast('Vector SVG diagram exported.');
  }

  // Export Architecture Rules for OpenLens Dev AST engine
  exportRulesJSON() {
    const rulesData = {
      product: "OpenLens Archy",
      exportedAt: new Date().toISOString(),
      architecture: this.app.currentPreset.name,
      description: this.app.currentPreset.description,
      rules: this.app.currentPreset.rules || [],
      adrs: this.app.currentPreset.adrs || [],
      layers: this.app.currentPreset.layerStats
    };

    const blob = new Blob([JSON.stringify(rulesData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${this.app.currentPreset.id}-rules.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    this.app.showToast('Architecture Rules exported for OpenLens Dev.');
  }

  // Export ADRs as Markdown
  exportADRsMarkdown() {
    let md = `# Architecture Decision Records (ADRs)\n\n`;
    md += `**Project:** ${this.app.currentPreset.name}\n`;
    md += `**Exported:** ${new Date().toLocaleDateString()}\n\n---\n\n`;

    (this.app.currentPreset.adrs || []).forEach(adr => {
      md += `## ${adr.id}: ${adr.title}\n\n`;
      md += `- **Status:** ${adr.status}\n`;
      md += `- **Layer:** ${adr.layer}\n`;
      md += `- **Date:** ${adr.date}\n\n`;
      md += `### Context & Decision\n${adr.decision}\n\n`;
      md += `### Consequences & Trade-offs\n${adr.consequences}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${this.app.currentPreset.id}-ADRs.md`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    this.app.showToast('Architecture Decision Records exported.');
  }

  // Export Self-Contained Interactive HTML (offline, portable, zero server needed)
  exportStandaloneHTML() {
    const preset = this.app.currentPreset;
    const jsonStr = JSON.stringify(preset);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${preset.name || 'Architecture Diagram'} — OpenLens Standalone</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    :root { --bg: #03080f; --surface: #0a1324; --border: rgba(255,255,255,0.1); --accent: #4f8ef7; --text: #f0f4fc; --muted: #7c8faa; }
    body[data-theme="light"] { --bg: #f8fafc; --surface: #ffffff; --border: rgba(0,0,0,0.1); --accent: #2563eb; --text: #0f172a; --muted: #64748b; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); overflow: hidden; height: 100vh; display: flex; flex-direction: column; }
    header { height: 48px; border-bottom: 1px solid var(--border); background: var(--surface); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 10; }
    .brand { font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; gap: 8px; }
    .theme-toggle { cursor: pointer; padding: 4px 10px; border-radius: 20px; background: transparent; border: 1px solid var(--border); color: var(--text); font-size: 0.75rem; font-weight: 600; }
    #viewport { flex: 1; position: relative; overflow: hidden; cursor: grab; background-image: radial-gradient(var(--border) 1px, transparent 1px); background-size: 24px 24px; }
    #canvas { position: absolute; top: 0; left: 0; transform-origin: 0 0; }
    .boundary { position: absolute; border-radius: 12px; pointer-events: none; border-style: dashed; }
    .boundary-label { position: absolute; top: 8px; left: 14px; font-size: 0.72rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; padding: 2px 8px; border-radius: 6px; background: var(--surface); }
    .node-card { position: absolute; border-radius: 8px; background: var(--surface); border: 1px solid var(--border); padding: 10px 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); cursor: pointer; transition: transform 0.15s, border-color 0.15s; }
    .node-card:hover { transform: translateY(-2px); border-color: var(--accent); }
    .node-title { font-weight: 700; font-size: 0.8rem; margin-bottom: 4px; }
    .node-meta { font-size: 0.68rem; color: var(--muted); font-family: 'JetBrains Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    svg { position: absolute; inset: 0; pointer-events: none; }
    .info-bar { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); background: var(--surface); border: 1px solid var(--border); border-radius: 30px; padding: 6px 16px; font-size: 0.75rem; color: var(--muted); box-shadow: 0 8px 24px rgba(0,0,0,0.3); z-index: 10; display: flex; gap: 14px; align-items: center; }
  </style>
</head>
<body data-theme="dark">
  <header>
    <div class="brand"><span>🔍</span> OpenLens Archy — <span style="color:var(--accent);">${preset.name || 'System Architecture'}</span></div>
    <button class="theme-toggle" id="theme-btn">🌓 Toggle Theme</button>
  </header>
  <div id="viewport">
    <div id="canvas">
      <svg id="svg-layer" width="4000" height="3000"></svg>
      <div id="boundaries-layer"></div>
      <div id="nodes-layer"></div>
    </div>
    <div class="info-bar">
      <span>🖱️ Drag to Pan · Scroll to Zoom</span>
      <span>|</span>
      <span>${(preset.nodes || []).length} Components · ${(preset.boundaries || []).length} Boundaries</span>
      <span style="color:var(--accent);">✓ Self-Contained Architecture Diagram</span>
    </div>
  </div>
  <script>
    const data = ${jsonStr};
    let scale = 0.8, panX = 40, panY = 30, isDragging = false, startX = 0, startY = 0;
    const canvas = document.getElementById('canvas');
    const viewport = document.getElementById('viewport');
    const svgLayer = document.getElementById('svg-layer');
    const bLayer = document.getElementById('boundaries-layer');
    const nLayer = document.getElementById('nodes-layer');

    function updateTransform() {
      canvas.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${scale})\`;
    }

    viewport.addEventListener('mousedown', e => { isDragging = true; startX = e.clientX - panX; startY = e.clientY - panY; viewport.style.cursor = 'grabbing'; });
    window.addEventListener('mousemove', e => { if (!isDragging) return; panX = e.clientX - startX; panY = e.clientY - startY; updateTransform(); });
    window.addEventListener('mouseup', () => { isDragging = false; viewport.style.cursor = 'grab'; });
    viewport.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      scale = Math.min(2.5, Math.max(0.3, scale * zoomFactor));
      updateTransform();
    }, { passive: false });

    document.getElementById('theme-btn').addEventListener('click', () => {
      const cur = document.body.getAttribute('data-theme');
      document.body.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
    });

    // Render Boundaries
    (data.boundaries || []).forEach(b => {
      const el = document.createElement('div');
      el.className = 'boundary';
      el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
      el.style.width = b.width + 'px'; el.style.height = b.height + 'px';
      el.style.borderColor = b.color || '#4f8ef7'; el.style.borderWidth = '1.5px';
      el.innerHTML = \`<div class="boundary-label" style="border: 1px solid \${b.color || '#4f8ef7'}; color: \${b.color || '#4f8ef7'};">\${b.label || b.name}</div>\`;
      bLayer.appendChild(el);
    });

    // Render Nodes
    const nodeMap = {};
    (data.nodes || []).forEach(n => {
      nodeMap[n.id] = n;
      const el = document.createElement('div');
      el.className = 'node-card';
      el.style.left = n.x + 'px'; el.style.top = n.y + 'px';
      el.style.width = (n.width || 230) + 'px'; el.style.height = (n.height || 68) + 'px';
      el.innerHTML = \`<div class="node-title">\${n.label}</div><div class="node-meta">\${n.file || n.subsystem || ''}</div>\`;
      el.addEventListener('click', () => alert(\`Component: \${n.label}\\nFile: \${n.file || 'N/A'}\\nSubsystem: \${n.subsystem || 'N/A'}\\nLines: \${n.lines || 'N/A'}\`));
      nLayer.appendChild(el);
    });

    // Render Connections
    (data.connections || []).forEach(c => {
      const fromNode = nodeMap[c.from];
      const toNode = nodeMap[c.to];
      if (fromNode && toNode) {
        const x1 = fromNode.x + (fromNode.width || 230);
        const y1 = fromNode.y + (fromNode.height || 68) / 2;
        const x2 = toNode.x;
        const y2 = toNode.y + (toNode.height || 68) / 2;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const cx1 = x1 + (x2 - x1) * 0.5;
        const cx2 = x1 + (x2 - x1) * 0.5;
        path.setAttribute('d', \`M \${x1} \${y1} C \${cx1} \${y1}, \${cx2} \${y2}, \${x2} \${y2}\`);
        path.setAttribute('stroke', '#4f8ef7');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.6');
        svgLayer.appendChild(path);
      }
    });

    updateTransform();
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${this.app.currentPreset.id || 'openlens'}-standalone.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    this.app.showToast('✓ Standalone Interactive HTML exported (offline portable).');
  }
}
