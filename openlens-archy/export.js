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
}
