/**
 * ============================================================================
 * PROTOCOL BUILDER - JAVASCRIPT CORE
 * ============================================================================
 * UI and logic for building clinical research protocols without code
 * Version: 1.0.0
 * Requires: eligibility-engine.js
 */

// ============================================================================
// PROTOCOL BUILDER STATE
// ============================================================================

const protocolBuilderState = {
    mode: 'list', // 'list', 'create', 'edit'
    currentProtocol: null,
    editingProtocolId: null,
    currentTab: 'basic',
    isDirty: false,
    validationErrors: {},
    draftSaved: false,
    lastSave: null
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    initializeProtocolBuilder();
});

function initializeProtocolBuilder() {
    console.log('[Protocol Builder] Initializing...');

    // Create protocol builder button if it doesn't exist
    createProtocolBuilderButton();

    // Create protocol builder modal if it doesn't exist
    createProtocolBuilderModal();

    // Set up event listeners
    setupEventListeners();

    // Auto-save drafts every 30 seconds
    setInterval(autoSaveDraft, 30000);

    console.log('[Protocol Builder] Ready');
}

function createProtocolBuilderButton() {
    if (document.getElementById('protocolBuilderBtn')) return;

    const button = document.createElement('button');
    button.id = 'protocolBuilderBtn';
    button.className = 'protocol-builder-button';
    button.innerHTML = '⚙️ Add/Edit Protocols';
    button.onclick = openProtocolBuilder;

    document.body.appendChild(button);
}

function createProtocolBuilderModal() {
    if (document.getElementById('protocolBuilderModal')) return;

    const modalHTML = `
        <div id="protocolBuilderModal" class="protocol-builder-modal">
            <div class="protocol-builder-container">
                <!-- Header -->
                <div class="protocol-builder-header">
                    <h2 id="builderTitle">Protocol Builder</h2>
                    <button class="protocol-builder-close" onclick="closeProtocolBuilder()">&times;</button>
                </div>

                <!-- Tabs -->
                <div class="protocol-builder-tabs">
                    <button class="protocol-tab active" data-tab="basic" onclick="switchTab('basic')">Basic Info</button>
                    <button class="protocol-tab" data-tab="inclusion" onclick="switchTab('inclusion')">Inclusion Criteria</button>
                    <button class="protocol-tab" data-tab="exclusion" onclick="switchTab('exclusion')">Exclusion Criteria</button>
                    <button class="protocol-tab" data-tab="preview" onclick="switchTab('preview')">Preview & Test</button>
                </div>

                <!-- Content -->
                <div class="protocol-builder-content" id="builderContent">
                    <!-- List View -->
                    <div id="listView" class="protocol-tab-content active">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                            <h3 style="margin: 0;">Existing Protocols</h3>
                            <button class="pb-btn pb-btn-primary" onclick="startNewProtocol()">
                                + Add New Protocol
                            </button>
                        </div>
                        <div id="protocolListContainer"></div>
                    </div>

                    <!-- Basic Info Tab -->
                    <div id="basicTab" class="protocol-tab-content">
                        <div id="basicInfoForm"></div>
                    </div>

                    <!-- Inclusion Criteria Tab -->
                    <div id="inclusionTab" class="protocol-tab-content">
                        <div id="inclusionCriteriaContainer"></div>
                    </div>

                    <!-- Exclusion Criteria Tab -->
                    <div id="exclusionTab" class="protocol-tab-content">
                        <div id="exclusionCriteriaContainer"></div>
                    </div>

                    <!-- Preview Tab -->
                    <div id="previewTab" class="protocol-tab-content">
                        <div id="protocolPreviewContainer"></div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="protocol-actions" id="protocolActions">
                    <div class="protocol-actions-left">
                        <button class="pb-btn pb-btn-outline" onclick="backToList()">
                            ← Back to List
                        </button>
                        <button class="pb-btn pb-btn-outline" onclick="exportProtocolJSON()">
                            📥 Export JSON
                        </button>
                        <button class="pb-btn pb-btn-outline" onclick="importProtocolJSON()">
                            📤 Import JSON
                        </button>
                    </div>
                    <div class="protocol-actions-right">
                        <button class="pb-btn pb-btn-secondary" onclick="saveDraft()">
                            💾 Save Draft
                        </button>
                        <button class="pb-btn pb-btn-success" onclick="saveProtocol()">
                            ✓ Save Protocol
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    document.body.appendChild(modalDiv.firstElementChild);
}

// ============================================================================
// MODAL CONTROL
// ============================================================================

function openProtocolBuilder() {
    const modal = document.getElementById('protocolBuilderModal');
    if (!modal) {
        console.error('[Protocol Builder] Modal not found');
        return;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Show list view by default
    showListView();
}

function closeProtocolBuilder() {
    if (protocolBuilderState.isDirty && !protocolBuilderState.draftSaved) {
        if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
            return;
        }
    }

    const modal = document.getElementById('protocolBuilderModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';

    resetBuilderState();
}

function resetBuilderState() {
    protocolBuilderState.mode = 'list';
    protocolBuilderState.currentProtocol = null;
    protocolBuilderState.editingProtocolId = null;
    protocolBuilderState.currentTab = 'basic';
    protocolBuilderState.isDirty = false;
    protocolBuilderState.validationErrors = {};
    protocolBuilderState.draftSaved = false;
}

// ============================================================================
// TAB SWITCHING
// ============================================================================

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.protocol-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.protocol-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Show appropriate content
    if (tabName === 'list') {
        document.getElementById('listView').classList.add('active');
    } else {
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    protocolBuilderState.currentTab = tabName;

    // Update preview if on preview tab
    if (tabName === 'preview') {
        updateProtocolPreview();
    }
}

// ============================================================================
// LIST VIEW
// ============================================================================

function showListView() {
    protocolBuilderState.mode = 'list';

    // Hide tabs
    document.querySelector('.protocol-builder-tabs').style.display = 'none';

    // Show list view
    switchTab('list');

    // Render protocol list
    renderProtocolList();

    // Update header
    document.getElementById('builderTitle').textContent = 'Protocol Builder';

    // Hide action buttons except back
    document.querySelector('.protocol-actions-right').style.display = 'none';
}

function renderProtocolList() {
    const container = document.getElementById('protocolListContainer');

    if (protocols.length === 0) {
        container.innerHTML = `
            <div class="protocol-preview-empty">
                <p style="font-size: 16px; margin-bottom: 20px;">No protocols created yet</p>
                <button class="pb-btn pb-btn-primary" onclick="startNewProtocol()">
                    Create Your First Protocol
                </button>
            </div>
        `;
        return;
    }

    let html = '<div class="protocol-list">';

    protocols.forEach(protocol => {
        const statusBadge = protocol.active !== false
            ? '<span class="protocol-list-badge active">Active</span>'
            : '<span class="protocol-list-badge inactive">Inactive</span>';

        const inclusionCount = (protocol.inclusionCriteria || []).length;
        const exclusionCount = (protocol.exclusionCriteria || []).length;

        html += `
            <div class="protocol-list-item ${protocol.active === false ? 'inactive' : ''}">
                <div class="protocol-list-info">
                    <div class="protocol-list-name">${protocol.protocolName}</div>
                    <div class="protocol-list-meta">
                        <span>ID: ${protocol.protocolId}</span>
                        <span>Indication: ${protocol.indication || 'Not set'}</span>
                        <span>${inclusionCount} inclusion, ${exclusionCount} exclusion criteria</span>
                    </div>
                </div>
                <div class="protocol-list-actions">
                    ${statusBadge}
                    <button class="pb-btn pb-btn-outline" onclick="editProtocol('${protocol.protocolId}')">
                        ✏️ Edit
                    </button>
                    <button class="pb-btn pb-btn-outline" onclick="duplicateProtocol('${protocol.protocolId}')">
                        📋 Duplicate
                    </button>
                    <button class="pb-btn pb-btn-danger" onclick="deleteProtocol('${protocol.protocolId}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// ============================================================================
// CREATE/EDIT PROTOCOL
// ============================================================================

function startNewProtocol() {
    protocolBuilderState.mode = 'create';
    protocolBuilderState.currentProtocol = {
        protocolId: '',
        protocolName: '',
        indication: '',
        phase: '',
        sponsor: '',
        active: true,
        inclusionCriteria: [],
        exclusionCriteria: []
    };

    showProtocolForm();
}

function editProtocol(protocolId) {
    const protocol = getProtocol(protocolId);
    if (!protocol) {
        alert('Protocol not found');
        return;
    }

    protocolBuilderState.mode = 'edit';
    protocolBuilderState.editingProtocolId = protocolId;
    protocolBuilderState.currentProtocol = JSON.parse(JSON.stringify(protocol)); // Deep clone

    showProtocolForm();
}

function duplicateProtocol(protocolId) {
    const protocol = getProtocol(protocolId);
    if (!protocol) {
        alert('Protocol not found');
        return;
    }

    const duplicate = JSON.parse(JSON.stringify(protocol));
    duplicate.protocolId = protocol.protocolId + '-COPY';
    duplicate.protocolName = protocol.protocolName + ' (Copy)';
    duplicate.active = false;

    protocolBuilderState.mode = 'create';
    protocolBuilderState.currentProtocol = duplicate;

    showProtocolForm();
}

function deleteProtocol(protocolId) {
    if (!confirm(`Are you sure you want to delete protocol ${protocolId}? This cannot be undone.`)) {
        return;
    }

    if (removeProtocol(protocolId)) {
        showMessage('Protocol deleted successfully', 'success');
        renderProtocolList();
    } else {
        showMessage('Failed to delete protocol', 'error');
    }
}

function showProtocolForm() {
    // Show tabs
    document.querySelector('.protocol-builder-tabs').style.display = 'flex';

    // Show action buttons
    document.querySelector('.protocol-actions-right').style.display = 'flex';

    // Update header
    document.getElementById('builderTitle').textContent =
        protocolBuilderState.mode === 'create' ? 'Create New Protocol' : 'Edit Protocol';

    // Switch to basic info tab
    switchTab('basic');

    // Render forms
    renderBasicInfoForm();
    renderCriteriaForm('inclusion');
    renderCriteriaForm('exclusion');
}

function backToList() {
    if (protocolBuilderState.isDirty && !protocolBuilderState.draftSaved) {
        if (!confirm('You have unsaved changes. Are you sure you want to go back?')) {
            return;
        }
    }

    showListView();
}

// ============================================================================
// BASIC INFO FORM
// ============================================================================

function renderBasicInfoForm() {
    const container = document.getElementById('basicInfoForm');
    const protocol = protocolBuilderState.currentProtocol;

    const html = `
        <div class="pb-form-group">
            <label class="pb-form-label required">Protocol ID</label>
            <input
                type="text"
                class="pb-form-input"
                id="protocolId"
                value="${protocol.protocolId}"
                placeholder="e.g., MDD-PHARMA-001"
                ${protocolBuilderState.mode === 'edit' ? 'readonly' : ''}
                onchange="updateProtocolField('protocolId', this.value)"
            >
            <span class="pb-form-help">Unique identifier for this protocol. Format: COMPOUND-INDICATION-NUMBER</span>
            <span class="pb-form-error" id="error-protocolId"></span>
        </div>

        <div class="pb-form-group">
            <label class="pb-form-label required">Protocol Name</label>
            <input
                type="text"
                class="pb-form-input"
                id="protocolName"
                value="${protocol.protocolName}"
                placeholder="e.g., Phase 3 Study of Novel Antidepressant"
                onchange="updateProtocolField('protocolName', this.value)"
            >
            <span class="pb-form-help">Full descriptive name of the study</span>
            <span class="pb-form-error" id="error-protocolName"></span>
        </div>

        <div class="pb-form-group">
            <label class="pb-form-label required">Indication</label>
            <select
                class="pb-form-select"
                id="indication"
                onchange="updateProtocolField('indication', this.value)"
            >
                <option value="">Select indication...</option>
                <option value="Psych" ${protocol.indication === 'Psych' ? 'selected' : ''}>Psychiatry</option>
                <option value="Neuro" ${protocol.indication === 'Neuro' ? 'selected' : ''}>Neurology</option>
                <option value="AUD" ${protocol.indication === 'AUD' ? 'selected' : ''}>Alcohol Use Disorder</option>
                <option value="Fibromyalgia" ${protocol.indication === 'Fibromyalgia' ? 'selected' : ''}>Fibromyalgia</option>
                <option value="BackPain" ${protocol.indication === 'BackPain' ? 'selected' : ''}>Back Pain</option>
                <option value="Other" ${protocol.indication === 'Other' ? 'selected' : ''}>Other</option>
            </select>
            <span class="pb-form-error" id="error-indication"></span>
        </div>

        <div class="criterion-field-row">
            <div class="pb-form-group">
                <label class="pb-form-label">Phase</label>
                <input
                    type="text"
                    class="pb-form-input"
                    id="phase"
                    value="${protocol.phase || ''}"
                    placeholder="e.g., Phase 3"
                    onchange="updateProtocolField('phase', this.value)"
                >
            </div>

            <div class="pb-form-group">
                <label class="pb-form-label">Sponsor</label>
                <input
                    type="text"
                    class="pb-form-input"
                    id="sponsor"
                    value="${protocol.sponsor || ''}"
                    placeholder="e.g., Example Pharmaceuticals"
                    onchange="updateProtocolField('sponsor', this.value)"
                >
            </div>
        </div>

        <div class="pb-form-group">
            <label class="pb-form-label">Active Status</label>
            <div style="display: flex; align-items: center; gap: 15px;">
                <label class="pb-toggle-switch">
                    <input
                        type="checkbox"
                        id="active"
                        ${protocol.active !== false ? 'checked' : ''}
                        onchange="updateProtocolField('active', this.checked)"
                    >
                    <span class="pb-toggle-slider"></span>
                </label>
                <span class="pb-form-help" style="margin-top: 0;">
                    ${protocol.active !== false ? 'Protocol is active and will be used in evaluations' : 'Protocol is inactive'}
                </span>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function updateProtocolField(field, value) {
    protocolBuilderState.currentProtocol[field] = value;
    protocolBuilderState.isDirty = true;
    protocolBuilderState.draftSaved = false;

    // Clear validation error for this field
    clearValidationError(field);
}

// ============================================================================
// CRITERIA FORM (INCLUSION/EXCLUSION)
// ============================================================================

function renderCriteriaForm(type) {
    const container = document.getElementById(`${type}CriteriaContainer`);
    const criteriaArray = protocolBuilderState.currentProtocol[`${type}Criteria`];

    let html = `
        <h3 style="margin-top: 0; margin-bottom: 20px; color: #1f2937;">
            ${type === 'inclusion' ? 'Inclusion' : 'Exclusion'} Criteria
            <span class="pb-form-help" style="font-weight: normal; margin-left: 10px;">
                (${criteriaArray.length} criteria defined)
            </span>
        </h3>

        <div class="criteria-list" id="${type}CriteriaList">
    `;

    criteriaArray.forEach((criterion, index) => {
        html += renderCriterionItem(criterion, index, type);
    });

    html += `
        </div>

        <button class="add-criterion-btn" onclick="addCriterion('${type}')">
            + Add ${type === 'inclusion' ? 'Inclusion' : 'Exclusion'} Criterion
        </button>
    `;

    container.innerHTML = html;
}

function renderCriterionItem(criterion, index, type) {
    const isCollapsed = criterion.collapsed || false;
    const typeLabel = getCriterionTypeLabel(criterion.type);

    return `
        <div class="criterion-item ${isCollapsed ? 'collapsed' : ''}" data-index="${index}" data-type="${type}">
            <div class="criterion-header" onclick="toggleCriterion(${index}, '${type}')">
                <div class="criterion-title">
                    ${criterion.type ? `<span class="criterion-type-badge">${typeLabel}</span>` : ''}
                    ${criterion.description || '<span class="criterion-title-placeholder">New criterion - click to expand</span>'}
                </div>
                <div class="criterion-controls">
                    ${index > 0 ? `<button class="criterion-btn" onclick="moveCriterion(${index}, '${type}', 'up'); event.stopPropagation();">↑</button>` : ''}
                    ${index < protocolBuilderState.currentProtocol[`${type}Criteria`].length - 1 ? `<button class="criterion-btn" onclick="moveCriterion(${index}, '${type}', 'down'); event.stopPropagation();">↓</button>` : ''}
                    <button class="criterion-btn delete" onclick="removeCriterion(${index}, '${type}'); event.stopPropagation();">🗑️</button>
                </div>
            </div>
            <div class="criterion-content">
                ${renderCriterionForm(criterion, index, type)}
            </div>
        </div>
    `;
}

function renderCriterionForm(criterion, index, type) {
    return `
        <div class="criterion-fields">
            <div class="pb-form-group">
                <label class="pb-form-label required">Description</label>
                <textarea
                    class="pb-form-textarea"
                    rows="2"
                    placeholder="Describe what this criterion checks..."
                    onchange="updateCriterion(${index}, '${type}', 'description', this.value)"
                >${criterion.description || ''}</textarea>
            </div>

            <div class="pb-form-group">
                <label class="pb-form-label required">Evaluation Type</label>
                <select
                    class="pb-form-select"
                    onchange="updateCriterion(${index}, '${type}', 'type', this.value); renderCriteriaForm('${type}');"
                >
                    <option value="">Select type...</option>
                    <option value="boolean" ${criterion.type === 'boolean' ? 'selected' : ''}>Boolean (Yes/No)</option>
                    <option value="numeric" ${criterion.type === 'numeric' ? 'selected' : ''}>Numeric Comparison</option>
                    <option value="range" ${criterion.type === 'range' ? 'selected' : ''}>Numeric Range</option>
                    <option value="duration" ${criterion.type === 'duration' ? 'selected' : ''}>Duration/Time-based</option>
                    <option value="medication" ${criterion.type === 'medication' ? 'selected' : ''}>Medication Check</option>
                    <option value="date" ${criterion.type === 'date' ? 'selected' : ''}>Date Comparison</option>
                    <option value="custom" ${criterion.type === 'custom' ? 'selected' : ''}>Custom Logic</option>
                </select>
            </div>

            ${renderCriterionTypeFields(criterion, index, type)}
        </div>
    `;
}

function renderCriterionTypeFields(criterion, index, type) {
    if (!criterion.type) return '';

    const config = criterion.config || {};

    switch (criterion.type) {
        case 'boolean':
            return `
                <div class="criterion-field-row">
                    <div class="pb-form-group">
                        <label class="pb-form-label">Patient Data Field</label>
                        <input
                            type="text"
                            class="pb-form-input"
                            placeholder="e.g., active_si"
                            value="${config.field || ''}"
                            onchange="updateCriterionConfig(${index}, '${type}', 'field', this.value)"
                        >
                    </div>
                    <div class="pb-form-group">
                        <label class="pb-form-label">Expected Value</label>
                        <select
                            class="pb-form-select"
                            onchange="updateCriterionConfig(${index}, '${type}', 'value', this.value === 'true')"
                        >
                            <option value="true" ${config.value === true ? 'selected' : ''}>Yes (True)</option>
                            <option value="false" ${config.value === false ? 'selected' : ''}>No (False)</option>
                        </select>
                    </div>
                </div>
            `;

        case 'numeric':
            return `
                <div class="criterion-field-row">
                    <div class="pb-form-group">
                        <label class="pb-form-label">Patient Data Field</label>
                        <input
                            type="text"
                            class="pb-form-input"
                            placeholder="e.g., phq9_score"
                            value="${config.field || ''}"
                            onchange="updateCriterionConfig(${index}, '${type}', 'field', this.value)"
                        >
                    </div>
                    <div class="pb-form-group">
                        <label class="pb-form-label">Operator</label>
                        <select
                            class="pb-form-select"
                            onchange="updateCriterionConfig(${index}, '${type}', 'operator', this.value)"
                        >
                            <option value="">Select...</option>
                            <option value=">" ${config.operator === '>' ? 'selected' : ''}>Greater than (>)</option>
                            <option value=">=" ${config.operator === '>=' ? 'selected' : ''}>Greater than or equal (≥)</option>
                            <option value="<" ${config.operator === '<' ? 'selected' : ''}>Less than (<)</option>
                            <option value="<=" ${config.operator === '<=' ? 'selected' : ''}>Less than or equal (≤)</option>
                            <option value="==" ${config.operator === '==' ? 'selected' : ''}>Equal to (=)</option>
                        </select>
                    </div>
                    <div class="pb-form-group">
                        <label class="pb-form-label">Threshold Value</label>
                        <input
                            type="number"
                            class="pb-form-input"
                            placeholder="e.g., 15"
                            value="${config.value || ''}"
                            onchange="updateCriterionConfig(${index}, '${type}', 'value', parseFloat(this.value))"
                        >
                    </div>
                </div>
            `;

        case 'range':
            return `
                <div class="criterion-field-row">
                    <div class="pb-form-group">
                        <label class="pb-form-label">Patient Data Field</label>
                        <input
                            type="text"
                            class="pb-form-input"
                            placeholder="e.g., age"
                            value="${config.field || ''}"
                            onchange="updateCriterionConfig(${index}, '${type}', 'field', this.value)"
                        >
                    </div>
                    <div class="pb-form-group">
                        <label class="pb-form-label">Minimum Value</label>
                        <input
                            type="number"
                            class="pb-form-input"
                            placeholder="e.g., 18"
                            value="${config.min || ''}"
                            onchange="updateCriterionConfig(${index}, '${type}', 'min', parseFloat(this.value))"
                        >
                    </div>
                    <div class="pb-form-group">
                        <label class="pb-form-label">Maximum Value</label>
                        <input
                            type="number"
                            class="pb-form-input"
                            placeholder="e.g., 65"
                            value="${config.max || ''}"
                            onchange="updateCriterionConfig(${index}, '${type}', 'max', parseFloat(this.value))"
                        >
                    </div>
                </div>
            `;

        case 'duration':
            return `
                <div class="criterion-field-row">
                    <div class="pb-form-group">
                        <label class="pb-form-label">Event/Diagnosis Field</label>
                        <input
                            type="text"
                            class="pb-form-input"
                            placeholder="e.g., diagnosis_date"
                            value="${config.field || ''}"
                            onchange="updateCriterionConfig(${index}, '${type}', 'field', this.value)"
                        >
                    </div>
                    <div class="pb-form-group">
                        <label class="pb-form-label">Operator</label>
                        <select
                            class="pb-form-select"
                            onchange="updateCriterionConfig(${index}, '${type}', 'operator', this.value)"
                        >
                            <option value="">Select...</option>
                            <option value=">=" ${config.operator === '>=' ? 'selected' : ''}>At least (≥)</option>
                            <option value=">" ${config.operator === '>' ? 'selected' : ''}>More than (>)</option>
                            <option value="<=" ${config.operator === '<=' ? 'selected' : ''}>No more than (≤)</option>
                            <option value="<" ${config.operator === '<' ? 'selected' : ''}>Less than (<)</option>
                        </select>
                    </div>
                    <div class="pb-form-group">
                        <label class="pb-form-label">Duration</label>
                        <input
                            type="number"
                            class="pb-form-input"
                            placeholder="e.g., 6"
                            value="${config.duration || ''}"
                            onchange="updateCriterionConfig(${index}, '${type}', 'duration', parseFloat(this.value))"
                        >
                    </div>
                    <div class="pb-form-group">
                        <label class="pb-form-label">Time Unit</label>
                        <select
                            class="pb-form-select"
                            onchange="updateCriterionConfig(${index}, '${type}', 'unit', this.value)"
                        >
                            <option value="">Select...</option>
                            <option value="days" ${config.unit === 'days' ? 'selected' : ''}>Days</option>
                            <option value="weeks" ${config.unit === 'weeks' ? 'selected' : ''}>Weeks</option>
                            <option value="months" ${config.unit === 'months' ? 'selected' : ''}>Months</option>
                            <option value="years" ${config.unit === 'years' ? 'selected' : ''}>Years</option>
                        </select>
                    </div>
                </div>
            `;

        case 'medication':
            return `
                <div class="criterion-field-row">
                    <div class="pb-form-group">
                        <label class="pb-form-label">Medication Name(s)</label>
                        <input
                            type="text"
                            class="pb-form-input"
                            placeholder="e.g., sertraline, fluoxetine (comma-separated)"
                            value="${config.medications || ''}"
                            onchange="updateCriterionConfig(${index}, '${type}', 'medications', this.value)"
                        >
                        <span class="pb-form-help">Enter multiple medications separated by commas</span>
                    </div>
                    <div class="pb-form-group">
                        <label class="pb-form-label">Match Type</label>
                        <select
                            class="pb-form-select"
                            onchange="updateCriterionConfig(${index}, '${type}', 'matchType', this.value)"
                        >
                            <option value="any" ${config.matchType === 'any' ? 'selected' : ''}>Patient on ANY of these</option>
                            <option value="all" ${config.matchType === 'all' ? 'selected' : ''}>Patient on ALL of these</option>
                            <option value="none" ${config.matchType === 'none' ? 'selected' : ''}>Patient on NONE of these</option>
                        </select>
                    </div>
                </div>
            `;

        case 'date':
            return `
                <div class="criterion-field-row">
                    <div class="pb-form-group">
                        <label class="pb-form-label">Date Field</label>
                        <input
                            type="text"
                            class="pb-form-input"
                            placeholder="e.g., enrollment_date"
                            value="${config.field || ''}"
                            onchange="updateCriterionConfig(${index}, '${type}', 'field', this.value)"
                        >
                    </div>
                    <div class="pb-form-group">
                        <label class="pb-form-label">Operator</label>
                        <select
                            class="pb-form-select"
                            onchange="updateCriterionConfig(${index}, '${type}', 'operator', this.value)"
                        >
                            <option value="">Select...</option>
                            <option value="after" ${config.operator === 'after' ? 'selected' : ''}>After</option>
                            <option value="before" ${config.operator === 'before' ? 'selected' : ''}>Before</option>
                            <option value="onOrAfter" ${config.operator === 'onOrAfter' ? 'selected' : ''}>On or after</option>
                            <option value="onOrBefore" ${config.operator === 'onOrBefore' ? 'selected' : ''}>On or before</option>
                        </select>
                    </div>
                    <div class="pb-form-group">
                        <label class="pb-form-label">Comparison Date</label>
                        <input
                            type="date"
                            class="pb-form-input"
                            value="${config.comparisonDate || ''}"
                            onchange="updateCriterionConfig(${index}, '${type}', 'comparisonDate', this.value)"
                        >
                    </div>
                </div>
            `;

        case 'custom':
            return `
                <div class="pb-form-group">
                    <label class="pb-form-label">Custom Logic Description</label>
                    <textarea
                        class="pb-form-textarea"
                        rows="3"
                        placeholder="Describe the custom logic here. This will need manual implementation."
                        onchange="updateCriterionConfig(${index}, '${type}', 'customLogic', this.value)"
                    >${config.customLogic || ''}</textarea>
                    <div class="pb-message warning" style="margin-top: 10px;">
                        ⚠️ Custom logic criteria require manual evaluation function implementation.
                        The system will create a placeholder that returns pending status.
                    </div>
                </div>
            `;

        default:
            return '';
    }
}

// Criterion manipulation functions
function addCriterion(type) {
    const newCriterion = {
        id: `${type}_${Date.now()}`,
        description: '',
        type: '',
        config: {},
        collapsed: false
    };

    protocolBuilderState.currentProtocol[`${type}Criteria`].push(newCriterion);
    protocolBuilderState.isDirty = true;
    renderCriteriaForm(type);
}

function removeCriterion(index, type) {
    if (!confirm('Remove this criterion?')) return;

    protocolBuilderState.currentProtocol[`${type}Criteria`].splice(index, 1);
    protocolBuilderState.isDirty = true;
    renderCriteriaForm(type);
}

function moveCriterion(index, type, direction) {
    const criteria = protocolBuilderState.currentProtocol[`${type}Criteria`];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= criteria.length) return;

    const temp = criteria[index];
    criteria[index] = criteria[newIndex];
    criteria[newIndex] = temp;

    protocolBuilderState.isDirty = true;
    renderCriteriaForm(type);
}

function toggleCriterion(index, type) {
    const criterion = protocolBuilderState.currentProtocol[`${type}Criteria`][index];
    criterion.collapsed = !criterion.collapsed;
    renderCriteriaForm(type);
}

function updateCriterion(index, type, field, value) {
    protocolBuilderState.currentProtocol[`${type}Criteria`][index][field] = value;
    protocolBuilderState.isDirty = true;
    protocolBuilderState.draftSaved = false;
}

function updateCriterionConfig(index, type, field, value) {
    if (!protocolBuilderState.currentProtocol[`${type}Criteria`][index].config) {
        protocolBuilderState.currentProtocol[`${type}Criteria`][index].config = {};
    }
    protocolBuilderState.currentProtocol[`${type}Criteria`][index].config[field] = value;
    protocolBuilderState.isDirty = true;
    protocolBuilderState.draftSaved = false;
}

function getCriterionTypeLabel(type) {
    const labels = {
        'boolean': 'Boolean',
        'numeric': 'Numeric',
        'range': 'Range',
        'duration': 'Duration',
        'medication': 'Medication',
        'date': 'Date',
        'custom': 'Custom'
    };
    return labels[type] || 'Unknown';
}

// ============================================================================
// PROTOCOL PREVIEW & TEST
// ============================================================================

function updateProtocolPreview() {
    const container = document.getElementById('protocolPreviewContainer');
    const protocol = protocolBuilderState.currentProtocol;

    if (!protocol.protocolId && !protocol.protocolName) {
        container.innerHTML = `
            <div class="protocol-preview-empty">
                <p>Fill out the Basic Info tab to see a preview of your protocol</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="protocol-preview">
            <h3 style="margin-top: 0;">Protocol Preview</h3>

            <div class="protocol-preview-section">
                <h4>Basic Information</h4>
                <div class="protocol-preview-field">
                    <strong>Protocol ID:</strong> ${protocol.protocolId || '<em>Not set</em>'}
                </div>
                <div class="protocol-preview-field">
                    <strong>Protocol Name:</strong> ${protocol.protocolName || '<em>Not set</em>'}
                </div>
                <div class="protocol-preview-field">
                    <strong>Indication:</strong> ${protocol.indication || '<em>Not set</em>'}
                </div>
                <div class="protocol-preview-field">
                    <strong>Phase:</strong> ${protocol.phase || '<em>Not set</em>'}
                </div>
                <div class="protocol-preview-field">
                    <strong>Sponsor:</strong> ${protocol.sponsor || '<em>Not set</em>'}
                </div>
                <div class="protocol-preview-field">
                    <strong>Status:</strong> ${protocol.active !== false ? '<span style="color: #10b981;">Active</span>' : '<span style="color: #6b7280;">Inactive</span>'}
                </div>
            </div>

            <div class="protocol-preview-section">
                <h4>Inclusion Criteria (${protocol.inclusionCriteria.length})</h4>
                ${renderCriteriaPreview(protocol.inclusionCriteria)}
            </div>

            <div class="protocol-preview-section">
                <h4>Exclusion Criteria (${protocol.exclusionCriteria.length})</h4>
                ${renderCriteriaPreview(protocol.exclusionCriteria)}
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <button class="pb-btn pb-btn-primary" onclick="openTestProtocol()" style="width: 100%;">
                    🧪 Test Protocol with Sample Data
                </button>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderCriteriaPreview(criteria) {
    if (criteria.length === 0) {
        return '<p style="color: #6b7280; font-style: italic; margin: 10px 0;">No criteria defined</p>';
    }

    let html = '<ol class="protocol-preview-criteria">';
    criteria.forEach(criterion => {
        const typeLabel = getCriterionTypeLabel(criterion.type);
        html += `
            <li>
                ${criterion.type ? `<span class="criterion-type-badge">${typeLabel}</span>` : ''}
                ${criterion.description || '<em style="color: #6b7280;">No description</em>'}
                ${renderCriterionConfigPreview(criterion)}
            </li>
        `;
    });
    html += '</ol>';
    return html;
}

function renderCriterionConfigPreview(criterion) {
    if (!criterion.type || !criterion.config) return '';

    const config = criterion.config;
    let details = '<div class="criterion-preview-details">';

    switch (criterion.type) {
        case 'boolean':
            details += `Field: <code>${config.field || 'not set'}</code>, Expected: <code>${config.value !== undefined ? config.value : 'not set'}</code>`;
            break;
        case 'numeric':
            details += `Field: <code>${config.field || 'not set'}</code> ${config.operator || '?'} ${config.value !== undefined ? config.value : '?'}`;
            break;
        case 'range':
            details += `Field: <code>${config.field || 'not set'}</code>, Range: ${config.min !== undefined ? config.min : '?'} to ${config.max !== undefined ? config.max : '?'}`;
            break;
        case 'duration':
            details += `Field: <code>${config.field || 'not set'}</code> ${config.operator || '?'} ${config.duration || '?'} ${config.unit || 'units'}`;
            break;
        case 'medication':
            details += `Medications: <code>${config.medications || 'not set'}</code>, Match: ${config.matchType || 'any'}`;
            break;
        case 'date':
            details += `Field: <code>${config.field || 'not set'}</code> ${config.operator || '?'} ${config.comparisonDate || 'not set'}`;
            break;
        case 'custom':
            details += `Custom logic: ${config.customLogic || 'No description provided'}`;
            break;
    }

    details += '</div>';
    return details;
}

function openTestProtocol() {
    // Validate protocol first
    const errors = validateProtocol();
    if (Object.keys(errors).length > 0) {
        alert('Please fix validation errors before testing the protocol.');
        return;
    }

    const testHTML = `
        <div class="test-protocol-modal">
            <div class="test-protocol-container">
                <div class="protocol-builder-header">
                    <h2>Test Protocol</h2>
                    <button class="protocol-builder-close" onclick="closeTestProtocol()">&times;</button>
                </div>
                <div class="test-protocol-content">
                    <p style="margin-bottom: 20px; color: #6b7280;">
                        Enter sample patient data to test how the protocol evaluates.
                        You can use JSON format or a simplified key=value format.
                    </p>
                    <div class="pb-form-group">
                        <label class="pb-form-label">Sample Patient Data (JSON)</label>
                        <textarea
                            id="testPatientData"
                            class="pb-form-textarea"
                            rows="15"
                            placeholder='{\n  "age": 45,\n  "phq9_score": 18,\n  "active_si": false,\n  "medications": ["sertraline"],\n  ...\n}'
                        >${getTestDataTemplate()}</textarea>
                    </div>
                    <button class="pb-btn pb-btn-primary" onclick="runProtocolTest()" style="width: 100%;">
                        Run Test
                    </button>
                    <div id="testResults" style="margin-top: 20px;"></div>
                </div>
            </div>
        </div>
    `;

    const modalDiv = document.createElement('div');
    modalDiv.id = 'testProtocolModal';
    modalDiv.innerHTML = testHTML;
    document.body.appendChild(modalDiv);
}

function closeTestProtocol() {
    const modal = document.getElementById('testProtocolModal');
    if (modal) modal.remove();
}

function getTestDataTemplate() {
    const protocol = protocolBuilderState.currentProtocol;
    const fields = new Set();

    // Collect all fields from criteria
    [...protocol.inclusionCriteria, ...protocol.exclusionCriteria].forEach(criterion => {
        if (criterion.config && criterion.config.field) {
            fields.add(criterion.config.field);
        }
    });

    // Create template
    const template = {};
    fields.forEach(field => {
        if (field.includes('score')) {
            template[field] = 0;
        } else if (field.includes('date')) {
            template[field] = '2024-01-01';
        } else if (field.includes('age')) {
            template[field] = 30;
        } else {
            template[field] = null;
        }
    });

    template.medications = [];

    return JSON.stringify(template, null, 2);
}

function runProtocolTest() {
    const dataInput = document.getElementById('testPatientData').value;
    let patientData;

    try {
        patientData = JSON.parse(dataInput);
    } catch (e) {
        document.getElementById('testResults').innerHTML = `
            <div class="pb-message error">
                ❌ Invalid JSON format. Please check your input.
            </div>
        `;
        return;
    }

    // Generate evaluation function for current protocol
    const testProtocol = generateProtocolWithEvaluationFunctions(protocolBuilderState.currentProtocol);

    // Create temporary engine instance
    const engine = new EligibilityEngine();

    // Add test protocol temporarily
    const tempProtocols = [...protocols];
    const existingIndex = tempProtocols.findIndex(p => p.protocolId === testProtocol.protocolId);
    if (existingIndex >= 0) {
        tempProtocols[existingIndex] = testProtocol;
    } else {
        tempProtocols.push(testProtocol);
    }

    // Temporarily replace protocols array
    const originalProtocols = protocols;
    protocols = tempProtocols;

    // Evaluate
    const result = engine.evaluateProtocol(testProtocol.protocolId, patientData);

    // Restore original protocols
    protocols = originalProtocols;

    // Display results
    displayTestResults(result, patientData);
}

function displayTestResults(result, patientData) {
    const container = document.getElementById('testResults');

    if (!result) {
        container.innerHTML = `
            <div class="pb-message error">
                ❌ Protocol not found or evaluation failed
            </div>
        `;
        return;
    }

    let html = `
        <div class="test-results">
            <h4>Test Results</h4>
            <div class="protocol-preview-field">
                <strong>Overall Status:</strong>
                <span style="color: ${result.eligible ? '#10b981' : result.status === 'pending' ? '#f59e0b' : '#ef4444'}; font-weight: bold;">
                    ${result.eligible ? '✓ ELIGIBLE' : result.status === 'pending' ? '⏳ PENDING' : '✗ NOT ELIGIBLE'}
                </span>
            </div>

            <div class="protocol-preview-section">
                <h4>Inclusion Criteria</h4>
                ${renderTestCriteriaResults(result.inclusionResults)}
            </div>

            <div class="protocol-preview-section">
                <h4>Exclusion Criteria</h4>
                ${renderTestCriteriaResults(result.exclusionResults)}
            </div>

            ${result.reasons && result.reasons.length > 0 ? `
                <div class="protocol-preview-section">
                    <h4>Reasons</h4>
                    <ul>
                        ${result.reasons.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;

    container.innerHTML = html;
}

function renderTestCriteriaResults(results) {
    if (!results || results.length === 0) {
        return '<p style="color: #6b7280; font-style: italic;">No criteria</p>';
    }

    let html = '<ul class="test-criteria-results">';
    results.forEach(criterion => {
        const icon = criterion.met ? '✓' : criterion.met === null ? '⏳' : '✗';
        const color = criterion.met ? '#10b981' : criterion.met === null ? '#f59e0b' : '#ef4444';
        html += `
            <li style="color: ${color};">
                ${icon} ${criterion.description}
                ${criterion.reason ? `<br><small style="color: #6b7280; margin-left: 20px;">${criterion.reason}</small>` : ''}
            </li>
        `;
    });
    html += '</ul>';
    return html;
}

// ============================================================================
// EVALUATION FUNCTION GENERATION
// ============================================================================

function generateProtocolWithEvaluationFunctions(protocolData) {
    const protocol = JSON.parse(JSON.stringify(protocolData)); // Deep clone

    // Generate evaluation functions for inclusion criteria
    protocol.inclusionCriteria = protocol.inclusionCriteria.map(criterion => {
        const evalFunc = generateEvaluationFunction(criterion, false);
        return {
            ...criterion,
            evaluationFunction: evalFunc
        };
    });

    // Generate evaluation functions for exclusion criteria
    protocol.exclusionCriteria = protocol.exclusionCriteria.map(criterion => {
        const evalFunc = generateEvaluationFunction(criterion, true);
        return {
            ...criterion,
            evaluationFunction: evalFunc
        };
    });

    return protocol;
}

function generateEvaluationFunction(criterion, isExclusion) {
    const config = criterion.config || {};

    switch (criterion.type) {
        case 'boolean':
            return function(patientData) {
                return evaluators.booleanCheck(
                    patientData[config.field],
                    config.value,
                    config.field,
                    isExclusion
                );
            };

        case 'numeric':
            const operatorMap = {
                '>': 'greaterThan',
                '>=': 'greaterThanOrEqual',
                '<': 'lessThan',
                '<=': 'lessThanOrEqual',
                '==': 'equal'
            };
            return function(patientData) {
                return evaluators.numericComparison(
                    patientData[config.field],
                    config.value,
                    operatorMap[config.operator] || config.operator,
                    config.field
                );
            };

        case 'range':
            return function(patientData) {
                return evaluators.rangeCheck(
                    patientData[config.field],
                    config.min,
                    config.max,
                    config.field
                );
            };

        case 'duration':
            return function(patientData) {
                const startDate = patientData[config.field];
                const endDate = new Date(); // Current date
                const operatorMap = {
                    '>': 'greaterThan',
                    '>=': 'greaterThanOrEqual',
                    '<': 'lessThan',
                    '<=': 'lessThanOrEqual'
                };
                return evaluators.durationCheck(
                    startDate,
                    endDate,
                    config.duration,
                    config.unit,
                    operatorMap[config.operator] || config.operator,
                    config.field
                );
            };

        case 'medication':
            return function(patientData) {
                const medications = config.medications ? config.medications.split(',').map(m => m.trim()) : [];
                return evaluators.medicationCheck(
                    patientData.medications || [],
                    medications,
                    config.matchType || 'any',
                    'medications'
                );
            };

        case 'date':
            return function(patientData) {
                return evaluators.dateComparison(
                    patientData[config.field],
                    config.comparisonDate,
                    config.operator,
                    config.field
                );
            };

        case 'custom':
            return function(patientData) {
                return {
                    met: null,
                    reason: `Custom logic requires manual implementation: ${config.customLogic || 'No description'}`
                };
            };

        default:
            return function(patientData) {
                return {
                    met: null,
                    reason: 'Unknown criterion type - evaluation not configured'
                };
            };
    }
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateProtocol() {
    const protocol = protocolBuilderState.currentProtocol;
    const errors = {};

    // Basic info validation
    if (!protocol.protocolId || protocol.protocolId.trim() === '') {
        errors.protocolId = 'Protocol ID is required';
    } else if (protocolBuilderState.mode === 'create' && getProtocol(protocol.protocolId)) {
        errors.protocolId = 'Protocol ID already exists';
    }

    if (!protocol.protocolName || protocol.protocolName.trim() === '') {
        errors.protocolName = 'Protocol name is required';
    }

    if (!protocol.indication || protocol.indication.trim() === '') {
        errors.indication = 'Indication is required';
    }

    // Criteria validation
    if (protocol.inclusionCriteria.length === 0) {
        errors.inclusionCriteria = 'At least one inclusion criterion is required';
    }

    // Validate each criterion
    const validateCriterion = (criterion, index, type) => {
        const prefix = `${type}_${index}`;

        if (!criterion.description || criterion.description.trim() === '') {
            errors[`${prefix}_description`] = 'Description required';
        }

        if (!criterion.type) {
            errors[`${prefix}_type`] = 'Evaluation type required';
        }

        if (criterion.type && criterion.config) {
            const config = criterion.config;

            switch (criterion.type) {
                case 'boolean':
                    if (!config.field) errors[`${prefix}_field`] = 'Field required';
                    if (config.value === undefined) errors[`${prefix}_value`] = 'Expected value required';
                    break;

                case 'numeric':
                    if (!config.field) errors[`${prefix}_field`] = 'Field required';
                    if (!config.operator) errors[`${prefix}_operator`] = 'Operator required';
                    if (config.value === undefined || config.value === '') errors[`${prefix}_value`] = 'Threshold required';
                    break;

                case 'range':
                    if (!config.field) errors[`${prefix}_field`] = 'Field required';
                    if (config.min === undefined || config.min === '') errors[`${prefix}_min`] = 'Minimum required';
                    if (config.max === undefined || config.max === '') errors[`${prefix}_max`] = 'Maximum required';
                    if (config.min !== undefined && config.max !== undefined && config.min >= config.max) {
                        errors[`${prefix}_range`] = 'Minimum must be less than maximum';
                    }
                    break;

                case 'duration':
                    if (!config.field) errors[`${prefix}_field`] = 'Field required';
                    if (!config.operator) errors[`${prefix}_operator`] = 'Operator required';
                    if (config.duration === undefined || config.duration === '') errors[`${prefix}_duration`] = 'Duration required';
                    if (!config.unit) errors[`${prefix}_unit`] = 'Time unit required';
                    break;

                case 'medication':
                    if (!config.medications || config.medications.trim() === '') {
                        errors[`${prefix}_medications`] = 'At least one medication required';
                    }
                    break;

                case 'date':
                    if (!config.field) errors[`${prefix}_field`] = 'Field required';
                    if (!config.operator) errors[`${prefix}_operator`] = 'Operator required';
                    if (!config.comparisonDate) errors[`${prefix}_comparisonDate`] = 'Comparison date required';
                    break;
            }
        }
    };

    protocol.inclusionCriteria.forEach((criterion, index) => {
        validateCriterion(criterion, index, 'inclusion');
    });

    protocol.exclusionCriteria.forEach((criterion, index) => {
        validateCriterion(criterion, index, 'exclusion');
    });

    protocolBuilderState.validationErrors = errors;
    return errors;
}

function displayValidationErrors() {
    const errors = protocolBuilderState.validationErrors;

    // Clear all existing error displays
    document.querySelectorAll('.pb-form-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.pb-form-input, .pb-form-select, .pb-form-textarea').forEach(el => {
        el.classList.remove('error');
    });

    // Display errors
    Object.keys(errors).forEach(key => {
        const errorElement = document.getElementById(`error-${key}`);
        if (errorElement) {
            errorElement.textContent = errors[key];
            const inputElement = document.getElementById(key);
            if (inputElement) {
                inputElement.classList.add('error');
            }
        }
    });

    // Show first error
    const firstError = Object.keys(errors)[0];
    if (firstError) {
        const errorElement = document.getElementById(`error-${firstError}`);
        if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function clearValidationError(field) {
    if (protocolBuilderState.validationErrors[field]) {
        delete protocolBuilderState.validationErrors[field];
        const errorElement = document.getElementById(`error-${field}`);
        if (errorElement) {
            errorElement.textContent = '';
        }
        const inputElement = document.getElementById(field);
        if (inputElement) {
            inputElement.classList.remove('error');
        }
    }
}

// ============================================================================
// SAVE PROTOCOL
// ============================================================================

function saveProtocol() {
    // Validate
    const errors = validateProtocol();

    if (Object.keys(errors).length > 0) {
        displayValidationErrors();
        showMessage('Please fix validation errors before saving', 'error');
        return;
    }

    // Generate evaluation functions
    const protocolWithFunctions = generateProtocolWithEvaluationFunctions(protocolBuilderState.currentProtocol);

    // Save to protocols array
    if (protocolBuilderState.mode === 'edit') {
        // Update existing
        const index = protocols.findIndex(p => p.protocolId === protocolBuilderState.editingProtocolId);
        if (index >= 0) {
            protocols[index] = protocolWithFunctions;
            showMessage('Protocol updated successfully', 'success');
        } else {
            showMessage('Protocol not found', 'error');
            return;
        }
    } else {
        // Add new
        protocols.push(protocolWithFunctions);
        showMessage('Protocol created successfully', 'success');
    }

    // Clear dirty flag
    protocolBuilderState.isDirty = false;
    protocolBuilderState.draftSaved = false;
    protocolBuilderState.lastSave = new Date();

    // Clear draft from localStorage
    localStorage.removeItem('protocolBuilder_draft');

    // Log for debugging
    console.log('[Protocol Builder] Protocol saved:', protocolWithFunctions.protocolId);
    console.log('[Protocol Builder] Total protocols:', protocols.length);

    // Return to list
    setTimeout(() => {
        showListView();
    }, 1000);
}

// ============================================================================
// DRAFT AUTO-SAVE
// ============================================================================

function saveDraft() {
    const draft = {
        mode: protocolBuilderState.mode,
        protocol: protocolBuilderState.currentProtocol,
        editingProtocolId: protocolBuilderState.editingProtocolId,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('protocolBuilder_draft', JSON.stringify(draft));
    protocolBuilderState.draftSaved = true;
    protocolBuilderState.lastSave = new Date();

    showMessage('Draft saved', 'info', 2000);
}

function autoSaveDraft() {
    if (protocolBuilderState.mode !== 'list' && protocolBuilderState.isDirty && !protocolBuilderState.draftSaved) {
        saveDraft();
        console.log('[Protocol Builder] Auto-saved draft');
    }
}

function loadDraft() {
    const draftStr = localStorage.getItem('protocolBuilder_draft');
    if (!draftStr) return false;

    try {
        const draft = JSON.parse(draftStr);

        if (confirm(`Found a draft saved on ${new Date(draft.timestamp).toLocaleString()}. Do you want to restore it?`)) {
            protocolBuilderState.mode = draft.mode;
            protocolBuilderState.currentProtocol = draft.protocol;
            protocolBuilderState.editingProtocolId = draft.editingProtocolId;
            protocolBuilderState.isDirty = true;

            showProtocolForm();
            return true;
        }
    } catch (e) {
        console.error('[Protocol Builder] Failed to load draft:', e);
    }

    return false;
}

// ============================================================================
// IMPORT/EXPORT
// ============================================================================

function exportProtocolJSON() {
    const protocol = protocolBuilderState.currentProtocol;

    if (!protocol.protocolId) {
        alert('Please set a protocol ID before exporting');
        return;
    }

    // Create export object (without evaluation functions)
    const exportData = {
        protocolId: protocol.protocolId,
        protocolName: protocol.protocolName,
        indication: protocol.indication,
        phase: protocol.phase,
        sponsor: protocol.sponsor,
        active: protocol.active,
        inclusionCriteria: protocol.inclusionCriteria.map(c => ({
            id: c.id,
            description: c.description,
            type: c.type,
            config: c.config
        })),
        exclusionCriteria: protocol.exclusionCriteria.map(c => ({
            id: c.id,
            description: c.description,
            type: c.type,
            config: c.config
        })),
        exportedAt: new Date().toISOString(),
        exportedBy: 'Protocol Builder v1.0'
    };

    // Create download
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${protocol.protocolId || 'protocol'}_${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);

    showMessage('Protocol exported successfully', 'success');
}

function importProtocolJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);

                // Validate imported data
                if (!imported.protocolId || !imported.protocolName) {
                    alert('Invalid protocol file: missing required fields');
                    return;
                }

                // Check if protocol ID already exists
                if (getProtocol(imported.protocolId)) {
                    if (!confirm(`Protocol ${imported.protocolId} already exists. Do you want to overwrite it?`)) {
                        // Modify ID for new protocol
                        imported.protocolId = imported.protocolId + '-IMPORTED';
                        imported.active = false;
                    }
                }

                // Load into builder
                protocolBuilderState.mode = 'create';
                protocolBuilderState.currentProtocol = {
                    protocolId: imported.protocolId,
                    protocolName: imported.protocolName,
                    indication: imported.indication || '',
                    phase: imported.phase || '',
                    sponsor: imported.sponsor || '',
                    active: imported.active !== false,
                    inclusionCriteria: imported.inclusionCriteria || [],
                    exclusionCriteria: imported.exclusionCriteria || []
                };

                showProtocolForm();
                showMessage('Protocol imported successfully', 'success');

            } catch (err) {
                alert('Failed to import protocol: Invalid JSON format');
                console.error(err);
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function setupEventListeners() {
    // Close modal on outside click
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('protocolBuilderModal');
        if (modal && e.target === modal) {
            closeProtocolBuilder();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        const modal = document.getElementById('protocolBuilderModal');
        if (!modal || !modal.classList.contains('active')) return;

        // Escape to close
        if (e.key === 'Escape') {
            closeProtocolBuilder();
        }

        // Ctrl+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (protocolBuilderState.mode !== 'list') {
                saveProtocol();
            }
        }
    });
}

function showMessage(message, type = 'info', duration = 3000) {
    // Remove existing message
    const existing = document.querySelector('.protocol-builder-message');
    if (existing) existing.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `protocol-builder-message ${type}`;
    messageDiv.textContent = message;

    const modal = document.getElementById('protocolBuilderModal');
    if (modal) {
        modal.appendChild(messageDiv);
    } else {
        document.body.appendChild(messageDiv);
    }

    setTimeout(() => {
        messageDiv.classList.add('show');
    }, 10);

    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => messageDiv.remove(), 300);
    }, duration);
}

// Helper to get protocol from main protocols array
function getProtocol(protocolId) {
    return protocols.find(p => p.protocolId === protocolId);
}

// Helper to remove protocol from main protocols array
function removeProtocol(protocolId) {
    const index = protocols.findIndex(p => p.protocolId === protocolId);
    if (index >= 0) {
        protocols.splice(index, 1);
        return true;
    }
    return false;
}

console.log('[Protocol Builder] Module loaded successfully');
