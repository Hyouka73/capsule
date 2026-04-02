import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import { useActivityLog } from '../../hooks/useActivityLog';
import { useCoupons } from '../../hooks/useCoupons';
import styles from './ActivityPanel.module.css';

const CATEGORY_MAP = {
    all: { label: 'Todos', icon: 'auto_awesome', color: 'var(--pastel-rose)' },
    memory: { label: 'Recuerdos', icon: 'photo_camera', color: 'var(--pastel-rose)' },
    photo: { label: 'Fotos', icon: 'image', color: 'var(--pastel-yellow)' },
    capsule: { label: 'Cápsulas', icon: 'hourglass_empty', color: 'var(--pastel-mint)' },
    bingo: { label: 'Bingo', icon: 'grid_view', color: 'var(--pastel-orange, #ffb400)' },
    wrapped: { label: 'Wrapped', icon: 'movie', color: 'var(--pastel-lavender)' },
    coupon: { label: 'Cupones', icon: 'confirmation_number', color: 'var(--pastel-orange, #ffb400)' },
};

export default function ActivityPanel({ filterType, setFilterType }) {
    const { 
        logs, 
        isLoading: loadingLogs, 
        isFetchingMore,
        hasMore,
        loadMore,
        markAsRead, 
        markAllAsRead, 
        unreadCount,
        fetchLogs // Added fetchLogs for manual refreshes
    } = useActivityLog();

    const { 
        approveRedemption, 
        postponeRedemption, 
        redemptions // Added redemptions list to check current status
    } = useCoupons();
    
    const [selectedActionLog, setSelectedActionLog] = useState(null);
    const [postponeMsg, setPostponeMsg] = useState('');

    // Check if a specific redemption is still pending approval
    const isRedemptionPending = (redemptionId) => {
        const r = redemptions?.find(r => r.id === redemptionId);
        return r?.status === 'pending_approval';
    };

    const [onlyUnread, setOnlyUnread] = useState(false);
    const scrollRef = useRef(null);

    // Activity Stats calculation
    const activityStats = useMemo(() => {
        const stats = {
            total: logs.length,
            unread: unreadCount,
            byType: {}
        };
        logs.forEach(log => {
            if (!stats.byType[log.targetType]) stats.byType[log.targetType] = 0;
            stats.byType[log.targetType]++;
        });
        return stats;
    }, [logs, unreadCount]);

    // Horizontal scroll for chips (mobile only)
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

    const filteredLogs = useMemo(() => {
        return (logs || []).filter(log => {
            if (log.targetType === 'snapshot') return false;
            const matchesType = filterType === 'all' || log.targetType === filterType;
            const matchesUnread = !onlyUnread || !log.isReadByAdmin;
            return matchesType && matchesUnread;
        });
    }, [logs, filterType, onlyUnread]);

    // ── Date Handling ── 
    const parseDate = (d) => {
        if (!d) return new Date();
        
        // Handle Firestore Timestamp {seconds, nanoseconds} or {_seconds, _nanoseconds}
        const s = d.seconds ?? d._seconds;
        if (typeof s === 'number') return new Date(s * 1000);
        
        // Handle Firebase .toDate() method
        if (typeof d.toDate === 'function') return d.toDate();
        
        // Final fallback: try raw parsing
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    const groupedLogs = useMemo(() => {
        const now = new Date();
        const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterdayTs = todayTs - 86400000;

        const groups = {};
        
        filteredLogs.forEach(log => {
            const date = parseDate(log.createdAt);
            const ts = date.getTime();
            let label = '';

            if (ts >= todayTs) label = 'Hoy';
            else if (ts >= yesterdayTs) label = 'Ayer';
            else {
                label = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                // Capitalize
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
            .sort((a, b) => b.localeCompare(a))
            .forEach(l => {
                result.push({ label: l, items: groups[l] });
            });

        return result;
    }, [filteredLogs]);

    const getTimeAgo = (dateInput) => {
        const date = parseDate(dateInput);
        const diff = new Date().getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        
        if (seconds < 60) return 'ahora';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    };

    const getIcon = (type) => CATEGORY_MAP[type]?.icon || 'notifications';
    const getLabel = (type) => CATEGORY_MAP[type]?.label || 'Actividad';

    if (loadingLogs && logs.length === 0) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <span>Cargando dashboard...</span>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            {/* ── Dashboard Header ── */}
            <header className={styles.header}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>Actividad</h1>
                    <p className={styles.subtitle}>Lo que pasa en vuestro mundo ✨</p>
                </div>
                <div className={styles.headerActions}>
                    {unreadCount > 0 && (
                        <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={markAllAsRead} 
                            className={styles.markAllBtn}
                        >
                            Marcar todo leído ({unreadCount})
                        </Button>
                    )}
                </div>
            </header>

            <div className={styles.dashboardContainer}>
                {/* ── Left Sidebar: Filters ── */}
                <aside className={styles.filtersSidebar}>
                    <div className={styles.sidebarSection}>
                        <h2 className={styles.sidebarTitle}>Filtrar por</h2>
                        <nav className={styles.filterNav}>
                            {Object.entries(CATEGORY_MAP).map(([id, cat]) => (
                                <button 
                                    key={id}
                                    className={`${styles.navChip} ${filterType === id ? styles.activeNavChip : ''}`}
                                    onClick={() => setFilterType(id)}
                                >
                                    <span className="material-symbols-rounded">{cat.icon}</span>
                                    <span>{cat.label}</span>
                                    {id !== 'all' && activityStats.byType[id] > 0 && (
                                        <span className={styles.statBadge}>{activityStats.byType[id]}</span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Unread Toggle */}
                    <div className={styles.sidebarSection}>
                        <button 
                            className={`${styles.toggleBtn} ${onlyUnread ? styles.toggleActive : ''}`}
                            onClick={() => setOnlyUnread(!onlyUnread)}
                        >
                            <span className="material-symbols-rounded">
                                {onlyUnread ? 'visibility_off' : 'visibility'}
                            </span>
                            <span>{onlyUnread ? 'Ver todos' : 'Solo sin leer'}</span>
                        </button>
                    </div>
                </aside>

                {/* ── Center: Feed ── */}
                <main className={styles.feedWrapper}>
                    {/* Mobile Only: Sticky scroll view of chips */}
                    <div className={styles.mobileFilterBar}>
                        <div className={styles.mobileChips} ref={scrollRef}>
                            {Object.entries(CATEGORY_MAP).map(([id, cat]) => (
                                <button 
                                    key={id}
                                    className={`${styles.chip} ${filterType === id ? styles.activeChip : ''}`}
                                    onClick={() => setFilterType(id)}
                                >
                                    <span className="material-symbols-rounded">{cat.icon}</span>
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.feedList}>
                        <AnimatePresence mode="popLayout">
                            {groupedLogs.length === 0 ? (
                                <motion.div 
                                    key="empty"
                                    className={styles.emptyFeed}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    <div className={styles.emptyIcon}>
                                        <span className="material-symbols-rounded">mark_email_read</span>
                                    </div>
                                    <h2>¡Todo al día!</h2>
                                    <p>No hay nueva actividad pendiente de revisar en esta categoría.</p>
                                    {onlyUnread && (
                                        <Button variant="secondary" onClick={() => setOnlyUnread(false)}>
                                            Ver actividad anterior
                                        </Button>
                                    )}
                                </motion.div>
                            ) : (
                                groupedLogs.map(group => (
                                    <section key={group.label} className={styles.feedSection}>
                                        <h3 className={styles.dateHeader}>{group.label}</h3>
                                        <div className={styles.itemsGrid}>
                                            {group.items.map(log => (
                                                <motion.div 
                                                    layout
                                                    key={log.id} 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`${styles.feedItem} ${log.isReadByAdmin ? styles.read : styles.unread}`}
                                                    onClick={() => !log.isReadByAdmin && markAsRead(log.id)}
                                                >
                                                    <div 
                                                        className={styles.itemIcon} 
                                                        style={{ backgroundColor: CATEGORY_MAP[log.targetType]?.color || 'var(--pastel-rose)' }}
                                                    >
                                                        <span className="material-symbols-rounded">
                                                            {getIcon(log.targetType)}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className={styles.itemContent}>
                                                        <div className={styles.itemInfo}>
                                                            <div className={styles.itemHeader}>
                                                                <span className={styles.itemAction} title={log.displayText}>
                                                                    {log.displayText}
                                                                </span>
                                                                <span className={styles.itemTime}>
                                                                    {getTimeAgo(log.createdAt)}
                                                                </span>
                                                            </div>
                                                            <div className={styles.itemMeta}>
                                                                <span className={styles.itemType}>{getLabel(log.targetType)}</span>
                                                                <span className={styles.itemId}>#{log.targetId?.slice(-4)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Manage Button: ONLY if log is a request AND its redemption is still pending */}
                                                    {log.action === 'coupon_requested' && log.redemptionId && isRedemptionPending(log.redemptionId) && (
                                                        <div className={styles.itemActions}>
                                                            <Button 
                                                                size="xs" 
                                                                variant="primary"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedActionLog(log);
                                                                }}
                                                            >
                                                                Gestionar
                                                            </Button>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </div>
                                    </section>
                                ))
                            )}
                        </AnimatePresence>

                        {hasMore && (
                            <div className={styles.loadMoreWrapper}>
                                <button 
                                    onClick={loadMore} 
                                    disabled={isFetchingMore}
                                    className={styles.loadMoreBtn}
                                >
                                    {isFetchingMore ? (
                                        <div className={styles.inlineSpinner} />
                                    ) : (
                                        'Ver más actividades'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </main>

                {/* ── Right Sidebar: Summary Stats ── */}
                <aside className={styles.statsSidebar}>
                    <div className={styles.statsCard}>
                        <h3 className={styles.statsTitle}>
                            <span className="material-symbols-rounded">analytics</span>
                            Resumen Semanal
                        </h3>
                        <div className={styles.statsGrid}>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Sin leer</span>
                                <span className={styles.statValue}>{activityStats.unread}</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Total</span>
                                <span className={styles.statValue}>{activityStats.total}</span>
                            </div>
                        </div>
                        <div className={styles.miniChart}>
                            {Object.entries(activityStats.byType).map(([type, count]) => (
                                <div 
                                    key={type}
                                    className={styles.chartBarWrapper}
                                    title={`${getLabel(type)}: ${count}`}
                                >
                                    <div 
                                        className={styles.chartBar}
                                        style={{ 
                                            height: `${Math.max((count / activityStats.total) * 100, 10)}%`,
                                            backgroundColor: CATEGORY_MAP[type]?.color 
                                        }}
                                    />
                                    <span className="material-symbols-rounded">{getIcon(type)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.helpCard}>
                        <span className="material-symbols-rounded">stars</span>
                        <p>Cada vez que tu partner añade algo, aparecerá aquí.</p>
                    </div>
                </aside>
            </div>

            {/* ── Action Modal (Using Portal) ── */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {selectedActionLog && (
                        <div className={styles.modalOverlay} onClick={() => setSelectedActionLog(null)}>
                            <motion.div 
                                className={styles.actionModal}
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className={styles.modalHeader}>
                                    <div className={styles.modalIcon}>🎁</div>
                                    <h3>Gestionar Petición</h3>
                                    <button className={styles.closeBtn} onClick={() => setSelectedActionLog(null)}>
                                        <span className="material-symbols-rounded">close</span>
                                    </button>
                                </div>

                                <div className={styles.modalBody}>
                                    <p className={styles.requestText}>
                                        <strong>{selectedActionLog.displayText}</strong>
                                    </p>
                                    <p className={styles.requestContext}>
                                        Tu partner está esperando este regalo. ¿Qué quieres hacer?
                                    </p>

                                    <div className={styles.postponeBox}>
                                        <textarea 
                                            placeholder="Motivo de posposición (opcional)..."
                                            className={styles.modalTextarea}
                                            value={postponeMsg}
                                            onChange={(e) => setPostponeMsg(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className={styles.modalActions}>
                                    <Button 
                                        variant="secondary" 
                                        onClick={async () => {
                                            if (!selectedActionLog?.redemptionId) return;
                                            await postponeRedemption(selectedActionLog.redemptionId, postponeMsg);
                                            await markAsRead(selectedActionLog.id);
                                            await fetchLogs(); // Core fix: Refresh logs to show the new "Postponed" entry
                                            setSelectedActionLog(null);
                                            setPostponeMsg('');
                                        }}
                                    >
                                        Posponer
                                    </Button>
                                    <Button 
                                        variant="primary" 
                                        onClick={async () => {
                                            if (!selectedActionLog?.redemptionId) return;
                                            await approveRedemption(selectedActionLog.redemptionId);
                                            await markAsRead(selectedActionLog.id);
                                            await fetchLogs(); // Core fix: Refresh logs to show the new "Approved" entry
                                            setSelectedActionLog(null);
                                        }}
                                    >
                                        ¡Conceder Deseo! ✨
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
