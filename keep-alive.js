#!/usr/bin/env node

/**
 * Keep-Alive Service for Render
 * Prevents cold starts by pinging the app every 14 minutes
 */

const https = require('https');
const http = require('http');

// Configuration
const APP_URL = process.env.APP_URL || 'https://your-app-name.onrender.com';
const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes in milliseconds
const HEALTH_ENDPOINT = '/api/tasks'; // Use existing API endpoint
const MAX_RETRIES = 3;
const TIMEOUT = 10000; // 10 seconds timeout

console.log('🚀 Keep-Alive Service Starting...');
console.log(`📡 Target: ${APP_URL}${HEALTH_ENDPOINT}`);
console.log(`⏰ Interval: ${PING_INTERVAL / 1000 / 60} minutes`);
console.log('─'.repeat(50));

/**
 * Ping the application to keep it warm
 */
async function pingApp() {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
        const url = new URL(APP_URL + HEALTH_ENDPOINT);
        const module = url.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'HEAD', // Use HEAD to avoid auth issues and reduce bandwidth
            timeout: TIMEOUT,
            headers: {
                'User-Agent': 'Keep-Alive-Service/1.0',
                'Accept': 'application/json'
            }
        };
        
        const req = module.request(options, (res) => {
            const responseTime = Date.now() - startTime;
            const status = res.statusCode;
            
            // Even 401 (auth required) means the app is awake
            if (status === 200 || status === 401) {
                console.log(`✅ [${timestamp}] App is alive! (${status}) - ${responseTime}ms`);
                resolve({ success: true, status, responseTime });
            } else {
                console.log(`⚠️  [${timestamp}] Unexpected status: ${status} - ${responseTime}ms`);
                resolve({ success: false, status, responseTime });
            }
        });
        
        req.on('error', (error) => {
            const responseTime = Date.now() - startTime;
            console.log(`❌ [${timestamp}] Error: ${error.message} - ${responseTime}ms`);
            reject({ success: false, error: error.message, responseTime });
        });
        
        req.on('timeout', () => {
            req.destroy();
            const responseTime = Date.now() - startTime;
            console.log(`⏰ [${timestamp}] Timeout after ${responseTime}ms`);
            reject({ success: false, error: 'Timeout', responseTime });
        });
        
        req.end();
    });
}

/**
 * Ping with retry logic
 */
async function pingWithRetry() {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await pingApp();
            if (result.success) {
                return result;
            }
            
            if (attempt < MAX_RETRIES) {
                console.log(`🔄 Retrying in 5 seconds... (attempt ${attempt}/${MAX_RETRIES})`);
                await sleep(5000);
            }
        } catch (error) {
            if (attempt < MAX_RETRIES) {
                console.log(`🔄 Retrying in 5 seconds... (attempt ${attempt}/${MAX_RETRIES})`);
                await sleep(5000);
            } else {
                console.log(`💀 Failed after ${MAX_RETRIES} attempts`);
                return { success: false, error: 'Max retries exceeded' };
            }
        }
    }
}

/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Start the keep-alive service
 */
async function startKeepAlive() {
    console.log('🔥 Keep-Alive Service is running!');
    console.log('💡 This will ping your app every 14 minutes to prevent cold starts');
    console.log('🛑 Press Ctrl+C to stop');
    console.log('─'.repeat(50));
    
    // Initial ping
    await pingWithRetry();
    
    // Set up interval
    const interval = setInterval(async () => {
        await pingWithRetry();
    }, PING_INTERVAL);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down Keep-Alive Service...');
        clearInterval(interval);
        console.log('✅ Service stopped');
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('\n🛑 Received SIGTERM, shutting down...');
        clearInterval(interval);
        process.exit(0);
    });
}

// Validate APP_URL
if (APP_URL === 'https://your-app-name.onrender.com') {
    console.error('❌ Please set your APP_URL environment variable!');
    console.error('   Example: APP_URL=https://your-app.onrender.com node keep-alive.js');
    process.exit(1);
}

// Start the service
startKeepAlive().catch(console.error);