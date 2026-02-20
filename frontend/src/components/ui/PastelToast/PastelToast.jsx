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
    success: (title, description) => _dispatch?.({ op: 'add', type: 'success', title, description }),
    error: (title, description) => _dispatch?.({ op: 'add', type: 'error', title, description }),
    loading: (title, description) => _dispatch?.({ op: 'add', type: 'loading', title, description }),
    info: (title, description) => _dispatch?.({ op: 'add', type: 'info', title, description }),

    /**
     * promise toast: shows a persisted "loading" toast, then
     * UPDATES IT IN PLACE (same id → same key) to success/error.
     * This avoids stacking and re-entry animations.
     */
    promise: async (promise, { loading, success, error }) => {
        const id = _dispatch?.({ op: 'add', type: 'loading', title: loading.title, description: loading.description, persist: true });
        try {
            const result = await promise;
            _dispatch?.({ op: 'update', id, type: 'success', title: success.title, description: success.description });
            return result;
        } catch (err) {
            _dispatch?.({ op: 'update', id, type: 'error', title: error.title, description: error.description });
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

            setToasts(prev => [...prev, {
                id,
                type: action.type,
                title: action.title,
                description: action.description,
            }]);

            if (!action.persist) {
                setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
            }

            return id;
        }

        if (action.op === 'update') {
            // Mutate in-place: same id → same React key → Framer Motion animates content, not mount
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
function ToastItem({ id, type, title, description, onClose }) {
    return (
        <motion.div
            layout
            className={`${styles.toast} ${styles[type]}`}
            initial={{ opacity: 0, y: -12, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={onClose}
        >
            <motion.div
                key={type}           /* re-animate badge when type changes */
                className={`${styles.badge} ${styles[`badge_${type}`]}`}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            >
                {ICONS[type]}
            </motion.div>

            <div className={styles.content}>
                <motion.span
                    key={title}      /* re-animate text when content changes */
                    className={`${styles.title} ${styles[`title_${type}`]}`}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {title}
                </motion.span>
                {description && (
                    <motion.span
                        key={description}
                        className={styles.description}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: 0.05 }}
                    >
                        {description}
                    </motion.span>
                )}
            </div>
        </motion.div>
    );
}
