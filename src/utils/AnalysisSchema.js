/**
 * AnalysisSchema.js — Project HEIMDALL Phase 1
 * Structured data parsing, export, and download utilities.
 * Transforms Aria's text output into machine-readable, exportable data.
 */

// ─────────────────────────────────────────────
// MARKDOWN TABLE PARSER
// ─────────────────────────────────────────────

/**
 * Parse a markdown table string into structured data.
 * Handles: | Header1 | Header2 |
 *          |---------|---------|
 *          | val1    | val2    |
 * @param {string} markdown - The full markdown text (can contain non-table content)
 * @returns {{ headers: string[], rows: string[][] }} Parsed table data
 */
export function parseMarkdownTable(markdown) {
    const lines = markdown.trim().split('\n');
    const tableLines = [];
    let inTable = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            inTable = true;
            tableLines.push(trimmed);
        } else if (inTable) {
            break; // End of table block
        }
    }

    if (tableLines.length < 2) return null;

    // Filter out separator rows (|---|---|)
    const dataLines = tableLines.filter(line => !line.replace(/[|\-:\s]/g, '').length === 0 ? false : !/^\|[\s\-:]+\|$/.test(line));
    
    // More robust separator detection
    const cleanLines = tableLines.filter(line => {
        const inner = line.slice(1, -1); // Remove outer pipes
        const cells = inner.split('|').map(c => c.trim());
        return !cells.every(c => /^[-:]+$/.test(c) || c === '');
    });

    if (cleanLines.length < 1) return null;

    const parseLine = (line) => {
        return line
            .slice(1, -1) // Remove leading/trailing |
            .split('|')
            .map(cell => cell.trim().replace(/\*\*/g, '')); // Strip bold markers
    };

    const headers = parseLine(cleanLines[0]);
    const rows = cleanLines.slice(1).map(parseLine);

    return { headers, rows };
}

/**
 * Extract ALL tables from a full message text.
 * @param {string} text - Full Aria response text
 * @returns {Array<{ headers: string[], rows: string[][] }>} Array of parsed tables
 */
export function extractAllTables(text) {
    const tables = [];
    const lines = text.split('\n');
    let currentTable = [];
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        const isTableLine = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;

        if (isTableLine) {
            inTable = true;
            currentTable.push(trimmed);
        } else {
            if (inTable && currentTable.length >= 2) {
                const parsed = parseMarkdownTable(currentTable.join('\n'));
                if (parsed && parsed.headers.length > 0) {
                    tables.push(parsed);
                }
            }
            inTable = false;
            currentTable = [];
        }
    }

    // Handle table at end of text
    if (inTable && currentTable.length >= 2) {
        const parsed = parseMarkdownTable(currentTable.join('\n'));
        if (parsed && parsed.headers.length > 0) {
            tables.push(parsed);
        }
    }

    return tables;
}

// ─────────────────────────────────────────────
// CHART URL EXTRACTION
// ─────────────────────────────────────────────

/**
 * Extract all QuickChart URLs from Aria's response.
 * Looks for ![...](https://quickchart.io/...) patterns.
 * @param {string} text - Full Aria response text
 * @returns {Array<{ alt: string, url: string }>}
 */
export function extractChartUrls(text) {
    const regex = /!\[([^\]]*)\]\((https:\/\/quickchart\.io\/[^)]+)\)/g;
    const charts = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        charts.push({ alt: match[1], url: match[2] });
    }
    return charts;
}

// ─────────────────────────────────────────────
// CSV CONVERSION & DOWNLOAD
// ─────────────────────────────────────────────

/**
 * Convert headers + rows into a CSV string.
 * Properly escapes commas, quotes, and newlines within cell values.
 * @param {string[]} headers
 * @param {string[][]} rows
 * @returns {string} CSV content
 */
export function convertToCSV(headers, rows) {
    const escape = (val) => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    const csvLines = [];
    csvLines.push(headers.map(escape).join(','));
    for (const row of rows) {
        csvLines.push(row.map(escape).join(','));
    }
    return csvLines.join('\n');
}

/**
 * Trigger a file download in the browser.
 * @param {string} content - File content
 * @param {string} filename - Download filename
 * @param {string} mimeType - MIME type
 */
function triggerDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Download CSV file from table data.
 * @param {string[]} headers
 * @param {string[][]} rows
 * @param {string} filename
 */
export function downloadCSV(headers, rows, filename = 'aria_analysis.csv') {
    const csv = convertToCSV(headers, rows);
    triggerDownload(csv, filename, 'text/csv;charset=utf-8');
}

// ─────────────────────────────────────────────
// JSON EXPORT
// ─────────────────────────────────────────────

/**
 * Download a JSON file from structured data.
 * @param {object} data - Data to export
 * @param {string} filename
 */
export function downloadJSON(data, filename = 'aria_analysis.json') {
    const json = JSON.stringify(data, null, 2);
    triggerDownload(json, filename, 'application/json;charset=utf-8');
}

/**
 * Build a structured export object from a message.
 * @param {object} msg - The Aria message object { text, sources }
 * @returns {object} Structured analysis data
 */
export function buildExportData(msg) {
    const tables = extractAllTables(msg.text);
    const charts = extractChartUrls(msg.text);

    return {
        timestamp: new Date().toISOString(),
        response: msg.text,
        sources: msg.sources || [],
        tables: tables.map((t, i) => ({
            name: `Table ${i + 1}`,
            columns: t.headers,
            rows: t.rows
        })),
        charts: charts.map(c => ({
            alt: c.alt,
            url: c.url
        }))
    };
}

/**
 * Build a full session export from all messages.
 * @param {Array} messages - All chat messages
 * @returns {object} Full session data
 */
export function buildSessionExport(messages) {
    return {
        session_timestamp: new Date().toISOString(),
        total_messages: messages.length,
        messages: messages.map(msg => ({
            role: msg.role,
            text: msg.text,
            sources: msg.sources || [],
            tables: extractAllTables(msg.text || ''),
            charts: extractChartUrls(msg.text || '')
        }))
    };
}

// ─────────────────────────────────────────────
// CHART IMAGE DOWNLOAD
// ─────────────────────────────────────────────

/**
 * Download a chart image from a QuickChart URL.
 * Uses fetch + blob to bypass CORS and save as PNG.
 * @param {string} chartUrl - The QuickChart URL
 * @param {string} filename
 */
export async function downloadChartImage(chartUrl, filename = 'aria_chart.png') {
    try {
        const response = await fetch(chartUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('[HEIMDALL] Chart download failed:', err);
        // Fallback: open in new tab
        window.open(chartUrl, '_blank');
    }
}
