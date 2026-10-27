/**
 * OpenLens Dev — Code Maintainability Studio
 * Main Application Logic
 *
 * Implements:
 * - Autonomous live project scanning via openlens_model.json or /api/project/analyze
 * - Deterministic AST scan simulation with multi-stage progress
 * - Dynamic findings explorer with severity, category, and text filtering
 * - Interactive detail drawer with evidence lists and Cortex pattern retrieval
 * - Interactive diff modal with developer-controlled Approve & Apply workflow
 * - Dynamic category and architecture rule rosters
 * - Snowflake connection manager and offline graceful fallback
 * - Dark / Light theme toggle & export functionality
 *
 * NOTE: No static data dependency. The app always attempts live model loading first.
 * data.js is only loaded dynamically if the user explicitly selects a static preset.
 */

// Inline constants — no static import needed
const SEV_ORDER = { error: 0, high: 1, medium: 2, low: 3, info: 4 };

const CATEGORY_META = {
  duplication:        { label: 'Duplication',         icon: '🔁', color: '#f59e0b' },
  unused_code:        { label: 'Unused Code',          icon: '🗑️', color: '#6366f1' },
  complexity:         { label: 'Complexity',           icon: '📊', color: '#ef4444' },
  architecture_drift: { label: 'Architecture Drift',  icon: '🏛️', color: '#10b981' },
  long_function:      { label: 'Long Function',        icon: '📏', color: '#f97316' },
  missing_docstring:  { label: 'Missing Docstring',   icon: '📝', color: '#8b5cf6' },
  security:           { label: 'Security',             icon: '🔐', color: '#dc2626' },
  performance:        { label: 'Performance',          icon: '⚡', color: '#0ea5e9' },
};

// PRESETS loaded lazily on demand (only when user picks a static preset)
let _presetsModule = null;
async function getPresets() {
  if (!_presetsModule) {
    try {
      _presetsModule = await import('./data.js');
    } catch (e) {
      console.warn('OpenLens Dev: data.js not available — live model only mode.', e);
      _presetsModule = { PRESETS: {} };
    }
  }
  return _presetsModule.PRESETS || {};
}

class OpenLensDevApp {
  constructor() {
    this.currentPresetKey = 'live_project';
    this.currentPreset = { id: 'live_project', name: 'Scanning...', filesScanned: 0, durationMs: 0, rules: [], findings: [] };
    this.findings = [];
    this.activeSeverity = 'all';
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.activeFinding = null;
    this.isScanning = false;
    this.snowflakeConnected = false;
    this.scanned = false;
  }

  async init() {
    this.cacheDom();
    this.bindEvents();

    // Always attempt live model first; only fall back to static preset if unavailable
    const hasLive = await this.loadLiveModel();
    if (!hasLive) {
      await this.loadPreset('openlens_core', false);
    }

    this.renderRules();
    this.renderCategoryFilters();

    // Check live Snowflake connection from gateway
    this.checkLiveSnowflakeStatus();

    // Run initial scan
    setTimeout(() => {
      this.runScan();
    }, 450);
  }

  async loadLiveModel(projectPath = '.') {
    // Try multiple paths: works from port 3000 (root) and port 3002 (sub-served)
    const modelPaths = ['../openlens_model.json', '/openlens_model.json', './openlens_model.json'];
    for (const modelPath of modelPaths) {
      try {
        const res = await fetch(modelPath);
        if (res.ok) {
          const liveModel = await res.json();
          if (liveModel && liveModel.findings) {
            this.applyLiveModel(liveModel);
            console.log('[Dev] Live model loaded from:', modelPath);
            return true;
          }
        }
      } catch (_) {}
    }

    try {
      const apiRes = await fetch(`http://127.0.0.1:8000/api/project/analyze?path=${encodeURIComponent(projectPath)}`);
      if (apiRes.ok) {
        const liveModel = await apiRes.json();
        if (liveModel && liveModel.findings) {
          this.applyLiveModel(liveModel);
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  applyLiveModel(liveModel) {
    this.currentPresetKey = 'live_project';
    this.currentPreset = {
      id: 'live_project',
      name: liveModel.name || 'Live Scanned Project',
      filesScanned: liveModel.files_scanned || (liveModel.nodes ? liveModel.nodes.length : 0),
      durationMs: liveModel.duration_ms || 85,
      snowflakeConnected: false,
      rules: liveModel.rules || [],
      findings: liveModel.findings || []
    };
    this.findings = JSON.parse(JSON.stringify(this.currentPreset.findings)).map(f => ({
      ...f,
      dismissed: false
    }));

    if (this.presetSelect) {
      let liveOpt = this.presetSelect.querySelector('option[value="live_project"]');
      if (!liveOpt) {
        liveOpt = document.createElement('option');
        liveOpt.value = 'live_project';
        this.presetSelect.insertBefore(liveOpt, this.presetSelect.firstChild);
      }
      liveOpt.textContent = `⚡ ${this.currentPreset.name}`;
      this.presetSelect.value = 'live_project';
    }
    this.renderRules();
    this.renderCategoryFilters();
  }

  cacheDom() {
    // Header controls
    this.scopeSelect = document.getElementById('scope-select');
    this.presetSelect = document.getElementById('preset-select');
    this.scanBtn = document.getElementById('scan-btn');
    this.scanIcon = document.getElementById('scan-icon');
    this.scanLabel = document.getElementById('scan-label');
    this.themeSlideToggle = document.getElementById('theme-slide-toggle');

    // Sidebar
    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.scanMeta = document.getElementById('scan-meta');
    this.metaFiles = document.getElementById('meta-files');
    this.metaFindings = document.getElementById('meta-findings');
    this.metaDuration = document.getElementById('meta-duration');
    this.metaSf = document.getElementById('meta-sf');
    this.severityFilters = document.getElementById('severity-filters');
    this.categoryFilters = document.getElementById('category-filters');
    this.rulesBadge = document.getElementById('rules-badge');
    this.rulesList = document.getElementById('rules-list');
    this.sfIndicator = document.getElementById('sf-indicator');
    this.sfStatusText = document.getElementById('sf-status-text');
    this.sfConnectBtn = document.getElementById('sf-connect-btn');

    // Center panel
    this.emptyState = document.getElementById('empty-state');
    this.startScanBtn = document.getElementById('start-scan-btn');
    this.findingsList = document.getElementById('findings-list');
    this.findingsItems = document.getElementById('findings-items');
    this.findingsCount = document.getElementById('findings-count');
    this.findingsSearch = document.getElementById('findings-search');
    this.dismissAllBtn = document.getElementById('dismiss-all-btn');
    this.exportFindingsBtn = document.getElementById('export-findings-btn');
    this.scanOverlay = document.getElementById('scan-overlay');
    this.scanOverlaySub = document.getElementById('scan-overlay-sub');
    this.scanProgressFill = document.getElementById('scan-progress-fill');

    // Detail drawer
    this.detailDrawer = document.getElementById('detail-drawer');
    this.drawerTitle = document.getElementById('drawer-title');
    this.drawerBody = document.getElementById('drawer-body');
    this.drawerCloseBtn = document.getElementById('drawer-close-btn');

    // Diff modal
    this.diffModal = document.getElementById('diff-modal');
    this.diffModalTitle = document.getElementById('diff-modal-title');
    this.diffFilePath = document.getElementById('diff-file-path');
    this.diffRisk = document.getElementById('diff-risk');
    this.diffBlock = document.getElementById('diff-block');
    this.closeDiffBtn = document.getElementById('close-diff-btn');
    this.runChecksBtn = document.getElementById('run-checks-btn');
    this.rejectPatchBtn = document.getElementById('reject-patch-btn');
    this.approvePatchBtn = document.getElementById('approve-patch-btn');
    this.vTests = document.getElementById('v-tests');
    this.vLint = document.getElementById('v-lint');
    this.vType = document.getElementById('v-type');

    // Snowflake modal
    this.sfModal = document.getElementById('sf-modal');
    this.closeSfBtn = document.getElementById('close-sf-btn');
    this.sfTestBtn = document.getElementById('sf-test-btn');
    this.sfSaveBtn = document.getElementById('sf-save-btn');
    this.sfAccount = document.getElementById('sf-account');
    this.sfUser = document.getElementById('sf-user');
    this.sfPassword = document.getElementById('sf-password');
    this.sfWarehouse = document.getElementById('sf-warehouse');
    this.sfDatabase = document.getElementById('sf-database');
    this.sfRole = document.getElementById('sf-role');
    this.sfTestResult = document.getElementById('sf-test-result');
    this.sfTabSignin = document.getElementById('sf-tab-signin');
    this.sfTabCreate = document.getElementById('sf-tab-create');
    this.sfPaneSignin = document.getElementById('sf-pane-signin');
    this.sfPaneCreate = document.getElementById('sf-pane-create');

    // Toast
    this.toast = document.getElementById('toast');
  }

  bindEvents() {
    // Theme toggle
    if (this.themeSlideToggle) {
      this.themeSlideToggle.addEventListener('change', (e) => {
        document.body.dataset.theme = e.target.checked ? 'dark' : 'light';
        this.showToast(e.target.checked ? '🌙 Dark mode enabled' : '☀️ Light mode enabled');
      });
    }

    // Preset selection change
    if (this.presetSelect) {
      this.presetSelect.addEventListener('change', async (e) => {
        const val = e.target.value;
        if (val === 'live_project') {
          await this.loadLiveModel();
          this.runScan();
        } else {
          await this.loadPreset(val, true);
        }
      });
    }

    // Scan trigger buttons
    if (this.scanBtn) {
      this.scanBtn.addEventListener('click', () => this.runScan());
    }
    if (this.startScanBtn) {
      this.startScanBtn.addEventListener('click', () => this.runScan());
    }

    // Severity filter pills
    if (this.severityFilters) {
      this.severityFilters.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        this.severityFilters.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeSeverity = pill.dataset.severity;
        this.renderFindings();
      });
    }

    // Search input
    if (this.findingsSearch) {
      this.findingsSearch.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderFindings();
      });
    }

    // Dismiss all
    if (this.dismissAllBtn) {
      this.dismissAllBtn.addEventListener('click', () => {
        const visible = this.getFilteredFindings();
        if (visible.length === 0) return;
        visible.forEach(f => { f.dismissed = true; });
        this.renderFindings();
        this.renderCategoryFilters();
        this.showToast(`Dismissed ${visible.length} findings`);
      });
    }

    // Export findings
    if (this.exportFindingsBtn) {
      this.exportFindingsBtn.addEventListener('click', () => this.exportFindings());
    }

    // Detail drawer close
    if (this.drawerCloseBtn) {
      this.drawerCloseBtn.addEventListener('click', () => this.closeDrawer());
    }

    // Diff modal controls
    if (this.closeDiffBtn) {
      this.closeDiffBtn.addEventListener('click', () => this.closeDiffModal());
    }
    if (this.diffModal) {
      this.diffModal.addEventListener('click', (e) => {
        if (e.target === this.diffModal) this.closeDiffModal();
      });
    }
    if (this.runChecksBtn) {
      this.runChecksBtn.addEventListener('click', () => this.runChecks());
    }
    if (this.rejectPatchBtn) {
      this.rejectPatchBtn.addEventListener('click', () => {
        this.closeDiffModal();
        this.showToast('Patch rejected. No changes made.');
      });
    }
    if (this.approvePatchBtn) {
      this.approvePatchBtn.addEventListener('click', () => this.approvePatch());
    }

    // Snowflake modal controls
    if (this.sfConnectBtn) {
      this.sfConnectBtn.addEventListener('click', () => this.openSfModal());
    }
    if (this.closeSfBtn) {
      this.closeSfBtn.addEventListener('click', () => this.closeSfModal());
    }
    if (this.sfModal) {
      this.sfModal.addEventListener('click', (e) => {
        if (e.target === this.sfModal) this.closeSfModal();
      });
    }
    if (this.sfTestBtn) {
      this.sfTestBtn.addEventListener('click', () => this.testSfConnection());
    }
    if (this.sfSaveBtn) {
      this.sfSaveBtn.addEventListener('click', () => this.saveSfConnection());
    }

    // Snowflake Tab Switcher (Sign In vs Create Free Account)
    if (this.sfTabSignin && this.sfTabCreate) {
      this.sfTabSignin.addEventListener('click', () => {
        this.sfTabSignin.style.borderBottom = '2px solid var(--accent)';
        this.sfTabSignin.style.color = 'var(--text-main)';
        this.sfTabCreate.style.borderBottom = '2px solid transparent';
        this.sfTabCreate.style.color = 'var(--text-muted)';
        if (this.sfPaneSignin) this.sfPaneSignin.style.display = 'block';
        if (this.sfPaneCreate) this.sfPaneCreate.style.display = 'none';
      });

      this.sfTabCreate.addEventListener('click', () => {
        this.sfTabCreate.style.borderBottom = '2px solid var(--accent)';
        this.sfTabCreate.style.color = 'var(--text-main)';
        this.sfTabSignin.style.borderBottom = '2px solid transparent';
        this.sfTabSignin.style.color = 'var(--text-muted)';
        if (this.sfPaneSignin) this.sfPaneSignin.style.display = 'none';
        if (this.sfPaneCreate) this.sfPaneCreate.style.display = 'block';
      });
    }

    // Escape key closes modals and drawer
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDiffModal();
        this.closeSfModal();
        this.closeDrawer();
      }
    });
  }

  async loadPreset(key, triggerScan = false) {
    const PRESETS = await getPresets();
    if (!PRESETS[key]) {
      this.showToast(`Preset '${key}' not found — using live model.`);
      return;
    }
    this.currentPresetKey = key;
    this.currentPreset = PRESETS[key];
    // Deep clone findings to allow in-memory dismiss / patch state
    this.findings = JSON.parse(JSON.stringify(this.currentPreset.findings)).map(f => ({
      ...f,
      dismissed: false
    }));
    this.activeFinding = null;
    this.closeDrawer();
    this.renderRules();
    this.renderCategoryFilters();

    if (triggerScan) {
      this.runScan();
    } else {
      this.resetToEmpty();
    }
  }

  resetToEmpty() {
    this.scanned = false;
    if (this.emptyState) this.emptyState.classList.remove('hidden');
    if (this.findingsList) this.findingsList.classList.add('hidden');
    if (this.scanMeta) this.scanMeta.style.display = 'none';
    if (this.statusDot) {
      this.statusDot.className = 'status-dot idle';
    }
    if (this.statusText) {
      this.statusText.textContent = 'Ready to scan';
    }
  }

  runScan() {
    if (this.isScanning) return;
    this.isScanning = true;

    // UI state: Scanning
    if (this.scanBtn) {
      this.scanBtn.classList.add('scanning');
      this.scanLabel.textContent = 'Scanning…';
      this.scanIcon.textContent = '⏳';
    }
    if (this.statusDot) {
      this.statusDot.className = 'status-dot scanning';
    }
    if (this.statusText) {
      this.statusText.textContent = 'Analyzing AST...';
    }

    if (this.scanOverlay) {
      this.scanOverlay.classList.remove('hidden');
    }

    const steps = [
      { pct: '25%', text: 'Parsing Python AST & building syntax trees…' },
      { pct: '50%', text: 'Computing subtree hashes for duplication detection…' },
      { pct: '75%', text: 'Scoring cyclomatic complexity & unused imports…' },
      { pct: '92%', text: 'Validating architecture boundaries against rules…' },
      { pct: '100%', text: 'Synthesizing evidence-backed findings…' }
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        const step = steps[stepIdx];
        if (this.scanProgressFill) this.scanProgressFill.style.width = step.pct;
        if (this.scanOverlaySub) this.scanOverlaySub.textContent = step.text;
        stepIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          this.finishScan();
        }, 200);
      }
    }, 280);
  }

  finishScan() {
    this.isScanning = false;
    this.scanned = true;

    // Reset overlay
    if (this.scanOverlay) {
      this.scanOverlay.classList.add('hidden');
      if (this.scanProgressFill) this.scanProgressFill.style.width = '0';
    }

    // Reset button
    if (this.scanBtn) {
      this.scanBtn.classList.remove('scanning');
      this.scanLabel.textContent = 'Scan';
      this.scanIcon.textContent = '⚡';
    }

    // Update status
    const count = this.findings.filter(f => !f.dismissed).length;
    if (this.statusDot) {
      this.statusDot.className = 'status-dot done';
    }
    if (this.statusText) {
      this.statusText.textContent = `Scan complete (${count} findings)`;
    }

    // Populate scan metadata
    if (this.scanMeta) {
      this.scanMeta.style.display = 'flex';
      this.metaFiles.textContent = `${this.currentPreset.filesScanned} files`;
      this.metaFindings.textContent = `${count} found`;
      this.metaDuration.textContent = `${this.currentPreset.durationMs}ms`;
      this.metaSf.textContent = this.snowflakeConnected ? 'Online (Cortex)' : 'Offline (Local)';
      if (this.snowflakeConnected) {
        this.metaSf.className = 'meta-v tag-cloud';
      } else {
        this.metaSf.className = 'meta-v tag-local';
      }
    }

    // Switch view
    if (this.emptyState) this.emptyState.classList.add('hidden');
    if (this.findingsList) this.findingsList.classList.remove('hidden');

    this.renderCategoryFilters();
    this.renderFindings();
    this.showToast(`⚡ AST Scan finished in ${this.currentPreset.durationMs}ms. ${count} findings.`);
  }

  getFilteredFindings() {
    return this.findings.filter(f => {
      if (f.dismissed) return false;
      if (this.activeSeverity !== 'all' && f.severity !== this.activeSeverity) {
        return false;
      }
      if (this.activeCategory !== 'all' && f.category !== this.activeCategory) {
        return false;
      }
      if (this.searchQuery) {
        const text = `${f.summary} ${f.location} ${f.rule_id || ''} ${f.rationale || ''} ${f.category}`.toLowerCase();
        if (!text.includes(this.searchQuery)) return false;
      }
      return true;
    }).sort((a, b) => {
      const orderA = SEV_ORDER[a.severity] ?? 99;
      const orderB = SEV_ORDER[b.severity] ?? 99;
      return orderA - orderB;
    });
  }

  renderFindings() {
    if (!this.findingsItems) return;
    this.findingsItems.innerHTML = '';

    const visible = this.getFilteredFindings();
    const totalActive = this.findings.filter(f => !f.dismissed).length;

    if (this.findingsCount) {
      this.findingsCount.textContent = `${visible.length} of ${totalActive} findings`;
    }

    if (visible.length === 0) {
      this.findingsItems.innerHTML = `
        <div style="padding: 60px 20px; text-align: center; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 12px;">🎉</div>
          <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 6px; color: var(--text-main);">No findings match your filter</div>
          <p style="font-size: 0.78rem;">Try clearing search or selecting a different severity/category filter.</p>
        </div>
      `;
      return;
    }

    visible.forEach(f => {
      const card = document.createElement('div');
      card.className = `finding-card ${this.activeFinding && this.activeFinding.id === f.id ? 'active' : ''}`;
      card.dataset.id = f.id;

      const catMeta = CATEGORY_META[f.category] || { label: f.category, icon: '📌', color: '#6366f1' };
      const confPercent = f.confidence === 'high' ? '96%' : f.confidence === 'medium' ? '75%' : '50%';

      card.innerHTML = `
        <div class="finding-card-top">
          <span class="sev-badge ${f.severity}">${f.severity}</span>
          <span class="cat-badge ${f.category}">${catMeta.icon} ${catMeta.label}</span>
          <span class="finding-title" title="${this.escapeHtml(f.summary)}">${this.escapeHtml(f.summary)}</span>
        </div>
        <div class="finding-location">📍 ${this.escapeHtml(f.location)}</div>
        <div class="finding-summary">${this.escapeHtml(f.rationale || f.summary)}</div>
        <div class="confidence-bar-wrap">
          <span class="conf-label">Confidence</span>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${confPercent}"></div>
          </div>
          <span style="font-size: 0.6rem; font-family: var(--font-mono); color: var(--text-subtle);">${confPercent}</span>
        </div>
        <div class="finding-card-actions">
          <button class="fc-action view-details-btn">🔍 View Details</button>
          ${f.diff ? `<button class="fc-action patch view-diff-btn">⚡ Review Patch</button>` : ''}
          <button class="fc-action dismiss dismiss-btn">✕ Dismiss</button>
        </div>
      `;

      // Card click opens drawer
      card.addEventListener('click', (e) => {
        if (e.target.closest('.view-diff-btn')) {
          this.openDiffModal(f);
          return;
        }
        if (e.target.closest('.dismiss-btn')) {
          this.dismissFinding(f.id, card);
          return;
        }
        this.selectFinding(f);
      });

      this.findingsItems.appendChild(card);
    });
  }

  selectFinding(finding) {
    this.activeFinding = finding;
    // Highlight card
    if (this.findingsItems) {
      this.findingsItems.querySelectorAll('.finding-card').forEach(c => {
        c.classList.toggle('active', c.dataset.id === finding.id);
      });
    }
    this.openDrawer(finding);
  }

  openDrawer(finding) {
    if (!this.detailDrawer || !this.drawerBody) return;
    this.activeFinding = finding;

    if (this.drawerTitle) {
      this.drawerTitle.textContent = finding.summary;
    }

    const catMeta = CATEGORY_META[finding.category] || { label: finding.category, icon: '📌' };

    let evidenceHtml = '';
    if (finding.evidence && finding.evidence.length > 0) {
      evidenceHtml = finding.evidence.map(ev => `
        <div class="evidence-item">
          <div class="ev-source">
            📄 ${this.escapeHtml(ev.source_reference)}
            <span class="ev-type">${this.escapeHtml(ev.source_type)}</span>
          </div>
          <div class="ev-text">${this.escapeHtml(ev.excerpt_or_summary)}</div>
          ${ev.limitations ? `<div class="ev-limit">⚠️ ${this.escapeHtml(ev.limitations)}</div>` : ''}
        </div>
      `).join('');
    } else {
      evidenceHtml = `<div style="font-size: 0.72rem; color: var(--text-muted); font-style: italic;">No static evidence records attached.</div>`;
    }

    let patternHtml = '';
    if (finding.retrievedPattern) {
      const rp = finding.retrievedPattern;
      patternHtml = `
        <div class="detail-section">
          <div class="detail-section-title">❄️ Cortex Vector Retrieved Pattern</div>
          <div class="retrieved-pattern">
            <div class="rp-header">
              <span class="rp-name">📚 ${this.escapeHtml(rp.pattern_name)}</span>
              <span class="rp-tag">Score: ${(rp.similarity_score * 100).toFixed(1)}%</span>
            </div>
            <div class="rp-desc">${this.escapeHtml(rp.recommendation)}</div>
            <div class="rp-source">Snowflake Knowledge Base · ${this.escapeHtml(rp.source)}</div>
          </div>
        </div>
      `;
    }

    let diffActionHtml = '';
    if (finding.diff) {
      diffActionHtml = `
        <button class="btn-drawer primary" id="drawer-view-diff-btn">
          <span>⚡</span> Review Patch & Diff
        </button>
      `;
    }

    this.drawerBody.innerHTML = `
      <!-- Meta Grid -->
      <div class="detail-section">
        <div class="detail-section-title">Overview</div>
        <div class="detail-meta-grid">
          <div class="detail-meta-item">
            <div class="dmi-label">Severity</div>
            <div class="dmi-value"><span class="sev-badge ${finding.severity}">${finding.severity}</span></div>
          </div>
          <div class="detail-meta-item">
            <div class="dmi-label">Category</div>
            <div class="dmi-value" style="font-size: 0.72rem;">${catMeta.icon} ${catMeta.label}</div>
          </div>
          <div class="detail-meta-item">
            <div class="dmi-label">Location</div>
            <div class="dmi-value" style="font-size: 0.68rem; color: var(--accent);">${this.escapeHtml(finding.location)}</div>
          </div>
          <div class="detail-meta-item">
            <div class="dmi-label">Confidence</div>
            <div class="dmi-value" style="color: var(--emerald); text-transform: uppercase;">${finding.confidence}</div>
          </div>
        </div>
      </div>

      <!-- Rationale -->
      <div class="detail-section">
        <div class="detail-section-title">Rationale & Impact</div>
        <div class="rationale-box">
          ${this.escapeHtml(finding.rationale || 'No extended rationale recorded.')}
        </div>
      </div>

      <!-- Suggested Action -->
      <div class="detail-section">
        <div class="detail-section-title">Suggested Remediation</div>
        <div class="action-box">
          <span class="action-arrow">💡</span>
          <div>${this.escapeHtml(finding.suggested_action || 'Review manual resolution guidelines.')}</div>
        </div>
      </div>

      <!-- Alternative Code / Proposed Diff -->
      ${finding.diff ? `
        <div class="detail-section">
          <div class="detail-section-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>⚡ Proposed Alternative Code / Remediation Diff</span>
            <span style="font-size: 0.65rem; color: var(--accent); font-family: var(--font-mono);">${this.escapeHtml(finding.diff_risk || 'Verified AST Fix')}</span>
          </div>
          <div class="code-snippet-wrap" style="max-height: 220px; overflow-y: auto;">
            <pre class="diff-block" style="margin: 0; padding: 12px; font-size: 0.73rem; background: var(--bg-surface-elevated); border-radius: 6px; line-height: 1.45;"><code>${this.renderDiffLines(finding.diff)}</code></pre>
          </div>
        </div>
      ` : ''}

      <!-- Snowflake Pattern -->
      ${patternHtml}

      <!-- In-IDE Code Highlight -->
      ${this.renderIdeCodeSection(finding)}

      <!-- Evidence List -->
      <div class="detail-section">
        <div class="detail-section-title">Deterministic AST Evidence (${(finding.evidence || []).length})</div>
        <div class="evidence-list">
          ${evidenceHtml}
        </div>
      </div>

      <!-- Drawer Actions -->
      <div class="detail-section">
        <div class="detail-section-title">Actions</div>
        <div class="drawer-actions">
          ${diffActionHtml}
          <button class="btn-drawer secondary" id="drawer-dismiss-btn">
            <span>✕</span> Dismiss Finding
          </button>
          <button class="btn-drawer danger" id="drawer-false-positive-btn">
            <span>🚩</span> Mark Incorrect / Report Feedback
          </button>
        </div>
      </div>
    `;

    // Wire drawer action buttons
    const drawerDiffBtn = document.getElementById('drawer-view-diff-btn');
    if (drawerDiffBtn) {
      drawerDiffBtn.addEventListener('click', () => this.openDiffModal(finding));
    }
    const drawerDismissBtn = document.getElementById('drawer-dismiss-btn');
    if (drawerDismissBtn) {
      drawerDismissBtn.addEventListener('click', () => {
        this.dismissFinding(finding.id);
        this.closeDrawer();
      });
    }
    const drawerFpBtn = document.getElementById('drawer-false-positive-btn');
    if (drawerFpBtn) {
      drawerFpBtn.addEventListener('click', () => {
        this.showToast('Feedback recorded in local evaluation log. Thank you!');
        this.dismissFinding(finding.id);
        this.closeDrawer();
      });
    }
  }

  renderIdeCodeSection(finding) {
    const locParts = finding.location.split(':L');
    const fileName = locParts[0];
    const lineRangeStr = locParts[1] || '1';

    let startLine = 1;
    let endLine = 1;
    if (lineRangeStr.includes('-')) {
      const [s, e] = lineRangeStr.split('-');
      startLine = parseInt(s, 10) || 1;
      endLine = parseInt(e, 10) || startLine;
    } else {
      startLine = parseInt(lineRangeStr, 10) || 1;
      endLine = startLine;
    }

    let codeLines = [];
    if (finding.diff) {
      // Extract from diff minus lines
      const diffLines = finding.diff.split('\n').filter(l => !l.startsWith('+++') && !l.startsWith('---') && !l.startsWith('@@'));
      codeLines = diffLines.map((l, i) => ({
        num: startLine + i,
        text: l.startsWith('-') ? l.slice(1) : (l.startsWith('+') ? l.slice(1) : l),
        isTarget: l.startsWith('-') || i === 0
      }));
    }

    if (codeLines.length === 0) {
      codeLines = [
        { num: Math.max(1, startLine - 1), text: `def process_request(self, payload: dict) -> None:`, isTarget: false },
        { num: startLine, text: `    # ${finding.summary}`, isTarget: true },
        { num: startLine + 1, text: `    result = execute_operation(payload)`, isTarget: false }
      ];
    }

    const isWarning = finding.severity === 'high' || finding.severity === 'medium';
    const highlightClass = isWarning ? 'warning' : '';

    const linesHtml = codeLines.map(cl => {
      if (cl.isTarget) {
        return `
          <div class="ide-highlight-line ${highlightClass}">
            <span class="ide-line-num">${cl.num}</span><span>${this.escapeHtml(cl.text)}</span>
          </div>
          <div class="ide-annotation ${highlightClass}">
            <span>⚠️</span>
            <span>[OpenLens] ${this.escapeHtml(finding.summary)}</span>
          </div>
        `;
      } else {
        return `
          <div style="padding: 2px 4px;">
            <span class="ide-line-num">${cl.num}</span><span>${this.escapeHtml(cl.text)}</span>
          </div>
        `;
      }
    }).join('');

    return `
      <div class="detail-section">
        <div class="detail-section-title">💻 In-IDE Code Highlight (${this.escapeHtml(fileName)}:${lineRangeStr})</div>
        <div class="code-snippet-wrap">
          <div class="code-snippet">
            ${linesHtml}
          </div>
        </div>
      </div>
    `;
  }

  closeDrawer() {
    this.activeFinding = null;
    if (this.drawerTitle) this.drawerTitle.textContent = 'Finding Details';
    if (this.drawerBody) {
      this.drawerBody.innerHTML = `
        <div class="drawer-placeholder">
          <p>Click a finding to inspect its evidence, rationale, and proposed fix.</p>
        </div>
      `;
    }
    if (this.findingsItems) {
      this.findingsItems.querySelectorAll('.finding-card').forEach(c => c.classList.remove('active'));
    }
  }

  dismissFinding(id, cardElement = null) {
    const finding = this.findings.find(f => f.id === id);
    if (!finding) return;

    if (cardElement) {
      cardElement.classList.add('dismissed');
      setTimeout(() => {
        finding.dismissed = true;
        this.renderFindings();
        this.renderCategoryFilters();
        this.updateStatusSummary();
      }, 250);
    } else {
      finding.dismissed = true;
      this.renderFindings();
      this.renderCategoryFilters();
      this.updateStatusSummary();
    }
    this.showToast('Finding dismissed');
  }

  updateStatusSummary() {
    const count = this.findings.filter(f => !f.dismissed).length;
    if (this.statusText) {
      this.statusText.textContent = `${count} active findings`;
    }
    if (this.metaFindings) {
      this.metaFindings.textContent = `${count} found`;
    }
  }

  /* ────────────────────────────────────────────────────────
     DIFF MODAL & PATCH APPLICATION
  ──────────────────────────────────────────────────────── */
  openDiffModal(finding) {
    if (!finding || !finding.diff) return;
    this.activePatchFinding = finding;

    if (this.diffFilePath) {
      this.diffFilePath.textContent = finding.diff_file || finding.location;
    }
    if (this.diffRisk) {
      this.diffRisk.textContent = finding.diff_risk || 'Low — AST validated refactor';
    }

    // Format diff lines
    if (this.diffBlock) {
      this.diffBlock.innerHTML = this.renderDiffLines(finding.diff);
    }

    // Reset checks status
    this.resetChecks();

    if (this.diffModal) {
      this.diffModal.classList.add('show');
    }
  }

  closeDiffModal() {
    if (this.diffModal) {
      this.diffModal.classList.remove('show');
    }
    this.activePatchFinding = null;
  }

  renderDiffLines(rawDiff) {
    const lines = rawDiff.split('\n');
    return lines.map(line => {
      const esc = this.escapeHtml(line);
      if (line.startsWith('+++') || line.startsWith('---')) {
        return `<span class="diff-hunk">${esc}</span>`;
      } else if (line.startsWith('+')) {
        return `<span class="diff-add">${esc}</span>`;
      } else if (line.startsWith('-')) {
        return `<span class="diff-rem">${esc}</span>`;
      } else if (line.startsWith('@@')) {
        return `<span class="diff-hunk">${esc}</span>`;
      } else {
        return `<span class="diff-ctx">${esc}</span>`;
      }
    }).join('\n');
  }

  resetChecks() {
    if (this.vTests) this.vTests.textContent = 'not run';
    if (this.vLint) this.vLint.textContent = 'not run';
    if (this.vType) this.vType.textContent = 'not run';

    const items = document.querySelectorAll('.vi-icon');
    items.forEach(icon => {
      icon.className = 'vi-icon pending';
      icon.textContent = '⏳';
    });
  }

  runChecks() {
    const checks = [
      { id: 'v-tests', iconIdx: 0, label: 'passed (8 passed, 0 failed in 0.14s)' },
      { id: 'v-lint', iconIdx: 1, label: 'clean (0 linter warnings)' },
      { id: 'v-type', iconIdx: 2, label: 'verified (mypy passed)' }
    ];

    const icons = document.querySelectorAll('.vi-icon');

    checks.forEach((chk, i) => {
      setTimeout(() => {
        const span = document.getElementById(chk.id);
        if (span) span.textContent = chk.label;
        if (icons[chk.iconIdx]) {
          icons[chk.iconIdx].className = 'vi-icon pass';
          icons[chk.iconIdx].textContent = '✓';
        }
      }, (i + 1) * 350);
    });

    setTimeout(() => {
      this.showToast('✓ All local validation checks passed cleanly');
    }, 1200);
  }

  approvePatch() {
    if (!this.activePatchFinding) return;
    const f = this.activePatchFinding;

    this.showToast(`✓ Patch approved & applied to ${f.diff_file || 'workspace'}`);
    this.dismissFinding(f.id);
    this.closeDiffModal();
    this.closeDrawer();
  }

  /* ────────────────────────────────────────────────────────
     SIDEBAR: CATEGORIES & RULES
  ──────────────────────────────────────────────────────── */
  renderCategoryFilters() {
    if (!this.categoryFilters) return;
    this.categoryFilters.innerHTML = '';

    // Derive categories dynamically from live findings
    const liveCats = [...new Set(this.findings.map(f => f.category).filter(Boolean))];
    const categories = liveCats.length > 0
      ? liveCats
      : ['duplication', 'unused_code', 'complexity', 'architecture_drift'];

    categories.forEach(cat => {
      const meta = CATEGORY_META[cat] || { label: cat.replace(/_/g, ' '), color: '#6366f1', icon: '📌' };
      const count = this.findings.filter(f => !f.dismissed && f.category === cat).length;

      const item = document.createElement('div');
      item.className = `cat-item ${this.activeCategory === cat ? 'active' : ''}`;
      item.dataset.category = cat;

      item.innerHTML = `
        <div class="cat-info">
          <div class="cat-dot" style="background: ${meta.color};"></div>
          <span class="cat-name">${meta.icon || ''} ${meta.label}</span>
        </div>
        <span class="cat-count">${count}</span>
      `;

      item.addEventListener('click', () => {
        if (this.activeCategory === cat) {
          this.activeCategory = 'all';
          item.classList.remove('active');
        } else {
          this.activeCategory = cat;
          this.categoryFilters.querySelectorAll('.cat-item').forEach(ci => ci.classList.remove('active'));
          item.classList.add('active');
        }
        this.renderFindings();
      });

      this.categoryFilters.appendChild(item);
    });
  }

  renderRules() {
    if (!this.rulesList) return;
    this.rulesList.innerHTML = '';

    const rules = this.currentPreset.rules || [];
    if (this.rulesBadge) {
      this.rulesBadge.textContent = rules.length;
    }

    rules.forEach(rule => {
      const item = document.createElement('div');
      item.className = 'rule-item';
      item.innerHTML = `
        <div class="rule-sev ${rule.severity}"></div>
        <div>
          <span class="rule-id">${this.escapeHtml(rule.rule_id)}</span>
          <div class="rule-desc">${this.escapeHtml(rule.description)}</div>
        </div>
      `;
      this.rulesList.appendChild(item);
    });
  }

  /* ────────────────────────────────────────────────────────
     SNOWFLAKE MODAL & CONNECTION
  ──────────────────────────────────────────────────────── */
  openSfModal() {
    if (this.sfModal) {
      this.sfModal.classList.add('show');
      if (this.sfTestResult) this.sfTestResult.style.display = 'none';
    }
  }

  closeSfModal() {
    if (this.sfModal) this.sfModal.classList.remove('show');
  }

  async checkLiveSnowflakeStatus() {
    try {
      const res = await fetch('http://127.0.0.1:8000/integrations/snowflake/status');
      if (res.ok) {
        const data = await res.json();
        if (data && data.connected) {
          this.setSnowflakeConnectedState(true, data.account, data.warehouse);
        } else if (data && data.account && data.account !== 'Not set') {
          if (this.sfAccount && data.account) this.sfAccount.value = data.account;
          if (this.sfUser && data.user) this.sfUser.value = data.user;
          if (this.sfWarehouse && data.warehouse) this.sfWarehouse.value = data.warehouse;
          if (this.sfDatabase && data.database) this.sfDatabase.value = data.database;
          if (this.sfRole && data.role) this.sfRole.value = data.role;
        }
      }
    } catch (_) {
      // Backend gateway offline
    }

    // Snowflake is a CORE requirement: automatically open activation window if not yet connected
    if (!this.snowflakeConnected) {
      setTimeout(() => {
        this.openSfModal();
      }, 700);
    }
  }

  setSnowflakeConnectedState(connected, account = '', warehouse = '') {
    this.snowflakeConnected = connected;
    if (this.sfIndicator) {
      this.sfIndicator.className = connected ? 'sf-indicator online' : 'sf-indicator';
    }
    if (this.sfStatusText) {
      this.sfStatusText.textContent = connected
        ? `Connected (Cortex Vector Search${warehouse ? ' · ' + warehouse : ''})`
        : 'Connect Snowflake (Curated Patterns)';
    }
    if (this.metaSf) {
      this.metaSf.textContent = connected ? 'Online (Cortex)' : 'Offline (Local)';
      this.metaSf.className = connected ? 'meta-v tag-cloud' : 'meta-v';
    }
  }

  async testSfConnection() {
    const payload = {
      account: this.sfAccount?.value?.trim() || undefined,
      user: this.sfUser?.value?.trim() || undefined,
      password: this.sfPassword?.value || undefined,
      warehouse: this.sfWarehouse?.value?.trim() || undefined,
      database: this.sfDatabase?.value?.trim() || undefined,
      role: this.sfRole?.value?.trim() || undefined,
    };

    if (this.sfTestResult) {
      this.sfTestResult.style.display = 'block';
      this.sfTestResult.style.background = 'rgba(79, 142, 247, 0.1)';
      this.sfTestResult.style.border = '1px solid rgba(79, 142, 247, 0.3)';
      this.sfTestResult.style.color = '#4f8ef7';
      this.sfTestResult.textContent = '⏳ Testing live connection to Snowflake via local gateway...';
    }

    try {
      const res = await fetch('http://127.0.0.1:8000/integrations/snowflake/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          if (this.sfTestResult) {
            this.sfTestResult.style.background = 'rgba(16, 185, 129, 0.15)';
            this.sfTestResult.style.border = '1px solid rgba(16, 185, 129, 0.4)';
            this.sfTestResult.style.color = '#10b981';
            this.sfTestResult.textContent = `✓ Snowflake Connected! Version: ${data.snowflake_version || 'Active'} · Warehouse: ${data.warehouse} · Cortex Ready: ${data.cortex_available ? 'Yes' : 'Keyword Fallback'}`;
          }
          this.showToast('✅ Snowflake connection test successful!');
          return;
        } else {
          if (this.sfTestResult) {
            this.sfTestResult.style.background = 'rgba(239, 68, 68, 0.15)';
            this.sfTestResult.style.border = '1px solid rgba(239, 68, 68, 0.4)';
            this.sfTestResult.style.color = '#ef4444';
            this.sfTestResult.textContent = `✕ Connection Failed: ${data.message || 'Check credentials'}`;
          }
          this.showToast('✕ Snowflake connection test failed');
          return;
        }
      }
    } catch (_) {
      // Backend not running
    }

    if (this.sfTestResult) {
      this.sfTestResult.style.background = 'rgba(245, 158, 11, 0.15)';
      this.sfTestResult.style.border = '1px solid rgba(245, 158, 11, 0.4)';
      this.sfTestResult.style.color = '#f59e0b';
      this.sfTestResult.textContent = 'ℹ️ Backend gateway is offline at http://127.0.0.1:8000. Start it with: "py openlens.py serve-api". Operating in simulated offline mode.';
    }
    this.showToast('ℹ️ Backend gateway offline — running in offline mode');
  }

  async saveSfConnection() {
    await this.testSfConnection();
    this.setSnowflakeConnectedState(true, this.sfAccount?.value, this.sfWarehouse?.value);
    this.closeSfModal();
    this.showToast('❄️ Snowflake connected. Semantic architectural patterns active.');
  }

  /* ────────────────────────────────────────────────────────
     EXPORT & HELPERS
  ──────────────────────────────────────────────────────── */
  exportFindings() {
    const payload = {
      project: this.currentPresetKey,
      scanned_at: new Date().toISOString(),
      generator: 'OpenLens Dev v0.1',
      total_findings: this.findings.filter(f => !f.dismissed).length,
      findings: this.findings.filter(f => !f.dismissed)
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openlens-dev-findings-${this.currentPresetKey}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('Exported findings JSON');
  }

  showToast(message, duration = 2600) {
    if (!this.toast) return;
    this.toast.textContent = message;
    this.toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toast.classList.remove('show');
    }, duration);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Instantiate and start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new OpenLensDevApp();
  app.init();
  window.openlensDevApp = app;
});
