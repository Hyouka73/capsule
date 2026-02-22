import { useState } from 'react';
import Card from '../../components/ui/Card/Card';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import styles from './ActivityPanel.module.css';

export default function ActivityPanel() {
    const [filter, setFilter] = useState('all');

    // Mock Stats
    const stats = [
        { label: 'Sesiones esta semana', value: '14', icon: '📱', trend: '+3' },
        { label: 'Fotos en recuerdos', value: '128', icon: '📸', trend: '+12' },
        { label: 'Cápsulas abiertas', value: '4', icon: '⏳', trend: '0' },
        { label: 'Bingo completado', value: '2', icon: '🎯', trend: '+1' },
    ];

    // Mock Next Capsules
    const nextCapsules = [
        { id: 1, title: 'Nuestro primer aniversario', unlockDate: '2026-02-14T00:00:00Z' },
        { id: 2, title: 'Pista para San Valentín', unlockDate: '2026-02-13T20:00:00Z' }
    ];

    // Mock Activity Log
    const activities = [
        { id: 101, type: 'session', user: 'Partner', action: 'Inició sesión', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), icon: '👋' },
        { id: 102, type: 'coupon_used', user: 'Partner', action: 'Canjeó el cupón "Tarde de Cine"', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), icon: '🎟️' },
        { id: 103, type: 'capsule_viewed', user: 'Partner', action: 'Abrió la cápsula "Pista 1"', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), icon: '🔓' },
        { id: 104, type: 'memory_created', user: 'Admin', action: 'Creó el recuerdo "Cena en la Roma"', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), icon: '✨' },
        { id: 105, type: 'bingo_marked', user: 'Admin', action: 'Marcó el reto "Cocinar juntos" en Bingo', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), icon: '🎯' },
    ];

    const filteredActivities = filter === 'all' ? activities : activities.filter(a => a.type === filter);

    const getTimeAgo = (dateString) => {
        const diffMs = Date.now() - new Date(dateString).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `Hace ${diffMins} min`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `Hace ${diffHours} h`;
        return `Hace ${Math.floor(diffHours / 24)} días`;
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Panel de Actividad</h1>
                    <p className={styles.subtitle}>Métricas y bitácora de interacción de la app.</p>
                </div>
            </div>

            {/* Stats Row */}
            <div className={styles.statsGrid}>
                {stats.map((stat, i) => (
                    <Card key={i} className={styles.statCard}>
                        <div className={styles.statIcon}>{stat.icon}</div>
                        <div className={styles.statInfo}>
                            <p className={styles.statLabel}>{stat.label}</p>
                            <h3 className={styles.statValue}>
                                {stat.value}
                                {stat.trend && <span className={styles.trendBadge}>{stat.trend}</span>}
                            </h3>
                        </div>
                    </Card>
                ))}
            </div>

            <div className={styles.mainLayout}>
                {/* Left Col: Activity Log */}
                <Card className={styles.feedCardContainer} glass>
                    <div className={styles.feedHeader}>
                        <h3>Última Actividad</h3>
                        <div style={{ width: '200px' }}>
                            <KawaiiInput type="select" value={filter} onChange={e => setFilter(e.target.value)} options={[
                                { value: 'all', label: 'Todas las acciones' },
                                { value: 'session', label: 'Sesiones' },
                                { value: 'coupon_used', label: 'Cupones' },
                                { value: 'capsule_viewed', label: 'Cápsulas Leídas' },
                                { value: 'memory_created', label: 'Recuerdos' },
                                { value: 'bingo_marked', label: 'Bingo' }
                            ]} />
                        </div>
                    </div>

                    <div className={styles.feedList}>
                        {filteredActivities.length === 0 ? (
                            <div className={styles.emptyFeed}>No hay actividad para este filtro.</div>
                        ) : (
                            filteredActivities.map(act => (
                                <div key={act.id} className={styles.feedItem}>
                                    <div className={styles.feedIcon}>{act.icon}</div>
                                    <div className={styles.feedContent}>
                                        <p className={styles.feedAction}><strong>{act.user}</strong> {act.action}</p>
                                        <span className={styles.feedTime}>{getTimeAgo(act.timestamp)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Right Col: Next Capsules */}
                <div className={styles.sideCol}>
                    <Card className={styles.upcomingCard} glass>
                        <h3 className={styles.upcomingTitle}>Próximas Cápsulas</h3>
                        <div className={styles.upcomingList}>
                            {nextCapsules.map(cap => (
                                <div key={cap.id} className={styles.upcomingItem}>
                                    <div className={styles.upcomingIcon}>⏳</div>
                                    <div>
                                        <h4 className={styles.upcomingName}>{cap.title}</h4>
                                        <p className={styles.upcomingDate}>{new Date(cap.unlockDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            ))}
                            {nextCapsules.length === 0 && <p className={styles.emptyText}>No hay cápsulas programadas.</p>}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
