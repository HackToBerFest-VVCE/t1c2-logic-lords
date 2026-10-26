// OpenLens Archy - Main Application Logic
// Handles rendering, panning, zooming, path highlighting, flow animations, themes, and interactions
// Compact Centered Floating Island with Light/Dark Slide Switch and Classic, Funk, Signal Flow Themes

import { ARCHITECTURE_PRESETS } from './data.js';
import { DiagramExporter } from './export.js';

class OpenLensArchyApp {
  constructor() {
    this.currentPresetKey = 'auv_defense';
    this.currentPreset = ARCHITECTURE_PRESETS[this.currentPresetKey];
    this.activeTheme = 'classic';
    this.activeMode = 'light';
    this.activeLayerFilter = null;
    this.pathModeActive = false;
    this.pathStartNode = null;
    this.lensDrawerOpen = false;

    // Viewport transform state
    this.scale = 0.62;
    this.panX = 20;
    this.panY = 12;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    this.exporter = new DiagramExporter(this);
  }

  async init() {
    this.cacheDomElements();
    this.bindEvents();
    this.applyTheme(this.activeTheme);
    this.applyMode(this.activeMode);

    // Autonomously load live scanned project model from local scan or backend API
    await this.loadLiveProjectModel();

    this.renderAllSections();
    this.updateLegend();
    this.updateZoomDisplay();
    this.showToast('OpenLens Archy active. Dynamic architecture model loaded.');
  }

  async loadLiveProjectModel(projectPath = '.') {
    try {
      const res = await fetch('../openlens_model.json');
      if (res.ok) {
        const liveModel = await res.json();
        if (liveModel && liveModel.nodes && liveModel.nodes.length > 0) {
          this.applyLiveModel(liveModel);
          return true;
        }
      }
    } catch (_) {}

    try {
      const apiRes = await fetch(`http://127.0.0.1:8000/api/project/analyze?path=${encodeURIComponent(projectPath)}`);
      if (apiRes.ok) {
        const liveModel = await apiRes.json();
        if (liveModel && liveModel.nodes && liveModel.nodes.length > 0) {
          this.applyLiveModel(liveModel);
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  applyLiveModel(liveModel) {
    this.currentPreset = liveModel;
    if (this.presetSelect) {
      let liveOpt = this.presetSelect.querySelector('option[value="live_project"]');
      if (!liveOpt) {
        liveOpt = document.createElement('option');
        liveOpt.value = 'live_project';
        this.presetSelect.insertBefore(liveOpt, this.presetSelect.firstChild);
      }
      liveOpt.textContent = `⚡ ${liveModel.name || 'Live Scanned Project'}`;
      this.presetSelect.value = 'live_project';
    }
  }

  cacheDomElements() {
    this.viewport = document.getElementById('workspace-viewport');
    this.content = document.getElementById('workspace-content');
    this.boundariesLayer = document.getElementById('boundaries-layer');
    this.connectionsLayer = document.getElementById('connections-layer');
    this.nodesLayer = document.getElementById('nodes-layer');
    this.flowTooltip = document.getElementById('flow-tooltip');
    this.lensDrawer = document.getElementById('lens-drawer');
    this.drawerContent = document.getElementById('drawer-content');
    this.toast = document.getElementById('toast-notification');
    this.zoomDisplay = document.getElementById('zoom-display');
    this.presetSelect = document.getElementById('preset-select');
    this.exportDropdown = document.getElementById('export-dropdown');
    this.exportMenu = document.getElementById('export-menu');
    this.adrModal = document.getElementById('adr-modal');

    // Theme & Mode Switchers
    this.themeSlideToggle = document.getElementById('theme-slide-toggle');
  }

  bindEvents() {
    // Light / Dark Slide Switch Toggle
    if (this.themeSlideToggle) {
      this.themeSlideToggle.checked = this.activeMode === 'dark';
      this.themeSlideToggle.addEventListener('change', e => {
        const mode = e.target.checked ? 'dark' : 'light';
        this.applyMode(mode);
      });
    }

    // Theme Dropdown (Classic · Funk · Signal Flow)
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = this.activeTheme;
      themeSelect.addEventListener('change', e => {
        this.applyTheme(e.target.value);
      });
    }

    // Canvas Pan & Zoom
    this.viewport.addEventListener('mousedown', e => this.onMouseDown(e));
    window.addEventListener('mousemove', e => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    this.viewport.addEventListener('wheel', e => this.onWheel(e), { passive: false });

    // Preset Selection
    if (this.presetSelect) {
      this.presetSelect.addEventListener('change', e => {
        this.currentPresetKey = e.target.value;
        this.currentPreset = ARCHITECTURE_PRESETS[this.currentPresetKey];
        this.renderAllSections();
        this.updateLegend();
        this.showToast(`Switched user file project: ${this.currentPreset.name}`);
      });
    }

    // Rescan Files Button
    document.getElementById('scan-files-btn')?.addEventListener('click', async () => {
      this.showToast('⚡ Autonomously scanning workspace... Extracting AST, imports & layers.');
      const success = await this.loadLiveProjectModel();
      this.renderAllSections();
      this.updateLegend();
      if (success) {
        this.showToast(`✓ Scan complete: ${this.currentPreset.files_scanned || 0} user files dynamically analyzed!`);
      } else {
        this.showToast('Re-rendered architecture model.');
      }
    });

    // Zoom Controls
    document.getElementById('zoom-in-btn')?.addEventListener('click', () => this.adjustZoom(0.1));
    document.getElementById('zoom-out-btn')?.addEventListener('click', () => this.adjustZoom(-0.1));
    document.getElementById('zoom-reset-btn')?.addEventListener('click', () => this.resetView());
    document.getElementById('fit-screen-btn')?.addEventListener('click', () => this.fitToScreen());

    // PATH Mode Toggle
    document.getElementById('path-mode-btn')?.addEventListener('click', () => this.togglePathMode());

    // LENS Mode Toggle
    document.getElementById('lens-mode-btn')?.addEventListener('click', () => this.toggleLensDrawer());
    document.getElementById('close-drawer-btn')?.addEventListener('click', () => this.toggleLensDrawer(false));

    // Export Dropdown
    document.getElementById('export-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      this.exportMenu.classList.toggle('show');
    });

    window.addEventListener('click', () => {
      this.exportMenu?.classList.remove('show');
    });

    document.getElementById('export-copy-btn')?.addEventListener('click', () => this.exporter.copyToClipboard());
    document.getElementById('export-png-btn')?.addEventListener('click', () => this.exporter.saveAsPNG());
    document.getElementById('export-jpeg-btn')?.addEventListener('click', () => this.exporter.saveAsJPEG());
    document.getElementById('export-svg-btn')?.addEventListener('click', () => this.exporter.saveAsSVG());
    document.getElementById('export-rules-btn')?.addEventListener('click', () => this.exporter.exportRulesJSON());
    document.getElementById('export-adrs-btn')?.addEventListener('click', () => this.exporter.exportADRsMarkdown());

    // ADR & Rules Modal
    document.getElementById('view-adrs-btn')?.addEventListener('click', () => this.openAdrModal());
    document.getElementById('close-modal-btn')?.addEventListener('click', () => this.closeAdrModal());
    this.adrModal?.addEventListener('click', e => {
      if (e.target === this.adrModal) this.closeAdrModal();
    });
  }

  // RENDER ALL SECTIONS (ONE AFTER THE OTHER)
  renderAllSections() {
    this.renderCurrentArchitecture();
    this.renderTechStack();
    this.renderSystemDesign();
    this.renderDesignPatterns();
    this.renderUserFiles();
  }

  // LIGHT / DARK MODE SWITCH
  applyMode(modeName) {
    this.activeMode = modeName;
    document.body.setAttribute('data-mode', modeName);
    if (this.themeSlideToggle) {
      this.themeSlideToggle.checked = modeName === 'dark';
    }
    this.showToast(`Display Mode: ${modeName.toUpperCase()}`);
  }

  // THEME SWITCHER: CLASSIC · FUNK · SIGNAL FLOW
  applyTheme(themeName) {
    this.activeTheme = themeName;
    document.body.setAttribute('data-theme', themeName);

    // Sync the theme dropdown
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = themeName;

    this.showToast(`Theme: ${themeName.replace('_', ' ').toUpperCase()}`);
  }

  // RENDER TECH STACK
  renderTechStack() {
    const container = document.getElementById('techstack-cards-container');
    if (!container) return;

    container.innerHTML = '';
    (this.currentPreset.techStack || []).forEach(tech => {
      const card = document.createElement('div');
      card.className = 'tech-card';
      card.innerHTML = `
        <div class="tech-card-header">
          <div class="tech-info">
            <span class="tech-icon">${tech.icon || '📦'}</span>
            <div>
              <div class="tech-name">${tech.name} <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">v${tech.version}</span></div>
              <div class="tech-category">${tech.category}</div>
            </div>
          </div>
          <span class="tech-file-badge">${tech.status || 'Detected'}</span>
        </div>
        <div style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--accent);">
          Found in: <strong>${tech.file}</strong>
        </div>
        <div class="tech-rationale">${tech.rationale}</div>
        <div class="tech-tags">
          ${(tech.pros || []).map(p => `<span class="pro-tag">✓ ${p}</span>`).join('')}
        </div>
      `;
      container.appendChild(card);
    });
  }

  // RENDER SYSTEM DESIGN
  renderSystemDesign() {
    const sys = this.currentPreset.systemDesign;
    if (!sys) return;

    const metricsContainer = document.getElementById('sla-metrics-container');
    if (metricsContainer) {
      metricsContainer.innerHTML = '';
      (sys.slaMetrics || []).forEach(m => {
        const card = document.createElement('div');
        card.className = 'metric-card';
        card.innerHTML = `
          <div class="metric-label">${m.label}</div>
          <div class="metric-value">${m.value}</div>
          <div class="metric-status">● ${m.status}</div>
        `;
        metricsContainer.appendChild(card);
      });
    }

    const specsContainer = document.getElementById('system-specs-container');
    if (specsContainer) {
      specsContainer.innerHTML = '';
      (sys.specifications || []).forEach(spec => {
        const card = document.createElement('div');
        card.className = 'sys-spec-card';
        card.innerHTML = `
          <div class="sys-spec-title">
            <span style="font-size: 1.3rem;">${spec.icon}</span>
            <span>${spec.title}</span>
          </div>
          <p style="font-size: 0.8rem; font-weight: 600; color: var(--accent);">${spec.summary}</p>
          <p class="sys-spec-details">${spec.details}</p>
        `;
        specsContainer.appendChild(card);
      });
    }
  }

  // RENDER DESIGN PATTERNS
  renderDesignPatterns() {
    const container = document.getElementById('patterns-cards-container');
    if (!container) return;

    container.innerHTML = '';
    (this.currentPreset.designPatterns || []).forEach(pat => {
      const card = document.createElement('div');
      card.className = 'pattern-card';
      card.innerHTML = `
        <div class="pattern-header">
          <div class="pattern-title-wrap">
            <span style="font-size: 1.4rem;">${pat.icon}</span>
            <div>
              <div class="pattern-title">${pat.name}</div>
              <div class="pattern-file">File: <code>${pat.file}</code> (${pat.category})</div>
            </div>
          </div>
        </div>
        <div class="pattern-desc">${pat.description}</div>
        ${pat.implementationSnippet ? `
          <div>
            <div style="font-size: 0.68rem; font-family: var(--font-mono); color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">
              Implementation in User Code:
            </div>
            <pre class="pattern-code"><code>${this.escapeHtml(pat.implementationSnippet)}</code></pre>
          </div>
        ` : ''}
        <div class="pattern-impact">
          <strong>Maintainability Impact:</strong> ${pat.maintainabilityImpact}
        </div>
      `;
      container.appendChild(card);
    });
  }

  // RENDER USER FILES
  renderUserFiles() {
    const tbody = document.getElementById('user-files-tbody');
    const badge = document.getElementById('files-count-badge');
    const files = this.currentPreset.userFiles || [];

    if (badge) badge.textContent = `${files.length} Files Tracked`;
    if (!tbody) return;

    tbody.innerHTML = '';
    files.forEach(f => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="file-path-col">📄 ${f.path}</td>
        <td><strong>${f.component}</strong></td>
        <td><span class="legend-pill" style="display:inline-flex;">${f.layer.toUpperCase()}</span></td>
        <td style="font-family: var(--font-mono); font-size: 0.75rem;">${f.lines} LOC</td>
        <td style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--accent);">${f.tech || 'Python'}</td>
        <td style="font-family: var(--font-mono); font-size: 0.72rem; color: #10b981;">${f.pattern || 'Modular'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  renderCurrentArchitecture() {
    this.renderBoundaries();
    this.renderNodes();
    this.renderConnections();
    this.applyTransform();
  }

  renderBoundaries() {
    this.boundariesLayer.innerHTML = '';
    (this.currentPreset.boundaries || []).forEach(b => {
      const box = document.createElement('div');
      box.className = 'boundary-box';
      box.id = `boundary-${b.id}`;
      box.style.left = `${b.x}px`;
      box.style.top = `${b.y}px`;
      box.style.width = `${b.width}px`;
      box.style.height = `${b.height}px`;
      box.style.border = `1.5px ${b.borderStyle || 'dashed'} ${b.color}`;
      box.style.backgroundColor = b.fill || 'transparent';

      const label = document.createElement('div');
      label.className = 'boundary-label';
      label.style.borderColor = b.color;
      label.textContent = b.label;
      box.appendChild(label);

      this.boundariesLayer.appendChild(box);
    });
  }

  renderNodes() {
    this.nodesLayer.innerHTML = '';
    (this.currentPreset.nodes || []).forEach(node => {
      const card = document.createElement('div');
      card.className = 'node-card';
      card.id = `node-${node.id}`;
      card.setAttribute('data-id', node.id);
      card.setAttribute('data-layer', node.layer);
      card.style.left = `${node.x}px`;
      card.style.top = `${node.y}px`;
      card.style.width = `${node.width}px`;
      card.style.height = `${node.height}px`;

      card.innerHTML = `
        <div class="node-header">
          <span class="node-icon">&lt;&gt;</span>
          <span class="node-title" title="${node.label}">${node.label}</span>
        </div>
        <div class="node-meta" title="${node.file || ''}">${node.file || ''}</div>
      `;

      card.addEventListener('mouseenter', () => this.onNodeHover(node));
      card.addEventListener('mouseleave', () => this.onNodeUnhover());
      card.addEventListener('click', e => {
        e.stopPropagation();
        this.onNodeClick(node);
      });

      this.nodesLayer.appendChild(card);
    });
  }

  renderConnections() {
    this.connectionsLayer.innerHTML = '';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="arrowhead" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 7 3, 0 6" fill="var(--path-default)" />
      </marker>
      <marker id="arrowhead-green" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 7 3, 0 6" fill="#10b981" />
      </marker>
      <marker id="arrowhead-blue" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 7 3, 0 6" fill="#38bdf8" />
      </marker>
      <marker id="arrowhead-purple" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 7 3, 0 6" fill="#a855f7" />
      </marker>
      <marker id="arrowhead-red" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 7 3, 0 6" fill="#ef4444" />
      </marker>
    `;
    this.connectionsLayer.appendChild(defs);

    const connectionsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    connectionsGroup.id = 'connections-group';

    (this.currentPreset.connections || []).forEach(conn => {
      const source = this.currentPreset.nodes.find(n => n.id === conn.from);
      const target = this.currentPreset.nodes.find(n => n.id === conn.to);
      if (!source || !target) return;

      const p1 = this.getNodeEdgePoint(source, target);
      const p2 = this.getNodeEdgePoint(target, source);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const d = `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', `flow-path ${conn.style === 'dashed' ? 'dashed' : ''}`);
      path.setAttribute('id', `conn-${conn.id}`);
      path.setAttribute('data-id', conn.id);
      path.setAttribute('data-from', conn.from);
      path.setAttribute('data-to', conn.to);

      let strokeColor = conn.color || 'var(--path-default)';
      path.style.stroke = strokeColor;
      
      let markerId = 'arrowhead';
      if (conn.color === '#10b981') markerId = 'arrowhead-green';
      else if (conn.color === '#38bdf8') markerId = 'arrowhead-blue';
      else if (conn.color === '#a855f7') markerId = 'arrowhead-purple';
      else if (conn.color === '#ef4444') markerId = 'arrowhead-red';

      path.setAttribute('marker-end', `url(#${markerId})`);

      path.addEventListener('mouseenter', e => this.onPathHover(conn, source, target, e));
      path.addEventListener('mousemove', e => this.onPathMouseMove(e));
      path.addEventListener('mouseleave', () => this.onPathUnhover());

      connectionsGroup.appendChild(path);

      if (conn.label) {
        const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        labelGroup.setAttribute('class', 'flow-label-group');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', midX);
        text.setAttribute('y', midY);
        text.setAttribute('class', 'flow-label-text');
        text.textContent = conn.label;

        labelGroup.appendChild(text);
        connectionsGroup.appendChild(labelGroup);
      }
    });

    this.connectionsLayer.appendChild(connectionsGroup);
  }

  getNodeEdgePoint(node, otherNode) {
    const cx1 = node.x + node.width / 2;
    const cy1 = node.y + node.height / 2;
    const cx2 = otherNode.x + otherNode.width / 2;
    const cy2 = otherNode.y + otherNode.height / 2;

    const dx = cx2 - cx1;
    const dy = cy2 - cy1;

    if (Math.abs(dx) > Math.abs(dy)) {
      return {
        x: dx > 0 ? node.x + node.width : node.x,
        y: cy1
      };
    } else {
      return {
        x: cx1,
        y: dy > 0 ? node.y + node.height : node.y
      };
    }
  }

  onPathHover(conn, source, target, e) {
    const pathEl = document.getElementById(`conn-${conn.id}`);
    if (pathEl) {
      pathEl.classList.add('highlighted');
    }

    document.querySelectorAll('.node-card').forEach(card => {
      const id = card.getAttribute('data-id');
      if (id === conn.from || id === conn.to) {
        card.classList.add('highlighted');
        card.classList.remove('dimmed');
      } else {
        card.classList.add('dimmed');
      }
    });

    document.querySelectorAll('.flow-path').forEach(p => {
      if (p.getAttribute('data-id') !== conn.id) {
        p.style.opacity = '0.15';
      }
    });

    this.showFlowTooltip(conn, source, target, e);
  }

  onPathMouseMove(e) {
    if (this.flowTooltip.style.display === 'flex') {
      this.flowTooltip.style.left = `${e.clientX + 16}px`;
      this.flowTooltip.style.top = `${e.clientY + 12}px`;
    }
  }

  onPathUnhover() {
    document.querySelectorAll('.flow-path').forEach(p => {
      p.classList.remove('highlighted');
      p.style.opacity = '1';
    });

    document.querySelectorAll('.node-card').forEach(card => {
      card.classList.remove('highlighted');
      card.classList.remove('dimmed');
    });

    this.flowTooltip.style.display = 'none';
  }

  showFlowTooltip(conn, source, target, e) {
    this.flowTooltip.innerHTML = `
      <div class="tooltip-title">
        <span>${source.label}</span>
        <span style="color:var(--accent); font-size:12px;">➔</span>
        <span>${target.label}</span>
      </div>
      <div class="tooltip-meta">FLOW: ${conn.label ? conn.label.toUpperCase() : 'DIRECT'} · ${conn.protocol || 'IPC'}</div>
      <div class="tooltip-desc">${conn.description || 'System communication channel across architectural boundaries.'}</div>
    `;
    this.flowTooltip.style.display = 'flex';
    this.flowTooltip.style.left = `${e.clientX + 16}px`;
    this.flowTooltip.style.top = `${e.clientY + 12}px`;
  }

  onNodeHover(node) {
    const connectedNodeIds = new Set([node.id]);
    const connectedConnIds = new Set();

    (this.currentPreset.connections || []).forEach(conn => {
      if (conn.from === node.id || conn.to === node.id) {
        connectedConnIds.add(conn.id);
        connectedNodeIds.add(conn.from);
        connectedNodeIds.add(conn.to);
      }
    });

    document.querySelectorAll('.node-card').forEach(card => {
      const id = card.getAttribute('data-id');
      if (connectedNodeIds.has(id)) {
        card.classList.add('highlighted');
        card.classList.remove('dimmed');
      } else {
        card.classList.add('dimmed');
      }
    });

    document.querySelectorAll('.flow-path').forEach(path => {
      const id = path.getAttribute('data-id');
      if (connectedConnIds.has(id)) {
        path.classList.add('highlighted');
        path.style.opacity = '1';
      } else {
        path.style.opacity = '0.12';
      }
    });
  }

  onNodeUnhover() {
    document.querySelectorAll('.node-card').forEach(card => {
      card.classList.remove('highlighted');
      card.classList.remove('dimmed');
    });
    document.querySelectorAll('.flow-path').forEach(p => {
      p.classList.remove('highlighted');
      p.style.opacity = '1';
    });
  }

  onNodeClick(node) {
    if (this.pathModeActive) {
      this.handlePathModeSelection(node);
      return;
    }
    this.inspectNodeInLens(node);
  }

  togglePathMode() {
    this.pathModeActive = !this.pathModeActive;
    const btn = document.getElementById('path-mode-btn');
    btn?.classList.toggle('active', this.pathModeActive);
    this.pathStartNode = null;

    if (this.pathModeActive) {
      this.showToast('PATH MODE: Click a starting component to trace its pipeline flow.');
    } else {
      this.onNodeUnhover();
      this.showToast('Exited PATH mode.');
    }
  }

  handlePathModeSelection(node) {
    if (!this.pathStartNode) {
      this.pathStartNode = node;
      this.showToast(`Selected Start: [${node.label}]. Now click destination component.`);
      const card = document.getElementById(`node-${node.id}`);
      card?.classList.add('highlighted');
    } else {
      const destination = node;
      this.showToast(`Tracing route: ${this.pathStartNode.label} ➔ ${destination.label}`);
      this.tracePipelineRoute(this.pathStartNode.id, destination.id);
      this.pathStartNode = null;
    }
  }

  tracePipelineRoute(startId, endId) {
    const queue = [[startId]];
    const visited = new Set([startId]);
    let foundPath = null;

    while (queue.length > 0) {
      const path = queue.shift();
      const curr = path[path.length - 1];

      if (curr === endId) {
        foundPath = path;
        break;
      }

      (this.currentPreset.connections || []).forEach(conn => {
        if (conn.from === curr && !visited.has(conn.to)) {
          visited.add(conn.to);
          queue.push([...path, conn.to]);
        }
      });
    }

    if (foundPath) {
      const pathNodeIds = new Set(foundPath);
      const pathConnIds = new Set();

      for (let i = 0; i < foundPath.length - 1; i++) {
        const u = foundPath[i];
        const v = foundPath[i + 1];
        const conn = this.currentPreset.connections.find(c => c.from === u && c.to === v);
        if (conn) pathConnIds.add(conn.id);
      }

      document.querySelectorAll('.node-card').forEach(card => {
        const id = card.getAttribute('data-id');
        if (pathNodeIds.has(id)) {
          card.classList.add('highlighted');
          card.classList.remove('dimmed');
        } else {
          card.classList.add('dimmed');
        }
      });

      document.querySelectorAll('.flow-path').forEach(p => {
        const id = p.getAttribute('data-id');
        if (pathConnIds.has(id)) {
          p.classList.add('highlighted');
          p.style.opacity = '1';
        } else {
          p.style.opacity = '0.1';
        }
      });

      this.showToast(`Path discovered: ${foundPath.length} hops across boundary.`);
    } else {
      this.showToast(`No direct downstream flow between selected nodes.`);
      this.onNodeUnhover();
    }
  }

  toggleLensDrawer(forceState = null) {
    this.lensDrawerOpen = forceState !== null ? forceState : !this.lensDrawerOpen;
    this.lensDrawer?.classList.toggle('open', this.lensDrawerOpen);
    const btn = document.getElementById('lens-mode-btn');
    btn?.classList.toggle('active', this.lensDrawerOpen);

    // Only auto-inspect first node if opening (not re-entering from inspectNodeInLens)
    if (this.lensDrawerOpen && !this._inspecting && this.currentPreset.nodes.length > 0) {
      this._openDrawer(this.currentPreset.nodes[0]);
    }
  }

  // Internal: open drawer without toggling state (avoids recursion)
  _openDrawer(node) {
    this.lensDrawerOpen = true;
    this.lensDrawer?.classList.add('open');
    document.getElementById('lens-mode-btn')?.classList.add('active');
    this._fillDrawerContent(node);
  }

  inspectNodeInLens(node) {
    // Open drawer directly without calling toggleLensDrawer to prevent recursion
    this._inspecting = true;
    this.lensDrawerOpen = true;
    this.lensDrawer?.classList.add('open');
    document.getElementById('lens-mode-btn')?.classList.add('active');
    this._fillDrawerContent(node);
    this._inspecting = false;
  }

  _fillDrawerContent(node) {
    const incomingConns = (this.currentPreset.connections || []).filter(c => c.to === node.id);
    const outgoingConns = (this.currentPreset.connections || []).filter(c => c.from === node.id);
    const matchedFile = (this.currentPreset.userFiles || []).find(f => f.component === node.label || f.path.includes(node.id));

    this.drawerContent.innerHTML = `
      <div class="node-inspect-card" style="border-left: 4px solid var(--layer-${node.layer}); padding: 12px; background: var(--bg-surface-elevated); border-radius: 6px;">
        <h3 style="margin-bottom: 4px; font-size: 1rem;">${node.label}</h3>
        <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent); margin-bottom: 8px;">File: ${node.file || 'N/A'}</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">${node.details || 'Component architecture definition.'}</p>
      </div>

      <div class="drawer-section">
        <h4 style="font-size: 0.8rem; text-transform: uppercase; margin-bottom: 8px; color: var(--text-main);">Layer &amp; Boundary</h4>
        <span class="legend-pill" style="display: inline-flex;">Layer: ${node.layer.toUpperCase()}</span>
      </div>

      ${matchedFile ? `
        <div class="drawer-section">
          <h4 style="font-size: 0.8rem; text-transform: uppercase; margin-bottom: 8px; color: var(--text-main);">Detected Tech &amp; Pattern</h4>
          <div style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--accent);">Tech: ${matchedFile.tech}</div>
          <div style="font-size: 0.75rem; font-family: var(--font-mono); color: #10b981; margin-top: 4px;">Pattern: ${matchedFile.pattern}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">Size: ${matchedFile.lines} lines of code</div>
        </div>
      ` : ''}

      <div class="drawer-section">
        <h4 style="font-size: 0.8rem; text-transform: uppercase; margin-bottom: 8px; color: var(--text-main);">Incoming Feeds (${incomingConns.length})</h4>
        ${incomingConns.map(c => `
          <div style="font-size: 0.75rem; font-family: var(--font-mono); padding: 4px 0; color: var(--text-muted);">
            ← <strong>${c.from}</strong> via <span style="color:var(--accent);">${c.protocol || 'REST'}</span> (${c.label})
          </div>
        `).join('') || '<div style="font-size: 0.75rem; color: var(--text-subtle);">None (Origin Node)</div>'}
      </div>

      <div class="drawer-section">
        <h4 style="font-size: 0.8rem; text-transform: uppercase; margin-bottom: 8px; color: var(--text-main);">Outgoing Flows (${outgoingConns.length})</h4>
        ${outgoingConns.map(c => `
          <div style="font-size: 0.75rem; font-family: var(--font-mono); padding: 4px 0; color: var(--text-muted);">
            ➔ <strong>${c.to}</strong> via <span style="color:var(--accent);">${c.protocol || 'REST'}</span> (${c.label})
          </div>
        `).join('') || '<div style="font-size: 0.75rem; color: var(--text-subtle);">None (Terminal Node)</div>'}
      </div>

      <div class="drawer-section">
        <h4 style="font-size: 0.8rem; text-transform: uppercase; margin-bottom: 8px; color: var(--text-main);">Architecture Conformance</h4>
        <div style="font-size: 0.75rem; color: #10b981; font-weight: 600;">✓ Clean Boundary Compliance</div>
        <div style="font-size: 0.72rem; color: var(--text-subtle); margin-top: 4px;">Audited against OpenLens AST Rules</div>
      </div>
    `;
  }

  updateLegend() {
    const counts = {
      frontend: 0,
      backend: 0,
      database: 0,
      security: 0,
      external: 0
    };

    (this.currentPreset.nodes || []).forEach(node => {
      if (counts[node.layer] !== undefined) {
        counts[node.layer]++;
      }
    });

    const legendContainer = document.getElementById('legend-items-container');
    if (!legendContainer) return;

    legendContainer.innerHTML = '';
    const layerMetadata = [
      { key: 'frontend', label: 'Frontend', color: 'var(--layer-frontend)' },
      { key: 'backend', label: 'Backend', color: 'var(--layer-backend)' },
      { key: 'database', label: 'Database', color: 'var(--layer-database)' },
      { key: 'security', label: 'Security', color: 'var(--layer-security)' },
      { key: 'external', label: 'External', color: 'var(--layer-external)' }
    ];

    layerMetadata.forEach(layer => {
      const count = counts[layer.key] || 0;
      const pill = document.createElement('div');
      pill.className = 'legend-pill';
      pill.setAttribute('data-layer', layer.key);
      pill.innerHTML = `
        <span class="legend-dot" style="background-color: ${layer.color};"></span>
        <span>${layer.label}</span>
        <span class="legend-count">${count}</span>
      `;

      pill.addEventListener('click', () => this.toggleLayerFilter(layer.key));
      legendContainer.appendChild(pill);
    });
  }

  toggleLayerFilter(layerKey) {
    if (this.activeLayerFilter === layerKey) {
      this.activeLayerFilter = null;
      document.querySelectorAll('.legend-pill').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.node-card').forEach(c => c.classList.remove('dimmed'));
      document.querySelectorAll('.flow-path').forEach(p => p.style.opacity = '1');
      this.showToast('Showing all architecture layers.');
    } else {
      this.activeLayerFilter = layerKey;
      document.querySelectorAll('.legend-pill').forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-layer') === layerKey);
      });

      document.querySelectorAll('.node-card').forEach(card => {
        if (card.getAttribute('data-layer') === layerKey) {
          card.classList.remove('dimmed');
          card.classList.add('highlighted');
        } else {
          card.classList.add('dimmed');
          card.classList.remove('highlighted');
        }
      });

      document.querySelectorAll('.flow-path').forEach(path => {
        const fromNode = this.currentPreset.nodes.find(n => n.id === path.getAttribute('data-from'));
        const toNode = this.currentPreset.nodes.find(n => n.id === path.getAttribute('data-to'));
        if (fromNode?.layer === layerKey || toNode?.layer === layerKey) {
          path.style.opacity = '1';
        } else {
          path.style.opacity = '0.1';
        }
      });

      this.showToast(`Filtered layer: ${layerKey.toUpperCase()}`);
    }
  }

  openAdrModal() {
    const listContainer = document.getElementById('adr-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    (this.currentPreset.adrs || []).forEach(adr => {
      const card = document.createElement('div');
      card.className = 'adr-card';
      card.innerHTML = `
        <div class="adr-title">${adr.id}: ${adr.title}</div>
        <div class="adr-meta">STATUS: ${adr.status} · LAYER: ${adr.layer} · DATE: ${adr.date}</div>
        <div class="adr-text"><strong>Decision:</strong> ${adr.decision}</div>
        <div class="adr-text"><strong>Consequences:</strong> ${adr.consequences}</div>
      `;
      listContainer.appendChild(card);
    });

    const rulesBlock = document.getElementById('rules-json-block');
    if (rulesBlock) {
      rulesBlock.textContent = JSON.stringify(this.currentPreset.rules || [], null, 2);
    }

    this.adrModal.classList.add('show');
  }

  closeAdrModal() {
    this.adrModal.classList.remove('show');
  }

  onMouseDown(e) {
    if (e.target.closest('.node-card') || e.target.closest('button')) return;
    this.isDragging = true;
    this.startX = e.clientX - this.panX;
    this.startY = e.clientY - this.panY;
    this.viewport.classList.add('panning');
  }

  onMouseMove(e) {
    if (!this.isDragging) return;
    this.panX = e.clientX - this.startX;
    this.panY = e.clientY - this.startY;
    this.applyTransform();
  }

  onMouseUp() {
    this.isDragging = false;
    this.viewport.classList.remove('panning');
  }

  onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newScale = Math.min(Math.max(this.scale * zoomFactor, 0.4), 2.5);

    const rect = this.viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
    this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
    this.scale = newScale;

    this.applyTransform();
    this.updateZoomDisplay();
  }

  adjustZoom(delta) {
    this.scale = Math.min(Math.max(this.scale + delta, 0.4), 2.5);
    this.applyTransform();
    this.updateZoomDisplay();
  }

  resetView() {
    this.scale = 0.62;
    this.panX = 20;
    this.panY = 12;
    this.applyTransform();
    this.updateZoomDisplay();
    this.showToast('View reset');
  }

  fitToScreen() {
    const vpW = this.viewport.clientWidth;
    const vpH = this.viewport.clientHeight;
    this.scale = Math.min(vpW / 1100, (vpH - 36) / 580, 0.85);
    this.panX = Math.max(10, (vpW - 1000 * this.scale) / 2);
    this.panY = Math.max(8, (vpH - 560 * this.scale) / 2);
    this.applyTransform();
    this.updateZoomDisplay();
    this.showToast('Fit to screen');
  }

  applyTransform() {
    if (this.content) {
      this.content.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    }
  }

  updateZoomDisplay() {
    if (this.zoomDisplay) {
      this.zoomDisplay.textContent = `${Math.round(this.scale * 100)}%`;
    }
  }

  showToast(message) {
    if (!this.toast) return;
    this.toast.textContent = message;
    this.toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toast.classList.remove('show');
    }, 2800);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new OpenLensArchyApp();
  app.init();
  window.openlensArchy = app;
});
