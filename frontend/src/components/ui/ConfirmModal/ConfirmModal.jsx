import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../Button/Button';
import styles from './ConfirmModal.module.css';

/**
 * Global Confirm Modal Component
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Modal visibility
 * @param {string} props.title - Modal title (optional)
 * @param {string} props.message - Alert message
 * @param {string} props.confirmText - Label for confirm button
 * @param {string} props.cancelText - Label for cancel button
 * @param {function} props.onConfirm - Callback when confirmed
 * @param {function} props.onCancel - Callback when cancelled
 * @param {string} props.variant - 'default' | 'danger' | 'success'
 * @param {string} props.emoji - Optional emoji to show at top
 */
export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    variant = 'default',
    emoji = '👋'
}) {
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className={styles.overlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onCancel}
                >
                    <motion.div
                        className={styles.container}
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.emojiContainer}>
                            <span className={styles.emoji}>{emoji}</span>
                        </div>
                        
                        <div className={styles.content}>
                            {title && <h2 className={styles.title}>{title}</h2>}
                            <p className={styles.message}>{message}</p>
                        </div>

                        <div className={styles.actions}>
                            <Button 
                                variant="ghost" 
                                onClick={onCancel}
                                className={styles.cancelBtn}
                            >
                                {cancelText}
                            </Button>
                            <Button 
                                variant={variant === 'danger' ? 'danger' : 'primary'}
                                onClick={onConfirm}
                                className={styles.confirmBtn}
                            >
                                {confirmText}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
