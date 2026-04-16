/**
 * HEIMDALL Phase 8 — Decision AI Engine
 * Pure Node.js implementation of Reinforcement Learning (Q-Learning)
 * Zero Dependencies
 */

/**
 * Tabular Q-Learning Agent for Pricing Strategy Optimization
 * Agent learns the optimal price adjustment based on current inventory levels and demand signals.
 *
 * States: [Low_Inv, Med_Inv, High_Inv] x [Low_Demand, Med_Demand, High_Demand] (9 states)
 * Actions: [Decrease_Price_10%, Keep_Price, Increase_Price_10%] (3 actions)
 * 
 * @param {Number} iterations - Number of training episodes
 * @param {String} currentState - The current real-world state "High_Inv_Low_Demand"
 * @returns {Object} - Optimal action and the trained Q-Table
 */
function optimizePricingRL(currentState, iterations = 5000) {
    const states = [
        "Low_Inv_Low_Demand", "Low_Inv_Med_Demand", "Low_Inv_High_Demand",
        "Med_Inv_Low_Demand", "Med_Inv_Med_Demand", "Med_Inv_High_Demand",
        "High_Inv_Low_Demand", "High_Inv_Med_Demand", "High_Inv_High_Demand"
    ];
    
    // 0: Decrease Price, 1: Keep Price, 2: Increase Price
    const actions = ["Decrease_Price_10%", "Keep_Price", "Increase_Price_10%"];
    
    // Initialize Q-Table with zeros
    const qTable = {};
    states.forEach(state => {
        qTable[state] = [0, 0, 0];
    });

    const alpha = 0.1; // Learning rate
    const gamma = 0.9; // Discount factor
    let epsilon = 1.0; // Exploration rate
    const epsilonDecay = 0.9995;

    // Simulated Environment Dynamics (Reward Function)
    function simulateEnvironment(state, actionIndex) {
        let reward = 0;
        let nextState = state;

        // Simplified reward logic: 
        // If High inventory and Low demand: decreasing price gives high reward (moves inventory)
        // If Low inventory and High demand: increasing price gives high reward (maximizes profit)
        
        if (state === "High_Inv_Low_Demand") {
            if (actionIndex === 0) { reward = 10; nextState = "Med_Inv_Med_Demand"; }
            else if (actionIndex === 1) { reward = -5; nextState = "High_Inv_Low_Demand"; }
            else { reward = -10; nextState = "High_Inv_Low_Demand"; }
        } else if (state === "Low_Inv_High_Demand") {
            if (actionIndex === 2) { reward = 20; nextState = "Med_Inv_Med_Demand"; }
            else if (actionIndex === 1) { reward = 5; nextState = "Low_Inv_High_Demand"; }
            else { reward = -10; nextState = "Low_Inv_High_Demand"; } // Stockout risk
        } else {
            // Default safe action for medium states is usually keeping the price
            if (actionIndex === 1) reward = 5;
            else reward = -2;
            nextState = "Med_Inv_Med_Demand";
        }

        return { reward, nextState };
    }

    // Training Loop
    for (let episode = 0; episode < iterations; episode++) {
        let state = states[Math.floor(Math.random() * states.length)]; // Random initial state
        
        for (let step = 0; step < 10; step++) { // 10 steps per episode
            let actionIndex;
            // Epsilon-Greedy policy
            if (Math.random() < epsilon) {
                actionIndex = Math.floor(Math.random() * actions.length); // Explore
            } else {
                actionIndex = qTable[state].indexOf(Math.max(...qTable[state])); // Exploit
            }

            const { reward, nextState } = simulateEnvironment(state, actionIndex);

            // Q-Learning Update Rule
            const maxFutureQ = Math.max(...qTable[nextState]);
            qTable[state][actionIndex] = qTable[state][actionIndex] + alpha * (reward + gamma * maxFutureQ - qTable[state][actionIndex]);

            state = nextState;
        }
        epsilon = Math.max(0.01, epsilon * epsilonDecay);
    }

    // Inference (Get best action for user's requested state)
    const normalizedState = states.includes(currentState) ? currentState : "Med_Inv_Med_Demand";
    const bestActionIndex = qTable[normalizedState].indexOf(Math.max(...qTable[normalizedState]));
    const recommendedAction = actions[bestActionIndex];

    const chartConfig = {
        type: 'bar',
        data: {
            labels: actions,
            datasets: [{
                label: `Q-Values for state: ${normalizedState}`,
                data: qTable[normalizedState].map(v => Number(v.toFixed(2))),
                backgroundColor: qTable[normalizedState].map((v, i) => i === bestActionIndex ? '#10b981' : '#cbd5e1')
            }]
        },
        options: {
            title: { display: true, text: 'Reinforcement Learning Value Policy' }
        }
    };

    return {
        state: normalizedState,
        recommendedAction,
        confidence: Math.max(...qTable[normalizedState]) > 0 ? 'High' : 'Low',
        qValues: {
            "Decrease_Price_10%": Number(qTable[normalizedState][0].toFixed(2)),
            "Keep_Price": Number(qTable[normalizedState][1].toFixed(2)),
            "Increase_Price_10%": Number(qTable[normalizedState][2].toFixed(2))
        },
        iterationsTrained: iterations,
        charts: [chartConfig]
    };
}

module.exports = {
    optimizePricingRL
};
