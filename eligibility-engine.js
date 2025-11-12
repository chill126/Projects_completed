/**
 * ============================================================================
 * CLINICAL RESEARCH ELIGIBILITY ENGINE - PART 1: CORE ARCHITECTURE
 * ============================================================================
 *
 * This module provides the core data structures and evaluation logic for
 * determining patient eligibility across multiple study protocols.
 *
 * Version: 1.0.0
 * Created: 2025-11-12
 *
 * ARCHITECTURE OVERVIEW:
 * - Protocol Storage: Array of protocol configurations
 * - Criterion Evaluation: Individual criterion checking logic
 * - Eligibility Engine: Main evaluation orchestrator
 * - State Management: Track evaluations and patient data
 * - Helper Functions: Common evaluation patterns
 */

// ============================================================================
// GLOBAL STATE MANAGEMENT
// ============================================================================

/**
 * Application state for eligibility evaluations
 */
const eligibilityState = {
    // Current indication filter (null = all)
    currentIndication: null,

    // Patient data from intake form
    patientData: {},

    // Results from most recent evaluation run
    evaluationResults: [],

    // Debug mode flag
    debugMode: false,

    // Selected protocol for detailed view
    selectedProtocol: null,

    // Evaluation history
    evaluationHistory: [],

    // Maximum history to keep
    maxHistoryLength: 50
};

/**
 * Update patient data in state
 * @param {Object} data - Patient data object
 */
function updatePatientData(data) {
    eligibilityState.patientData = { ...eligibilityState.patientData, ...data };
    console.log('[State] Patient data updated:', Object.keys(data));
}

/**
 * Get current patient data
 * @returns {Object} Patient data
 */
function getPatientData() {
    return { ...eligibilityState.patientData };
}

/**
 * Clear all patient data
 */
function clearPatientData() {
    eligibilityState.patientData = {};
    eligibilityState.evaluationResults = [];
    console.log('[State] Patient data cleared');
}

/**
 * Add evaluation to history
 * @param {Object} result - Evaluation result
 */
function addToHistory(result) {
    eligibilityState.evaluationHistory.unshift({
        ...result,
        timestamp: new Date().toISOString()
    });

    // Trim history if needed
    if (eligibilityState.evaluationHistory.length > eligibilityState.maxHistoryLength) {
        eligibilityState.evaluationHistory.pop();
    }
}

// ============================================================================
// PROTOCOL STORAGE
// ============================================================================

/**
 * Global protocols array - stores all study protocol configurations
 *
 * Each protocol defines:
 * - Basic metadata (ID, name, indication)
 * - Inclusion criteria (must ALL be met)
 * - Exclusion criteria (NONE can be met)
 * - Active status (whether to include in evaluations)
 */
const protocols = [
    // Protocols will be dynamically added here
    // See PROTOCOL_TEMPLATE below for structure
];

/**
 * PROTOCOL TEMPLATE - Copy this structure to create new protocols
 *
 * const EXAMPLE_PROTOCOL = {
 *     protocolId: "STUDY-001",
 *     protocolName: "Example Clinical Trial",
 *     indication: "Psych",
 *     phase: "Phase 3",
 *     sponsor: "Example Pharma",
 *     active: true,
 *     inclusionCriteria: [
 *         {
 *             id: "inc_1",
 *             description: "Age between 18-65",
 *             type: "range",
 *             field: "age",
 *             operator: "between",
 *             value: [18, 65],
 *             evaluationFunction: (patientData) => {
 *                 return evaluators.rangeCheck(patientData.age, 18, 65, "Age");
 *             }
 *         }
 *     ],
 *     exclusionCriteria: [
 *         {
 *             id: "exc_1",
 *             description: "Current pregnancy",
 *             type: "boolean",
 *             field: "pregnant",
 *             operator: "equals",
 *             value: true,
 *             evaluationFunction: (patientData) => {
 *                 return evaluators.booleanCheck(patientData.pregnant, true, "Pregnancy");
 *             }
 *         }
 *     ]
 * };
 */

/**
 * Add a protocol to the protocols array
 * @param {Object} protocol - Protocol configuration object
 * @returns {boolean} Success status
 */
function addProtocol(protocol) {
    // Validate protocol structure
    if (!protocol.protocolId || !protocol.protocolName || !protocol.indication) {
        console.error('[Protocol] Invalid protocol structure - missing required fields');
        return false;
    }

    // Check for duplicate ID
    if (protocols.find(p => p.protocolId === protocol.protocolId)) {
        console.error(`[Protocol] Protocol with ID ${protocol.protocolId} already exists`);
        return false;
    }

    // Add protocol
    protocols.push(protocol);
    console.log(`[Protocol] Added: ${protocol.protocolId} - ${protocol.protocolName}`);
    return true;
}

/**
 * Remove a protocol by ID
 * @param {string} protocolId - Protocol ID to remove
 * @returns {boolean} Success status
 */
function removeProtocol(protocolId) {
    const index = protocols.findIndex(p => p.protocolId === protocolId);
    if (index === -1) {
        console.error(`[Protocol] Protocol ${protocolId} not found`);
        return false;
    }

    protocols.splice(index, 1);
    console.log(`[Protocol] Removed: ${protocolId}`);
    return true;
}

/**
 * Get protocol by ID
 * @param {string} protocolId - Protocol ID
 * @returns {Object|null} Protocol object or null
 */
function getProtocol(protocolId) {
    return protocols.find(p => p.protocolId === protocolId) || null;
}

/**
 * Get all protocols for a specific indication
 * @param {string} indication - Indication type
 * @returns {Array} Array of protocols
 */
function getProtocolsByIndication(indication) {
    if (!indication) return protocols.filter(p => p.active !== false);
    return protocols.filter(p => p.indication === indication && p.active !== false);
}

/**
 * Toggle protocol active status
 * @param {string} protocolId - Protocol ID
 * @returns {boolean} New active status
 */
function toggleProtocolStatus(protocolId) {
    const protocol = getProtocol(protocolId);
    if (!protocol) return false;

    protocol.active = !protocol.active;
    console.log(`[Protocol] ${protocolId} active status: ${protocol.active}`);
    return protocol.active;
}

// ============================================================================
// EVALUATION HELPER FUNCTIONS
// ============================================================================

/**
 * Common evaluation functions for criterion checking
 * These provide standardized evaluation patterns with consistent return format
 */
const evaluators = {
    /**
     * Numeric comparison evaluation
     * @param {number} actualValue - Patient's actual value
     * @param {number} threshold - Required threshold
     * @param {string} operator - Comparison operator
     * @param {string} fieldName - Field name for messaging
     * @returns {Object} Evaluation result
     */
    numericComparison: function(actualValue, threshold, operator, fieldName) {
        // Handle missing data
        if (actualValue === undefined || actualValue === null || actualValue === '') {
            return {
                met: null,
                reason: `${fieldName} not provided - pending data`,
                details: {
                    actualValue: null,
                    requiredValue: threshold,
                    operator,
                    status: 'pending'
                }
            };
        }

        const numValue = parseFloat(actualValue);
        if (isNaN(numValue)) {
            return {
                met: false,
                reason: `${fieldName} is not a valid number`,
                details: {
                    actualValue,
                    requiredValue: threshold,
                    operator,
                    status: 'invalid'
                }
            };
        }

        let met = false;
        let comparison = '';

        switch (operator) {
            case 'equals':
            case '==':
                met = numValue === threshold;
                comparison = '=';
                break;
            case 'greaterThan':
            case '>':
                met = numValue > threshold;
                comparison = '>';
                break;
            case 'greaterThanOrEqual':
            case '>=':
                met = numValue >= threshold;
                comparison = '≥';
                break;
            case 'lessThan':
            case '<':
                met = numValue < threshold;
                comparison = '<';
                break;
            case 'lessThanOrEqual':
            case '<=':
                met = numValue <= threshold;
                comparison = '≤';
                break;
            default:
                return {
                    met: false,
                    reason: `Unknown operator: ${operator}`,
                    details: { actualValue: numValue, requiredValue: threshold, operator, status: 'error' }
                };
        }

        return {
            met,
            reason: met
                ? `${fieldName} of ${numValue} meets requirement (${comparison} ${threshold})`
                : `${fieldName} of ${numValue} does not meet requirement (${comparison} ${threshold})`,
            details: {
                actualValue: numValue,
                requiredValue: threshold,
                operator: comparison,
                status: 'evaluated'
            }
        };
    },

    /**
     * Range check evaluation (value must be between min and max, inclusive)
     * @param {number} actualValue - Patient's actual value
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (inclusive)
     * @param {string} fieldName - Field name for messaging
     * @returns {Object} Evaluation result
     */
    rangeCheck: function(actualValue, min, max, fieldName) {
        if (actualValue === undefined || actualValue === null || actualValue === '') {
            return {
                met: null,
                reason: `${fieldName} not provided - pending data`,
                details: { actualValue: null, range: [min, max], status: 'pending' }
            };
        }

        const numValue = parseFloat(actualValue);
        if (isNaN(numValue)) {
            return {
                met: false,
                reason: `${fieldName} is not a valid number`,
                details: { actualValue, range: [min, max], status: 'invalid' }
            };
        }

        const met = numValue >= min && numValue <= max;

        return {
            met,
            reason: met
                ? `${fieldName} of ${numValue} is within range [${min}, ${max}]`
                : `${fieldName} of ${numValue} is outside range [${min}, ${max}]`,
            details: {
                actualValue: numValue,
                range: [min, max],
                status: 'evaluated'
            }
        };
    },

    /**
     * Boolean check evaluation
     * @param {boolean} actualValue - Patient's actual value
     * @param {boolean} requiredValue - Required value
     * @param {string} fieldName - Field name for messaging
     * @param {boolean} isExclusion - Whether this is an exclusion criterion
     * @returns {Object} Evaluation result
     */
    booleanCheck: function(actualValue, requiredValue, fieldName, isExclusion = false) {
        if (actualValue === undefined || actualValue === null) {
            return {
                met: null,
                reason: `${fieldName} not provided - pending data`,
                details: { actualValue: null, requiredValue, status: 'pending' }
            };
        }

        const met = actualValue === requiredValue;

        let reason;
        if (isExclusion) {
            reason = met
                ? `${fieldName} = ${actualValue} (EXCLUSIONARY)`
                : `${fieldName} = ${actualValue} (acceptable)`;
        } else {
            reason = met
                ? `${fieldName} = ${actualValue} (meets requirement)`
                : `${fieldName} = ${actualValue} (does not meet requirement)`;
        }

        return {
            met,
            reason,
            details: {
                actualValue,
                requiredValue,
                isExclusion,
                status: 'evaluated'
            }
        };
    },

    /**
     * Date comparison evaluation
     * @param {string|Date} actualDate - Patient's date value
     * @param {string|Date} comparisonDate - Date to compare against
     * @param {string} operator - Comparison operator (before, after, equals)
     * @param {string} fieldName - Field name for messaging
     * @returns {Object} Evaluation result
     */
    dateComparison: function(actualDate, comparisonDate, operator, fieldName) {
        if (!actualDate) {
            return {
                met: null,
                reason: `${fieldName} not provided - pending data`,
                details: { actualDate: null, comparisonDate, operator, status: 'pending' }
            };
        }

        const date1 = new Date(actualDate);
        const date2 = new Date(comparisonDate);

        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
            return {
                met: false,
                reason: `Invalid date format for ${fieldName}`,
                details: { actualDate, comparisonDate, operator, status: 'invalid' }
            };
        }

        let met = false;
        let comparison = '';

        switch (operator) {
            case 'before':
            case '<':
                met = date1 < date2;
                comparison = 'before';
                break;
            case 'after':
            case '>':
                met = date1 > date2;
                comparison = 'after';
                break;
            case 'equals':
            case '==':
                met = date1.toDateString() === date2.toDateString();
                comparison = 'equal to';
                break;
            case 'onOrAfter':
            case '>=':
                met = date1 >= date2;
                comparison = 'on or after';
                break;
            case 'onOrBefore':
            case '<=':
                met = date1 <= date2;
                comparison = 'on or before';
                break;
            default:
                return {
                    met: false,
                    reason: `Unknown date operator: ${operator}`,
                    details: { actualDate, comparisonDate, operator, status: 'error' }
                };
        }

        return {
            met,
            reason: met
                ? `${fieldName} (${date1.toLocaleDateString()}) is ${comparison} ${date2.toLocaleDateString()}`
                : `${fieldName} (${date1.toLocaleDateString()}) is not ${comparison} ${date2.toLocaleDateString()}`,
            details: {
                actualDate: date1.toISOString(),
                comparisonDate: date2.toISOString(),
                operator: comparison,
                status: 'evaluated'
            }
        };
    },

    /**
     * Duration calculation (time between two dates or from a date to now)
     * @param {string|Date} startDate - Start date
     * @param {string|Date} endDate - End date (null = today)
     * @param {number} requiredDuration - Required duration
     * @param {string} unit - Time unit (days, weeks, months, years)
     * @param {string} operator - Comparison operator
     * @param {string} fieldName - Field name for messaging
     * @returns {Object} Evaluation result
     */
    durationCheck: function(startDate, endDate, requiredDuration, unit, operator, fieldName) {
        if (!startDate) {
            return {
                met: null,
                reason: `${fieldName} start date not provided - pending data`,
                details: { startDate: null, endDate, requiredDuration, unit, operator, status: 'pending' }
            };
        }

        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return {
                met: false,
                reason: `Invalid date format for ${fieldName}`,
                details: { startDate, endDate, requiredDuration, unit, operator, status: 'invalid' }
            };
        }

        // Calculate duration in milliseconds
        const durationMs = end - start;

        // Convert to requested unit
        let actualDuration;
        switch (unit.toLowerCase()) {
            case 'days':
                actualDuration = durationMs / (1000 * 60 * 60 * 24);
                break;
            case 'weeks':
                actualDuration = durationMs / (1000 * 60 * 60 * 24 * 7);
                break;
            case 'months':
                actualDuration = durationMs / (1000 * 60 * 60 * 24 * 30.44); // Average month
                break;
            case 'years':
                actualDuration = durationMs / (1000 * 60 * 60 * 24 * 365.25); // Account for leap years
                break;
            default:
                return {
                    met: false,
                    reason: `Unknown time unit: ${unit}`,
                    details: { startDate, endDate, requiredDuration, unit, operator, status: 'error' }
                };
        }

        // Use numeric comparison
        return this.numericComparison(
            actualDuration,
            requiredDuration,
            operator,
            `${fieldName} duration (${actualDuration.toFixed(1)} ${unit})`
        );
    },

    /**
     * Medication check - verify if patient is on specific medication(s)
     * @param {Array} medications - Patient's current medications
     * @param {string|Array} targetMedications - Medication(s) to check for
     * @param {string} matchType - "any" or "all" or "none"
     * @param {string} fieldName - Field name for messaging
     * @returns {Object} Evaluation result
     */
    medicationCheck: function(medications, targetMedications, matchType, fieldName) {
        if (!medications || !Array.isArray(medications)) {
            return {
                met: null,
                reason: `${fieldName} not provided - pending data`,
                details: { medications: null, targetMedications, matchType, status: 'pending' }
            };
        }

        const targets = Array.isArray(targetMedications) ? targetMedications : [targetMedications];
        const medNames = medications.map(m => (m.name || m).toLowerCase());

        let matchCount = 0;
        const matches = [];

        targets.forEach(target => {
            const targetLower = target.toLowerCase();
            const found = medNames.some(med => med.includes(targetLower));
            if (found) {
                matchCount++;
                matches.push(target);
            }
        });

        let met = false;
        let reason = '';

        switch (matchType.toLowerCase()) {
            case 'any':
                met = matchCount > 0;
                reason = met
                    ? `Patient is on ${matches.join(', ')}`
                    : `Patient is not on any of: ${targets.join(', ')}`;
                break;
            case 'all':
                met = matchCount === targets.length;
                reason = met
                    ? `Patient is on all required medications: ${targets.join(', ')}`
                    : `Patient is missing: ${targets.filter(t => !matches.includes(t)).join(', ')}`;
                break;
            case 'none':
                met = matchCount === 0;
                reason = met
                    ? `Patient is not on any exclusionary medications`
                    : `Patient is on exclusionary medication(s): ${matches.join(', ')}`;
                break;
            default:
                return {
                    met: false,
                    reason: `Unknown match type: ${matchType}`,
                    details: { medications, targetMedications, matchType, status: 'error' }
                };
        }

        return {
            met,
            reason,
            details: {
                patientMedications: medNames,
                targetMedications: targets,
                matches,
                matchType,
                status: 'evaluated'
            }
        };
    },

    /**
     * String contains check
     * @param {string} actualValue - Actual string value
     * @param {string|Array} searchTerms - Term(s) to search for
     * @param {boolean} caseSensitive - Whether search is case-sensitive
     * @param {string} fieldName - Field name for messaging
     * @returns {Object} Evaluation result
     */
    stringContains: function(actualValue, searchTerms, caseSensitive, fieldName) {
        if (!actualValue) {
            return {
                met: null,
                reason: `${fieldName} not provided - pending data`,
                details: { actualValue: null, searchTerms, caseSensitive, status: 'pending' }
            };
        }

        const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
        const value = caseSensitive ? actualValue : actualValue.toLowerCase();

        const matches = terms.filter(term => {
            const searchTerm = caseSensitive ? term : term.toLowerCase();
            return value.includes(searchTerm);
        });

        const met = matches.length > 0;

        return {
            met,
            reason: met
                ? `${fieldName} contains: ${matches.join(', ')}`
                : `${fieldName} does not contain any of: ${terms.join(', ')}`,
            details: {
                actualValue,
                searchTerms: terms,
                matches,
                caseSensitive,
                status: 'evaluated'
            }
        };
    },

    /**
     * Custom evaluation - allows for complex custom logic
     * @param {Function} customFunction - Custom evaluation function
     * @param {Object} patientData - Patient data object
     * @param {string} description - Description of what's being evaluated
     * @returns {Object} Evaluation result
     */
    custom: function(customFunction, patientData, description) {
        try {
            const result = customFunction(patientData);

            // Ensure result has required fields
            if (typeof result.met !== 'boolean' && result.met !== null) {
                throw new Error('Custom function must return {met: boolean|null, reason: string, details: object}');
            }

            return {
                met: result.met,
                reason: result.reason || description,
                details: result.details || { status: 'custom' }
            };
        } catch (error) {
            console.error(`[Evaluator] Custom function error: ${error.message}`);
            return {
                met: false,
                reason: `Evaluation error: ${error.message}`,
                details: { error: error.message, status: 'error' }
            };
        }
    }
};

// ============================================================================
// ELIGIBILITY ENGINE - MAIN CLASS
// ============================================================================

/**
 * Main eligibility evaluation engine
 * Orchestrates all criterion evaluations and determines overall eligibility
 */
class EligibilityEngine {
    constructor() {
        this.evaluationCache = new Map();
        this.lastEvaluation = null;
    }

    /**
     * Evaluate a single criterion
     * @param {Object} criterion - Criterion object
     * @param {Object} patientData - Patient data
     * @returns {Object} Evaluation result
     */
    evaluateCriterion(criterion, patientData) {
        try {
            // Use custom evaluation function if provided
            if (criterion.evaluationFunction && typeof criterion.evaluationFunction === 'function') {
                const result = criterion.evaluationFunction(patientData);
                return {
                    criterionId: criterion.id,
                    description: criterion.description,
                    type: criterion.type,
                    ...result
                };
            }

            // Fallback to basic evaluation based on type
            console.warn(`[Engine] No evaluation function for criterion ${criterion.id}, using basic evaluation`);

            const actualValue = patientData[criterion.field];
            let result;

            switch (criterion.type) {
                case 'numeric':
                    result = evaluators.numericComparison(
                        actualValue,
                        criterion.value,
                        criterion.operator,
                        criterion.field
                    );
                    break;
                case 'boolean':
                    result = evaluators.booleanCheck(
                        actualValue,
                        criterion.value,
                        criterion.field
                    );
                    break;
                case 'range':
                    result = evaluators.rangeCheck(
                        actualValue,
                        criterion.value[0],
                        criterion.value[1],
                        criterion.field
                    );
                    break;
                default:
                    result = {
                        met: null,
                        reason: `Cannot auto-evaluate type: ${criterion.type}`,
                        details: { status: 'unsupported' }
                    };
            }

            return {
                criterionId: criterion.id,
                description: criterion.description,
                type: criterion.type,
                ...result
            };

        } catch (error) {
            console.error(`[Engine] Error evaluating criterion ${criterion.id}:`, error);
            return {
                criterionId: criterion.id,
                description: criterion.description,
                type: criterion.type,
                met: false,
                reason: `Evaluation error: ${error.message}`,
                details: { error: error.message, status: 'error' }
            };
        }
    }

    /**
     * Evaluate all criteria for a protocol
     * @param {string} protocolId - Protocol ID
     * @param {Object} patientData - Patient data
     * @returns {Object} Full evaluation result
     */
    evaluateProtocol(protocolId, patientData) {
        const protocol = getProtocol(protocolId);

        if (!protocol) {
            console.error(`[Engine] Protocol ${protocolId} not found`);
            return {
                error: true,
                message: `Protocol ${protocolId} not found`
            };
        }

        console.log(`[Engine] Evaluating protocol: ${protocol.protocolName}`);

        // Evaluate all inclusion criteria
        const inclusionResults = (protocol.inclusionCriteria || []).map(criterion =>
            this.evaluateCriterion(criterion, patientData)
        );

        // Evaluate all exclusion criteria
        const exclusionResults = (protocol.exclusionCriteria || []).map(criterion =>
            this.evaluateCriterion(criterion, patientData)
        );

        // Determine overall eligibility
        const inclusionMet = inclusionResults.every(r => r.met === true);
        const exclusionMet = exclusionResults.some(r => r.met === true);
        const hasPendingData = [...inclusionResults, ...exclusionResults].some(r => r.met === null);

        let status, overallEligible, eligibilityReason;

        if (hasPendingData) {
            status = 'Pending Data';
            overallEligible = null;

            const pendingFields = [...inclusionResults, ...exclusionResults]
                .filter(r => r.met === null)
                .map(r => r.description);

            eligibilityReason = `Cannot determine eligibility - missing data: ${pendingFields.join(', ')}`;

        } else if (exclusionMet) {
            status = 'Screen Failure';
            overallEligible = false;

            const failedExclusions = exclusionResults
                .filter(r => r.met === true)
                .map(r => r.description);

            eligibilityReason = `Screen failure - patient has exclusionary criteria: ${failedExclusions.join('; ')}`;

        } else if (!inclusionMet) {
            status = 'Screen Failure';
            overallEligible = false;

            const failedInclusions = inclusionResults
                .filter(r => r.met === false)
                .map(r => r.description);

            eligibilityReason = `Screen failure - patient does not meet inclusion criteria: ${failedInclusions.join('; ')}`;

        } else {
            status = 'Eligible';
            overallEligible = true;
            eligibilityReason = 'Patient meets all inclusion criteria and has no exclusionary criteria';
        }

        const result = {
            protocolId: protocol.protocolId,
            protocolName: protocol.protocolName,
            indication: protocol.indication,
            timestamp: new Date().toISOString(),
            overallEligible,
            status,
            inclusionResults,
            exclusionResults,
            eligibilityReason,
            summary: {
                inclusionCriteriaMet: inclusionResults.filter(r => r.met === true).length,
                inclusionCriteriaTotal: inclusionResults.length,
                exclusionCriteriaMet: exclusionResults.filter(r => r.met === true).length,
                exclusionCriteriaTotal: exclusionResults.length,
                pendingData: [...inclusionResults, ...exclusionResults].filter(r => r.met === null).length
            }
        };

        // Cache result
        this.lastEvaluation = result;
        this.evaluationCache.set(protocolId, result);

        // Add to history
        addToHistory(result);

        console.log(`[Engine] Evaluation complete - Status: ${status}`);

        return result;
    }

    /**
     * Evaluate all protocols for a specific indication
     * @param {string} indication - Indication type (null for all)
     * @param {Object} patientData - Patient data
     * @returns {Array} Array of evaluation results
     */
    evaluateAllProtocols(indication, patientData) {
        console.log(`[Engine] Evaluating all protocols for indication: ${indication || 'ALL'}`);

        const protocolsToEvaluate = getProtocolsByIndication(indication);

        if (protocolsToEvaluate.length === 0) {
            console.warn('[Engine] No active protocols found for evaluation');
            return [];
        }

        const results = protocolsToEvaluate.map(protocol =>
            this.evaluateProtocol(protocol.protocolId, patientData)
        );

        // Update state
        eligibilityState.evaluationResults = results;
        eligibilityState.currentIndication = indication;

        console.log(`[Engine] Evaluated ${results.length} protocols`);

        return results;
    }

    /**
     * Get status of a specific criterion from last evaluation
     * @param {string} protocolId - Protocol ID
     * @param {string} criterionId - Criterion ID
     * @returns {Object|null} Criterion result or null
     */
    getCriterionStatus(protocolId, criterionId) {
        const result = this.evaluationCache.get(protocolId);

        if (!result) {
            console.warn(`[Engine] No cached result for protocol ${protocolId}`);
            return null;
        }

        // Search in inclusion criteria
        let criterion = result.inclusionResults.find(r => r.criterionId === criterionId);
        if (criterion) {
            return { ...criterion, criterionType: 'inclusion' };
        }

        // Search in exclusion criteria
        criterion = result.exclusionResults.find(r => r.criterionId === criterionId);
        if (criterion) {
            return { ...criterion, criterionType: 'exclusion' };
        }

        return null;
    }

    /**
     * Get detailed eligibility reason for a protocol
     * @param {string} protocolId - Protocol ID
     * @returns {Object} Detailed reasoning
     */
    getEligibilityReason(protocolId) {
        const result = this.evaluationCache.get(protocolId);

        if (!result) {
            return {
                error: true,
                message: `No evaluation found for protocol ${protocolId}`
            };
        }

        return {
            protocolId: result.protocolId,
            protocolName: result.protocolName,
            status: result.status,
            overallEligible: result.overallEligible,
            summary: result.eligibilityReason,
            inclusionDetails: result.inclusionResults.map(r => ({
                description: r.description,
                met: r.met,
                reason: r.reason
            })),
            exclusionDetails: result.exclusionResults.map(r => ({
                description: r.description,
                met: r.met,
                reason: r.reason
            })),
            timestamp: result.timestamp
        };
    }

    /**
     * Clear evaluation cache
     */
    clearCache() {
        this.evaluationCache.clear();
        this.lastEvaluation = null;
        console.log('[Engine] Evaluation cache cleared');
    }

    /**
     * Get evaluation statistics
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const allResults = Array.from(this.evaluationCache.values());

        return {
            totalEvaluations: allResults.length,
            eligible: allResults.filter(r => r.overallEligible === true).length,
            screenFailures: allResults.filter(r => r.overallEligible === false).length,
            pending: allResults.filter(r => r.overallEligible === null).length,
            byIndication: this.getIndicationBreakdown(allResults)
        };
    }

    /**
     * Get breakdown by indication
     * @param {Array} results - Evaluation results
     * @returns {Object} Indication breakdown
     */
    getIndicationBreakdown(results) {
        const breakdown = {};

        results.forEach(result => {
            if (!breakdown[result.indication]) {
                breakdown[result.indication] = {
                    total: 0,
                    eligible: 0,
                    screenFailure: 0,
                    pending: 0
                };
            }

            breakdown[result.indication].total++;

            if (result.overallEligible === true) {
                breakdown[result.indication].eligible++;
            } else if (result.overallEligible === false) {
                breakdown[result.indication].screenFailure++;
            } else {
                breakdown[result.indication].pending++;
            }
        });

        return breakdown;
    }
}

// Create global instance
const eligibilityEngine = new EligibilityEngine();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract patient data from the intake form
 * This function should be called when evaluating eligibility
 * @returns {Object} Patient data object
 */
function extractPatientDataFromForm() {
    const data = {};

    // Basic demographics
    data.ccid = document.getElementById('ccid')?.value || null;
    data.firstName = document.getElementById('firstName')?.value || null;
    data.lastName = document.getElementById('lastName')?.value || null;
    data.age = parseInt(document.getElementById('age')?.value) || null;
    data.gender = document.getElementById('gender')?.value || null;
    data.race = document.getElementById('race')?.value || null;
    data.language = document.getElementById('language')?.value || null;

    // BMI data
    const heightFeet = parseFloat(document.getElementById('heightFeet')?.value) || 0;
    const heightInches = parseFloat(document.getElementById('heightInches')?.value) || 0;
    const weight = parseFloat(document.getElementById('weight')?.value) || 0;

    if (heightFeet > 0 && weight > 0) {
        const totalInches = (heightFeet * 12) + heightInches;
        data.bmi = parseFloat(((weight * 703) / (totalInches * totalInches)).toFixed(1));
        data.height_inches = totalInches;
        data.weight_lbs = weight;
    }

    // Suicidality
    data.active_si = document.getElementById('currentSuicidalIdeation')?.checked || false;
    data.history_suicide_attempt = document.getElementById('historySuicideAttempt')?.checked || false;
    data.last_suicide_attempt_date = document.getElementById('lastSuicideAttemptDate')?.value || null;

    // Assessment scores (from global state if available)
    // These would be populated from the assessment modals
    data.phq9_score = eligibilityState.patientData.phq9_score || null;
    data.gad7_score = eligibilityState.patientData.gad7_score || null;
    data.ptsd_positive = eligibilityState.patientData.ptsd_positive || null;
    data.lsas_score = eligibilityState.patientData.lsas_score || null;
    data.scid_criteria_count = eligibilityState.patientData.scid_criteria_count || null;
    data.ravlt_total = eligibilityState.patientData.ravlt_total || null;

    // Medical history (extract from table)
    data.medical_history = extractMedicalHistory();

    // Medications (extract from table)
    data.medications = extractMedications();

    // Allergies (extract from table)
    data.allergies = extractAllergies();

    return data;
}

/**
 * Extract medical history from table
 * @returns {Array} Medical history array
 */
function extractMedicalHistory() {
    const rows = document.querySelectorAll('#medicalHistoryTable tbody tr');
    const history = [];

    rows.forEach(row => {
        const name = row.querySelector('.condition-name')?.value;
        if (!name) return;

        history.push({
            name,
            startDate: row.querySelector('.start-date')?.value || null,
            endDate: row.querySelector('.end-date')?.value || null,
            current: row.querySelector('.current-condition')?.checked || false,
            hasConMed: row.querySelector('.has-con-med')?.checked || false
        });
    });

    return history;
}

/**
 * Extract medications from table
 * @returns {Array} Medications array
 */
function extractMedications() {
    const rows = document.querySelectorAll('#medicationsTable tbody tr');
    const medications = [];

    rows.forEach(row => {
        const name = row.querySelector('.medication-name')?.value;
        if (!name) return;

        medications.push({
            name,
            dosage: row.querySelector('.medication-dosage')?.value || null,
            frequency: row.querySelector('.medication-frequency')?.value || null,
            startDate: row.querySelector('.medication-start-date')?.value || null,
            endDate: row.querySelector('.medication-end-date')?.value || null,
            current: row.querySelector('.medication-current')?.checked || false
        });
    });

    return medications;
}

/**
 * Extract allergies from table
 * @returns {Array} Allergies array
 */
function extractAllergies() {
    const rows = document.querySelectorAll('#allergiesTable tbody tr');
    const allergies = [];

    rows.forEach(row => {
        const name = row.querySelector('.allergy-name')?.value;
        if (!name) return;

        allergies.push({
            substance: name,
            reaction: row.querySelector('.allergy-reaction')?.value || null,
            date: row.querySelector('.allergy-date')?.value || null
        });
    });

    return allergies;
}

/**
 * Format evaluation result for display
 * @param {Object} result - Evaluation result
 * @returns {string} Formatted HTML string
 */
function formatEvaluationResult(result) {
    let html = `
        <div class="evaluation-result" data-protocol="${result.protocolId}">
            <h3>${result.protocolName}</h3>
            <div class="status ${result.status.toLowerCase().replace(' ', '-')}">${result.status}</div>
            <p>${result.eligibilityReason}</p>

            <div class="criteria-summary">
                <div>Inclusion: ${result.summary.inclusionCriteriaMet}/${result.summary.inclusionCriteriaTotal}</div>
                <div>Exclusion: ${result.summary.exclusionCriteriaMet}/${result.summary.exclusionCriteriaTotal}</div>
                ${result.summary.pendingData > 0 ? `<div>Pending: ${result.summary.pendingData}</div>` : ''}
            </div>
        </div>
    `;

    return html;
}

// ============================================================================
// EXPORT / INITIALIZATION
// ============================================================================

console.log('[Eligibility Engine] Module loaded successfully');
console.log('[Eligibility Engine] Version 1.0.0');
console.log('[Eligibility Engine] Ready to evaluate protocols');

// Make key functions available globally for integration
if (typeof window !== 'undefined') {
    window.EligibilityEngine = EligibilityEngine;
    window.eligibilityEngine = eligibilityEngine;
    window.eligibilityState = eligibilityState;
    window.protocols = protocols;
    window.evaluators = evaluators;
    window.addProtocol = addProtocol;
    window.removeProtocol = removeProtocol;
    window.getProtocol = getProtocol;
    window.getProtocolsByIndication = getProtocolsByIndication;
    window.extractPatientDataFromForm = extractPatientDataFromForm;
    window.updatePatientData = updatePatientData;
    window.getPatientData = getPatientData;
    window.clearPatientData = clearPatientData;
}
