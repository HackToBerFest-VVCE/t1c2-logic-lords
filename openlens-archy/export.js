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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Generate <project-name>-archy.html â€” Premium Interactive Architecture File
  // Zero dependencies Â· Offline capable Â· Pan/Zoom Â· Node Inspector Â· ADR Viewer
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  generateArchyHTML() {
    const preset = this.app.currentPreset;
    const projectName = (preset.id || preset.name || 'project')
      .toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const displayName = preset.name || projectName;
    const jsonStr = JSON.stringify(preset, null, 2);
    const generatedAt = new Date().toLocaleString();
    const nodeCount = (preset.nodes || []).length;
    const boundaryCount = (preset.boundaries || []).length;
    const connCount = (preset.connections || []).length;
    const techStack = (preset.tech_stack || []).slice(0, 20);
    const adrs = preset.adrs || [];
    const rules = preset.rules || [];
    const filesScanned = preset.files_scanned || nodeCount;
    const patterns = preset.patterns || [];

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${displayName} â€” Archy Architecture</title>
  <meta name="description" content="Interactive architecture diagram for ${displayName}, generated by OpenLens Archy.">
  <meta name="generator" content="OpenLens Archy">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    /* â”€â”€â”€ Design Tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    :root {
      --bg: #03100a; --surface: #071a0f; --surface2: #0d2418; --border: rgba(131,153,88,0.18);
      --border-strong: rgba(131,153,88,0.45); --accent: #7fb069; --accent2: #4caf8a;
      --text: #f7f4d5; --text-sub: rgba(247,244,213,0.65); --text-muted: rgba(247,244,213,0.38);
      --emerald: #10b981; --gold: #f59e0b; --rose: #f43f5e; --sky: #38bdf8; --violet: #8b5cf6;
      --layer-frontend: #38bdf8; --layer-backend: #10b981; --layer-database: #a855f7;
      --layer-security: #f43f5e; --layer-external: #94a3b8; --layer-ai: #f59e0b;
      --radius: 8px; --radius-lg: 14px; --font: 'Plus Jakarta Sans', sans-serif;
      --mono: 'JetBrains Mono', monospace; --shadow: 0 8px 32px rgba(0,0,0,0.55);
      --sidebar-w: 280px; --header-h: 52px;
    }
    [data-theme="light"] {
      --bg: #f4f1e4; --surface: #ffffff; --surface2: #f0ede0; --border: rgba(10,51,35,0.15);
      --border-strong: rgba(10,51,35,0.4); --accent: #2d7a4f; --accent2: #1a6b40;
      --text: #0a2117; --text-sub: rgba(10,33,23,0.65); --text-muted: rgba(10,33,23,0.38);
    }

    /* â”€â”€â”€ Reset & Base â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; overflow: hidden; font-family: var(--font); background: var(--bg); color: var(--text); }

    /* â”€â”€â”€ Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    #app { display: flex; flex-direction: column; height: 100vh; }
    #topbar { height: var(--header-h); background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; padding: 0 16px; z-index: 50; flex-shrink: 0; }
    #main { display: flex; flex: 1; overflow: hidden; }
    #sidebar { width: var(--sidebar-w); background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; transition: width 0.25s ease; }
    #sidebar.collapsed { width: 0; }
    #canvas-area { flex: 1; position: relative; overflow: hidden; background-image: radial-gradient(circle, var(--border) 1px, transparent 1px); background-size: 24px 24px; cursor: grab; }
    #canvas-area.grabbing { cursor: grabbing; }

    /* â”€â”€â”€ Topbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    .brand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 0.9rem; text-decoration: none; color: var(--text); }
    .brand-dot { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, var(--accent), var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .brand-sub { color: var(--accent); }
    .tb-divider { width: 1px; height: 22px; background: var(--border); flex-shrink: 0; }
    .tb-title { font-size: 0.8rem; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
    .tb-meta { font-size: 0.68rem; color: var(--text-muted); font-family: var(--mono); white-space: nowrap; }
    .tb-spacer { flex: 1; }
    .tb-btn { height: 30px; padding: 0 12px; border-radius: 20px; border: 1px solid var(--border); background: transparent; color: var(--text-sub); font-family: var(--font); font-size: 0.7rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.15s; white-space: nowrap; }
    .tb-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(127,176,105,0.08); }
    .tb-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(127,176,105,0.12); }
    #search-input { height: 30px; padding: 0 12px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface2); color: var(--text); font-family: var(--font); font-size: 0.72rem; width: 180px; outline: none; transition: border-color 0.15s; }
    #search-input:focus { border-color: var(--accent); }
    #search-input::placeholder { color: var(--text-muted); }

    /* â”€â”€â”€ Sidebar Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    .sidebar-tabs { display: flex; border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .sb-tab { flex: 1; padding: 9px 4px; text-align: center; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; }
    .sb-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
    .sb-tab:hover:not(.active) { color: var(--text-sub); }
    .sidebar-panel { flex: 1; overflow-y: auto; padding: 12px; display: none; }
    .sidebar-panel.active { display: block; }
    .sidebar-panel::-webkit-scrollbar { width: 4px; } .sidebar-panel::-webkit-scrollbar-track { background: transparent; } .sidebar-panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

    /* â”€â”€â”€ Sidebar Widgets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    .sb-section-label { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 8px; margin-top: 14px; }
    .sb-section-label:first-child { margin-top: 0; }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 4px; }
    .stat-card { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px; text-align: center; }
    .stat-num { font-size: 1.4rem; font-weight: 800; color: var(--accent); font-family: var(--mono); }
    .stat-label { font-size: 0.58rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
    .tech-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border); background: var(--surface2); font-size: 0.62rem; font-weight: 600; color: var(--text-sub); margin: 2px; font-family: var(--mono); }
    .node-list-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; cursor: pointer; transition: background 0.12s; font-size: 0.72rem; }
    .node-list-item:hover { background: var(--surface2); }
    .node-list-item.highlighted { background: rgba(127,176,105,0.12); color: var(--accent); }
    .node-list-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .rule-item { padding: 7px 8px; border-radius: 6px; border: 1px solid var(--border); margin-bottom: 5px; font-size: 0.68rem; }
    .rule-id { font-family: var(--mono); color: var(--accent); font-weight: 600; font-size: 0.6rem; }
    .rule-desc { color: var(--text-sub); margin-top: 2px; line-height: 1.4; }
    .sev-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
    .sev-dot.error { background: var(--rose); } .sev-dot.high { background: var(--gold); } .sev-dot.medium { background: var(--sky); } .sev-dot.low { background: var(--emerald); }
    .adr-item { padding: 8px; border-radius: 6px; border: 1px solid var(--border); margin-bottom: 6px; cursor: pointer; transition: border-color 0.15s; }
    .adr-item:hover { border-color: var(--accent); }
    .adr-id { font-family: var(--mono); font-size: 0.6rem; color: var(--accent); font-weight: 700; }
    .adr-title { font-size: 0.72rem; font-weight: 600; margin-top: 2px; color: var(--text); }
    .adr-status { font-size: 0.6rem; color: var(--text-muted); }
    .pattern-item { padding: 7px 8px; border-radius: 6px; border: 1px solid var(--border); margin-bottom: 5px; }
    .pattern-name { font-weight: 700; font-size: 0.7rem; color: var(--text); }
    .pattern-files { font-size: 0.6rem; color: var(--text-muted); font-family: var(--mono); margin-top: 2px; }

    /* â”€â”€â”€ Canvas Elements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    #canvas { position: absolute; top: 0; left: 0; transform-origin: 0 0; will-change: transform; }
    .boundary-el { position: absolute; border-radius: 12px; border-width: 1.5px; border-style: dashed; pointer-events: none; transition: opacity 0.2s; }
    .boundary-label-pill { position: absolute; top: -10px; left: 12px; padding: 2px 10px; border-radius: 6px; font-size: 0.62rem; font-weight: 800; font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.06em; background: var(--bg); border-width: 1px; border-style: solid; }
    .node-card { position: absolute; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface); padding: 0; overflow: hidden; cursor: pointer; transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s; box-shadow: 0 2px 12px rgba(0,0,0,0.4); }
    .node-card:hover { border-color: var(--accent); box-shadow: var(--shadow), 0 0 0 1px var(--accent); transform: translateY(-1px); }
    .node-card.selected { border-color: var(--accent); box-shadow: var(--shadow), 0 0 0 2px var(--accent); }
    .node-card.dimmed { opacity: 0.25; }
    .node-card.highlighted { opacity: 1 !important; }
    .node-stripe { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: var(--radius) 0 0 var(--radius); }
    .node-body { padding: 9px 12px 9px 16px; }
    .node-icon { font-size: 0.7rem; color: var(--text-muted); font-family: var(--mono); margin-bottom: 2px; }
    .node-label { font-weight: 700; font-size: 0.78rem; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px; }
    .node-sub { font-size: 0.62rem; color: var(--text-muted); font-family: var(--mono); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px; }
    .node-tags { display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap; }
    .node-tag { font-size: 0.55rem; font-weight: 700; padding: 1px 5px; border-radius: 3px; font-family: var(--mono); text-transform: uppercase; }
    svg#connections-svg { position: absolute; top: 0; left: 0; pointer-events: none; overflow: visible; }

    /* â”€â”€â”€ Inspector Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    #inspector { position: absolute; right: 16px; top: 16px; width: 300px; background: var(--surface); border: 1px solid var(--border-strong); border-radius: var(--radius-lg); box-shadow: var(--shadow); z-index: 30; transform: translateX(320px); transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; }
    #inspector.open { transform: translateX(0); }
    .inspector-header { padding: 14px 16px 10px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .inspector-title { font-weight: 800; font-size: 0.85rem; color: var(--text); }
    .inspector-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem; line-height: 1; padding: 0; }
    .inspector-close:hover { color: var(--text); }
    .inspector-body { padding: 14px 16px; overflow-y: auto; max-height: 70vh; }
    .inspector-body::-webkit-scrollbar { width: 4px; } .inspector-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
    .ins-row { display: flex; justify-content: space-between; align-items: baseline; padding: 5px 0; border-bottom: 1px solid var(--border); font-size: 0.7rem; }
    .ins-row:last-child { border-bottom: none; }
    .ins-key { color: var(--text-muted); }
    .ins-val { color: var(--text); font-family: var(--mono); font-size: 0.65rem; font-weight: 600; text-align: right; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ins-section { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: var(--accent); margin: 12px 0 6px; }
    .ins-dep-list { display: flex; flex-wrap: wrap; gap: 4px; }
    .ins-dep { font-size: 0.6rem; font-family: var(--mono); padding: 2px 6px; border-radius: 4px; background: var(--surface2); border: 1px solid var(--border); color: var(--text-sub); }

    /* â”€â”€â”€ Bottom Info Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    #infobar { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); background: var(--surface); border: 1px solid var(--border); border-radius: 30px; padding: 7px 18px; font-size: 0.68rem; color: var(--text-muted); z-index: 20; display: flex; gap: 14px; align-items: center; box-shadow: 0 4px 20px rgba(0,0,0,0.4); font-family: var(--mono); white-space: nowrap; }
    #infobar span { display: flex; align-items: center; gap: 5px; }

    /* â”€â”€â”€ Zoom Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    #zoom-controls { position: absolute; bottom: 60px; right: 16px; display: flex; flex-direction: column; gap: 4px; z-index: 20; }
    .zoom-btn { width: 32px; height: 32px; border-radius: 8px; background: var(--surface); border: 1px solid var(--border); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700; transition: all 0.15s; }
    .zoom-btn:hover { border-color: var(--accent); color: var(--accent); }
    #zoom-label { width: 32px; height: 28px; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.58rem; font-family: var(--mono); font-weight: 700; color: var(--text-sub); }

    /* â”€â”€â”€ ADR Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    #adr-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; display: none; align-items: center; justify-content: center; padding: 20px; }
    #adr-modal.open { display: flex; }
    .adr-modal-card { background: var(--surface); border: 1px solid var(--border-strong); border-radius: var(--radius-lg); max-width: 620px; width: 100%; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 24px 80px rgba(0,0,0,0.7); }
    .adr-modal-header { padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .adr-modal-body { padding: 18px 20px; overflow-y: auto; flex: 1; }
    .adr-modal-body::-webkit-scrollbar { width: 4px; } .adr-modal-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
    .adr-full-section { margin-bottom: 14px; }
    .adr-full-label { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; color: var(--accent); margin-bottom: 4px; letter-spacing: 0.06em; }
    .adr-full-content { font-size: 0.78rem; color: var(--text-sub); line-height: 1.6; }

    /* â”€â”€â”€ Scrollbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    ::-webkit-scrollbar { width: 5px; height: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    /* â”€â”€â”€ Animations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    .node-card { animation: fadeIn 0.3s ease backwards; }

    /* â”€â”€â”€ Responsive: hide sidebar on small screens â”€â”€â”€â”€â”€ */
    @media (max-width: 768px) { #sidebar { display: none; } }
  </style>
</head>
<body data-theme="dark">
<div id="app">

  <!-- â”€â”€ TOPBAR â”€â”€ -->
  <div id="topbar">
    <div class="brand">
      <div class="brand-dot">ðŸ”</div>
      <span>OpenLens <span class="brand-sub">Archy</span></span>
    </div>
    <div class="tb-divider"></div>
    <div>
      <div class="tb-title">${displayName}</div>
      <div class="tb-meta">${nodeCount} components Â· ${boundaryCount} boundaries Â· Generated ${generatedAt}</div>
    </div>
    <div class="tb-divider"></div>
    <input id="search-input" type="text" placeholder="ðŸ” Search componentsâ€¦">
    <div class="tb-spacer"></div>
    <button class="tb-btn" id="toggle-sidebar-btn">â˜° Sidebar</button>
    <button class="tb-btn" id="fit-btn">â›¶ Fit</button>
    <button class="tb-btn" id="theme-btn">ðŸŒ“ Theme</button>
  </div>

  <!-- â”€â”€ MAIN â”€â”€ -->
  <div id="main">

    <!-- â”€â”€ SIDEBAR â”€â”€ -->
    <div id="sidebar">
      <div class="sidebar-tabs">
        <div class="sb-tab active" data-panel="overview">Overview</div>
        <div class="sb-tab" data-panel="nodes">Nodes</div>
        <div class="sb-tab" data-panel="stack">Stack</div>
        <div class="sb-tab" data-panel="adrs">ADRs</div>
      </div>

      <!-- OVERVIEW PANEL -->
      <div class="sidebar-panel active" id="panel-overview">
        <div class="sb-section-label">Project Stats</div>
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-num">${nodeCount}</div><div class="stat-label">Components</div></div>
          <div class="stat-card"><div class="stat-num">${connCount}</div><div class="stat-label">Connections</div></div>
          <div class="stat-card"><div class="stat-num">${boundaryCount}</div><div class="stat-label">Boundaries</div></div>
          <div class="stat-card"><div class="stat-num">${filesScanned}</div><div class="stat-label">Files Scanned</div></div>
        </div>
        <div class="sb-section-label">Layer Legend</div>
        <div id="legend-overview"></div>
        <div class="sb-section-label">Design Patterns (${patterns.length})</div>
        <div id="patterns-list"></div>
        <div class="sb-section-label">Architecture Rules (${rules.length})</div>
        <div id="rules-list"></div>
      </div>

      <!-- NODES PANEL -->
      <div class="sidebar-panel" id="panel-nodes">
        <div class="sb-section-label">All Components</div>
        <div id="nodes-list"></div>
      </div>

      <!-- STACK PANEL -->
      <div class="sidebar-panel" id="panel-stack">
        <div class="sb-section-label">Detected Tech Stack</div>
        <div id="tech-stack-list"></div>
      </div>

      <!-- ADRs PANEL -->
      <div class="sidebar-panel" id="panel-adrs">
        <div class="sb-section-label">Architecture Decision Records</div>
        <div id="adrs-list"></div>
      </div>
    </div>

    <!-- â”€â”€ CANVAS AREA â”€â”€ -->
    <div id="canvas-area">
      <div id="canvas">
        <svg id="connections-svg" width="5000" height="4000"></svg>
        <div id="boundaries-layer"></div>
        <div id="nodes-layer"></div>
      </div>

      <!-- Inspector Panel -->
      <div id="inspector">
        <div class="inspector-header">
          <div class="inspector-title" id="inspector-title">Component</div>
          <button class="inspector-close" id="inspector-close">âœ•</button>
        </div>
        <div class="inspector-body" id="inspector-body"></div>
      </div>

      <!-- Info Bar -->
      <div id="infobar">
        <span>ðŸ–±ï¸ Drag to Pan Â· Scroll to Zoom</span>
        <span>|</span>
        <span>âŒ¨ï¸ F = Fit Â· Esc = Deselect</span>
        <span>|</span>
        <span id="zoom-info">100%</span>
        <span>|</span>
        <span style="color:var(--accent)">âœ“ ${displayName} Architecture</span>
      </div>

      <!-- Zoom Controls -->
      <div id="zoom-controls">
        <button class="zoom-btn" id="zoom-in">+</button>
        <div id="zoom-label">100%</div>
        <button class="zoom-btn" id="zoom-out">âˆ’</button>
        <button class="zoom-btn" id="zoom-reset" title="Reset view">â†º</button>
      </div>
    </div>
  </div>
</div>

<!-- ADR Modal -->
<div id="adr-modal">
  <div class="adr-modal-card">
    <div class="adr-modal-header">
      <div>
        <div id="adr-modal-id" style="font-size:0.65rem;font-family:var(--mono);color:var(--accent);font-weight:700;margin-bottom:4px;"></div>
        <div id="adr-modal-title" style="font-weight:800;font-size:1rem;color:var(--text);"></div>
      </div>
      <button class="inspector-close" id="adr-modal-close">âœ•</button>
    </div>
    <div class="adr-modal-body">
      <div class="adr-full-section"><div class="adr-full-label">Status</div><div class="adr-full-content" id="adr-modal-status"></div></div>
      <div class="adr-full-section"><div class="adr-full-label">Context & Decision</div><div class="adr-full-content" id="adr-modal-decision"></div></div>
      <div class="adr-full-section"><div class="adr-full-label">Consequences & Trade-offs</div><div class="adr-full-content" id="adr-modal-consequences"></div></div>
    </div>
  </div>
</div>

<script>
// â”€â”€â”€ Embedded Architecture Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MODEL = ${jsonStr};

// â”€â”€â”€ Layer Colour Map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LAYER_COLORS = {
  frontend:'#38bdf8', backend:'#10b981', database:'#a855f7',
  security:'#f43f5e', external:'#94a3b8', ai:'#f59e0b', ml:'#f59e0b',
  middleware:'#fb923c', cache:'#e879f9', messaging:'#34d399'
};
const LAYER_ICONS = {
  frontend:'ðŸŒ', backend:'âš™ï¸', database:'ðŸ—„ï¸', security:'ðŸ›¡ï¸',
  external:'ðŸŒ', ai:'ðŸ¤–', ml:'ðŸ¤–', middleware:'ðŸ”€', cache:'âš¡', messaging:'ðŸ“¨'
};

// â”€â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let scale = 0.72, panX = 60, panY = 40;
let isDragging = false, startMouseX = 0, startMouseY = 0, startPanX = 0, startPanY = 0;
let selectedNodeId = null;
let searchQuery = '';

// â”€â”€â”€ DOM Refs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const canvas = document.getElementById('canvas');
const canvasArea = document.getElementById('canvas-area');
const boundariesLayer = document.getElementById('boundaries-layer');
const nodesLayer = document.getElementById('nodes-layer');
const svgEl = document.getElementById('connections-svg');
const inspector = document.getElementById('inspector');
const inspectorTitle = document.getElementById('inspector-title');
const inspectorBody = document.getElementById('inspector-body');
const zoomLabel = document.getElementById('zoom-label');
const zoomInfo = document.getElementById('zoom-info');

// â”€â”€â”€ Transform â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function applyTransform() {
  canvas.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${scale})\`;
  const pct = Math.round(scale * 100) + '%';
  zoomLabel.textContent = pct;
  zoomInfo.textContent = pct;
}

// â”€â”€â”€ Pan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
canvasArea.addEventListener('mousedown', e => {
  if (e.target.closest('.node-card') || e.target.closest('#inspector')) return;
  isDragging = true;
  startMouseX = e.clientX; startMouseY = e.clientY;
  startPanX = panX; startPanY = panY;
  canvasArea.classList.add('grabbing');
});
window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  panX = startPanX + e.clientX - startMouseX;
  panY = startPanY + e.clientY - startMouseY;
  applyTransform();
});
window.addEventListener('mouseup', () => { isDragging = false; canvasArea.classList.remove('grabbing'); });

// Touch pan
let touchStartX = 0, touchStartY = 0;
canvasArea.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX - panX;
  touchStartY = e.touches[0].clientY - panY;
}, { passive: true });
canvasArea.addEventListener('touchmove', e => {
  panX = e.touches[0].clientX - touchStartX;
  panY = e.touches[0].clientY - touchStartY;
  applyTransform();
}, { passive: true });

// â”€â”€â”€ Zoom â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
canvasArea.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = canvasArea.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const prevScale = scale;
  const factor = e.deltaY < 0 ? 1.12 : 0.89;
  scale = Math.min(3, Math.max(0.2, scale * factor));
  panX = mouseX - (mouseX - panX) * (scale / prevScale);
  panY = mouseY - (mouseY - panY) * (scale / prevScale);
  applyTransform();
}, { passive: false });

document.getElementById('zoom-in').addEventListener('click', () => { scale = Math.min(3, scale * 1.15); applyTransform(); });
document.getElementById('zoom-out').addEventListener('click', () => { scale = Math.max(0.2, scale * 0.87); applyTransform(); });
document.getElementById('zoom-reset').addEventListener('click', () => { scale = 0.72; panX = 60; panY = 40; applyTransform(); });
document.getElementById('fit-btn').addEventListener('click', fitToScreen);
function fitToScreen() {
  if (!MODEL.nodes || MODEL.nodes.length === 0) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  MODEL.nodes.forEach(n => {
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + (n.width || 230)); maxY = Math.max(maxY, n.y + (n.height || 70));
  });
  const vw = canvasArea.clientWidth, vh = canvasArea.clientHeight;
  const pad = 60;
  const scaleX = (vw - pad * 2) / (maxX - minX);
  const scaleY = (vh - pad * 2) / (maxY - minY);
  scale = Math.min(scaleX, scaleY, 1.4);
  panX = pad - minX * scale;
  panY = pad - minY * scale;
  applyTransform();
}

// â”€â”€â”€ Theme â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('theme-btn').addEventListener('click', () => {
  const cur = document.body.getAttribute('data-theme');
  document.body.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
});

// â”€â”€â”€ Sidebar Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.querySelectorAll('.sb-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.sb-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.panel)?.classList.add('active');
  });
});

// â”€â”€â”€ Sidebar Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('toggle-sidebar-btn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

// â”€â”€â”€ Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('search-input').addEventListener('input', e => {
  searchQuery = e.target.value.trim().toLowerCase();
  applySearch();
});
function applySearch() {
  const cards = nodesLayer.querySelectorAll('.node-card');
  cards.forEach(card => {
    if (!searchQuery) {
      card.classList.remove('dimmed', 'highlighted');
    } else {
      const label = (card.dataset.label || '').toLowerCase();
      const file = (card.dataset.file || '').toLowerCase();
      const subsystem = (card.dataset.subsystem || '').toLowerCase();
      const match = label.includes(searchQuery) || file.includes(searchQuery) || subsystem.includes(searchQuery);
      card.classList.toggle('dimmed', !match);
      card.classList.toggle('highlighted', match);
    }
  });
  // Also highlight in node list
  document.querySelectorAll('.node-list-item').forEach(item => {
    if (!searchQuery) { item.classList.remove('highlighted'); return; }
    const txt = item.textContent.toLowerCase();
    item.classList.toggle('highlighted', txt.includes(searchQuery));
  });
}

// â”€â”€â”€ Inspector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openInspector(node) {
  selectedNodeId = node.id;
  document.querySelectorAll('.node-card').forEach(c => c.classList.toggle('selected', c.dataset.id === node.id));
  inspectorTitle.textContent = node.label || node.id;

  const layerColor = LAYER_COLORS[node.layer] || '#7fb069';
  const deps = (node.dependencies || node.imports || []).slice(0, 12);

  inspectorBody.innerHTML = \`
    <div class="ins-row"><span class="ins-key">Layer</span><span class="ins-val" style="color:\${layerColor}">\${node.layer || 'â€”'}</span></div>
    <div class="ins-row"><span class="ins-key">Subsystem</span><span class="ins-val">\${node.subsystem || 'â€”'}</span></div>
    <div class="ins-row"><span class="ins-key">File</span><span class="ins-val">\${node.file || 'â€”'}</span></div>
    <div class="ins-row"><span class="ins-key">Lines</span><span class="ins-val">\${node.lines ? node.lines + ' lines' : 'â€”'}</span></div>
    <div class="ins-row"><span class="ins-key">Classes</span><span class="ins-val">\${(node.classes || []).length > 0 ? (node.classes || []).join(', ') : 'â€”'}</span></div>
    <div class="ins-row"><span class="ins-key">Functions</span><span class="ins-val">\${(node.functions || node.methods || []).length > 0 ? (node.functions || node.methods || []).length + ' defined' : 'â€”'}</span></div>
    \${deps.length > 0 ? \`
      <div class="ins-section">Imports / Dependencies</div>
      <div class="ins-dep-list">\${deps.map(d => \`<span class="ins-dep">\${d}</span>\`).join('')}</div>
    \` : ''}
    \${node.complexity_score ? \`<div class="ins-row"><span class="ins-key">Complexity Score</span><span class="ins-val" style="color:var(--gold)">\${node.complexity_score}</span></div>\` : ''}
    \${node.description ? \`<div class="ins-section">Description</div><div style="font-size:0.72rem;color:var(--text-sub);line-height:1.55;">\${node.description}</div>\` : ''}
  \`;
  inspector.classList.add('open');
}

function closeInspector() {
  inspector.classList.remove('open');
  selectedNodeId = null;
  document.querySelectorAll('.node-card').forEach(c => c.classList.remove('selected'));
}

document.getElementById('inspector-close').addEventListener('click', closeInspector);

// â”€â”€â”€ Keyboard Shortcuts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeInspector(); searchQuery = ''; document.getElementById('search-input').value = ''; applySearch(); }
  if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey) fitToScreen();
  if (e.key === '+' || e.key === '=') { scale = Math.min(3, scale * 1.12); applyTransform(); }
  if (e.key === '-') { scale = Math.max(0.2, scale * 0.89); applyTransform(); }
});

// â”€â”€â”€ Render Boundaries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderBoundaries() {
  (MODEL.boundaries || []).forEach(b => {
    const el = document.createElement('div');
    el.className = 'boundary-el';
    el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
    el.style.width = b.width + 'px'; el.style.height = b.height + 'px';
    const color = b.color || '#7fb069';
    el.style.borderColor = color;
    el.style.backgroundColor = color + '08';

    const labelEl = document.createElement('div');
    labelEl.className = 'boundary-label-pill';
    labelEl.textContent = b.label || b.name || '';
    labelEl.style.color = color;
    labelEl.style.borderColor = color;
    el.appendChild(labelEl);
    boundariesLayer.appendChild(el);
  });
}

// â”€â”€â”€ Render Nodes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const nodeMap = {};
function renderNodes() {
  (MODEL.nodes || []).forEach((n, i) => {
    nodeMap[n.id] = n;
    const layerColor = LAYER_COLORS[n.layer] || '#7fb069';
    const w = n.width || 230;
    const h = n.height || 70;

    const card = document.createElement('div');
    card.className = 'node-card';
    card.dataset.id = n.id;
    card.dataset.label = n.label || '';
    card.dataset.file = n.file || '';
    card.dataset.subsystem = n.subsystem || '';
    card.style.left = n.x + 'px'; card.style.top = n.y + 'px';
    card.style.width = w + 'px'; card.style.minHeight = h + 'px';
    card.style.animationDelay = (i * 18) + 'ms';

    const layerTag = n.layer ? \`<span class="node-tag" style="background:\${layerColor}22;color:\${layerColor};border:1px solid \${layerColor}44">\${LAYER_ICONS[n.layer] || ''} \${n.layer}</span>\` : '';
    const lines = (MODEL.nodes || []).find(x => x.id === n.id)?.lines;
    const linesTag = lines ? \`<span class="node-tag" style="background:rgba(255,255,255,0.05);color:var(--text-muted);border:1px solid var(--border)">\${lines}L</span>\` : '';

    card.innerHTML = \`
      <div class="node-stripe" style="background:\${layerColor}"></div>
      <div class="node-body">
        <div class="node-icon">&lt;&gt; \${n.type || 'module'}</div>
        <div class="node-label">\${n.label || n.id}</div>
        <div class="node-sub">\${n.file || n.subsystem || ''}</div>
        <div class="node-tags">\${layerTag}\${linesTag}</div>
      </div>
    \`;
    card.addEventListener('click', () => openInspector(n));
    nodesLayer.appendChild(card);
  });
}

// â”€â”€â”€ Render Connections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderConnections() {
  svgEl.innerHTML = '';
  // Arrow marker
  svgEl.innerHTML = \`
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L8,3 z" fill="#7fb069" opacity="0.7"/>
      </marker>
      <marker id="arrow-dim" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" opacity="0.3"/>
      </marker>
    </defs>
  \`;

  (MODEL.connections || []).forEach(conn => {
    const from = nodeMap[conn.from];
    const to = nodeMap[conn.to];
    if (!from || !to) return;

    const x1 = from.x + (from.width || 230);
    const y1 = from.y + (from.height || 70) / 2;
    const x2 = to.x;
    const y2 = to.y + (to.height || 70) / 2;
    const cx1 = x1 + Math.abs(x2 - x1) * 0.4;
    const cx2 = x2 - Math.abs(x2 - x1) * 0.4;

    const color = conn.color || '#7fb069';
    const isDashed = conn.style === 'dashed';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', \`M \${x1} \${y1} C \${cx1} \${y1}, \${cx2} \${y2}, \${x2} \${y2}\`);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', '0.55');
    path.setAttribute('marker-end', 'url(#arrow)');
    if (isDashed) path.setAttribute('stroke-dasharray', '5,4');
    svgEl.appendChild(path);

    // Connection label
    if (conn.label) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textEl.setAttribute('x', midX); textEl.setAttribute('y', midY + 4);
      textEl.setAttribute('text-anchor', 'middle');
      textEl.setAttribute('font-size', '9');
      textEl.setAttribute('font-family', 'JetBrains Mono, monospace');
      textEl.setAttribute('fill', color);
      textEl.setAttribute('opacity', '0.75');
      textEl.textContent = conn.label;
      svgEl.appendChild(textEl);
    }
  });
}

// â”€â”€â”€ Render Sidebar Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderSidebar() {
  // Legend
  const layersPresent = [...new Set((MODEL.nodes || []).map(n => n.layer).filter(Boolean))];
  document.getElementById('legend-overview').innerHTML = layersPresent.map(l =>
    \`<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:0.7rem;">
      <span style="width:10px;height:10px;border-radius:50%;background:\${LAYER_COLORS[l]||'#7fb069'};flex-shrink:0;display:inline-block"></span>
      <span style="color:var(--text-sub)">\${LAYER_ICONS[l] || ''} \${l.charAt(0).toUpperCase() + l.slice(1)}</span>
      <span style="margin-left:auto;font-size:0.6rem;color:var(--text-muted);font-family:var(--mono)">\${(MODEL.nodes||[]).filter(n=>n.layer===l).length}</span>
    </div>\`
  ).join('');

  // Patterns
  const patternsList = document.getElementById('patterns-list');
  if ((MODEL.patterns || []).length === 0) {
    patternsList.innerHTML = '<div style="font-size:0.68rem;color:var(--text-muted)">None detected</div>';
  } else {
    patternsList.innerHTML = (MODEL.patterns || []).map(p => \`
      <div class="pattern-item">
        <div class="pattern-name">\${p.name || p}</div>
        \${p.files ? \`<div class="pattern-files">\${(p.files||[]).slice(0,3).join(', ')}</div>\` : ''}
      </div>
    \`).join('');
  }

  // Rules
  const rulesList = document.getElementById('rules-list');
  if ((MODEL.rules || []).length === 0) {
    rulesList.innerHTML = '<div style="font-size:0.68rem;color:var(--text-muted)">No rules defined</div>';
  } else {
    rulesList.innerHTML = (MODEL.rules || []).slice(0, 8).map(r => \`
      <div class="rule-item">
        <div class="rule-id"><span class="sev-dot \${r.severity||'low'}"></span>\${r.rule_id || ''}</div>
        <div class="rule-desc">\${r.description || ''}</div>
      </div>
    \`).join('');
  }

  // Nodes List
  document.getElementById('nodes-list').innerHTML = (MODEL.nodes || []).map(n => {
    const color = LAYER_COLORS[n.layer] || '#7fb069';
    return \`
      <div class="node-list-item" onclick="scrollToNode('\${n.id}')">
        <span class="node-list-dot" style="background:\${color}"></span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${n.label || n.id}</span>
        <span style="font-size:0.6rem;color:var(--text-muted);font-family:var(--mono);margin-left:auto;flex-shrink:0">\${n.layer || ''}</span>
      </div>
    \`;
  }).join('');

  // Tech Stack
  document.getElementById('tech-stack-list').innerHTML = (MODEL.tech_stack || []).length === 0
    ? '<div style="font-size:0.68rem;color:var(--text-muted)">Not detected</div>'
    : '<div style="display:flex;flex-wrap:wrap;gap:4px;">' + (MODEL.tech_stack || []).map(t =>
        \`<span class="tech-tag">\${typeof t === 'string' ? t : (t.name || JSON.stringify(t))}</span>\`
      ).join('') + '</div>';

  // ADRs
  document.getElementById('adrs-list').innerHTML = (MODEL.adrs || []).length === 0
    ? '<div style="font-size:0.68rem;color:var(--text-muted)">No ADRs recorded</div>'
    : (MODEL.adrs || []).map((adr, i) => \`
        <div class="adr-item" onclick="openAdrModal(\${i})">
          <div class="adr-id">\${adr.id || ('ADR-' + (i+1))}</div>
          <div class="adr-title">\${adr.title || 'Untitled'}</div>
          <div class="adr-status">\${adr.status || ''} Â· \${adr.date || ''}</div>
        </div>
      \`).join('');
}

// â”€â”€â”€ Scroll to Node â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function scrollToNode(id) {
  const n = nodeMap[id];
  if (!n) return;
  const vw = canvasArea.clientWidth, vh = canvasArea.clientHeight;
  panX = vw / 2 - (n.x + (n.width || 230) / 2) * scale;
  panY = vh / 2 - (n.y + (n.height || 70) / 2) * scale;
  applyTransform();
  openInspector(n);
  // Switch to nodes panel
  document.querySelectorAll('.sb-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-panel="nodes"]')?.classList.add('active');
  document.getElementById('panel-nodes')?.classList.add('active');
}

// â”€â”€â”€ ADR Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openAdrModal(idx) {
  const adr = (MODEL.adrs || [])[idx];
  if (!adr) return;
  document.getElementById('adr-modal-id').textContent = adr.id || ('ADR-' + (idx+1));
  document.getElementById('adr-modal-title').textContent = adr.title || 'Untitled';
  document.getElementById('adr-modal-status').textContent = adr.status || 'â€”';
  document.getElementById('adr-modal-decision').textContent = adr.decision || 'â€”';
  document.getElementById('adr-modal-consequences').textContent = adr.consequences || 'â€”';
  document.getElementById('adr-modal').classList.add('open');
}
document.getElementById('adr-modal-close').addEventListener('click', () => document.getElementById('adr-modal').classList.remove('open'));
document.getElementById('adr-modal').addEventListener('click', e => { if (e.target === document.getElementById('adr-modal')) e.target.classList.remove('open'); });

// â”€â”€â”€ Boot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
renderBoundaries();
renderNodes();
renderConnections();
renderSidebar();
applyTransform();
</script>
</body>
</html>`;

    const slug = `${projectName}-archy.html`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = slug;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    this.app.showToast(`✓ ${slug} generated — open it in any browser, offline!`);
  }

  // Legacy alias kept for backward compatibility
  exportStandaloneHTML() {
    this.generateArchyHTML();
  }
}
