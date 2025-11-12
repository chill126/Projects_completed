/**
 * ============================================================================
 * MAIN INTERFACE LOGIC - PART 3: USER INTERFACE
 * ============================================================================
 * Handles UI interactions, state management, and results display
 * Version: 1.0.0
 */

// ============================================================================
// APPLICATION STATE
// ============================================================================

const appState = {
    currentIndication: null,
    patientData: null,
    evaluationResults: null,
    filteredResults: null,
    selectedProtocolId: null,
    debugMode: false,
    lastEvaluationTimestamp: null
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[Main Interface] Initializing...');

    // Update protocol count badges
    updateProtocolBadges();

    // Set up keyboard shortcuts
    setupKeyboardShortcuts();

    console.log('[Main Interface] Ready');
    console.log('[Main Interface] Total protocols loaded:', protocols.length);
});

function updateProtocolBadges() {
    const indications = ['Psych', 'Neuro', 'AUD', 'Other'];

    indications.forEach(indication => {
        const count = protocols.filter(p =>
            p.indication === indication && p.active !== false
        ).length;

        const badge = document.getElementById(`badge-${indication}`);
        if (badge) {
            badge.textContent = count;
        }
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+Enter to calculate eligibility
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            calculateEligibility();
        }

        // Escape to close details panel
        if (e.key === 'Escape') {
            closeDetailsPanel();
        }
    });
}

// ============================================================================
// INDICATION SELECTION
// ============================================================================

function selectIndication(indication) {
    appState.currentIndication = indication;

    // Update button states
    document.querySelectorAll('.indication-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const selectedBtn = document.querySelector(`[data-indication="${indication}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }

    // Update hint text
    const hint = document.getElementById('calculateHint');
    const protocolCount = protocols.filter(p =>
        p.indication === indication && p.active !== false
    ).length;

    if (protocolCount === 0) {
        hint.textContent = `No active protocols for ${indication}. Add protocols using the Protocol Builder.`;
    } else {
        hint.textContent = `Ready to evaluate against ${protocolCount} active ${indication} protocol${protocolCount !== 1 ? 's' : ''}`;
    }

    console.log('[Main Interface] Selected indication:', indication);
}

// ============================================================================
// PATIENT DATA COLLECTION
// ============================================================================

function collectPatientData() {
    const data = {
        // Demographics
        age: getValue('age', 'number'),
        gender: getValue('gender'),
        race: getValue('race'),

        // Assessment Scores
        phq9_score: getValue('phq9_score', 'number'),
        gad7_score: getValue('gad7_score', 'number'),
        mmse_score: getValue('mmse_score', 'number'),

        // Clinical History
        active_si: getValue('active_si', 'boolean'),
        psychosis_history: getValue('psychosis_history', 'boolean'),
        substance_abuse: getValue('substance_abuse', 'boolean'),

        // Medications
        medications: getMedications()
    };

    return data;
}

function getValue(fieldId, type = 'string') {
    const element = document.getElementById(fieldId);
    if (!element || !element.value) return null;

    const value = element.value.trim();
    if (!value) return null;

    switch (type) {
        case 'number':
            return parseFloat(value);
        case 'boolean':
            return value === 'true' ? true : value === 'false' ? false : null;
        default:
            return value;
    }
}

function getMedications() {
    const medicationsText = document.getElementById('medications').value;
    if (!medicationsText) return [];

    return medicationsText
        .split(',')
        .map(m => m.trim())
        .filter(m => m);
}

// ============================================================================
// CALCULATE ELIGIBILITY
// ============================================================================

function calculateEligibility() {
    // Validate indication selected
    if (!appState.currentIndication) {
        alert('Please select a study indication first');
        return;
    }

    // Check if protocols exist for indication
    const activeProtocols = protocols.filter(p =>
        p.indication === appState.currentIndication && p.active !== false
    );

    if (activeProtocols.length === 0) {
        alert(`No active protocols found for ${appState.currentIndication}. Please add protocols using the Protocol Builder.`);
        return;
    }

    // Show loading state
    const btn = document.getElementById('calculateBtn');
    btn.classList.add('loading');
    btn.disabled = true;

    // Simulate async operation (in real app might be API call)
    setTimeout(() => {
        try {
            // Start timing
            debugState.evaluationStartTime = performance.now();

            // Collect patient data
            appState.patientData = collectPatientData();

            // Create eligibility engine
            const engine = new EligibilityEngine();

            // Evaluate all protocols with individual timing
            const results = [];
            activeProtocols.forEach(protocol => {
                const protocolStart = performance.now();
                const result = engine.evaluateProtocol(protocol.protocolId, appState.patientData);
                const protocolEnd = performance.now();

                debugState.protocolTimings[protocol.protocolId] = Math.round(protocolEnd - protocolStart);
                results.push(result);
            });

            // End timing
            debugState.evaluationEndTime = performance.now();

            // Store results
            appState.evaluationResults = results;
            appState.filteredResults = results;
            appState.lastEvaluationTimestamp = new Date();

            // Display results
            displayResults();

            // Update debug panel if active
            if (appState.debugMode) {
                updateDebugPanel();
            }

        } catch (error) {
            console.error('[Main Interface] Evaluation error:', error);
            alert('Error evaluating eligibility. Check console for details.');
        } finally {
            // Remove loading state
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }, 500);
}

// ============================================================================
// DISPLAY RESULTS
// ============================================================================

function displayResults() {
    const results = appState.evaluationResults;

    if (!results || results.length === 0) {
        displayEmptyState();
        return;
    }

    // Show results section
    document.getElementById('resultsSection').classList.remove('hidden');

    // Update header
    document.getElementById('resultsIndication').textContent = appState.currentIndication;
    document.getElementById('resultsTimestamp').textContent =
        'Evaluated on ' + appState.lastEvaluationTimestamp.toLocaleString();

    // Update summary
    updateResultsSummary(results);

    // Render protocol cards
    renderProtocolCards(results);

    // Scroll to results
    document.getElementById('resultsSection').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function displayEmptyState() {
    const grid = document.getElementById('protocolsGrid');
    grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-text">No active protocols found</div>
            <div class="empty-state-subtext">
                Add protocols using the Protocol Builder to begin evaluating patients
            </div>
        </div>
    `;

    document.getElementById('resultsSection').classList.remove('hidden');
    document.getElementById('resultsSummary').innerHTML = '';
}

function updateResultsSummary(results) {
    const total = results.length;
    const eligible = results.filter(r => r.eligible === true).length;
    const screenFailure = results.filter(r => r.eligible === false).length;
    const pending = results.filter(r => r.status === 'pending').length;

    const summaryHTML = `
        <div class="summary-stat">
            <div class="summary-stat-value">${total}</div>
            <div class="summary-stat-label">Total Protocols</div>
        </div>
        <div class="summary-stat">
            <div class="summary-stat-value eligible">${eligible}</div>
            <div class="summary-stat-label">Eligible</div>
        </div>
        <div class="summary-stat">
            <div class="summary-stat-value screen-failure">${screenFailure}</div>
            <div class="summary-stat-label">Screen Failures</div>
        </div>
        <div class="summary-stat">
            <div class="summary-stat-value pending">${pending}</div>
            <div class="summary-stat-label">Pending Data</div>
        </div>
    `;

    document.getElementById('resultsSummary').innerHTML = summaryHTML;
}

function renderProtocolCards(results) {
    const grid = document.getElementById('protocolsGrid');

    if (!results || results.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><p>No results to display</p></div>';
        return;
    }

    let html = '';

    results.forEach(result => {
        const statusClass = result.eligible ? 'eligible' :
            result.status === 'pending' ? 'pending' : 'screen-failure';

        const statusIcon = result.eligible ? '✓' :
            result.status === 'pending' ? '⚠' : '✗';

        const statusLabel = result.eligible ? 'ELIGIBLE' :
            result.status === 'pending' ? 'PENDING DATA' : 'SCREEN FAILURE';

        // Create summary of why patient is/isn't eligible
        let summary = '';
        if (result.eligible) {
            summary = 'Patient meets all inclusion criteria and no exclusions apply.';
        } else if (result.status === 'pending') {
            const pendingCount = [
                ...result.inclusionResults.filter(c => c.met === null),
                ...result.exclusionResults.filter(c => c.met === null)
            ].length;
            summary = `${pendingCount} criteria cannot be evaluated due to missing patient data.`;
        } else {
            const unmetInclusion = result.inclusionResults.filter(c => c.met === false).length;
            const metExclusion = result.exclusionResults.filter(c => c.met === true).length;
            const reasons = [];
            if (unmetInclusion > 0) reasons.push(`${unmetInclusion} inclusion criteria not met`);
            if (metExclusion > 0) reasons.push(`${metExclusion} exclusion criteria met`);
            summary = reasons.join(', ') + '.';
        }

        html += `
            <div class="protocol-card ${statusClass}"
                 data-protocol-id="${result.protocolId}"
                 onclick="showProtocolDetails('${result.protocolId}')">
                <div class="protocol-card-header">
                    <div>
                        <div class="protocol-card-title">${result.protocolName}</div>
                        <div class="protocol-card-id">ID: ${result.protocolId}</div>
                    </div>
                    <div class="protocol-status-icon ${statusClass}">${statusIcon}</div>
                </div>
                <div>
                    <span class="protocol-status-label ${statusClass}">${statusLabel}</span>
                </div>
                <div class="protocol-summary">${summary}</div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

// ============================================================================
// DETAILED RESULTS PANEL
// ============================================================================

function showProtocolDetails(protocolId) {
    // Find result
    const result = appState.evaluationResults.find(r => r.protocolId === protocolId);
    if (!result) {
        console.error('[Main Interface] Protocol not found:', protocolId);
        return;
    }

    // Update selected state
    appState.selectedProtocolId = protocolId;
    document.querySelectorAll('.protocol-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-protocol-id="${protocolId}"]`).classList.add('selected');

    // Update panel header
    document.getElementById('detailsTitle').textContent = result.protocolName;
    document.getElementById('detailsId').textContent = `Protocol ID: ${result.protocolId}`;

    // Build panel content
    const statusClass = result.eligible ? 'eligible' :
        result.status === 'pending' ? 'pending' : 'screen-failure';

    const statusLabel = result.eligible ? 'ELIGIBLE FOR STUDY' :
        result.status === 'pending' ? 'PENDING - MISSING DATA' : 'SCREEN FAILURE';

    let contentHTML = `
        <!-- Eligibility Summary -->
        <div class="details-section">
            <div class="eligibility-summary-box ${statusClass}">
                <div class="summary-determination ${statusClass}">${statusLabel}</div>
                <div class="summary-explanation">${generateSummaryExplanation(result)}</div>
            </div>
        </div>

        <!-- Inclusion Criteria -->
        <div class="details-section">
            <div class="details-section-title">Inclusion Criteria</div>
            ${renderCriteriaDetails(result.inclusionResults)}
        </div>

        <!-- Exclusion Criteria -->
        ${result.exclusionResults.length > 0 ? `
            <div class="details-section">
                <div class="details-section-title">Exclusion Criteria</div>
                ${renderCriteriaDetails(result.exclusionResults, true)}
            </div>
        ` : ''}
    `;

    document.getElementById('detailsContent').innerHTML = contentHTML;

    // Show panel
    document.getElementById('detailsOverlay').classList.add('active');
    document.getElementById('detailsPanel').classList.add('active');
}

function generateSummaryExplanation(result) {
    if (result.eligible) {
        return 'This patient meets all inclusion criteria and does not meet any exclusion criteria. The patient is eligible for enrollment in this study.';
    } else if (result.status === 'pending') {
        const pendingCriteria = [
            ...result.inclusionResults.filter(c => c.met === null),
            ...result.exclusionResults.filter(c => c.met === null)
        ];

        let explanation = 'Cannot determine eligibility due to missing patient data. The following information is needed:<ul style="margin: 12px 0 0 20px;">';
        pendingCriteria.forEach(c => {
            explanation += `<li>${c.description}</li>`;
        });
        explanation += '</ul>';
        return explanation;
    } else {
        const unmetInclusion = result.inclusionResults.filter(c => c.met === false);
        const metExclusion = result.exclusionResults.filter(c => c.met === true);

        let explanation = 'This patient does not meet eligibility criteria for the following reasons:<ul style="margin: 12px 0 0 20px;">';

        if (unmetInclusion.length > 0) {
            unmetInclusion.forEach(c => {
                explanation += `<li><strong>Unmet Inclusion:</strong> ${c.description}</li>`;
            });
        }

        if (metExclusion.length > 0) {
            metExclusion.forEach(c => {
                explanation += `<li><strong>Met Exclusion:</strong> ${c.description}</li>`;
            });
        }

        explanation += '</ul>';
        return explanation;
    }
}

function renderCriteriaDetails(criteria, isExclusion = false) {
    if (!criteria || criteria.length === 0) {
        return '<p style="color: #6b7280; font-style: italic;">No criteria defined</p>';
    }

    let html = '';

    criteria.forEach(criterion => {
        // For exclusion criteria, the logic is inverted
        // met=true means patient IS excluded (bad)
        // met=false means patient is NOT excluded (good)
        const icon = criterion.met === null ? '⚠' :
            isExclusion ? (criterion.met ? '✗' : '✓') :
            (criterion.met ? '✓' : '✗');

        const statusClass = criterion.met === null ? 'pending-data' :
            isExclusion ? (criterion.met ? 'not-met' : 'met') :
            (criterion.met ? 'met' : 'not-met');

        html += `
            <div class="criteria-item ${statusClass}">
                <div class="criteria-item-header">
                    <div class="criteria-icon ${statusClass}">${icon}</div>
                    <div class="criteria-description">${criterion.description}</div>
                </div>
                ${criterion.reason ? `
                    <div class="criteria-reason">${criterion.reason}</div>
                ` : ''}
            </div>
        `;
    });

    return html;
}

function closeDetailsPanel() {
    document.getElementById('detailsOverlay').classList.remove('active');
    document.getElementById('detailsPanel').classList.remove('active');

    // Clear selected state
    document.querySelectorAll('.protocol-card').forEach(card => {
        card.classList.remove('selected');
    });

    appState.selectedProtocolId = null;
}

// ============================================================================
// FILTERING AND SORTING
// ============================================================================

function filterResults(filter) {
    if (!appState.evaluationResults) return;

    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

    // Filter results
    let filtered = appState.evaluationResults;

    switch (filter) {
        case 'eligible':
            filtered = filtered.filter(r => r.eligible === true);
            break;
        case 'screen-failure':
            filtered = filtered.filter(r => r.eligible === false && r.status !== 'pending');
            break;
        case 'pending':
            filtered = filtered.filter(r => r.status === 'pending');
            break;
        // 'all' - no filtering
    }

    appState.filteredResults = filtered;

    // Re-render
    renderProtocolCards(filtered);

    console.log('[Main Interface] Filtered to:', filter, '- showing', filtered.length, 'results');
}

function sortResults() {
    if (!appState.filteredResults) return;

    const sortBy = document.getElementById('sortSelect').value;
    let sorted = [...appState.filteredResults];

    switch (sortBy) {
        case 'name':
            sorted.sort((a, b) => a.protocolName.localeCompare(b.protocolName));
            break;
        case 'status':
            // Eligible first, then screen failure, then pending
            sorted.sort((a, b) => {
                const scoreA = a.eligible ? 3 : a.status === 'pending' ? 1 : 2;
                const scoreB = b.eligible ? 3 : b.status === 'pending' ? 1 : 2;
                return scoreB - scoreA;
            });
            break;
    }

    appState.filteredResults = sorted;
    renderProtocolCards(sorted);

    console.log('[Main Interface] Sorted by:', sortBy);
}

// ============================================================================
// EXPORT RESULTS
// ============================================================================

function exportResults() {
    if (!appState.evaluationResults || !appState.patientData) {
        alert('No results to export. Please calculate eligibility first.');
        return;
    }

    // Create export data
    const exportData = {
        exportTimestamp: new Date().toISOString(),
        indication: appState.currentIndication,
        evaluationTimestamp: appState.lastEvaluationTimestamp.toISOString(),
        patientData: appState.patientData,
        summary: {
            total: appState.evaluationResults.length,
            eligible: appState.evaluationResults.filter(r => r.eligible).length,
            screenFailure: appState.evaluationResults.filter(r => !r.eligible && r.status !== 'pending').length,
            pending: appState.evaluationResults.filter(r => r.status === 'pending').length
        },
        results: appState.evaluationResults.map(r => ({
            protocolId: r.protocolId,
            protocolName: r.protocolName,
            eligible: r.eligible,
            status: r.status,
            reasons: r.reasons,
            inclusionResults: r.inclusionResults.map(c => ({
                description: c.description,
                met: c.met,
                reason: c.reason
            })),
            exclusionResults: r.exclusionResults.map(c => ({
                description: c.description,
                met: c.met,
                reason: c.reason
            }))
        }))
    };

    // Create and download JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `eligibility_results_${appState.currentIndication}_${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);

    console.log('[Main Interface] Results exported');

    // Show success message
    showToast('Results exported successfully', 'success');
}

// ============================================================================
// DEBUG MODE - ENHANCED DEBUGGER (PART 4B)
// ============================================================================

const debugState = {
    evaluationStartTime: null,
    evaluationEndTime: null,
    protocolTimings: {},
    debugLog: [],
    isExpanded: true,
    verbosityLevel: 'detailed', // 'minimal', 'standard', 'detailed', 'verbose'
    filterMode: 'all', // 'all', 'failed', 'passed', 'pending'
    searchQuery: '',
    maxLogHistory: 10,
    errorsAndWarnings: []
};

function toggleDebugMode() {
    appState.debugMode = document.getElementById('debugToggle').checked;

    const panel = document.getElementById('debugPanel');
    if (appState.debugMode) {
        panel.classList.add('active');
        if (appState.evaluationResults) {
            updateDebugPanel();
        } else {
            showEmptyDebugPanel();
        }
    } else {
        panel.classList.remove('active');
    }

    console.log('[Main Interface] Debug mode:', appState.debugMode ? 'ON' : 'OFF');
}

function showEmptyDebugPanel() {
    const content = document.getElementById('debugContent');
    content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #9ca3af;">
            <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">🐛</div>
            <div style="font-size: 16px; margin-bottom: 8px;">No evaluation data available</div>
            <div style="font-size: 14px; opacity: 0.7;">Calculate eligibility to see detailed debug information</div>
        </div>
    `;
}

function updateDebugPanel() {
    if (!appState.debugMode || !appState.evaluationResults) return;

    const totalEvaluationTime = debugState.evaluationEndTime - debugState.evaluationStartTime;
    const totalCriteria = appState.evaluationResults.reduce((sum, r) => {
        return sum + r.inclusionResults.length + r.exclusionResults.length;
    }, 0);

    // Performance warning detection
    const totalTime = Math.round(totalEvaluationTime);
    const perfClass = totalTime > 500 ? 'error' : totalTime > 100 ? 'warning' : 'normal';

    // Build debug panel HTML
    let html = `
        <!-- Debug Header -->
        <div class="debug-header">
            <div class="debug-header-left">
                <div class="debug-header-title">
                    <span style="font-size: 20px; margin-right: 8px;">🐛</span>
                    Eligibility Engine Debugger
                    <span class="debug-version">v2.0</span>
                </div>
                <div class="debug-header-timestamp">
                    Last evaluation: ${appState.lastEvaluationTimestamp.toLocaleString()}
                </div>
            </div>
            <div class="debug-header-stats">
                <div class="debug-stat">
                    <div class="debug-stat-value">${appState.evaluationResults.length}</div>
                    <div class="debug-stat-label">Protocols</div>
                </div>
                <div class="debug-stat">
                    <div class="debug-stat-value">${totalCriteria}</div>
                    <div class="debug-stat-label">Criteria</div>
                </div>
                <div class="debug-stat ${perfClass}">
                    <div class="debug-stat-value">${totalTime}ms</div>
                    <div class="debug-stat-label">Eval Time ${perfClass === 'warning' ? '⚠' : perfClass === 'error' ? '🔴' : ''}</div>
                </div>
                <div class="debug-stat">
                    <div class="debug-stat-value">${debugState.debugLog.length}</div>
                    <div class="debug-stat-label">History</div>
                </div>
            </div>
            <div class="debug-header-actions">
                <button class="debug-btn" onclick="toggleDebugExpansion()">
                    ${debugState.isExpanded ? '▼ Collapse All' : '▶ Expand All'}
                </button>
                <button class="debug-btn" onclick="clearDebugLog()">🗑️ Clear</button>
                <button class="debug-btn" onclick="exportDebugLog()">📥 Export</button>
                <button class="debug-btn" onclick="copyDebugInfo()">📋 Copy</button>
            </div>
        </div>

        <!-- Global Debug Controls -->
        <div class="debug-controls">
            <div class="debug-controls-row">
                <div class="debug-control-group">
                    <label class="debug-control-label">Filter:</label>
                    <div class="debug-filter-buttons">
                        <button class="debug-filter-btn ${debugState.filterMode === 'all' ? 'active' : ''}"
                                onclick="setDebugFilter('all')">All</button>
                        <button class="debug-filter-btn ${debugState.filterMode === 'failed' ? 'active' : ''}"
                                onclick="setDebugFilter('failed')">Failed</button>
                        <button class="debug-filter-btn ${debugState.filterMode === 'passed' ? 'active' : ''}"
                                onclick="setDebugFilter('passed')">Passed</button>
                        <button class="debug-filter-btn ${debugState.filterMode === 'pending' ? 'active' : ''}"
                                onclick="setDebugFilter('pending')">Pending</button>
                    </div>
                </div>
                <div class="debug-control-group">
                    <label class="debug-control-label">Verbosity:</label>
                    <select class="debug-select" id="debugVerbosity" onchange="setDebugVerbosity(this.value)">
                        <option value="minimal" ${debugState.verbosityLevel === 'minimal' ? 'selected' : ''}>Minimal</option>
                        <option value="standard" ${debugState.verbosityLevel === 'standard' ? 'selected' : ''}>Standard</option>
                        <option value="detailed" ${debugState.verbosityLevel === 'detailed' ? 'selected' : ''}>Detailed</option>
                        <option value="verbose" ${debugState.verbosityLevel === 'verbose' ? 'selected' : ''}>Verbose</option>
                    </select>
                </div>
                <div class="debug-control-group flex-grow">
                    <label class="debug-control-label">Search:</label>
                    <input type="text" class="debug-search" id="debugSearch" placeholder="Search protocols, criteria..."
                           value="${debugState.searchQuery}" oninput="handleDebugSearch(this.value)">
                </div>
            </div>
        </div>

        ${debugState.debugLog.length > 1 ? `
        <!-- Debug Log History -->
        <div class="debug-history">
            <label class="debug-control-label">View Previous Evaluation:</label>
            <select class="debug-select" id="debugHistory" onchange="loadDebugHistory(this.value)">
                <option value="current">Current (${appState.lastEvaluationTimestamp.toLocaleTimeString()})</option>
                ${debugState.debugLog.slice(0, debugState.maxLogHistory - 1).map((log, idx) => `
                    <option value="${idx}">Evaluation ${idx + 1} (${new Date(log.timestamp).toLocaleTimeString()})</option>
                `).join('')}
            </select>
        </div>
        ` : ''}

        ${perfClass !== 'normal' ? `
        <!-- Performance Warning -->
        <div class="debug-warning ${perfClass}">
            <strong>⚠ Performance ${perfClass === 'error' ? 'Error' : 'Warning'}:</strong>
            Evaluation took ${totalTime}ms (threshold: ${perfClass === 'error' ? '500ms' : '100ms'})
            ${perfClass === 'error' ? ' - Consider optimizing criteria evaluation functions or reducing protocol count.' : ''}
        </div>
        ` : ''}

        <!-- Patient Data Snapshot -->
        <div class="debug-section">
            <div class="debug-section-header" onclick="toggleDebugSection('patient-data')">
                <span class="debug-section-arrow" id="arrow-patient-data">▼</span>
                <span class="debug-section-title">Patient Data Snapshot</span>
            </div>
            <div class="debug-section-content" id="content-patient-data">
                <pre class="debug-json">${JSON.stringify(appState.patientData, null, 2)}</pre>
            </div>
        </div>

        <!-- Protocol Evaluations -->
        <div class="debug-protocols">
            ${renderProtocolDebugSections()}
        </div>
    `;

    document.getElementById('debugContent').innerHTML = html;

    // Add to debug log
    debugState.debugLog.push({
        timestamp: new Date().toISOString(),
        indication: appState.currentIndication,
        results: appState.evaluationResults,
        patientData: appState.patientData,
        timings: {
            total: totalEvaluationTime,
            protocols: debugState.protocolTimings
        }
    });
}

function renderProtocolDebugSections() {
    if (!appState.evaluationResults) return '';

    let html = '';
    let filteredResults = appState.evaluationResults;

    // Apply filter
    if (debugState.filterMode !== 'all') {
        filteredResults = filteredResults.filter(result => {
            if (debugState.filterMode === 'failed') return result.eligible === false && result.status !== 'pending';
            if (debugState.filterMode === 'passed') return result.eligible === true;
            if (debugState.filterMode === 'pending') return result.status === 'pending';
            return true;
        });
    }

    // Apply search query
    if (debugState.searchQuery) {
        const query = debugState.searchQuery.toLowerCase();
        filteredResults = filteredResults.filter(result => {
            const nameMatch = result.protocolName.toLowerCase().includes(query);
            const idMatch = result.protocolId.toLowerCase().includes(query);
            const criteriaMatch = [...result.inclusionResults, ...result.exclusionResults]
                .some(c => c.description.toLowerCase().includes(query));
            return nameMatch || idMatch || criteriaMatch;
        });
    }

    if (filteredResults.length === 0) {
        return '<div style="text-align: center; padding: 40px; color: #9ca3af;">No protocols match the current filter/search criteria</div>';
    }

    filteredResults.forEach((result, index) => {
        const statusClass = result.eligible ? 'eligible' :
            result.status === 'pending' ? 'pending' : 'screen-failure';

        const statusBadge = result.eligible ? '✓ ELIGIBLE' :
            result.status === 'pending' ? '⚠ PENDING' : '✗ SCREEN FAILURE';

        const protocolTiming = debugState.protocolTimings[result.protocolId] || 0;

        html += `
            <div class="debug-protocol-section ${statusClass}">
                <div class="debug-protocol-header" onclick="toggleDebugSection('protocol-${index}')">
                    <div class="debug-protocol-header-left">
                        <span class="debug-section-arrow" id="arrow-protocol-${index}">▼</span>
                        <div>
                            <div class="debug-protocol-name">${result.protocolName}</div>
                            <div class="debug-protocol-id">ID: ${result.protocolId}</div>
                        </div>
                    </div>
                    <div class="debug-protocol-header-right">
                        <span class="debug-protocol-badge ${statusClass}">${statusBadge}</span>
                        <span class="debug-protocol-time">${protocolTiming}ms</span>
                    </div>
                </div>

                <div class="debug-protocol-content" id="content-protocol-${index}">
                    <!-- Evaluation Metadata -->
                    <div class="debug-subsection">
                        <div class="debug-subsection-title">Evaluation Metadata</div>
                        <div class="debug-metadata">
                            <div class="debug-metadata-row">
                                <span class="debug-metadata-label">Evaluation Time:</span>
                                <span class="debug-metadata-value">${protocolTiming}ms</span>
                            </div>
                            <div class="debug-metadata-row">
                                <span class="debug-metadata-label">Total Criteria:</span>
                                <span class="debug-metadata-value">${result.inclusionResults.length + result.exclusionResults.length}</span>
                            </div>
                            <div class="debug-metadata-row">
                                <span class="debug-metadata-label">Overall Status:</span>
                                <span class="debug-metadata-value ${statusClass}">${statusBadge}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Inclusion Criteria Tracking -->
                    <div class="debug-subsection">
                        <div class="debug-subsection-title">
                            Inclusion Criteria (${result.inclusionResults.length})
                        </div>
                        ${renderCriteriaDebugTable(result.inclusionResults, false)}
                    </div>

                    <!-- Exclusion Criteria Tracking -->
                    ${result.exclusionResults.length > 0 ? `
                        <div class="debug-subsection">
                            <div class="debug-subsection-title">
                                Exclusion Criteria (${result.exclusionResults.length})
                                <span style="font-size: 12px; color: #9ca3af; font-weight: normal; margin-left: 8px;">
                                    (✗ Met = Patient Excluded, ✓ Not Met = Patient Passes)
                                </span>
                            </div>
                            ${renderCriteriaDebugTable(result.exclusionResults, true)}
                        </div>
                    ` : ''}

                    <!-- Calculation Breakdown -->
                    <div class="debug-subsection">
                        <div class="debug-subsection-title">Calculation Breakdown</div>
                        ${renderCalculationBreakdown(result)}
                    </div>

                    <!-- Raw Result Data -->
                    <div class="debug-subsection">
                        <div class="debug-subsection-header" onclick="toggleDebugSection('raw-${index}')">
                            <span class="debug-section-arrow" id="arrow-raw-${index}">▶</span>
                            <span class="debug-subsection-title" style="margin: 0;">Raw Result Data (JSON)</span>
                            <button class="debug-copy-btn" onclick="event.stopPropagation(); copyJsonData('${result.protocolId}', ${index})">
                                📋 Copy JSON
                            </button>
                        </div>
                        <div class="debug-section-content" id="content-raw-${index}" style="display: none;">
                            <pre class="debug-json" id="json-${index}">${JSON.stringify(result, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    return html;
}

function renderCriteriaDebugTable(criteria, isExclusion) {
    if (!criteria || criteria.length === 0) {
        return '<p style="color: #9ca3af; font-style: italic; padding: 12px;">No criteria</p>';
    }

    let html = `
        <div class="debug-criteria-table">
            <div class="debug-criteria-header">
                <div class="debug-criteria-col" style="width: 40px;">#</div>
                <div class="debug-criteria-col" style="flex: 2;">Description</div>
                <div class="debug-criteria-col" style="width: 100px;">Status</div>
                <div class="debug-criteria-col" style="flex: 1;">Details</div>
            </div>
    `;

    criteria.forEach((criterion, index) => {
        // For exclusions, invert the visual logic
        const met = criterion.met;
        const statusIcon = met === null ? '⚠' :
            isExclusion ? (met ? '✗' : '✓') :
            (met ? '✓' : '✗');

        const statusClass = met === null ? 'pending' :
            isExclusion ? (met ? 'not-met' : 'met') :
            (met ? 'met' : 'not-met');

        const statusText = met === null ? 'PENDING' :
            isExclusion ? (met ? 'EXCLUDED' : 'PASSES') :
            (met ? 'MET' : 'NOT MET');

        html += `
            <div class="debug-criteria-row ${statusClass}">
                <div class="debug-criteria-col" style="width: 40px; font-weight: 700;">${index + 1}</div>
                <div class="debug-criteria-col" style="flex: 2;">
                    <div class="debug-criteria-desc">${criterion.description}</div>
                    ${criterion.id ? `<div class="debug-criteria-id">ID: ${criterion.id}</div>` : ''}
                </div>
                <div class="debug-criteria-col" style="width: 100px;">
                    <span class="debug-criteria-status ${statusClass}">
                        ${statusIcon} ${statusText}
                    </span>
                </div>
                <div class="debug-criteria-col" style="flex: 1;">
                    <div class="debug-criteria-reason">${criterion.reason || 'No details available'}</div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

function renderCalculationBreakdown(result) {
    const inclusionMet = result.inclusionResults.filter(c => c.met === true).length;
    const inclusionTotal = result.inclusionResults.length;
    const inclusionPending = result.inclusionResults.filter(c => c.met === null).length;

    const exclusionMet = result.exclusionResults.filter(c => c.met === true).length;
    const exclusionTotal = result.exclusionResults.length;
    const exclusionPending = result.exclusionResults.filter(c => c.met === null).length;

    let html = `
        <div class="debug-calculation">
            <!-- Detailed Inclusion Evaluation -->
            <div class="debug-calc-step">
                <div class="debug-calc-label">INCLUSION EVALUATION:</div>
                <div class="debug-calc-details">
                    ${result.inclusionResults.map((c, idx) => {
                        const icon = c.met === null ? '⚠' : c.met ? '✓' : '✗';
                        const detailLine = formatCriterionDetail(c, false);
                        return `<div class="debug-calc-line ${c.met === null ? 'pending' : c.met ? 'met' : 'not-met'}">
                            ${icon} ${c.id || 'inc_' + (idx + 1)}: ${detailLine}
                        </div>`;
                    }).join('')}
                    <div class="debug-calc-result ${inclusionMet === inclusionTotal && inclusionPending === 0 ? 'pass' : 'fail'}">
                        → ${inclusionMet === inclusionTotal && inclusionPending === 0 ?
                            `All ${inclusionTotal} inclusion criteria MET` :
                            inclusionPending > 0 ?
                            `${inclusionPending} criteria PENDING DATA` :
                            `Only ${inclusionMet} of ${inclusionTotal} criteria met`}
                    </div>
                </div>
            </div>

            ${exclusionTotal > 0 ? `
                <!-- Detailed Exclusion Evaluation -->
                <div class="debug-calc-step">
                    <div class="debug-calc-label">EXCLUSION EVALUATION:</div>
                    <div class="debug-calc-details">
                        ${result.exclusionResults.map((c, idx) => {
                            const icon = c.met === null ? '⚠' : c.met ? '✗' : '✓';
                            const detailLine = formatCriterionDetail(c, true);
                            return `<div class="debug-calc-line ${c.met === null ? 'pending' : c.met ? 'not-met' : 'met'}">
                                ${icon} ${c.id || 'exc_' + (idx + 1)}: ${detailLine}
                            </div>`;
                        }).join('')}
                        <div class="debug-calc-result ${exclusionMet === 0 && exclusionPending === 0 ? 'pass' : 'fail'}">
                            → ${exclusionMet === 0 && exclusionPending === 0 ?
                                `No exclusions met - PATIENT PASSES` :
                                exclusionPending > 0 ?
                                `${exclusionPending} exclusions PENDING DATA` :
                                `${exclusionMet} exclusion${exclusionMet > 1 ? 's' : ''} MET - PATIENT EXCLUDED`}
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Final Determination -->
            <div class="debug-calc-step final">
                <div class="debug-calc-label">FINAL DETERMINATION:
                    <strong style="color: ${result.eligible ? '#10b981' : result.status === 'pending' ? '#f59e0b' : '#ef4444'}">
                        ${result.eligible ? 'ELIGIBLE' : result.status === 'pending' ? 'PENDING' : 'SCREEN FAILURE'}
                    </strong>
                </div>
            </div>
        </div>
    `;

    return html;
}

function formatCriterionDetail(criterion, isExclusion) {
    if (criterion.met === null) {
        return `${criterion.description} → PENDING DATA`;
    }

    // Extract details if available
    const details = criterion.details || {};
    let comparison = '';

    if (details.actualValue !== undefined && details.requiredValue !== undefined) {
        const actual = details.actualValue;
        const required = details.requiredValue;
        const op = details.operator || '=';

        if (details.range) {
            // Range check
            comparison = `[${actual} between ${details.range[0]}-${details.range[1]}]`;
        } else {
            // Comparison operator
            comparison = `[${actual} ${op} ${required}]`;
        }

        const status = criterion.met ? 'MET' : 'NOT MET';
        const statusSuffix = isExclusion ?
            (criterion.met ? ' (FAIL - EXCLUDED)' : ' (PASS)') :
            ` → ${status}`;

        return `${criterion.description.substring(0, 50)}${criterion.description.length > 50 ? '...' : ''} ${comparison} ${statusSuffix}`;
    }

    // Fallback to reason
    const status = criterion.met ? 'MET' : 'NOT MET';
    const statusSuffix = isExclusion ?
        (criterion.met ? ' → MET (FAIL - EXCLUDED)' : ' → NOT MET (PASS)') :
        ` → ${status}`;
    return `${criterion.description} ${statusSuffix}`;
}

function toggleDebugSection(sectionId) {
    const content = document.getElementById(`content-${sectionId}`);
    const arrow = document.getElementById(`arrow-${sectionId}`);

    if (!content || !arrow) return;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.textContent = '▼';
    } else {
        content.style.display = 'none';
        arrow.textContent = '▶';
    }
}

function toggleDebugExpansion() {
    debugState.isExpanded = !debugState.isExpanded;

    // Toggle all protocol sections
    document.querySelectorAll('[id^="content-protocol-"]').forEach(el => {
        el.style.display = debugState.isExpanded ? 'block' : 'none';
    });

    document.querySelectorAll('[id^="arrow-protocol-"]').forEach(el => {
        el.textContent = debugState.isExpanded ? '▼' : '▶';
    });

    // Update button text
    event.target.textContent = debugState.isExpanded ? '▼ Collapse All' : '▶ Expand All';
}

function clearDebugLog() {
    if (!confirm('Clear all debug log history? This cannot be undone.')) {
        return;
    }

    debugState.debugLog = [];
    debugState.protocolTimings = {};

    showToast('Debug log cleared', 'info');
    console.log('[Debug] Log cleared');
}

function exportDebugLog() {
    if (debugState.debugLog.length === 0) {
        alert('No debug data to export. Calculate eligibility first.');
        return;
    }

    const exportData = {
        exportedAt: new Date().toISOString(),
        debuggerVersion: '2.0.0',
        totalEvaluations: debugState.debugLog.length,
        log: debugState.debugLog
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `debug_log_${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);

    showToast('Debug log exported', 'success');
    console.log('[Debug] Log exported');
}

function copyDebugInfo() {
    if (!appState.evaluationResults) {
        alert('No debug data to copy. Calculate eligibility first.');
        return;
    }

    const summary = {
        timestamp: appState.lastEvaluationTimestamp.toISOString(),
        indication: appState.currentIndication,
        totalProtocols: appState.evaluationResults.length,
        eligible: appState.evaluationResults.filter(r => r.eligible).length,
        screenFailure: appState.evaluationResults.filter(r => !r.eligible && r.status !== 'pending').length,
        pending: appState.evaluationResults.filter(r => r.status === 'pending').length,
        evaluationTime: Math.round(debugState.evaluationEndTime - debugState.evaluationStartTime) + 'ms',
        results: appState.evaluationResults.map(r => ({
            protocol: r.protocolName,
            status: r.eligible ? 'ELIGIBLE' : r.status === 'pending' ? 'PENDING' : 'SCREEN FAILURE',
            inclusionMet: `${r.inclusionResults.filter(c => c.met).length}/${r.inclusionResults.length}`,
            exclusionMet: r.exclusionResults.filter(c => c.met).length
        }))
    };

    const text = JSON.stringify(summary, null, 2);
    navigator.clipboard.writeText(text).then(() => {
        showToast('Debug info copied to clipboard', 'success');
        console.log('[Debug] Info copied to clipboard');
    }).catch(err => {
        console.error('[Debug] Failed to copy:', err);
        showToast('Failed to copy to clipboard', 'error');
    });
}

function setDebugFilter(mode) {
    debugState.filterMode = mode;
    updateDebugPanel();
    console.log('[Debug] Filter set to:', mode);
}

function setDebugVerbosity(level) {
    debugState.verbosityLevel = level;
    updateDebugPanel();
    console.log('[Debug] Verbosity set to:', level);
}

function handleDebugSearch(query) {
    debugState.searchQuery = query;
    updateDebugPanel();
}

function loadDebugHistory(index) {
    if (index === 'current') {
        updateDebugPanel();
        return;
    }

    const idx = parseInt(index);
    if (idx >= 0 && idx < debugState.debugLog.length) {
        const historicalLog = debugState.debugLog[idx];

        // Temporarily replace current results with historical data
        const savedResults = appState.evaluationResults;
        const savedTimestamp = appState.lastEvaluationTimestamp;
        const savedPatientData = appState.patientData;

        appState.evaluationResults = historicalLog.results;
        appState.lastEvaluationTimestamp = new Date(historicalLog.timestamp);
        appState.patientData = historicalLog.patientData;

        updateDebugPanel();

        // Restore current data after a short delay (so user can see historical view)
        // Note: In a real implementation, you'd want a "lock" to prevent switching back
        // but for this demo we'll just update the panel
        console.log('[Debug] Loaded historical evaluation:', index);
    }
}

function copyJsonData(protocolId, index) {
    const element = document.getElementById(`json-${index}`);
    if (!element) {
        showToast('Failed to find JSON data', 'error');
        return;
    }

    const jsonText = element.textContent;
    navigator.clipboard.writeText(jsonText).then(() => {
        showToast(`JSON data for ${protocolId} copied`, 'success');
        console.log('[Debug] JSON data copied for protocol:', protocolId);
    }).catch(err => {
        console.error('[Debug] Failed to copy JSON:', err);
        showToast('Failed to copy JSON data', 'error');
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#2563eb'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log('[Main Interface] Module loaded successfully');
