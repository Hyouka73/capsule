import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS, ACTIVITY_ACTIONS } from '../config/constants.js';

/**
 * updateBingoSquare — Backend API (BFF)
 * 
 * Marca una casilla como completada, detecta logros (bingos) y otorga monedas.
 * Payload: { categoryId: string, memoryId: string, completedAt: ISO string }
 */
export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { categoryId, memoryId, completedAt, uncheck } = request.data || {};
    const { relationshipId, uid } = request.auth.token;

    if (!relationshipId) throw new HttpsError('failed-precondition', 'No relationship found.');
    if (!categoryId) throw new HttpsError('invalid-argument', 'categoryId is required.');

    const db = getFirestore();
    const boardRef = db.collection('relationships')
        .doc(relationshipId)
        .collection(COLLECTIONS.BINGO_BOARD)
        .doc(SINGLETON_DOCS.BINGO_BOARD);

    try {
        return await db.runTransaction(async (transaction) => {
            const boardSnap = await transaction.get(boardRef);
            if (!boardSnap.exists) throw new HttpsError('not-found', 'Bingo board not found.');

            const data = boardSnap.data();
            const categories = [...(data.categories || [])];
            const catIndex = categories.findIndex(c => c.id === categoryId);

            if (catIndex === -1) throw new HttpsError('not-found', `Categoría '${categoryId}' no encontrada.`);

            const cat = categories[catIndex];

            // 1. Guardar estado previo para comparación de logros
            const prevCategories = JSON.parse(JSON.stringify(categories));

            if (uncheck) {
                categories[catIndex] = {
                    ...cat,
                    isCompleted: false,
                    completedMemoryId: null,
                    completedAt: null
                };
            } else {
                if (cat.completedMemoryId) {
                    return { success: true, message: 'La casilla ya estaba completada.' };
                }
                const resolvedAt = completedAt
                    ? Timestamp.fromDate(new Date(completedAt))
                    : FieldValue.serverTimestamp();

                categories[catIndex] = {
                    ...cat,
                    isCompleted: true,
                    completedMemoryId: memoryId || 'manual',
                    completedAt: resolvedAt
                };
            }

            // 2. Detección de Logros (4x4) - Restaurado del historial original
            const ROWS = 4;
            const COLS = 4;

            const getLinesDetails = (cats) => {
                const lines = [];
                // Rows
                for (let r = 0; r < ROWS; r++) {
                    let rowFull = true;
                    for (let c = 0; c < COLS; c++) {
                        if (!cats[r * COLS + c]?.completedMemoryId) { rowFull = false; break; }
                    }
                    if (rowFull) lines.push({ type: 'line', label: `Fila ${r + 1} ✅`, coins: 15 });
                }
                // Cols
                for (let c = 0; c < COLS; c++) {
                    let colFull = true;
                    for (let r = 0; r < ROWS; r++) {
                        if (!cats[r * COLS + c]?.completedMemoryId) { colFull = false; break; }
                    }
                    if (colFull) lines.push({ type: 'line', label: `Columna ${c + 1} ✅`, coins: 15 });
                }
                // Diagonals
                if ([0, 5, 10, 15].every(i => cats[i]?.completedMemoryId)) {
                    lines.push({ type: 'diagonal', label: 'Diagonal Principal ✅', coins: 15 });
                }
                if ([3, 6, 9, 12].every(i => cats[i]?.completedMemoryId)) {
                    lines.push({ type: 'diagonal', label: 'Diagonal Secundaria ✅', coins: 15 });
                }
                return lines;
            };

            const prevLines = getLinesDetails(prevCategories);
            const nextLines = getLinesDetails(categories);
            
            // Filtrar nuevos logros
            const newAchievements = nextLines.filter(nl => 
                !prevLines.some(pl => pl.label === nl.label && pl.type === nl.type)
            );

            const isBoardFull = categories.every(c => c.completedMemoryId);
            const wasBoardFull = prevCategories.every(c => c.completedMemoryId);

            if (isBoardFull && !wasBoardFull) {
                newAchievements.push({ type: 'full_board', label: '¡TABLERO COMPLETO! 🏆', coins: 50 });
            }

            // Casilla Especial (+5)
            if (!uncheck && categories[catIndex].isSpecial) {
                newAchievements.push({ type: 'special', label: 'Casilla Especial ✨', coins: 5 });
            }

            // 3. Recompensas (gameCoins) - Restaurado del historial original
            let totalCoinsEarned = 0;
            if (!uncheck && newAchievements.length > 0) {
                totalCoinsEarned = newAchievements.reduce((sum, ac) => sum + ac.coins, 0);
                const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

                const newTransactions = newAchievements.map(ac => ({
                    type: "earned",
                    source: `bingo_${ac.type}`,
                    label: ac.label,
                    amount: ac.coins,
                    timestamp: new Date().toISOString()
                }));

                transaction.update(userRef, {
                    gameCoins: FieldValue.increment(totalCoinsEarned),
                    coinTransactions: FieldValue.arrayUnion(...newTransactions)
                });
            }

            // 4. Guardar Tablero
            const completedCount = categories.filter(c => c.completedMemoryId).length;
            transaction.update(boardRef, {
                categories: categories,
                completedCount,
                updatedAt: FieldValue.serverTimestamp()
            });

            // 5. Actividad y FCM - Restaurado del historial original
            if (!uncheck && totalCoinsEarned > 0) {
                const activityRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.ACTIVITY_LOG).doc();
                transaction.set(activityRef, {
                    relationshipId,
                    userId: uid,
                    action: ACTIVITY_ACTIONS.BINGO_COMPLETED,
                    targetType: 'bingo',
                    targetId: categoryId,
                    displayText: `Completó el reto "${categories[catIndex].title || 'Bingo'}" y ganó ${totalCoinsEarned} monedas! 🎯`,
                    metadata: { achievements: newAchievements, coins: totalCoinsEarned },
                    isReadByAdmin: false,
                    readAt: null,
                    createdAt: FieldValue.serverTimestamp()
                });

                // FCM Push notification para logros reales
                const realAchievements = newAchievements.filter(a => a.type !== 'special');
                if (realAchievements.length > 0) {
                    try {
                        const relSnap = await transaction.get(db.collection('relationships').doc(relationshipId).collection('config').doc(SINGLETON_DOCS.RELATIONSHIP));
                        const relData = relSnap.data() || {};
                        // Identificar al otro miembro
                        const adminUid = relData.adminUid;
                        const partnerUid = relData.partnerUid;
                        const otherUid = (uid === adminUid) ? partnerUid : adminUid;
                        
                        if (otherUid) {
                            const { sendToUser } = await import('../services/fcmService.js');
                            const topAchievement = realAchievements[0];
                            await sendToUser(otherUid, {
                                title: '🎯 ¡Bingo!',
                                body: `¡Tu pareja ha conseguido un logro: ${topAchievement.label}! 🏆`,
                                data: {
                                    type: 'bingo_achievement',
                                    achievement: topAchievement.type,
                                    relationshipId
                                }
                            });
                        }
                    } catch (fcmErr) {
                        logger.error('[updateBingoSquare] FCM notification failed:', fcmErr.message);
                    }
                }
            }

            return {
                success: true,
                newAchievements,
                totalCoinsEarned,
                isFullBoard: isBoardFull && !wasBoardFull
            };
        });
    } catch (error) {
        logger.error('updateBingoSquare error:', error.message);
        throw new HttpsError('internal', error.message);
    }
};
