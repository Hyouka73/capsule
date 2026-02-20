const { initializeApp } = require('firebase-admin/app');

initializeApp();

const { onPhotoUploaded } = require('./src/triggers/onPhotoUploaded');
const { taskUnlockCapsule } = require('./src/triggers/taskUnlockCapsule');
const { exchangeInviteToken } = require('./src/api/exchangeInviteToken');
const { generateInviteToken } = require('./src/api/generateInviteToken');

// Nuevas APIs BFF
const { createMemory } = require('./src/api/createMemory');
const { logActivity } = require('./src/api/logActivity');
const { findOrCreatePlace } = require('./src/api/findOrCreatePlace');
const { getMemories } = require('./src/api/getMemories');
const { createCapsule } = require('./src/api/createCapsule');
const { openCapsule } = require('./src/api/openCapsule');
const { getCapsules } = require('./src/api/getCapsules');

exports.onPhotoUploaded = onPhotoUploaded;
exports.taskUnlockCapsule = taskUnlockCapsule;
exports.exchangeInviteToken = exchangeInviteToken;
exports.generateInviteToken = generateInviteToken;

// Front-to-Back APIs
exports.createMemory = createMemory;
exports.logActivity = logActivity;
exports.findOrCreatePlace = findOrCreatePlace;
exports.getMemories = getMemories;
exports.createCapsule = createCapsule;
exports.openCapsule = openCapsule;
exports.getCapsules = getCapsules;
