/**
 * HEIMDALL Phase 2 — Request/Response Schemas
 * Standardizes all communication between Frontend and Engines
 */

const Schemas = {
    // Math Engine Requests
    bep: {
        fixedCost: "number",
        variableCost: "number",
        sellingPrice: "number"
    },
    emv: {
        scenarios: "array", // [{ name, probability, impact }]
        investmentCost: "number"
    },
    eoq: {
        annualDemand: "number",
        orderCost: "number",
        holdingCost: "number"
    },
    
    // Forecast Engine Requests
    forecast: {
        data: "array",
        window: "number",
        periods: "number"
    },

    // Optimization Engine Requests
    transportation: {
        supply: "array",
        demand: "array",
        costMatrix: "array"
    },

    // Simulation Engine Requests
    monteCarlo: {
        revenue: "object",
        cost: "object",
        iterations: "number"
    },

    // Network Engine Requests
    route: {
        nodes: "array",
        edges: "array",
        startNode: "string",
        endNode: "string",
        criteria: "string" // 'cost', 'time', 'risk'
    }
};

/**
 * Basic Validator Utility
 */
function validate(schema, data) {
    const errors = [];
    for (const key in schema) {
        const expectedType = schema[key];
        const actualValue = data[key];
        
        if (actualValue === undefined || actualValue === null) {
            errors.push(`${key} is required`);
            continue;
        }

        if (expectedType === 'array' && !Array.isArray(actualValue)) {
            errors.push(`${key} must be an array`);
        } else if (expectedType !== 'array' && typeof actualValue !== expectedType) {
            errors.push(`${key} must be a ${expectedType}`);
        }
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}

module.exports = {
    Schemas,
    validate
};
