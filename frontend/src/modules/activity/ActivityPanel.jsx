import { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../../components/ui/Card/Card';
import Button from '../../components/ui/Button/Button';
import { useActivityLog } from '../../hooks/useActivityLog';
import { useCoupons } from '../../hooks/useCoupons';
import styles from './ActivityPanel.module.css';

export default function ActivityPanel({ filterType, setFilterType }) {
    const { 
        logs, 
        isLoading: loadingLogs, 
        isFetchingMore,
        hasMore,
        loadMore,
        markAsRead, 
        markAllAsRead, 
        unreadCount 
    } = useActivityLog();

    const { coupons, redemptions, updateCoupon } = useCoupons({ adminMode: true });
    
    const [onlyUnread, setOnlyUnread] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        const slider = scrollRef.current;
        if (!slider) return;

        let isDown = false;
        let startX;
        let scrollLeft;

        const startDragging = (e) => {
            isDown = true;
            slider.style.cursor = 'grabbing';
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        };

        const stopDragging = () => {
            isDown = false;
            slider.style.cursor = 'grab';
        };

        const move = (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeft - walk;
        };

        slider.addEventListener('mousedown', startDragging);
        slider.addEventListener('mouseleave', stopDragging);
        slider.addEventListener('mouseup', stopDragging);
        slider.addEventListener('mousemove', move);

        return () => {
            slider.removeEventListener('mousedown', startDragging);
            slider.removeEventListener('mouseleave', stopDragging);
            slider.removeEventListener('mouseup', stopDragging);
            slider.removeEventListener('mousemove', move);
        };
    }, []);

    const pendingRedemptions = useMemo(() => {
        return (redemptions || []).filter(r => r.status === 'pending_approval').map(r => {
            const coupon = coupons.find(c => c.id === r.couponId);
            return { ...r, coupon };
        }).filter(r => r.coupon);
    }, [redemptions, coupons]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            if (log.targetType === 'snapshot') return false;
            const matchesType = filterType === 'all' || log.targetType === filterType;
            const matchesUnread = !onlyUnread || !log.isReadByAdmin;
            return matchesType && matchesUnread;
        });
    }, [logs, filterType, onlyUnread]);

    const groupedLogs = useMemo(() => {
        const now = new Date();
        const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterdayTs = todayTs - 86400000;

        const groups = {};
        
        filteredLogs.forEach(log => {
            const d = new Date(log.createdAt);
            const ts = d.getTime();
            let label = '';

            if (ts >= todayTs) label = 'Hoy';
            else if (ts >= yesterdayTs) label = 'Ayer';
            else {
                label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                label = label.charAt(0).toUpperCase() + label.slice(1);
            }

            if (!groups[label]) groups[label] = [];
            groups[label].push(log);
        });

        const orderedLabels = ['Hoy', 'Ayer'];
        const result = [];
        
        orderedLabels.forEach(l => {
            if (groups[l]) result.push({ label: l, items: groups[l] });
        });

        Object.keys(groups)
            .filter(l => !orderedLabels.includes(l))
            .forEach(l => {
                result.push({ label: l, items: groups[l] });
            });

        return result;
    }, [filteredLogs]);

    const getTimeAgo = (dateInput) => {
        const date = new Date(dateInput);
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'ahora mismo';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `hace ${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours}h`;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleApprove = async (redemption) => {
        // NOTE: Standard updateCoupon might not handle status change to 'approved' if it only expects data updates.
        // For now, keeping the logic minimal as per the ActivityLog focus.
        // If a specific updateRedemption API is missing, we should address it in other module migration.
        try {
            await updateCoupon(redemption.couponId, {
                redemptionsLeft: (redemption.coupon.redemptionsLeft || redemption.coupon.maxRedemptions || 1) - 1
            });
            // TODO: Migrate redemption status update to apiClient/backend API when moving coupons module
        } catch (err) {
            // silent fail
        }
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

    const getLabel = (type) => {
        switch (type) {
            case 'memory': return 'Recuerdo';
            case 'photo': return 'Foto';
            case 'capsule': return 'Cápsula';
            case 'coupon': return 'Cupón';
            case 'bingo': return 'Bingo';
            case 'wrapped': return 'Wrapped';
            case 'snapshot': return 'Instantánea';
            default: return 'Actividad';
        }
    };

    const CATEGORIES = [
        { id: 'all', label: 'Todos', icon: '♡' },
        { id: 'memory', label: 'Recuerdos', icon: '📸' },
        { id: 'photo', label: 'Fotos', icon: '🖼️' },
        { id: 'capsule', label: 'Cápsulas', icon: '⏳' },
        { id: 'coupon', label: 'Cupones', icon: '🎁' },
        { id: 'bingo', label: 'Bingo', icon: '🎯' },
    ];

    if (loadingLogs && logs.length === 0) {
        return <div className={styles.loading}>Cargando feed de actividad...</div>;
    }

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>Panel de Actividad</h1>
                    <p className={styles.subtitle}>Monitorea las acciones de tu partner.</p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="primary" size="md" onClick={markAllAsRead} className={styles.markAllBtn}>
                        Marcar todo como leído ({unreadCount})
                    </Button>
                )}
            </header>

            <div className={styles.dashboardGrid}>
                <div className={styles.feedContainer}>
                    <div className={styles.filterHeader}>
                        <div className={styles.filterChips} ref={scrollRef}>
                            {CATEGORIES.map(cat => (
                                <button 
                                    key={cat.id}
                                    className={`${styles.chip} ${filterType === cat.id ? styles.activeChip : ''}`}
                                    onClick={() => setFilterType(cat.id)}
                                >
                                    <span className={styles.chipIcon}>{cat.icon}</span>
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

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
                                            className={`${styles.feedItem} ${log.isReadByAdmin ? styles.read : styles.unread}`}
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
                                                    <span className={styles.itemType}>{getLabel(log.targetType)}</span>
                                                    <span className={styles.itemId}>#{log.targetId?.slice(-6)}</span>
                                                </div>
                                            </div>
                                            <div className={styles.itemActions}>
                                                {!log.isReadByAdmin && (
                                                    <button 
                                                        className={styles.markReadBtn} 
                                                        onClick={() => markAsRead(log.id)}
                                                        title="Marcar como leído"
                                                    >
                                                        ✅
                                                    </button>
                                                )}
                                                <div className={styles.statusIndicator}>
                                                    {log.isReadByAdmin ? '○' : '●'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            ))}

                            {hasMore && (
                                <div className={styles.loadMoreContainer}>
                                    <Button 
                                        variant="secondary" 
                                        onClick={loadMore} 
                                        disabled={isFetchingMore}
                                        className={styles.loadMoreBtn}
                                    >
                                        {isFetchingMore ? 'Cargando...' : 'Cargar más actividades'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <aside className={styles.filtersSidebar}>
                    {pendingRedemptions.length > 0 && (
                        <Card className={styles.pendingRedemptionsCard}>
                            <h3>🎟️ Solicitudes ({pendingRedemptions.length})</h3>
                            <div className={styles.pendingList}>
                                {pendingRedemptions.map(r => (
                                    <div key={r.id} className={styles.pendingItem}>
                                        <div className={styles.pendingInfo}>
                                            <span className={styles.pendingEmoji}>{r.coupon.emoji}</span>
                                            <div>
                                                <p className={styles.pendingTitle}>{r.coupon.title}</p>
                                                <span className={styles.pendingTime}>{getTimeAgo(r.requestedAt?.toDate() || new Date())}</span>
                                            </div>
                                        </div>
                                        <div className={styles.pendingActions}>
                                            <Button size="xs" onClick={() => handleApprove(r)}>✅</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    <Card className={styles.statsCard}>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Sin leer</span>
                            <span className={styles.unreadCountBadge}>{unreadCount}</span>
                        </div>
                    </Card>
                </aside>
            </div>
        </div>
    );
}

