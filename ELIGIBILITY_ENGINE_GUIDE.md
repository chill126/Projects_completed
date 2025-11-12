# Clinical Research Eligibility Engine - Developer Guide

## Version 1.0.0 - Part 1 of 4

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Core Concepts](#core-concepts)
5. [Creating Protocols](#creating-protocols)
6. [Evaluation Functions](#evaluation-functions)
7. [API Reference](#api-reference)
8. [Examples](#examples)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Clinical Research Eligibility Engine is a JavaScript-based system for evaluating patient eligibility across multiple clinical research protocols. It provides:

- **Flexible Protocol Definition**: Define any number of protocols with custom criteria
- **Intelligent Evaluation**: Automatic evaluation with detailed reasoning
- **State Management**: Track patient data and evaluation history
- **Extensible Architecture**: Easy to add new evaluation types
- **Debug Support**: Comprehensive logging and debugging capabilities

### Key Features

✅ Support for multiple study indications (Psych, Neuro, AUD, Fibromyalgia, etc.)
✅ Inclusion and exclusion criteria evaluation
✅ Handles missing data gracefully (marks as "Pending" not "Failed")
✅ Detailed evaluation reasoning for every criterion
✅ Evaluation history tracking
✅ Built-in helper functions for common patterns

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────┐
│                  INTAKE FORM                        │
│          (Patient Data Collection)                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ├─> extractPatientDataFromForm()
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│              PATIENT DATA STATE                     │
│          (eligibilityState.patientData)             │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│            ELIGIBILITY ENGINE                       │
│    • evaluateProtocol()                             │
│    • evaluateAllProtocols()                         │
│    • getCriterionStatus()                           │
└────────────────┬────────────────────────────────────┘
                 │
                 ├─> PROTOCOLS ARRAY
                 │   ├─> Protocol 1
                 │   ├─> Protocol 2
                 │   └─> Protocol N
                 │
                 ├─> EVALUATORS
                 │   ├─> numericComparison()
                 │   ├─> rangeCheck()
                 │   ├─> booleanCheck()
                 │   ├─> dateComparison()
                 │   ├─> durationCheck()
                 │   └─> medicationCheck()
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│           EVALUATION RESULTS                        │
│    • Overall eligibility determination              │
│    • Detailed criterion-by-criterion results        │
│    • Reasoning and explanations                     │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. **Data Collection**: Patient completes intake form
2. **Data Extraction**: `extractPatientDataFromForm()` pulls data into structured object
3. **Evaluation**: `eligibilityEngine.evaluateProtocol()` or `evaluateAllProtocols()`
4. **Results**: Detailed evaluation results with eligibility determination
5. **Display**: Results rendered in UI (Part 2-4)

---

## Getting Started

### Installation

1. **Include the engine in your HTML:**

```html
<!-- Load the eligibility engine -->
<script src="eligibility-engine.js"></script>

<!-- (Optional) Load example protocols -->
<script src="example-protocols.js"></script>
```

2. **Verify installation:**

```javascript
// Check that the engine loaded
console.log(eligibilityEngine); // Should show EligibilityEngine instance
console.log(protocols); // Should show empty array (or examples if loaded)
```

### Quick Start

```javascript
// 1. Load example protocols (optional)
loadExampleProtocols();

// 2. Extract patient data from form
const patientData = extractPatientDataFromForm();

// 3. Update state with additional data (e.g., from assessments)
updatePatientData({
    phq9_score: 18,
    gad7_score: 12,
    scid_criteria_count: 6
});

// 4. Evaluate all protocols for an indication
const results = eligibilityEngine.evaluateAllProtocols('Psych', getPatientData());

// 5. View results
results.forEach(result => {
    console.log(`${result.protocolName}: ${result.status}`);
    console.log(`Reason: ${result.eligibilityReason}`);
});
```

---

## Core Concepts

### 1. Protocol Object

A protocol represents a clinical research study with eligibility criteria.

```javascript
{
    protocolId: "UNIQUE-ID",           // Required: Unique identifier
    protocolName: "Study Full Name",   // Required: Human-readable name
    indication: "Psych",               // Required: Study category
    phase: "Phase 3",                  // Optional: Study phase
    sponsor: "Company Name",           // Optional: Sponsor
    active: true,                      // Required: Enable/disable
    inclusionCriteria: [...],          // Required: Array of criteria
    exclusionCriteria: [...]           // Required: Array of criteria
}
```

### 2. Criterion Object

A criterion represents a single eligibility requirement.

```javascript
{
    id: "inc_1",                       // Unique within protocol
    description: "Age 18-65 years",    // Human-readable
    type: "range",                     // Type of evaluation
    field: "age",                      // Which patient data field
    operator: "between",               // How to compare
    value: [18, 65],                   // Expected value(s)
    evaluationFunction: (patientData) => {
        // Custom evaluation logic
        return {
            met: true/false/null,      // Required
            reason: "explanation",      // Required
            details: {...}              // Required
        };
    }
}
```

### 3. Evaluation Result

The output from evaluating a criterion.

```javascript
{
    criterionId: "inc_1",
    description: "Age 18-65 years",
    type: "range",
    met: true,                         // true, false, or null (pending)
    reason: "Age of 45 is within range [18, 65]",
    details: {
        actualValue: 45,
        range: [18, 65],
        status: 'evaluated'
    }
}
```

### 4. Protocol Evaluation Result

The complete result for an entire protocol.

```javascript
{
    protocolId: "STUDY-001",
    protocolName: "Example Study",
    indication: "Psych",
    timestamp: "2025-11-12T10:30:00Z",
    overallEligible: true,             // Overall determination
    status: "Eligible",                // "Eligible" | "Screen Failure" | "Pending Data"
    inclusionResults: [...],           // Array of criterion results
    exclusionResults: [...],           // Array of criterion results
    eligibilityReason: "Full explanation",
    summary: {
        inclusionCriteriaMet: 5,
        inclusionCriteriaTotal: 5,
        exclusionCriteriaMet: 0,
        exclusionCriteriaTotal: 8,
        pendingData: 0
    }
}
```

---

## Creating Protocols

### Step-by-Step Guide

#### Step 1: Define Protocol Metadata

```javascript
const MY_PROTOCOL = {
    protocolId: "MY-STUDY-001",
    protocolName: "My Clinical Trial Name",
    indication: "Psych",  // Must match indication selector
    phase: "Phase 2",
    sponsor: "My Organization",
    active: true,
    inclusionCriteria: [],  // We'll add these next
    exclusionCriteria: []
};
```

#### Step 2: Add Inclusion Criteria

```javascript
MY_PROTOCOL.inclusionCriteria = [
    // Age requirement
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

    // Depression severity
    {
        id: "inc_phq9",
        description: "PHQ-9 score ≥ 10",
        type: "numeric",
        field: "phq9_score",
        operator: "greaterThanOrEqual",
        value: 10,
        evaluationFunction: (patientData) => {
            return evaluators.numericComparison(
                patientData.phq9_score,
                10,
                "greaterThanOrEqual",
                "PHQ-9 score"
            );
        }
    }
];
```

#### Step 3: Add Exclusion Criteria

```javascript
MY_PROTOCOL.exclusionCriteria = [
    // Suicidal ideation
    {
        id: "exc_si",
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
                true  // isExclusion flag
            );
        }
    },

    // Medication exclusion
    {
        id: "exc_antidepressants",
        description: "Currently on antidepressants",
        type: "medication",
        field: "medications",
        operator: "none",
        value: ["sertraline", "fluoxetine", "escitalopram"],
        evaluationFunction: (patientData) => {
            return evaluators.medicationCheck(
                patientData.medications,
                ["sertraline", "fluoxetine", "escitalopram"],
                "none",
                "Antidepressants"
            );
        }
    }
];
```

#### Step 4: Add Protocol to Engine

```javascript
// Add the protocol
addProtocol(MY_PROTOCOL);

// Verify it was added
console.log(getProtocol("MY-STUDY-001"));
```

---

## Evaluation Functions

### Built-in Evaluators

The `evaluators` object provides pre-built functions for common patterns.

#### 1. Numeric Comparison

```javascript
evaluators.numericComparison(actualValue, threshold, operator, fieldName)
```

**Operators:** `"equals"`, `"greaterThan"`, `"greaterThanOrEqual"`, `"lessThan"`, `"lessThanOrEqual"`

**Example:**
```javascript
{
    id: "inc_score",
    description: "Score must be at least 15",
    evaluationFunction: (patientData) => {
        return evaluators.numericComparison(
            patientData.score,
            15,
            "greaterThanOrEqual",
            "Score"
        );
    }
}
```

#### 2. Range Check

```javascript
evaluators.rangeCheck(actualValue, min, max, fieldName)
```

**Example:**
```javascript
{
    id: "inc_age",
    description: "Age between 18-65",
    evaluationFunction: (patientData) => {
        return evaluators.rangeCheck(patientData.age, 18, 65, "Age");
    }
}
```

#### 3. Boolean Check

```javascript
evaluators.booleanCheck(actualValue, requiredValue, fieldName, isExclusion)
```

**Example:**
```javascript
{
    id: "exc_pregnant",
    description: "Not pregnant",
    evaluationFunction: (patientData) => {
        return evaluators.booleanCheck(
            patientData.pregnant,
            true,
            "Pregnancy",
            true  // This is an exclusion criterion
        );
    }
}
```

#### 4. Date Comparison

```javascript
evaluators.dateComparison(actualDate, comparisonDate, operator, fieldName)
```

**Operators:** `"before"`, `"after"`, `"equals"`, `"onOrAfter"`, `"onOrBefore"`

**Example:**
```javascript
{
    id: "inc_enrollment_date",
    description: "Enrolled after Jan 1, 2025",
    evaluationFunction: (patientData) => {
        return evaluators.dateComparison(
            patientData.enrollment_date,
            "2025-01-01",
            "after",
            "Enrollment date"
        );
    }
}
```

#### 5. Duration Check

```javascript
evaluators.durationCheck(startDate, endDate, requiredDuration, unit, operator, fieldName)
```

**Units:** `"days"`, `"weeks"`, `"months"`, `"years"`

**Example:**
```javascript
{
    id: "inc_diagnosis_duration",
    description: "Diagnosed at least 6 months ago",
    evaluationFunction: (patientData) => {
        return evaluators.durationCheck(
            patientData.diagnosis_date,
            null,  // null = today
            6,
            "months",
            "greaterThanOrEqual",
            "Time since diagnosis"
        );
    }
}
```

#### 6. Medication Check

```javascript
evaluators.medicationCheck(medications, targetMedications, matchType, fieldName)
```

**Match Types:** `"any"`, `"all"`, `"none"`

**Example:**
```javascript
{
    id: "exc_ssri",
    description: "Not currently on SSRIs",
    evaluationFunction: (patientData) => {
        return evaluators.medicationCheck(
            patientData.medications,
            ["sertraline", "fluoxetine", "paroxetine"],
            "none",  // Patient should not be on ANY of these
            "SSRI medications"
        );
    }
}
```

#### 7. String Contains

```javascript
evaluators.stringContains(actualValue, searchTerms, caseSensitive, fieldName)
```

**Example:**
```javascript
{
    id: "inc_diagnosis",
    description: "Has depression diagnosis",
    evaluationFunction: (patientData) => {
        return evaluators.stringContains(
            patientData.primary_diagnosis,
            ["depression", "MDD", "major depressive"],
            false,  // case insensitive
            "Primary diagnosis"
        );
    }
}
```

#### 8. Custom Evaluation

For complex logic that doesn't fit standard patterns:

```javascript
{
    id: "inc_complex",
    description: "Complex custom requirement",
    evaluationFunction: (patientData) => {
        // Your custom logic here
        const condition1 = patientData.age > 18;
        const condition2 = patientData.phq9_score >= 10;
        const condition3 = !patientData.active_si;

        const met = condition1 && condition2 && condition3;

        return {
            met: met,
            reason: met
                ? "All custom conditions satisfied"
                : "Custom conditions not met",
            details: {
                condition1,
                condition2,
                condition3,
                logic: "AND"
            }
        };
    }
}
```

---

## API Reference

### State Management

#### `updatePatientData(data)`
Update patient data in state.

```javascript
updatePatientData({ phq9_score: 18, age: 45 });
```

#### `getPatientData()`
Get current patient data.

```javascript
const data = getPatientData();
```

#### `clearPatientData()`
Clear all patient data and evaluation results.

```javascript
clearPatientData();
```

### Protocol Management

#### `addProtocol(protocol)`
Add a protocol to the system.

```javascript
const success = addProtocol(MY_PROTOCOL);
```

#### `removeProtocol(protocolId)`
Remove a protocol by ID.

```javascript
removeProtocol("MY-STUDY-001");
```

#### `getProtocol(protocolId)`
Get a specific protocol.

```javascript
const protocol = getProtocol("MY-STUDY-001");
```

#### `getProtocolsByIndication(indication)`
Get all active protocols for an indication.

```javascript
const psychProtocols = getProtocolsByIndication("Psych");
```

#### `toggleProtocolStatus(protocolId)`
Toggle active/inactive status.

```javascript
const newStatus = toggleProtocolStatus("MY-STUDY-001");
```

### Evaluation Engine

#### `eligibilityEngine.evaluateProtocol(protocolId, patientData)`
Evaluate a single protocol.

```javascript
const result = eligibilityEngine.evaluateProtocol(
    "MY-STUDY-001",
    getPatientData()
);
```

#### `eligibilityEngine.evaluateAllProtocols(indication, patientData)`
Evaluate all protocols for an indication.

```javascript
const results = eligibilityEngine.evaluateAllProtocols(
    "Psych",
    getPatientData()
);
```

#### `eligibilityEngine.getCriterionStatus(protocolId, criterionId)`
Get status of a specific criterion.

```javascript
const criterionResult = eligibilityEngine.getCriterionStatus(
    "MY-STUDY-001",
    "inc_age"
);
```

#### `eligibilityEngine.getEligibilityReason(protocolId)`
Get detailed reasoning for eligibility determination.

```javascript
const reasoning = eligibilityEngine.getEligibilityReason("MY-STUDY-001");
```

#### `eligibilityEngine.getStatistics()`
Get evaluation statistics.

```javascript
const stats = eligibilityEngine.getStatistics();
// {
//     totalEvaluations: 3,
//     eligible: 1,
//     screenFailures: 2,
//     pending: 0,
//     byIndication: {...}
// }
```

#### `eligibilityEngine.clearCache()`
Clear evaluation cache.

```javascript
eligibilityEngine.clearCache();
```

### Data Extraction

#### `extractPatientDataFromForm()`
Extract all patient data from the intake form.

```javascript
const data = extractPatientDataFromForm();
```

---

## Examples

### Example 1: Simple Age + Score Protocol

```javascript
const SIMPLE_PROTOCOL = {
    protocolId: "SIMPLE-001",
    protocolName: "Simple Depression Study",
    indication: "Psych",
    active: true,

    inclusionCriteria: [
        {
            id: "inc_age",
            description: "Age 18-65",
            evaluationFunction: (patientData) => {
                return evaluators.rangeCheck(patientData.age, 18, 65, "Age");
            }
        },
        {
            id: "inc_phq9",
            description: "PHQ-9 ≥ 10",
            evaluationFunction: (patientData) => {
                return evaluators.numericComparison(
                    patientData.phq9_score,
                    10,
                    "greaterThanOrEqual",
                    "PHQ-9"
                );
            }
        }
    ],

    exclusionCriteria: [
        {
            id: "exc_si",
            description: "Active suicidal ideation",
            evaluationFunction: (patientData) => {
                return evaluators.booleanCheck(
                    patientData.active_si,
                    true,
                    "SI",
                    true
                );
            }
        }
    ]
};

addProtocol(SIMPLE_PROTOCOL);
```

### Example 2: Medication-Based Exclusion

```javascript
const MED_PROTOCOL = {
    protocolId: "MED-001",
    protocolName: "Medication Study",
    indication: "Psych",
    active: true,

    inclusionCriteria: [
        {
            id: "inc_age",
            description: "Age 18+",
            evaluationFunction: (patientData) => {
                return evaluators.numericComparison(
                    patientData.age,
                    18,
                    "greaterThanOrEqual",
                    "Age"
                );
            }
        }
    ],

    exclusionCriteria: [
        {
            id: "exc_current_antidepressants",
            description: "Not on antidepressants",
            evaluationFunction: (patientData) => {
                const antidepressants = [
                    "sertraline", "zoloft",
                    "fluoxetine", "prozac",
                    "escitalopram", "lexapro",
                    "citalopram", "celexa"
                ];

                return evaluators.medicationCheck(
                    patientData.medications,
                    antidepressants,
                    "none",
                    "Antidepressant medications"
                );
            }
        }
    ]
};

addProtocol(MED_PROTOCOL);
```

### Example 3: Complex Custom Logic

```javascript
const COMPLEX_PROTOCOL = {
    protocolId: "COMPLEX-001",
    protocolName: "Complex Criteria Study",
    indication: "Psych",
    active: true,

    inclusionCriteria: [
        {
            id: "inc_composite",
            description: "Moderate depression OR severe anxiety",
            evaluationFunction: (patientData) => {
                const phq9 = patientData.phq9_score || 0;
                const gad7 = patientData.gad7_score || 0;

                const moderateDepression = phq9 >= 10;
                const severeAnxiety = gad7 >= 15;

                const met = moderateDepression || severeAnxiety;

                let reason;
                if (moderateDepression && severeAnxiety) {
                    reason = `Both criteria met: PHQ-9=${phq9}, GAD-7=${gad7}`;
                } else if (moderateDepression) {
                    reason = `Moderate depression met (PHQ-9=${phq9})`;
                } else if (severeAnxiety) {
                    reason = `Severe anxiety met (GAD-7=${gad7})`;
                } else {
                    reason = `Neither criterion met: PHQ-9=${phq9}, GAD-7=${gad7}`;
                }

                return {
                    met,
                    reason,
                    details: {
                        phq9Score: phq9,
                        gad7Score: gad7,
                        moderateDepression,
                        severeAnxiety,
                        logic: "OR"
                    }
                };
            }
        }
    ],

    exclusionCriteria: []
};

addProtocol(COMPLEX_PROTOCOL);
```

---

## Best Practices

### 1. Criterion Naming

✅ **DO:**
- Use descriptive IDs: `inc_age_range`, `exc_active_si`
- Write clear descriptions: "Age between 18-65 years"
- Include units and thresholds: "PHQ-9 score ≥ 15"

❌ **DON'T:**
- Use cryptic IDs: `c1`, `x2`
- Vague descriptions: "Age requirement"
- Missing context: "Score requirement"

### 2. Handle Missing Data

✅ **DO:**
```javascript
evaluationFunction: (patientData) => {
    if (!patientData.phq9_score) {
        return {
            met: null,  // null = pending
            reason: "PHQ-9 not completed - pending data",
            details: { status: 'pending' }
        };
    }
    // ... rest of logic
}
```

❌ **DON'T:**
```javascript
evaluationFunction: (patientData) => {
    const met = patientData.phq9_score >= 10; // Error if undefined!
    return { met, reason: "..." };
}
```

### 3. Provide Detailed Reasons

✅ **DO:**
```javascript
return {
    met: true,
    reason: "PHQ-9 score of 18 meets moderate depression threshold (≥ 15)",
    details: { actualValue: 18, threshold: 15, operator: ">=" }
};
```

❌ **DON'T:**
```javascript
return {
    met: true,
    reason: "Criteria met",
    details: {}
};
```

### 4. Use Built-in Evaluators

✅ **DO:**
```javascript
return evaluators.rangeCheck(patientData.age, 18, 65, "Age");
```

❌ **DON'T:**
```javascript
// Reinventing the wheel
const age = patientData.age;
const met = age >= 18 && age <= 65;
return { met, reason: "...", details: {...} };
```

### 5. Test Your Protocols

Always test with sample data:

```javascript
// Create test patient data
const testPatient = {
    age: 45,
    phq9_score: 18,
    active_si: false,
    medications: []
};

// Evaluate
const result = eligibilityEngine.evaluateProtocol(
    "MY-STUDY-001",
    testPatient
);

// Check results
console.log(result.status); // Should be "Eligible"
console.log(result.inclusionResults);
console.log(result.exclusionResults);
```

---

## Troubleshooting

### Issue: "Protocol not found"

**Cause:** Protocol ID doesn't match or protocol wasn't added.

**Solution:**
```javascript
// Check if protocol exists
const protocol = getProtocol("MY-STUDY-001");
if (!protocol) {
    console.log("Protocol not found, adding it...");
    addProtocol(MY_PROTOCOL);
}
```

### Issue: All criteria show "Pending"

**Cause:** Patient data not extracted from form.

**Solution:**
```javascript
// Extract data first
const patientData = extractPatientDataFromForm();

// Or update specific fields
updatePatientData({ phq9_score: 18 });

// Then evaluate
const results = eligibilityEngine.evaluateAllProtocols(
    "Psych",
    getPatientData()
);
```

### Issue: Custom evaluation always returns false

**Cause:** Evaluation function not returning correct structure.

**Solution:**
```javascript
// Ensure you return the required fields
evaluationFunction: (patientData) => {
    return {
        met: true/false/null,     // Required
        reason: "explanation",     // Required
        details: { ... }           // Required
    };
}
```

### Issue: Medication check not working

**Cause:** Medication names don't match format in patient data.

**Solution:**
```javascript
// Check actual medication data structure
console.log(patientData.medications);
// [{ name: "Sertraline 50mg", dosage: "50mg", ... }]

// Use partial matching
return evaluators.medicationCheck(
    patientData.medications,
    ["sertraline", "zoloft"],  // Will match "Sertraline 50mg"
    "none",
    "SSRIs"
);
```

### Debug Mode

Enable detailed logging:

```javascript
eligibilityState.debugMode = true;

// Now all evaluations will log detailed information
const result = eligibilityEngine.evaluateProtocol("MY-STUDY-001", patientData);
```

---

## Next Steps

This is **Part 1 of 4** - the core architecture.

**Coming in Parts 2-4:**
- Part 2: UI Components (Protocol Builder, Results Display)
- Part 3: Advanced Features (Protocol Import/Export, Validation Rules)
- Part 4: Integration & Testing (Form Integration, Test Suite)

For now, you can:

1. ✅ Create custom protocols using the examples
2. ✅ Test evaluations with sample patient data
3. ✅ Explore the built-in evaluators
4. ✅ Load and experiment with example protocols

---

## Questions?

Check the example protocols in `example-protocols.js` for working implementations.

The engine is fully functional and ready to use programmatically while UI components are being developed!
