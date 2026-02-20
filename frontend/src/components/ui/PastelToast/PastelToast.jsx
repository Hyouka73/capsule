import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './PastelToast.module.css';

/* ─── Context ─── */
const ToastContext = createContext(null);

let _addToast = null;

/* Public API — call anywhere in the tree */
export const toast = {
    success: (title, description) => _addToast?.({ type: 'success', title, description }),
    error: (title, description) => _addToast?.({ type: 'error', title, description }),
    loading: (title, description) => _addToast?.({ type: 'loading', title, description }),
    info: (title, description) => _addToast?.({ type: 'info', title, description }),

    /** Returns a promise-aware toast (loading → success / error) */
    promise: async (promise, { loading, success, error }) => {
        const id = _addToast?.({ type: 'loading', title: loading.title, description: loading.description, persist: true });
        try {
            const result = await promise;
            _addToast?.({ type: 'success', title: success.title, description: success.description, replaceId: id });
            return result;
        } catch (err) {
            _addToast?.({ type: 'error', title: error.title, description: error.description, replaceId: id });
            throw err;
        }
    },
};

/* ─── Provider ─── */
export function PastelToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback(({ type, title, description, persist = false, replaceId = null }) => {
        const id = Date.now() + Math.random();

        setToasts(prev => {
            const filtered = replaceId ? prev.filter(t => t.id !== replaceId) : prev;
            return [...filtered, { id, type, title, description }];
        });

        if (!persist) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 4000);
        }

        return id;
    }, []);

    useEffect(() => { _addToast = addToast; }, [addToast]);

    const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <ToastContext.Provider value={{ addToast }}>
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

/* ─── Single Toast ─── */
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
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
};

function ToastItem({ id, type, title, description, onClose }) {
    return (
        <motion.div
            layout
            className={`${styles.toast} ${styles[type]}`}
            initial={{ opacity: 0, y: -16, scale: 0.92, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, scale: 0.9, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            onClick={onClose}
        >
            <div className={`${styles.badge} ${styles[`badge_${type}`]}`}>
                {ICONS[type]}
            </div>
            <div className={styles.content}>
                <span className={`${styles.title} ${styles[`title_${type}`]}`}>{title}</span>
                {description && <span className={styles.description}>{description}</span>}
            </div>
        </motion.div>
    );
}
