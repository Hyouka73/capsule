import { initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

/**
 * PROJECT CAPSULE — Storage CORS Configuration
 * 
 * This script authorizes your application to perform direct downloads 
 * (Binary Fetch / Blob) from Android and Mobile browsers.
 * 
 * It's a ONE-TIME configuration.
 */

const PROJECT_ID = 'capsule-valentins-day';
const BUCKET_NAME = 'capsule-valentins-day.firebasestorage.app';

console.log(`[CORS] Initializing for project: ${PROJECT_ID}...`);
console.log(`[CORS] Target Bucket: ${BUCKET_NAME}`);

initializeApp({
    projectId: PROJECT_ID,
    storageBucket: BUCKET_NAME
});

const bucket = getStorage().bucket(BUCKET_NAME);

const corsConfiguration = [
  {
    // Origins: Add your Vercel URL if you want strict security, 
    // but '*' is standard for public-read assets like these photos.
    origin: ['*'], 
    method: ['GET', 'HEAD', 'OPTIONS'],
    maxAgeSeconds: 3600,
    responseHeader: [
        'Content-Type', 
        'Access-Control-Allow-Origin', 
        'Authorization', 
        'Content-Length', 
        'User-Agent', 
        'X-Requested-With'
    ]
  }
];

async function setCors() {
  try {
    console.log(`[CORS] Attempting to set configuration...`);
    
    await bucket.setCorsConfiguration(corsConfiguration);
    
    console.log('\n✅ SUCCESS!');
    console.log('--------------------------------------------------');
    console.log('CORS configuration applied successfully.');
    console.log('The "Save Photo" button will now work on Android.');
    console.log('--------------------------------------------------\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR setting CORS:');
    console.error(error.message);
    if (error.code === 403 || error.message.includes('permission')) {
        console.error('\nTIP: Make sure you are logged in to Firebase CLI (firebase login) and have owner permissions for the project.');
    }
    process.exit(1);
  }
}

setCors();
