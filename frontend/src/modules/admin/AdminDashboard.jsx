import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AnimatePresence } from 'framer-motion';
import { useActivityLog } from '../../hooks/useActivityLog';
import MemoryManager from '../memories/MemoryManager';
import CapsuleManager from '../capsules/CapsuleManager';
import CouponManager from '../coupons/CouponManager';
import BingoManager from '../bingo/BingoManager';
import ActivityPanel from '../activity/ActivityPanel';
import WrappedManager from '../wrapped/WrappedManager';
import GlobalSettings from '../settings/GlobalSettings';
import SnapshotButton from '../snapshots/components/SnapshotButton';
import SnapshotOverlay from '../snapshots/components/SnapshotOverlay';
import SnapshotCreator from '../snapshots/components/SnapshotCreator';
import SnapshotHistory from '../snapshots/components/SnapshotHistory';
import Button from '../../components/ui/Button/Button';
import { usePendingBingo } from '../../hooks/usePendingBingo';
import { useBingo } from '../../hooks/useBingo';
import BingoSuggestionSheet from '../memories/components/BingoSuggestionSheet';
import CelebrationOverlay from '../../components/Bingo/CelebrationOverlay';
import styles from './AdminDashboard.module.css';

const SECTIONS = [
    { id: 'activity', label: 'Actividad', icon: '📊' },
    { id: 'memories', label: 'Recuerdos', icon: '📸' },
    { id: 'capsules', label: 'Cápsulas', icon: '⏳' },
    { id: 'coupons', label: 'Cupones', icon: '🎁' },
    { id: 'bingo', label: 'Bingo', icon: '🎯' },
    { id: 'wrapped', label: 'Wrapped', icon: '🎬' },
    { id: 'settings', label: 'Config', icon: '⚙️' },
];

export default function AdminDashboard() {
    const { signOut, user } = useAuth();
    const { unreadCount } = useActivityLog();
    const [activeSection, setActiveSection] = useState('activity');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    // Snapshot state — mirrors UserDashboard
    const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
    const [activeSnapshots, setActiveSnapshots] = useState([]);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Bingo Integration for Admin (when creating memories from here)
    const { pendingSuggestions, resolvePendingSuggestion, dismissSuggestion } = usePendingBingo();
    const { completeBingoSquare, celebrationEvent, clearCelebrationEvent } = useBingo();
    const [sheetDismissed, setSheetDismissed] = useState(false);
    const firstPendingSuggestion = pendingSuggestions.find(s => !s.dismissed);

    useEffect(() => {
        if (firstPendingSuggestion) {
            setSheetDismissed(false);
        }
    }, [firstPendingSuggestion?.memoryId]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const renderContent = () => {
        switch (activeSection) {
            case 'memories': return <MemoryManager />;
            case 'capsules': return <CapsuleManager />;
            case 'coupons': return <CouponManager />;
            case 'bingo': return <BingoManager />;
            case 'activity': return <ActivityPanel />;
            case 'wrapped': return <WrappedManager />;
            case 'settings': return <GlobalSettings />;
            default: return <ActivityPanel />;
        }
    };

    return (
        <div className={styles.root}>
            {/* ── Sidebar (Desktop) / Bottom Nav (Mobile) ── */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logoGroup}>
                        <span className={styles.sidebarLogo}>✦</span>
                        <div className={styles.sidebarTitles}>
                            <span className={styles.sidebarTitle}>Capsule</span>
                            <span className={styles.sidebarBadge}>Admin Mode</span>
                        </div>
                    </div>
                </div>

                <nav className={styles.nav}>
                    {SECTIONS.map(section => (
                        <button
                            key={section.id}
                            className={`${styles.navItem} ${activeSection === section.id ? styles.active : ''}`}
                            onClick={() => setActiveSection(section.id)}
                            title={section.label}
                        >
                            <span className={styles.navIcon}>{section.icon}</span>
                            <span className={styles.navLabel}>{section.label}</span>
                            {section.id === 'activity' && unreadCount > 0 && (
                                <span className={styles.unreadBadge}>{unreadCount}</span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className={styles.footer}>
                    <div className={styles.userInfo}>
                        <span className={styles.userEmail}>{user?.email?.split('@')[0]}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={signOut}
                        className={styles.signOutBtn}
                        title="Cerrar sesión"
                    >
                        <span className={styles.signOutIcon}>👋</span>
                        <span className={styles.signOutText}>Cerrar sesión</span>
                    </Button>
                </div>
            </aside>

            {/* ── Main Content Area ── */}
            <main className={styles.main}>
                <div className={styles.contentWrapper}>
                    {renderContent()}
                </div>
            </main>

            {/* ── Snapshot button (top-right) — ver fotos que envió el partner ── */}
            {!isSnapshotOpen && !isCameraOpen && (
                <div className={styles.snapshotBtnWrapper}>
                    <SnapshotButton
                        onOpenSnapshot={(snapshotsArray) => {
                            setActiveSnapshots(snapshotsArray);
                            setIsSnapshotOpen(true);
                        }}
                        onOpenCamera={() => setIsCameraOpen(true)}
                    />
                </div>
            )}

            {/* ── Camera FAB — tomar nueva instantánea para el partner ── */}
            {!isSnapshotOpen && !isCameraOpen && (
                <button
                    className={styles.fab}
                    onClick={() => setIsCameraOpen(true)}
                    title="Nueva Instantánea"
                >
                    <span className="material-symbols-outlined">add_a_photo</span>
                </button>
            )}

            {/* ── SnapshotOverlay — ver fotos recibidas ── */}
            <AnimatePresence>
                {isSnapshotOpen && activeSnapshots.length > 0 && (
                    <SnapshotOverlay
                        key="admin-snapshot-overlay"
                        snapshots={activeSnapshots}
                        onClose={() => {
                            setIsSnapshotOpen(false);
                            setActiveSnapshots([]);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── SnapshotCreator — tomar foto ── */}
            {isCameraOpen && (
                <SnapshotCreator 
                    onClose={() => setIsCameraOpen(false)} 
                    onOpenOwnSnapshots={(ownSnaps) => {
                        setActiveSnapshots(ownSnaps);
                        setIsHistoryOpen(true);
                        setIsCameraOpen(false);
                    }}
                />
            )}

            <AnimatePresence>
                {isHistoryOpen && (
                    <SnapshotHistory 
                        snapshots={activeSnapshots}
                        onClose={() => {
                            setIsHistoryOpen(false);
                            setActiveSnapshots([]);
                            setIsCameraOpen(true); // Return to camera
                        }}
                    />
                )}
            </AnimatePresence>

            <BingoSuggestionSheet 
                isOpen={!!firstPendingSuggestion && !sheetDismissed}
                suggestions={firstPendingSuggestion?.suggestions || []}
                onConfirm={async (selectedIds) => {
                    if (!firstPendingSuggestion) return;
                    setSheetDismissed(true);
                    for (const id of selectedIds) {
                        completeBingoSquare(id, firstPendingSuggestion.memoryId);
                    }
                    resolvePendingSuggestion(firstPendingSuggestion.memoryId);
                }}
                onCancel={async () => {
                    if (!firstPendingSuggestion) return;
                    setSheetDismissed(true);
                    try {
                        const { openDB } = await import('../../config/dbConfig');
                        const db = await openDB();
                        const tx = db.transaction('pending_bingo', 'readwrite');
                        const store = tx.objectStore('pending_bingo');
                        const memoryId = firstPendingSuggestion.memoryId || crypto.randomUUID();
                        store.put({
                            ...firstPendingSuggestion,
                            memoryId,
                            resolved: false,
                            dismissed: true,
                            createdAt: firstPendingSuggestion.createdAt || Date.now()
                        });
                        await new Promise((resolve, reject) => {
                            tx.oncomplete = () => resolve();
                            tx.onerror = () => reject(tx.error);
                        });
                    } catch (err) {}
                    dismissSuggestion(firstPendingSuggestion.memoryId);
                }}
            />

            {celebrationEvent && (
                <CelebrationOverlay 
                    tierLabel={celebrationEvent.tierLabel}
                    reward={celebrationEvent.reward}
                    coins={celebrationEvent.coins}
                    onComplete={clearCelebrationEvent}
                />
            )}
        </div>
    );
}
