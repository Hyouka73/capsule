/**
 * set-admin-claim-final.js
 * Reads Firebase CLI cached token and sets role:admin via REST API.
 * Run from the /backend directory: node set-admin-claim-final.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const UID = 'kT5JgmEpfMSCi1cMm7cLe1Oonb13';
const PROJECT_ID = 'capsule-valentins-day';

// Find the Firebase CLI token from configstore
function getFirebaseToken() {
    const candidates = [
        path.join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json'),
        path.join(process.env.HOME || process.env.USERPROFILE || '', '.config', 'configstore', 'firebase-tools.json'),
    ];

    for (const p of candidates) {
        if (fs.existsSync(p)) {
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (data?.tokens?.access_token) return data.tokens.access_token;
            if (data?.tokens?.refresh_token) return { refresh_token: data.tokens.refresh_token };
        }
    }
    return null;
}

function post(url, body, token) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const urlObj = new URL(url);
        const opts = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'Authorization': `Bearer ${token}`,
            },
        };
        const req = https.request(opts, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    const tokenData = getFirebaseToken();
    if (!tokenData) {
        console.error('❌ Could not find Firebase CLI token.');
        console.error('Try: firebase login then run this script again.');
        process.exit(1);
    }

    const token = typeof tokenData === 'string' ? tokenData : null;
    if (!token) {
        console.error('❌ Only found refresh_token, not access_token. Run: firebase login --reauth');
        process.exit(1);
    }

    console.log('✅ Got Firebase CLI token. Setting custom claims...');

    const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`;
    const res = await post(url, {
        localId: UID,
        customAttributes: JSON.stringify({ role: 'admin' }),
    }, token);

    if (res.status !== 200) {
        console.error('❌ Failed with status', res.status);
        console.error(JSON.stringify(res.body, null, 2));
        process.exit(1);
    }

    console.log('✅ SUCCESS! Custom claims set: role=admin');
    console.log('   UID:', UID);
    console.log('');
    console.log('Next steps:');
    console.log('  1. In the browser, go to http://localhost:5173/admin');
    console.log('  2. The user is already signed in — refresh the ID token by:');
    console.log('     Opening dev console and running: await firebase.auth().currentUser.getIdToken(true)');
    console.log('     OR simply: sign out and sign back in.');
}

main().catch(err => { console.error(err); process.exit(1); });
