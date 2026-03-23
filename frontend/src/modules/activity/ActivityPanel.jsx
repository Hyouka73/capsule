import { useState, useMemo } from 'react';
import Card from '../../components/ui/Card/Card';
import Button from '../../components/ui/Button/Button';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import { useActivityLog } from '../../hooks/useActivityLog';
import styles from './ActivityPanel.module.css';

export default function ActivityPanel() {
    const { logs, isLoading, markAsRead, markAllAsRead, unreadCount } = useActivityLog();
    
    // Filters
    const [filterType, setFilterType] = useState('all');
    const [onlyUnread, setOnlyUnread] = useState(false);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesType = filterType === 'all' || log.targetType === filterType;
            const matchesUnread = !onlyUnread || !log.isReadByAdmin;
            return matchesType && matchesUnread;
        });
    }, [logs, filterType, onlyUnread]);

    const groupedLogs = useMemo(() => {
        const groups = {};
        filteredLogs.forEach(log => {
            const date = new Date(log.createdAt);
            const dateKey = date.toDateString();
            if (!groups[dateKey]) {
                groups[dateKey] = {
                    date,
                    label: getFriendlyDate(date),
                    items: []
                };
            }
            groups[dateKey].items.push(log);
        });
        return Object.values(groups).sort((a, b) => b.date - a.date);
    }, [filteredLogs]);

    function getFriendlyDate(date) {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Hoy';
        if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
        
        return date.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long', 
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
        });
    }

    const getTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'ahora mismo';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `hace ${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours}h`;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getIcon = (type) => {
        switch (type) {
            case 'memory': return '📸';
            case 'photo': return '🖼️';
            case 'capsule': return '⏳';
            case 'coupon': return '🎁';
            case 'bingo': return '🎯';
            case 'wrapped': return '🎬';
            case 'snapshot': return '✨';
            default: return '🔔';
        }
    };

    if (isLoading) {
        return <div className={styles.loading}>Cargando feed de actividad real...</div>;
    }

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>Panel de Actividad</h1>
                    <p className={styles.subtitle}>Monitorea las acciones de tu partner en tiempo real.</p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                        Marcar todo como leído ({unreadCount})
                    </Button>
                )}
            </header>

            <div className={styles.dashboardGrid}>
                {/* ── Desktop Filters ── */}
                <aside className={styles.filtersSidebar}>
                    <Card className={styles.filterCard}>
                        <h3 className={styles.filterTitle}>Filtros</h3>
                        
                        <div className={styles.filterGroup}>
                            <KawaiiInput 
                                type="toggle" 
                                label="Solo no leídos" 
                                value={onlyUnread} 
                                onChange={e => setOnlyUnread(e.target.checked)} 
                            />
                        </div>

                        <div className={styles.filterGroup}>
                            <label className={styles.label}>Por tipo</label>
                            <div className={styles.filterOptions}>
                                {['all', 'memory', 'photo', 'capsule', 'coupon', 'bingo', 'snapshot'].map(type => (
                                    <button 
                                        key={type}
                                        className={`${styles.filterBtn} ${filterType === type ? styles.activeFilter : ''}`}
                                        onClick={() => setFilterType(type)}
                                    >
                                        {type === 'all' ? 'Todos' : type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <Card className={styles.statsCard}>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Total Logs</span>
                            <span className={styles.statValue}>{logs.length}</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Sin leer</span>
                            <span className={styles.statValue}>{unreadCount}</span>
                        </div>
                    </Card>
                </aside>

                {/* ── Main Feed ── */}
                <div className={styles.feedContainer}>
                    {groupedLogs.length === 0 ? (
                        <div className={styles.emptyFeed}>
                            <span>📭</span>
                            <p>No hay actividad que coincida con los filtros.</p>
                        </div>
                    ) : (
                        <div className={styles.feedList}>
                            {groupedLogs.map(group => (
                                <section key={group.label} className={styles.feedSection}>
                                    <header className={styles.dateHeader}>
                                        {group.label}
                                    </header>
                                    
                                    {group.items.map(log => (
                                        <div 
                                            key={log.id} 
                                            className={`${styles.feedItem} ${!log.isReadByAdmin ? styles.unread : ''}`}
                                            onClick={() => !log.isReadByAdmin && markAsRead(log.id)}
                                            style={{ cursor: !log.isReadByAdmin ? 'pointer' : 'default' }}
                                        >
                                            <div className={`${styles.itemIcon} ${styles[log.targetType]}`}>
                                                {getIcon(log.targetType)}
                                            </div>
                                            <div className={styles.itemContent}>
                                                <div className={styles.itemHeader}>
                                                    <span className={styles.itemAction}>{log.displayText}</span>
                                                    <span className={styles.itemTime}>{getTimeAgo(log.createdAt)}</span>
                                                </div>
                                                <div className={styles.itemFooter}>
                                                    <span className={styles.itemType}>{log.targetType}</span>
                                                    <span className={styles.itemId}>ID: {log.targetId}</span>
                                                </div>
                                            </div>
                                            {!log.isReadByAdmin && <div className={styles.unreadDot} />}
                                        </div>
                                    ))}
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

