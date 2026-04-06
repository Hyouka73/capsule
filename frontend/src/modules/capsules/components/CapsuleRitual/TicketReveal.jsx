import { motion } from 'framer-motion';
import styles from './TicketReveal.module.css';

/**
 * TicketReveal — Invitación de lujo para Recuerdos Web.
 * @param {Object} link - El objeto del link {url, title, domain}.
 */
export default function TicketReveal({ link }) {
    if (!link) return null;

    return (
        <motion.a 
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ticket}
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ 
                type: 'spring', 
                damping: 15, 
                stiffness: 100,
                delay: 0.3 
            }}
        >
            <div className={styles.ticketHeader}>
                <span className={styles.ticketTitle}>Invitación Especial</span>
                <span className={styles.ticketIcon}>✨</span>
            </div>
            
            <div className={styles.ticketBody}>
                <h2 className={styles.linkTitle}>{link.title || 'Recuerdo Web'}</h2>
                <div className={styles.domainPill}>{link.domain || 'ver destino'}</div>
            </div>

            <div className={styles.ticketFooter}>
                <span className={styles.footerText}>Toca para viajar 🚀</span>
                <div className={styles.barcode} />
            </div>

            {/* Brillo Dorado (Glow) */}
            <div className={styles.goldenGlow} />
        </motion.a>
    );
}
