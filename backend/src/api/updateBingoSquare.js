import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, ACTIVITY_ACTIONS } from '../config/constants.js';

/**
 * updateBingoSquare — Backend API (BFF)
 * 
 * Marca una casilla como completada, detecta logros (bingos) y otorga monedas.
 * Ruta: relationships/{relationshipId}/bingo/board
 */
export const updateBingoSquare = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado para actualizar el bingo.');
    }

    const { categoryId, memoryId, completedAt } = request.data;
    const { uid } = request.auth;
    const { relationshipId } = request.auth.token;

    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'El usuario no tiene una relación asignada.');
    }

    if (!categoryId) {
        throw new HttpsError('invalid-argument', 'El categoryId es obligatorio.');
    }

    const db = getFirestore();
    const boardsColl = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.BINGO_BOARD);

    try {
        return await db.runTransaction(async (transaction) => {
            const activeSnap = await transaction.get(boardsColl.where('status', '==', 'active').limit(1));
            
            let boardRef;
            let boardData;

            if (activeSnap.empty) {
                // Secondary check: legacy 'board' document
                const legacyRef = boardsColl.doc('board');
                const legacySnap = await transaction.get(legacyRef);
                if (!legacySnap.exists) {
                    throw new HttpsError('not-found', 'Tablero de bingo activo no encontrado.');
                }
                boardRef = legacyRef;
                boardData = legacySnap.data();
            } else {
                boardRef = activeSnap.docs[0].ref;
                boardData = activeSnap.docs[0].data();
            }

            const categories = boardData.categories || [];
            const squareIndex = categories.findIndex(c => c.id === categoryId);

            if (squareIndex === -1) {
                throw new HttpsError('not-found', `La categoría ${categoryId} no existe en el tablero.`);
            }

            if (categories[squareIndex].completedMemoryId) {
                return { success: true, message: 'La casilla ya estaba completada.' };
            }

            // 2. Actualizar Casilla
            const prevCategories = JSON.parse(JSON.stringify(categories));
            categories[squareIndex].completedMemoryId = memoryId || 'manual_entry';
            categories[squareIndex].completedAt = completedAt || new Date().toISOString();

            // 3. Detección de Logros (4x4)
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

            // Casilla Especial (+5) - solo si no es parte de un logro mayor en este turno para evitar spam?
            // Pero el prompt dice premiar +15 (línea), +15 (diagonal), +50 (full). 
            // La casilla especial es un plus.
            if (categories[squareIndex].isSpecial) {
                newAchievements.push({ type: 'special', label: 'Casilla Especial ✨', coins: 5 });
            }

            // 4. Procesar Recompensas
            let totalCoinsEarned = 0;
            if (newAchievements.length > 0) {
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

            // 5. Guardar Tablero
            transaction.update(boardRef, {
                categories: categories,
                completedCount: categories.filter(c => c.completedMemoryId).length,
                updatedAt: FieldValue.serverTimestamp()
            });

            // 6. Log Activity
            if (totalCoinsEarned > 0) {
                const activityRef = db
                    .collection('relationships')
                    .doc(relationshipId)
                    .collection(COLLECTIONS.ACTIVITY_LOG)
                    .doc();
                transaction.set(activityRef, {
                    relationshipId,
                    userId: uid,
                    action: ACTIVITY_ACTIONS.BINGO_COMPLETED,
                    targetType: 'bingo',
                    targetId: categoryId,
                    displayText: `Completó el reto "${categories[squareIndex].title || 'Bingo'}" y ganó ${totalCoinsEarned} monedas! 🎯`,
                    metadata: { achievements: newAchievements, coins: totalCoinsEarned },
                    isReadByAdmin: false,
                    readAt: null,
                    createdAt: FieldValue.serverTimestamp()
                });

                // --- FCM Notification for Achievements ---
                // We only notify if there's a real achievement (not just a special square)
                const realAchievements = newAchievements.filter(a => a.type !== 'special');
                if (realAchievements.length > 0) {
                    try {
                        // Notify the OTHER person in the relationship
                        // Need to find the partner or admin UID
                        const membersSnap = await transaction.get(db.collection('relationships').doc(relationshipId));
                        const members = membersSnap.data()?.members || [];
                        const otherUid = members.find(m => m !== uid);
                        
                        if (otherUid) {
                            // We can't do await import inside transaction easily without complications in some envs, 
                            // but for Firebase Functions it's usually fine if it's already loaded or top-level.
                            // However, we'll do it safely.
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
                        logger.error('[updateBingoSquare] FCM achievement notification failed:', fcmErr.message);
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
        logger.error('updateBingoSquare error:', { uid, relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al actualizar la casilla de bingo.');
    }
});

