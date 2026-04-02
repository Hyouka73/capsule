import { useState, useEffect, useCallback, createContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './PastelToast.module.css';

/* ─── Context ─── */
const ToastContext = createContext(null);

let _dispatch = null;

/* ─────────────────────────────────────────
   Public API — usable anywhere in the tree
   ───────────────────────────────────────── */
export const toast = {
    success: (title, description, options) => _dispatch?.({ op: 'add', type: 'success', title, description, ...options }),
    error: (title, description, options) => _dispatch?.({ op: 'add', type: 'error', title, description, ...options }),
    loading: (title, description, options) => _dispatch?.({ op: 'add', type: 'loading', title, description, ...options }),
    info: (title, description, options) => _dispatch?.({ op: 'add', type: 'info', title, description, ...options }),

    /**
     * promise toast: shows a persisted "loading" toast, then
     * UPDATES IT IN PLACE (same id → same key) to success/error.
     * This avoids stacking and re-entry animations.
     */
    promise: async (promise, { loading, success, error }) => {
        const loadingTitle = typeof loading === 'string' ? loading : loading?.title;
        const loadingDesc = typeof loading === 'string' ? undefined : loading?.description;
        const id = _dispatch?.({ op: 'add', type: 'loading', title: loadingTitle, description: loadingDesc, persist: true });
        
        try {
            const result = await promise;
            const successTitle = typeof success === 'string' ? success : success?.title;
            const successDesc = typeof success === 'string' ? undefined : success?.description;
            _dispatch?.({ op: 'update', id, type: 'success', title: successTitle, description: successDesc });
            return result;
        } catch (err) {
            const errorTitle = typeof error === 'string' ? error : error?.title;
            const errorDesc = typeof error === 'string' ? undefined : error?.description;
            _dispatch?.({ op: 'update', id, type: 'error', title: errorTitle, description: errorDesc });
            throw err;
        }
    },
};

/* ─────────────────────────────────────────
   Provider
   ───────────────────────────────────────── */
export function PastelToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dispatch = useCallback((action) => {
        if (action.op === 'add') {
            const id = Date.now() + Math.random();

            // Version 3.0: Compact stacking (limit to 3)
            setToasts(prev => {
                const newToasts = [
                    {
                        id,
                        type: action.type,
                        title: action.title,
                        description: action.description,
                        onClick: action.onClick,
                    },
                    ...prev
                ].slice(0, 2);
                return newToasts;
            });

            if (!action.persist) {
                const duration = action.duration || 3500;
                setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
            }

            return id;
        }

        if (action.op === 'update') {
            // Update the single active toast
            setToasts(prev => prev.map(t =>
                t.id === action.id
                    ? { ...t, type: action.type, title: action.title, description: action.description }
                    : t
            ));
            // Auto-dismiss after update
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== action.id)), 4000);
        }
    }, []);

    useEffect(() => { _dispatch = dispatch; }, [dispatch]);

    const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <ToastContext.Provider value={{ dispatch }}>
            {children}
            <div className={styles.viewport}>
                <AnimatePresence mode="popLayout">
                    {toasts.map(t => (
                        <ToastItem key={t.id} {...t} onClose={() => remove(t.id)} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

/* ─────────────────────────────────────────
   SVG Icons
   ───────────────────────────────────────── */
const ICONS = {
    success: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    error: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    loading: (
        <svg className={styles.spin} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    ),
    info: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
};

/* ─────────────────────────────────────────
   Toast Item
   ───────────────────────────────────────── */
function ToastItem({ id, type, title, description, onClose, onClick }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
            drag="y"
            dragConstraints={{ top: -50, bottom: 50 }}
            onDragEnd={(_, info) => {
                if (Math.abs(info.offset.y) > 40) onClose();
            }}
            whileTap={{ scale: 0.98 }}
            transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
                mass: 1
            }}
            className={`${styles.toast} ${styles[type]}`}
            role="status"
            aria-live="polite"
        >
            <motion.div
                key={type}
                className={`${styles.badge} ${styles[`badge_${type}`]}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
                {ICONS[type]}
            </motion.div>

            <div className={styles.content} onClick={() => {
                if (onClick) onClick();
                onClose();
            }}>
                <span className={styles.title}>{title}</span>
                {description && (
                    <span className={styles.description}>{description}</span>
                )}
            </div>

            <button 
                className={styles.closeBtn} 
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                aria-label="Cerrar"
            >
                ✕
            </button>
        </motion.div>
    );
}
