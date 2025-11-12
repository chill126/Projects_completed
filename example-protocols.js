/**
 * ============================================================================
 * EXAMPLE PROTOCOL DEFINITIONS
 * ============================================================================
 *
 * This file contains example protocol configurations demonstrating how to
 * create protocols for the eligibility engine.
 *
 * HOW TO USE THIS FILE:
 * 1. Copy the structure of any example protocol
 * 2. Modify the criteria to match your study requirements
 * 3. Use addProtocol() to add it to the engine
 * 4. Test the protocol with sample patient data
 *
 * IMPORTANT: This file is for reference only. Load it AFTER eligibility-engine.js
 */

// ============================================================================
// EXAMPLE 1: DEPRESSION STUDY (Moderate to Severe MDD)
// ============================================================================

const DEPRESSION_STUDY_001 = {
    protocolId: "MDD-PHARMA-001",
    protocolName: "Phase 3 Study of Novel Antidepressant in Moderate to Severe MDD",
    indication: "Psych",
    phase: "Phase 3",
    sponsor: "Example Pharmaceuticals",
    active: true,

    inclusionCriteria: [
        {
            id: "inc_age",
            description: "Age 18-65 years",
            type: "range",
            field: "age",
            operator: "between",
            value: [18, 65],
            evaluationFunction: (patientData) => {
                return evaluators.rangeCheck(patientData.age, 18, 65, "Age");
            }
        },
        {
            id: "inc_phq9",
            description: "PHQ-9 score ≥ 15 (Moderate to Severe Depression)",
            type: "numeric",
            field: "phq9_score",
            operator: "greaterThanOrEqual",
            value: 15,
            evaluationFunction: (patientData) => {
                return evaluators.numericComparison(
                    patientData.phq9_score,
                    15,
                    "greaterThanOrEqual",
                    "PHQ-9 score"
                );
            }
        },
        {
            id: "inc_diagnosis_duration",
            description: "MDD diagnosis present for at least 8 weeks",
            type: "duration",
            field: "mdd_diagnosis_date",
            operator: "greaterThanOrEqual",
            value: 8,
            evaluationFunction: (patientData) => {
                return evaluators.durationCheck(
                    patientData.mdd_diagnosis_date,
                    null, // null = today
                    8,
                    "weeks",
                    "greaterThanOrEqual",
                    "MDD diagnosis"
                );
            }
        },
        {
            id: "inc_english",
            description: "English speaking",
            type: "boolean",
            field: "language",
            operator: "equals",
            value: "english",
            evaluationFunction: (patientData) => {
                const isEnglish = patientData.language === "english";
                return {
                    met: isEnglish,
                    reason: isEnglish
                        ? "Patient speaks English"
                        : `Patient language: ${patientData.language || 'not specified'}`,
                    details: { actualValue: patientData.language, requiredValue: "english" }
                };
            }
        }
    ],

    exclusionCriteria: [
        {
            id: "exc_active_si",
            description: "Active suicidal ideation",
            type: "boolean",
            field: "active_si",
            operator: "equals",
            value: true,
            evaluationFunction: (patientData) => {
                return evaluators.booleanCheck(
                    patientData.active_si,
                    true,
                    "Active suicidal ideation",
                    true // isExclusion flag
                );
            }
        },
        {
            id: "exc_recent_suicide_attempt",
            description: "Suicide attempt within past 6 months",
            type: "duration",
            field: "last_suicide_attempt_date",
            operator: "lessThan",
            value: 6,
            evaluationFunction: (patientData) => {
                if (!patientData.history_suicide_attempt) {
                    return {
                        met: false,
                        reason: "No history of suicide attempts",
                        details: { status: 'not_applicable' }
                    };
                }

                if (!patientData.last_suicide_attempt_date) {
                    return {
                        met: null,
                        reason: "History of suicide attempt present, but date not provided - pending data",
                        details: { status: 'pending' }
                    };
                }

                const result = evaluators.durationCheck(
                    patientData.last_suicide_attempt_date,
                    null,
                    6,
                    "months",
                    "lessThan",
                    "Last suicide attempt"
                );

                // For exclusion, if duration is LESS than 6 months, they are excluded
                if (result.met === true) {
                    result.reason = "EXCLUSIONARY - Suicide attempt within past 6 months";
                } else if (result.met === false) {
                    result.reason = "Suicide attempt was more than 6 months ago - acceptable";
                }

                return result;
            }
        },
        {
            id: "exc_bipolar",
            description: "Bipolar disorder diagnosis",
            type: "custom",
            field: "medical_history",
            operator: "contains",
            value: "bipolar",
            evaluationFunction: (patientData) => {
                if (!patientData.medical_history || patientData.medical_history.length === 0) {
                    return {
                        met: false,
                        reason: "No medical history provided",
                        details: { status: 'no_data' }
                    };
                }

                const hasBipolar = patientData.medical_history.some(condition =>
                    condition.name.toLowerCase().includes('bipolar')
                );

                return {
                    met: hasBipolar,
                    reason: hasBipolar
                        ? "EXCLUSIONARY - Patient has bipolar disorder diagnosis"
                        : "No bipolar disorder in medical history",
                    details: {
                        medicalHistory: patientData.medical_history.map(c => c.name),
                        excludes: hasBipolar
                    }
                };
            }
        },
        {
            id: "exc_psychotic",
            description: "Current or lifetime psychotic disorder",
            type: "custom",
            field: "medical_history",
            operator: "contains",
            value: ["schizophrenia", "schizoaffective", "psychosis"],
            evaluationFunction: (patientData) => {
                if (!patientData.medical_history || patientData.medical_history.length === 0) {
                    return {
                        met: false,
                        reason: "No medical history provided",
                        details: { status: 'no_data' }
                    };
                }

                const psychoticTerms = ["schizophrenia", "schizoaffective", "psychosis", "psychotic"];
                const foundConditions = [];

                patientData.medical_history.forEach(condition => {
                    const nameLower = condition.name.toLowerCase();
                    psychoticTerms.forEach(term => {
                        if (nameLower.includes(term)) {
                            foundConditions.push(condition.name);
                        }
                    });
                });

                const hasPsychotic = foundConditions.length > 0;

                return {
                    met: hasPsychotic,
                    reason: hasPsychotic
                        ? `EXCLUSIONARY - Psychotic disorder found: ${[...new Set(foundConditions)].join(', ')}`
                        : "No psychotic disorders in medical history",
                    details: {
                        medicalHistory: patientData.medical_history.map(c => c.name),
                        foundConditions,
                        excludes: hasPsychotic
                    }
                };
            }
        },
        {
            id: "exc_antidepressants",
            description: "Currently taking antidepressant medications",
            type: "medication",
            field: "medications",
            operator: "none",
            value: ["SSRI", "SNRI", "TCA", "MAOI", "mirtazapine", "bupropion"],
            evaluationFunction: (patientData) => {
                const antidepressantClasses = [
                    "sertraline", "fluoxetine", "escitalopram", "citalopram", "paroxetine", // SSRIs
                    "venlafaxine", "duloxetine", "desvenlafaxine", // SNRIs
                    "amitriptyline", "nortriptyline", "imipramine", // TCAs
                    "phenelzine", "tranylcypromine", "selegiline", // MAOIs
                    "mirtazapine", "bupropion", "trazodone" // Atypicals
                ];

                return evaluators.medicationCheck(
                    patientData.medications,
                    antidepressantClasses,
                    "none",
                    "Antidepressant medications"
                );
            }
        },
        {
            id: "exc_bmi",
            description: "BMI < 18 or > 40",
            type: "custom",
            field: "bmi",
            operator: "outsideRange",
            value: [18, 40],
            evaluationFunction: (patientData) => {
                if (!patientData.bmi) {
                    return {
                        met: null,
                        reason: "BMI not calculated - pending height/weight data",
                        details: { status: 'pending' }
                    };
                }

                const bmi = patientData.bmi;
                const isOutOfRange = bmi < 18 || bmi > 40;

                return {
                    met: isOutOfRange,
                    reason: isOutOfRange
                        ? `EXCLUSIONARY - BMI of ${bmi} is outside acceptable range [18, 40]`
                        : `BMI of ${bmi} is within acceptable range`,
                    details: {
                        actualValue: bmi,
                        acceptableRange: [18, 40],
                        excludes: isOutOfRange
                    }
                };
            }
        }
    ]
};

// ============================================================================
// EXAMPLE 2: ALCOHOL USE DISORDER STUDY
// ============================================================================

const AUD_STUDY_001 = {
    protocolId: "AUD-TRIAL-001",
    protocolName: "Alcohol Use Disorder Treatment Study - Moderate to Severe",
    indication: "AUD",
    phase: "Phase 2",
    sponsor: "Addiction Research Institute",
    active: true,

    inclusionCriteria: [
        {
            id: "inc_age",
            description: "Age 21-70 years",
            type: "range",
            field: "age",
            operator: "between",
            value: [21, 70],
            evaluationFunction: (patientData) => {
                return evaluators.rangeCheck(patientData.age, 21, 70, "Age");
            }
        },
        {
            id: "inc_scid_aud",
            description: "DSM-5 AUD diagnosis - Moderate or Severe (≥4 criteria)",
            type: "numeric",
            field: "scid_criteria_count",
            operator: "greaterThanOrEqual",
            value: 4,
            evaluationFunction: (patientData) => {
                const result = evaluators.numericComparison(
                    patientData.scid_criteria_count,
                    4,
                    "greaterThanOrEqual",
                    "SCID AUD criteria"
                );

                if (result.met === true) {
                    const severity = patientData.scid_criteria_count >= 6 ? "Severe" : "Moderate";
                    result.reason = `SCID criteria met: ${patientData.scid_criteria_count}/11 (${severity} AUD)`;
                }

                return result;
            }
        },
        {
            id: "inc_drinking_frequency",
            description: "Heavy drinking days: ≥4 days in past 28 days",
            type: "numeric",
            field: "heavy_drinking_days_past_month",
            operator: "greaterThanOrEqual",
            value: 4,
            evaluationFunction: (patientData) => {
                return evaluators.numericComparison(
                    patientData.heavy_drinking_days_past_month,
                    4,
                    "greaterThanOrEqual",
                    "Heavy drinking days in past month"
                );
            }
        },
        {
            id: "inc_treatment_seeking",
            description: "Patient seeking treatment for AUD",
            type: "boolean",
            field: "seeking_aud_treatment",
            operator: "equals",
            value: true,
            evaluationFunction: (patientData) => {
                return evaluators.booleanCheck(
                    patientData.seeking_aud_treatment,
                    true,
                    "Seeking AUD treatment"
                );
            }
        }
    ],

    exclusionCriteria: [
        {
            id: "exc_withdrawal_risk",
            description: "Severe alcohol withdrawal risk requiring medical detox",
            type: "boolean",
            field: "severe_withdrawal_risk",
            operator: "equals",
            value: true,
            evaluationFunction: (patientData) => {
                return evaluators.booleanCheck(
                    patientData.severe_withdrawal_risk,
                    true,
                    "Severe withdrawal risk",
                    true
                );
            }
        },
        {
            id: "exc_liver_disease",
            description: "Severe liver disease or cirrhosis",
            type: "custom",
            field: "medical_history",
            operator: "contains",
            value: ["cirrhosis", "hepatic encephalopathy", "liver failure"],
            evaluationFunction: (patientData) => {
                if (!patientData.medical_history || patientData.medical_history.length === 0) {
                    return {
                        met: false,
                        reason: "No liver disease in medical history",
                        details: { status: 'no_data' }
                    };
                }

                const liverConditions = ["cirrhosis", "hepatic", "liver failure", "hepatitis c"];
                const foundConditions = [];

                patientData.medical_history.forEach(condition => {
                    const nameLower = condition.name.toLowerCase();
                    liverConditions.forEach(term => {
                        if (nameLower.includes(term)) {
                            foundConditions.push(condition.name);
                        }
                    });
                });

                const hasLiverDisease = foundConditions.length > 0;

                return {
                    met: hasLiverDisease,
                    reason: hasLiverDisease
                        ? `EXCLUSIONARY - Liver disease found: ${[...new Set(foundConditions)].join(', ')}`
                        : "No severe liver disease in medical history",
                    details: {
                        foundConditions,
                        excludes: hasLiverDisease
                    }
                };
            }
        },
        {
            id: "exc_other_substance_dependence",
            description: "Current dependence on other substances (except nicotine/caffeine)",
            type: "custom",
            field: "substance_use",
            operator: "custom",
            value: null,
            evaluationFunction: (patientData) => {
                // This would need to check substance use data from the form
                // For now, returning a placeholder
                return {
                    met: null,
                    reason: "Substance use assessment pending",
                    details: { status: 'pending' }
                };
            }
        },
        {
            id: "exc_disulfiram_current",
            description: "Currently taking disulfiram",
            type: "medication",
            field: "medications",
            operator: "none",
            value: ["disulfiram", "antabuse"],
            evaluationFunction: (patientData) => {
                return evaluators.medicationCheck(
                    patientData.medications,
                    ["disulfiram", "antabuse"],
                    "none",
                    "Disulfiram"
                );
            }
        }
    ]
};

// ============================================================================
// EXAMPLE 3: NEUROLOGY STUDY (Alzheimer's Disease)
// ============================================================================

const NEURO_AD_STUDY_001 = {
    protocolId: "AD-NEURO-001",
    protocolName: "Early Alzheimer's Disease Cognitive Enhancement Study",
    indication: "Neuro",
    phase: "Phase 3",
    sponsor: "Neuroscience Research Group",
    active: true,

    inclusionCriteria: [
        {
            id: "inc_age",
            description: "Age 55-85 years",
            type: "range",
            field: "age",
            operator: "between",
            value: [55, 85],
            evaluationFunction: (patientData) => {
                return evaluators.rangeCheck(patientData.age, 55, 85, "Age");
            }
        },
        {
            id: "inc_ravlt",
            description: "RAVLT total score 30-45 (Mild cognitive impairment range)",
            type: "range",
            field: "ravlt_total",
            operator: "between",
            value: [30, 45],
            evaluationFunction: (patientData) => {
                return evaluators.rangeCheck(
                    patientData.ravlt_total,
                    30,
                    45,
                    "RAVLT total score"
                );
            }
        },
        {
            id: "inc_diagnosis_ad",
            description: "Diagnosis of early-stage Alzheimer's disease",
            type: "custom",
            field: "medical_history",
            operator: "contains",
            value: "alzheimer",
            evaluationFunction: (patientData) => {
                if (!patientData.medical_history || patientData.medical_history.length === 0) {
                    return {
                        met: null,
                        reason: "Medical history not provided - pending data",
                        details: { status: 'pending' }
                    };
                }

                const hasAD = patientData.medical_history.some(condition =>
                    condition.name.toLowerCase().includes('alzheimer')
                );

                return {
                    met: hasAD,
                    reason: hasAD
                        ? "Alzheimer's disease diagnosis confirmed in medical history"
                        : "No Alzheimer's diagnosis in medical history",
                    details: {
                        medicalHistory: patientData.medical_history.map(c => c.name),
                        diagnosisRequired: true
                    }
                };
            }
        },
        {
            id: "inc_caregiver",
            description: "Reliable caregiver available",
            type: "boolean",
            field: "has_caregiver",
            operator: "equals",
            value: true,
            evaluationFunction: (patientData) => {
                return evaluators.booleanCheck(
                    patientData.has_caregiver,
                    true,
                    "Caregiver availability"
                );
            }
        }
    ],

    exclusionCriteria: [
        {
            id: "exc_other_dementia",
            description: "Other types of dementia (vascular, Lewy body, frontotemporal)",
            type: "custom",
            field: "medical_history",
            operator: "contains",
            value: ["vascular dementia", "lewy body", "frontotemporal"],
            evaluationFunction: (patientData) => {
                if (!patientData.medical_history || patientData.medical_history.length === 0) {
                    return {
                        met: false,
                        reason: "No other dementia types found",
                        details: { status: 'no_data' }
                    };
                }

                const otherDementiaTerms = ["vascular dementia", "lewy body", "frontotemporal", "parkinson"];
                const foundConditions = [];

                patientData.medical_history.forEach(condition => {
                    const nameLower = condition.name.toLowerCase();
                    otherDementiaTerms.forEach(term => {
                        if (nameLower.includes(term) && !nameLower.includes('alzheimer')) {
                            foundConditions.push(condition.name);
                        }
                    });
                });

                const hasOtherDementia = foundConditions.length > 0;

                return {
                    met: hasOtherDementia,
                    reason: hasOtherDementia
                        ? `EXCLUSIONARY - Other dementia type found: ${[...new Set(foundConditions)].join(', ')}`
                        : "No other dementia types in medical history",
                    details: {
                        foundConditions,
                        excludes: hasOtherDementia
                    }
                };
            }
        },
        {
            id: "exc_cholinesterase_inhibitors",
            description: "Current use of cholinesterase inhibitors or memantine",
            type: "medication",
            field: "medications",
            operator: "none",
            value: ["donepezil", "rivastigmine", "galantamine", "memantine", "aricept", "exelon", "razadyne", "namenda"],
            evaluationFunction: (patientData) => {
                return evaluators.medicationCheck(
                    patientData.medications,
                    ["donepezil", "rivastigmine", "galantamine", "memantine", "aricept", "exelon", "razadyne", "namenda"],
                    "none",
                    "AD medications"
                );
            }
        },
        {
            id: "exc_severe_depression",
            description: "Severe depression (PHQ-9 ≥ 20)",
            type: "numeric",
            field: "phq9_score",
            operator: "greaterThanOrEqual",
            value: 20,
            evaluationFunction: (patientData) => {
                const result = evaluators.numericComparison(
                    patientData.phq9_score,
                    20,
                    "greaterThanOrEqual",
                    "PHQ-9 score"
                );

                if (result.met === true) {
                    result.reason = `EXCLUSIONARY - Severe depression (PHQ-9 = ${patientData.phq9_score})`;
                } else if (result.met === false) {
                    result.reason = `PHQ-9 score of ${patientData.phq9_score} is below exclusionary threshold`;
                }

                return result;
            }
        }
    ]
};

// ============================================================================
// LOAD EXAMPLES INTO PROTOCOLS ARRAY
// ============================================================================

/**
 * Function to load example protocols
 * Call this to add example protocols to the engine
 */
function loadExampleProtocols() {
    console.log('[Examples] Loading example protocols...');

    const exampleProtocols = [
        DEPRESSION_STUDY_001,
        AUD_STUDY_001,
        NEURO_AD_STUDY_001
    ];

    let loadedCount = 0;

    exampleProtocols.forEach(protocol => {
        if (addProtocol(protocol)) {
            loadedCount++;
        }
    });

    console.log(`[Examples] Loaded ${loadedCount}/${exampleProtocols.length} example protocols`);

    return {
        success: true,
        loaded: loadedCount,
        total: exampleProtocols.length,
        protocols: exampleProtocols.map(p => ({
            id: p.protocolId,
            name: p.protocolName,
            indication: p.indication
        }))
    };
}

/**
 * Clear all example protocols
 */
function clearExampleProtocols() {
    console.log('[Examples] Clearing example protocols...');

    const exampleIds = [
        "MDD-PHARMA-001",
        "AUD-TRIAL-001",
        "AD-NEURO-001"
    ];

    let removedCount = 0;

    exampleIds.forEach(id => {
        if (removeProtocol(id)) {
            removedCount++;
        }
    });

    console.log(`[Examples] Removed ${removedCount}/${exampleIds.length} example protocols`);
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.loadExampleProtocols = loadExampleProtocols;
    window.clearExampleProtocols = clearExampleProtocols;
    window.DEPRESSION_STUDY_001 = DEPRESSION_STUDY_001;
    window.AUD_STUDY_001 = AUD_STUDY_001;
    window.NEURO_AD_STUDY_001 = NEURO_AD_STUDY_001;
}

console.log('[Examples] Example protocols module loaded');
