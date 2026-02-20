import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import MemoryManager from './MemoryManager';
import CapsuleManager from './CapsuleManager';
import Button from '../../components/ui/Button/Button';
import styles from './AdminDashboard.module.css';

const SECTIONS = [
    { id: 'memories', label: 'Recuerdos', icon: '📸' },
    { id: 'capsules', label: 'Cápsulas', icon: '⏳' },
    { id: 'coupons', label: 'Cupones', icon: '🎁' },
    { id: 'activity', label: 'Actividad', icon: '💬' },
    { id: 'settings', label: 'Config', icon: '⚙️' },
];

export default function AdminDashboard() {
    const { signOut } = useAuth();
    const [activeSection, setActiveSection] = useState('memories');

    return (
        <div className={styles.root}>
            {/* ── Sidebar ── */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <span className={styles.sidebarLogo}>✦</span>
                    <span className={styles.sidebarTitle}>Capsule</span>
                    <span className={styles.sidebarBadge}>Admin</span>
                </div>

                <nav className={styles.nav}>
                    {SECTIONS.map(section => (
                        <button
                            key={section.id}
                            className={`${styles.navItem} ${activeSection === section.id ? styles.active : ''}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            <span className={styles.navIcon}>{section.icon}</span>
                            <span className={styles.navLabel}>{section.label}</span>
                        </button>
                    ))}
                </nav>

                <div className={styles.footer}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={signOut}
                        className={styles.signOutBtn}
                    >
                        Cerrar sesión
                    </Button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className={styles.main}>
                {activeSection === 'memories' && <MemoryManager />}
                {activeSection === 'capsules' && <CapsuleManager />}
                {activeSection === 'coupons' && <ComingSoon label="Cupones y Sorpresas" />}
                {activeSection === 'activity' && <ComingSoon label="Activity Log" />}
                {activeSection === 'settings' && <ComingSoon label="Configuración" />}
            </main>
        </div>
    );
}

function ComingSoon({ label }) {
    return (
        <div className={styles.comingSoon}>
            <p className={styles.comingSoonIcon}>🚧</p>
            <h2>{label}</h2>
            <p>Próximamente en el siguiente bloque de desarrollo.</p>
        </div>
    );
}

