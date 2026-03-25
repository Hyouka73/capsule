import { motion } from 'framer-motion';
import styles from './CouponTicket.module.css';
import { CouponIcons } from '../../../icons/CouponIcons';

export default function CouponTicket({ coupon, onRedeem }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`${styles.couponCard} ${coupon.isUsed ? styles.couponUsed : ''}`}
        >
            <div className={styles.ticketStub}>
                <div className={styles.serialNumber}>
                    #{coupon.id?.slice(-3).toUpperCase() || '000'}
                </div>
                <div className={styles.couponIcon}>
                    {coupon.emoji || '🎁'}
                </div>
            </div>

            <div className={styles.ticketBody}>
                <div className={styles.couponText}>
                    <h3>{coupon.title || coupon.name}</h3>
                    <p>{coupon.description}</p>
                    {coupon.maxRedemptions > 1 && (
                        <div className={styles.redemptionTracker}>
                            {Array.from({ length: coupon.maxRedemptions }).map((_, i) => (
                                <span 
                                    key={i} 
                                    className={`${styles.punchHole} ${i < (coupon.maxRedemptions - coupon.redemptionsLeft) ? styles.punched : ''}`}
                                >
                                    ●
                                </span>
                            ))}
                            <span className={styles.redemptionCount}>
                                {coupon.redemptionsLeft} de {coupon.maxRedemptions} disponibles
                            </span>
                        </div>
                    )}
                </div>

                <div className={styles.ticketAction}>
                    {(!coupon.isUsed && (coupon.redemptionsLeft === undefined || coupon.redemptionsLeft > 0)) ? (
                        <button
                            className={styles.redeemBtn}
                            onClick={() => onRedeem(coupon)}
                        >
                            Canjear 💌
                        </button>
                    ) : (
                        <div className={styles.usedStamp}>
                            {coupon.maxRedemptions > 1 ? 'Agotado 🎫' : 'Cobrado ✓'}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
