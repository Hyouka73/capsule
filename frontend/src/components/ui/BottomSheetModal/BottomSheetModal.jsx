import { motion, AnimatePresence } from 'framer-motion';
import styles from './BottomSheetModal.module.css';

/**
 * Reusable Bottom Sheet Modal Component
 * @param {object} props
 * @param {boolean} props.isOpen - Is modal open
 * @param {function} props.onClose - Function to close modal
 * @param {string} props.emoji - Large emoji header
 * @param {string} props.title - Modal title text
 * @param {string} props.description - Modal description text
 * @param {string} props.confirmText - Primary action text
 * @param {string} props.cancelText - Secondary action text
 * @param {function} props.onConfirm - Action when confirmed
 * @param {function} props.onCancel - Action when cancelled (defaults to onClose)
 * @param {boolean} props.closeOnClickOutside - Whether to close when clicking the overlay
 * @param {string} props.overlayClassName - Custom class for the overlay
 * @param {boolean} props.showOverlay - Whether to show the backdrop background/blur
 */
export default function BottomSheetModal({
    isOpen,
    onClose,
    emoji,
    title,
    description,
    children,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    hideActions = false,
    closeOnClickOutside = true,
    overlayClassName = '',
    showOverlay = true,
}) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className={`${styles.modalOverlay} ${overlayClassName} ${!showOverlay ? styles.noOverlay : ''}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => closeOnClickOutside && onClose()}
                >
                    <motion.div
                        className={styles.modalContent}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Indicador de arrastre decorativo */}
                        <div className={styles.dragHandle} />

                        {emoji && <span className={styles.modalEmoji}>{emoji}</span>}
                        {title && <h2>{title}</h2>}
                        {description && <p>{description}</p>}
                        {children && <div className={styles.children}>{children}</div>}


                        {!hideActions && (
                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    className={styles.confirmBtn}
                                    onClick={onConfirm}
                                >
                                    {confirmText}
                                </button>
                                <button
                                    type="button"
                                    className={styles.cancelBtn}
                                    onClick={onCancel || onClose}
                                >
                                    {cancelText}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
