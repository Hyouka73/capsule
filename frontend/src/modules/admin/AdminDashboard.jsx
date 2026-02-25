import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import MemoryManager from '../memories/MemoryManager';
import CapsuleManager from '../capsules/CapsuleManager';
import CouponManager from '../coupons/CouponManager';
import BingoManager from '../bingo/BingoManager';
import ActivityPanel from '../activity/ActivityPanel';
import WrappedManager from '../wrapped/WrappedManager';
import GlobalSettings from '../settings/GlobalSettings';
import SnapshotCreator from '../snapshots/components/SnapshotCreator';
import Button from '../../components/ui/Button/Button';
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
    const [activeSection, setActiveSection] = useState('activity');
    const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    // Track responsiveness
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

            {/* ── Instantánea FAB (Fixed) ── */}
            <button
                className={styles.fab}
                onClick={() => setIsSnapshotModalOpen(true)}
                title="Nueva Instantánea"
            >
                <span className="material-symbols-outlined">add_a_photo</span>
            </button>

            {/* ── Modal ── */}
            {isSnapshotModalOpen && (
                <SnapshotCreator
                    onClose={() => setIsSnapshotModalOpen(false)}
                    onSuccess={() => {
                        // Optional: Refresh activity or show toast
                        setActiveSection('activity');
                    }}
                />
            )}
        </div>
    );
}

function ComingSoon({ label, icon }) {
    return (
        <div className={styles.comingSoon}>
            <div className={styles.comingSoonGlass}>
                <p className={styles.comingSoonIcon}>{icon}</p>
                <h2>{label}</h2>
                <p>Módulo en desarrollo para el Bloque C.</p>
            </div>
        </div>
    );
}

