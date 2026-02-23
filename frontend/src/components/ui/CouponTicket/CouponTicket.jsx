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
                    #{coupon.id.padStart(3, '0')}
                </div>
                <div className={styles.couponIcon}>
                    {CouponIcons[coupon.icon] ? CouponIcons[coupon.icon]({ className: styles.svgIcon }) : '🎟️'}
                </div>
            </div>

            <div className={styles.ticketBody}>
                <div className={styles.couponText}>
                    <h3>{coupon.title}</h3>
                    <p>{coupon.description}</p>
                </div>

                <div className={styles.ticketAction}>
                    {!coupon.isUsed ? (
                        <button
                            className={styles.redeemBtn}
                            onClick={() => onRedeem(coupon)}
                        >
                            Canjear
                        </button>
                    ) : (
                        <div className={styles.usedStamp}>
                            Cobrado ✓
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
