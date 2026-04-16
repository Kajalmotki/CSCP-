/**
 * HEIMDALL Phase 2 — Modular Backend Entry
 * Fully Mapping 19 HEIMDALL Engine Endpoints
 */

const { parseBody, CORS_HEADERS } = require('./server_utils');

// Import HEIMDALL Engines
const { calculateBEP, calculateEMV, calculateEOQ, calculateROP, calculateSafetyStock, buildChartUrl } = require('./services/math_engine');
const { forecastSMA, forecastWMA, forecastSES, forecastHolt, forecastLinearRegression, forecastCompare } = require('./services/forecast_engine');
const { solveTransportation, selectSupplier, optimizeProduction } = require('./services/optimization_engine');
const { simulateRisk, simulateScenarios } = require('./services/simulation_engine');
const { findOptimalRoute, analyzeNetworkResilience } = require('./services/network_engine');
const { predictEntityRisk, detectAnomalies, extractSCMEntities } = require('./services/ml_service');
const { optimizePricingRL } = require('./services/decision_engine');
const { simulateShockPropagation } = require('./services/global_intelligence');
const { storeMemory, retrieveMemories } = require('./services/memory_service');
const { fetchSAPMasterData, syncERPInventory, checkConnectivity } = require('./services/enterprise_connector');
const { analyzeWorkflowEvents, triggerAction } = require('./services/workflow_service');
const { loadDictionary } = require('./services/dictionary_service');
const { loadDictionary } = require('./services/dictionary_service');
const { searchChunks, generateLocalAnswer } = require('./services/local_rag_service');

const PDF_PATH = 'C:\\Users\\Siddharth\\OneDrive\\Desktop\\CSCP\\CSCP Modules\\ASCM Dictionary- Updated - 19th Edition - English.pdf';
let pdfParse;
try { pdfParse = require('pdf-parse'); } catch (e) { pdfParse = null; }

// Reference to shared knowledge (will be passed from server.js)
let knowledgeChunks = [];
function setKnowledge(chunks) { knowledgeChunks = chunks; }

async function app(req, res) {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        return res.end();
    }

    const { url, method } = req;

    try {
        // ─────────────────────────────────────────
        // MATH ENGINE
        // ─────────────────────────────────────────
        if (method === 'POST' && url === '/api/v1/math/bep') {
            const body = await parseBody(req);
            const result = calculateBEP(body.fixedCost, body.variableCost, body.sellingPrice);
            if (result.charts?.[0]) result.chartUrl = buildChartUrl(result.charts[0]);
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ status: 'success', data: result }));
        }
        if (method === 'POST' && url === '/api/v1/math/emv') {
            const body = await parseBody(req);
            const result = calculateEMV(body.scenarios, body.investmentCost);
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ status: 'success', data: result }));
        }

        // ─────────────────────────────────────────
        // FORECAST ENGINE
        // ─────────────────────────────────────────
        if (method === 'POST' && url === '/api/v1/forecast/sma') {
            const { data, window, periods } = await parseBody(req);
            const result = forecastSMA(data.map(Number), window || 3, periods || 6);
            if (result.charts?.[0]) result.chartUrl = buildChartUrl(result.charts[0]);
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ status: 'success', data: result }));
        }
        if (method === 'POST' && url === '/api/v1/forecast/compare') {
            const { data, periods } = await parseBody(req);
            const result = forecastCompare(data.map(Number), periods || 6);
            if (result.charts?.[0]) result.chartUrl = buildChartUrl(result.charts[0]);
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ status: 'success', data: result }));
        }

        // ─────────────────────────────────────────
        // OPTIMIZATION ENGINE
        // ─────────────────────────────────────────
        if (method === 'POST' && url === '/api/v1/optimize/transport') {
            const { supply, demand, costMatrix } = await parseBody(req);
            const result = solveTransportation(supply.map(Number), demand.map(Number), costMatrix.map(r => r.map(Number)));
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ status: 'success', data: result }));
        }

        // ─────────────────────────────────────────
        // SIMULATION ENGINE
        // ─────────────────────────────────────────
        if (method === 'POST' && url === '/api/v1/simulate/risk') {
            const body = await parseBody(req);
            const result = simulateRisk(body);
            if (result.charts?.[0]) result.chartUrl = buildChartUrl(result.charts[0]);
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ status: 'success', data: result }));
        }

        // ─────────────────────────────────────────
        // NETWORK ENGINE
        // ─────────────────────────────────────────
        if (method === 'POST' && url === '/api/v1/network/route') {
            const { nodes, edges, startNode, endNode, criteria } = await parseBody(req);
            const result = findOptimalRoute(nodes, edges, startNode, endNode, criteria || 'cost');
            if (result.charts?.[0]) result.chartUrl = buildChartUrl(result.charts[0]);
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ status: 'success', data: result }));
        }

        // ─────────────────────────────────────────
        // ML ENGINE
        // ─────────────────────────────────────────
        if (method === 'POST' && url === '/api/v1/ml/anomaly') {
            const { data, threshold } = await parseBody(req);
            const result = detectAnomalies(data.map(Number), threshold || 2.0);
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ status: 'success', data: result }));
        }

        // ─────────────────────────────────────────
        // DECISION ENGINE
        // ─────────────────────────────────────────
        if (method === 'POST' && url === '/api/v1/decide/price') {
            const { state, iterations } = await parseBody(req);
            const result = optimizePricingRL(state, iterations || 5000);
            if (result.charts?.[0]) result.chartUrl = buildChartUrl(result.charts[0]);
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ status: 'success', data: result }));
        }

        // ─────────────────────────────────────────
        // GLOBAL INTELLIGENCE
        // ─────────────────────────────────────────
        if (method === 'POST' && url === '/api/v1/global/shock') {
            const { nodes, edges, originNodeId, shockMagnitude } = await parseBody(req);
            const result = simulateShockPropagation(nodes, edges, originNodeId, shockMagnitude);
            if (result.charts?.[0]) result.chartUrl = buildChartUrl(result.charts[0]);
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ status: 'success', data: result }));
        }

        // ─────────────────────────────────────────
        // MEMORY ENGINE
        // ─────────────────────────────────────────
        if (method === 'POST' && url === '/api/v1/memory/store') {
            const { text, metadata, apiKey } = await parseBody(req);
            const success = await storeMemory(text, metadata, apiKey);
            res.writeHead(success ? 200 : 500, CORS_HEADERS);
            return res.end(JSON.stringify({ status: success ? 'success' : 'error' }));
        }

        // ─────────────────────────────────────────
        // ORIGINAL ARIA ENGINE (Local RAG)
        // ─────────────────────────────────────────
        if (method === 'POST' && url === '/api/situational-ai') {
            const { question } = await parseBody(req);
            const chunks = searchChunks(knowledgeChunks, question, 8);
            const answer = generateLocalAnswer(question, chunks);
            const sources = [...new Set(chunks.map(c => `Module ${c.module}`))];
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ answer, sources }));
        }

        if (method === 'GET' && url === '/api/dictionary') {
            const entries = await loadDictionary(PDF_PATH, pdfParse);
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ entries, total: entries.length }));
        }

        // ─────────────────────────────────────────
        // ENTERPRISE & WORKFLOW (Phase 11)
        // ─────────────────────────────────────────
        if (method === 'GET' && url === '/api/v1/enterprise/status') {
            const status = await checkConnectivity();
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ status: 'success', data: status }));
        }

        if (method === 'POST' && url === '/api/v1/workflow/analyze') {
            const { inventory, demand } = await parseBody(req);
            const result = analyzeWorkflowEvents(inventory, demand);
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ status: 'success', data: result }));
        }

        // SYSTEM HEALTH
        if (method === 'GET' && url === '/api/v1/health') {
            res.writeHead(200, CORS_HEADERS);
            return res.end(JSON.stringify({ 
                status: 'operational', 
                system: 'HEIMDALL Modular', 
                version: '3.2.0',
                engines: {
                    math: 'online', forecast: 'online', optimization: 'online',
                    simulation: 'online', network: 'online', ml: 'online',
                    decision: 'online', global: 'online', memory: 'online',
                    enterprise: 'online', workflow: 'online', 
                    rag: knowledgeChunks.length > 0 ? 'online' : 'loading'
                },
                uptime: process.uptime()
            }));
        }

    } catch (e) {
        res.writeHead(500, CORS_HEADERS);
        return res.end(JSON.stringify({ error: e.message }));
    }

    res.writeHead(404, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

module.exports = { app, setKnowledge };
