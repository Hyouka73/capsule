import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAppConfig } from '../../context/AppConfigContext';
import { toast } from '../../components/ui/PastelToast/PastelToast';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
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
import PastelButton from '../../components/ui/PastelButton/PastelButton';
import PastelCard from '../../components/ui/PastelCard/PastelCard';
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
    const { modules, isConfigLoaded, inviteConfig } = useAppConfig();
    const { user, signOut } = useAuth();
    const { 
        celebrationEvent, 
        clearCelebrationEvent, 
        resetBingoBoard,
        bingoQueue,
        resolveBingoSuggestion,
        isResolving
    } = useBingo();

    const [activeSection, setActiveSection] = useState('activity');
    const [filterType, setFilterType] = useState('all');
    const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [activeSnapshots, setActiveSnapshots] = useState([]);

    const { unreadCount: filteredUnreadCount } = useActivityLog({ filterType });

    // Filtering logic
    const visibleSections = SECTIONS.filter(section => {
        // Critical sections always visible
        if (section.id === 'settings' || section.id === 'activity') return true;
        
        // Fallback if modules not present
        if (!modules) {
            return true;
        }

        // Map section to module path
        const moduleMap = {
            'activity': true,
            'settings': true,
            'bingo': modules.bingo?.isEnabled,
            'capsules': modules.capsules?.isEnabled,
            'coupons': modules.coupons?.isEnabled,
            'memories': modules.memories?.isEnabled || true,
            'snapshots': modules.snapshots?.isEnabled,
            'wrapped': modules.movies?.isEnabled,
        };

        return moduleMap[section.id] !== false;
    });

    // Toast for hidden sections (once per session)
    useEffect(() => {
        if (isConfigLoaded && modules) {
            const hasHidden = SECTIONS.some(s => {
                if (s.id === 'settings' || s.id === 'activity') return false;
                const moduleMap = {
                    'bingo': modules.bingo?.isEnabled,
                    'capsules': modules.capsules?.isEnabled,
                    'coupons': modules.coupons?.isEnabled,
                    'memories': modules.memories?.isEnabled || true,
                    'snapshots': modules.snapshots?.isEnabled,
                    'wrapped': modules.movies?.isEnabled,
                };
                return moduleMap[s.id] === false;
            });

            if (hasHidden) {
                const toastShown = localStorage.getItem('capsule_admin_hidden_toast_shown');
                if (!toastShown) {
                    toast.info('Configuración', 'Algunas secciones están ocultas por configuración');
                    localStorage.setItem('capsule_admin_hidden_toast_shown', 'true');
                }
            }
        }
    }, [isConfigLoaded, modules]);

    // Cleanup toast flag on unmount/session end? 
    // The user said "máximo 1 vez por sesión (localStorage flag)".
    // To make it "per session" using localStorage, we'd need to clear it on load or use sessionStorage.
    // I'll stick to the "localStorage flag" request but handle it as a session-like behavior if possible, 
    // or just a persistent flag if they meant once ever. 
    // But "por sesión" usually means sessionStorage. 
    // I'll use a sessionStorage check optionally or just localStorage as requested.
    // Let's use sessionStorage for true "per session" but keep the key names clear.
    // Actually, I'll use a hack to clear it if it's a new window session but it's complex.
    // I'll just use sessionStorage and mention it, or localStorage and it stays.
    // Wait, the PM said "localStorage flag". I'll use localStorage.


    useEffect(() => {
        const handleResize = () => {
            // handle responsive design if needed
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const renderContent = () => {
        const isVisible = visibleSections.some(s => s.id === activeSection);
        if (!isVisible && activeSection !== 'activity' && activeSection !== 'settings') {
            return (
                <div className={styles.disabledContentState}>
                    <span className={styles.disabledSectionIcon}>🚫</span>
                    <h2 className={styles.disabledSectionTitle}>Módulo desactivado</h2>
                    <p className={styles.disabledSectionDesc}>
                        Esta sección ha sido ocultada por la configuración del sistema. 
                        Puedes volver a activarla desde el panel de Configuración.
                    </p>
                    <PastelButton 
                        variant="primary" 
                        onClick={() => setActiveSection('settings')}
                    >
                        Ir a Configuración
                    </PastelButton>
                </div>
            );
        }

        switch (activeSection) {
            case 'activity': return (
                <>
                    {/* ── Partner Invite Card (shown while partner is pending) ── */}
                    {inviteConfig?.inviteLink && inviteConfig?.isActive && (
                        <InviteLinkCard inviteLink={inviteConfig.inviteLink} />
                    )}
                    <ActivityPanel
                        filterType={filterType}
                        setFilterType={setFilterType}
                    />
                </>
            );
            case 'memories': return <MemoryManager />;
            case 'capsules': return <CapsuleManager />;
            case 'coupons': return <CouponManager />;
            case 'bingo': return <BingoManager />;
            case 'wrapped': return <WrappedManager />;
            case 'settings': return <GlobalSettings />;
            default: return (
                <ActivityPanel 
                    filterType={filterType} 
                    setFilterType={setFilterType} 
                />
            );
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
                    <AnimatePresence mode="popLayout">
                        {visibleSections.map(section => (
                            <motion.button
                                key={section.id}
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className={`${styles.navItem} ${activeSection === section.id ? styles.active : ''}`}
                                onClick={() => setActiveSection(section.id)}
                                title={section.label}
                            >
                                <span className={styles.navIcon}>{section.icon}</span>
                                <span className={styles.navLabel}>{section.label}</span>
                                {section.id === 'activity' && filteredUnreadCount > 0 && (
                                    <span className={styles.unreadBadge}>{filteredUnreadCount}</span>
                                )}
                            </motion.button>
                        ))}
                    </AnimatePresence>
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <span className={styles.userEmail}>{user?.email?.split('@')[0]}</span>
                    </div>
                    <PastelButton
                        variant="secondary"
                        size="sm"
                        onClick={signOut}
                        className={styles.signOutBtn}
                        title="Cerrar sesión"
                    >
                        <span className={styles.signOutIcon}>👋</span>
                        <span className={styles.signOutText}>Cerrar sesión</span>
                    </PastelButton>
                </div>
            </aside>

            {/* ── Main Content Area ── */}
            <main className={styles.main}>
                {/* ── Admin Header (Dynamic Title + Snapshot) ── */}
                <header className={styles.adminHeader}>
                    <div className={styles.headerLeft}>
                        <span className={styles.sectionIcon}>
                            {SECTIONS.find(s => s.id === activeSection)?.icon}
                        </span>
                        <h1 className={styles.headerTitle}>
                            {SECTIONS.find(s => s.id === activeSection)?.label}
                        </h1>
                        {!visibleSections.find(s => s.id === activeSection) && (
                            <span className={styles.disabledModuleBadge}>
                                Módulo desactivado
                            </span>
                        )}
                    </div>

                    <div className={styles.headerRight}>
                        <SnapshotButton 
                            onOpenSnapshot={(snaps) => {
                                setActiveSnapshots(snaps);
                                setIsSnapshotOpen(true);
                            }}
                            onOpenCamera={() => setIsCameraOpen(true)}
                        />
                    </div>
                </header>
                <div className={styles.contentWrapper}>
                    {renderContent()}
                </div>
            </main>

            {/* Snapshot Button removido por petición (Solo se ve en Mapa) */}
            {/* ── Camera FAB — tomar nueva instantánea para el partner ── */}

            {/* ── SnapshotOverlay — ver fotos recibidas ── */}
            <AnimatePresence>
                {isSnapshotOpen && activeSnapshots.length > 0 && (
                    <SnapshotOverlay
                        key="admin-snapshot-overlay"
                        snapshots={activeSnapshots}
                        onClose={(shouldReply) => {
                            setIsSnapshotOpen(false);
                            setActiveSnapshots([]);
                            if (shouldReply) {
                                setTimeout(() => setIsCameraOpen(true), 300);
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── SnapshotCreator — tomar foto ── */}
            {isCameraOpen && (
                <SnapshotCreator 
                    onClose={() => setIsCameraOpen(false)} 
                    onOpenHistory={(ownSnaps) => {
                        setActiveSnapshots(ownSnaps);
                        setIsHistoryOpen(true);
                        // No cerramos la cámara para que al volver siga ahí
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
                isOpen={bingoQueue.length > 0}
                suggestions={bingoQueue[0]?.suggestions || []}
                onConfirm={async (selectedIds) => {
                    if (bingoQueue.length === 0) return;
                    await resolveBingoSuggestion(bingoQueue[0].memoryId, selectedIds);
                }}
                onCancel={async () => {
                    if (bingoQueue.length === 0) return;
                    await resolveBingoSuggestion(bingoQueue[0].memoryId);
                }}
                isSaving={isResolving}
            />

            {celebrationEvent && (
                <CelebrationOverlay 
                    tierLabel={celebrationEvent.tierLabel}
                    reward={celebrationEvent.reward}
                    coins={celebrationEvent.coins}
                    onComplete={() => {
                        if (celebrationEvent.isFullBoard) {
                            resetBingoBoard();
                        }
                        clearCelebrationEvent();
                    }}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// InviteLinkCard — Shown in AdminDashboard when partner account is pending
// ─────────────────────────────────────────────────────────────────────────────
function InviteLinkCard({ inviteLink }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            toast.success('¡Copiado!', 'El link de invitación está en tu portapapeles.');
            setTimeout(() => setCopied(false), 2500);
        } catch {
            toast.error('Error', 'No se pudo copiar. Cópialo manualmente.');
        }
    }, [inviteLink]);

    return (
        <motion.div
            className={styles.inviteCard}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
            <div className={styles.inviteCardHeader}>
                <span className={styles.inviteCardIcon}>💌</span>
                <div>
                    <h3 className={styles.inviteCardTitle}>Invita a tu pareja</h3>
                    <p className={styles.inviteCardDesc}>Comparte este link para que pueda unirse a tu espacio.</p>
                </div>
            </div>

            <div className={styles.inviteLinkBox}>
                <p className={styles.inviteLinkText} title={inviteLink}>
                    {inviteLink.length > 48 ? `${inviteLink.substring(0, 48)}...` : inviteLink}
                </p>
                <PastelButton
                    onClick={handleCopy}
                    size="sm"
                    className={styles.copyBtn}
                >
                    <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>
                        {copied ? 'check' : 'content_copy'}
                    </span>
                    {copied ? '¡Copiado!' : 'Copiar'}
                </PastelButton>
            </div>
        </motion.div>
    );
}
