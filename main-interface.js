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
            // Collect patient data
            appState.patientData = collectPatientData();

            // Create eligibility engine
            const engine = new EligibilityEngine();

            // Evaluate all protocols
            const results = engine.evaluateAllProtocols(
                appState.currentIndication,
                appState.patientData
            );

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
// DEBUG MODE
// ============================================================================

function toggleDebugMode() {
    appState.debugMode = document.getElementById('debugToggle').checked;

    const panel = document.getElementById('debugPanel');
    if (appState.debugMode) {
        panel.classList.add('active');
        updateDebugPanel();
    } else {
        panel.classList.remove('active');
    }

    console.log('[Main Interface] Debug mode:', appState.debugMode ? 'ON' : 'OFF');
}

function updateDebugPanel() {
    if (!appState.debugMode) return;

    const debugInfo = {
        timestamp: new Date().toISOString(),
        indication: appState.currentIndication,
        totalProtocols: protocols.length,
        activeProtocols: protocols.filter(p => p.active !== false).length,
        patientData: appState.patientData,
        evaluationResults: appState.evaluationResults ? {
            total: appState.evaluationResults.length,
            eligible: appState.evaluationResults.filter(r => r.eligible).length,
            screenFailure: appState.evaluationResults.filter(r => !r.eligible && r.status !== 'pending').length,
            pending: appState.evaluationResults.filter(r => r.status === 'pending').length,
            details: appState.evaluationResults
        } : null
    };

    document.getElementById('debugContent').textContent = JSON.stringify(debugInfo, null, 2);
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
