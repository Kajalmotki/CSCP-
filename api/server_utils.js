/**
 * HEIMDALL Modular Backend Utilities
 */

/**
 * Parses the raw HTTP request body into JSON
 */
async function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(new Error('Invalid JSON Payload'));
            }
        });
        req.on('error', reject);
    });
}

/**
 * Standard CORS Headers
 */
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

module.exports = {
    parseBody,
    CORS_HEADERS
};
