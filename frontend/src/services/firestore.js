import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp,
    onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Generic Firestore CRUD service
 * Provides a reusable interface for all collections
 */

// ─── READ ────────────────────────────────────────────

/**
 * Get a single document by ID
 */
export async function getDocument(collectionName, docId) {
    const docRef = doc(db, collectionName, docId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
}

/**
 * Get all documents in a collection (with optional limit)
 */
export async function getCollection(collectionName, maxResults = 50) {
    const q = query(collection(db, collectionName), limit(maxResults));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Query documents with filters
 * @param {string} collectionName
 * @param {Array} filters - Array of [field, operator, value]
 * @param {Object} options - { orderByField, orderDirection, maxResults, lastDoc }
 */
export async function queryDocuments(collectionName, filters = [], options = {}) {
    const {
        orderByField = 'createdAt',
        orderDirection = 'desc',
        maxResults = 20,
        lastDoc = null,
    } = options;

    const constraints = [
        ...filters.map(([field, op, value]) => where(field, op, value)),
        orderBy(orderByField, orderDirection),
        limit(maxResults),
    ];

    if (lastDoc) {
        constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getDocs(q);

    return {
        docs: snapshot.docs.map(d => ({ id: d.id, ...d.data() })),
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === maxResults,
    };
}

/**
 * Subscribe to real-time updates on a collection
 * @returns {Function} unsubscribe function
 */
export function subscribeToCollection(collectionName, callback, filters = [], maxResults = 50) {
    const constraints = [
        ...filters.map(([field, op, value]) => where(field, op, value)),
        limit(maxResults),
    ];

    const q = query(collection(db, collectionName), ...constraints);

    return onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(docs);
    });
}

/**
 * Subscribe to a single document
 * @returns {Function} unsubscribe function
 */
export function subscribeToDocument(collectionName, docId, callback) {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(docRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback(null);
            return;
        }
        callback({ id: snapshot.id, ...snapshot.data() });
    });
}

// ─── WRITE ───────────────────────────────────────────

/**
 * Create a new document (auto-generated ID)
 */
export async function createDocument(collectionName, data) {
    const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

/**
 * Update an existing document
 */
export async function updateDocument(collectionName, docId, data) {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Delete a document
 */
export async function deleteDocument(collectionName, docId) {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
}

// ─── HELPERS ─────────────────────────────────────────

export { serverTimestamp };
