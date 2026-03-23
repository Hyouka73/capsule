import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Countdown from './Countdown';
import { useAppConfig } from '../../context/AppConfigContext';
import LoadingScreen from '../ui/LoadingScreen/LoadingScreen';
import './TimeLock.css';

function TimeLock({ children }) {
    const { teaser, isConfigLoaded } = useAppConfig();
    const [isLocked, setIsLocked] = useState(true);

    const unlockDate = teaser?.unlockAt 
        ? new Date(teaser.unlockAt) 
        : null;

    useEffect(() => {
        if (!isConfigLoaded) return;

        if (teaser?.isEnabled === false) {
            setIsLocked(false);
            return;
        }

        if (unlockDate) {
            const target = unlockDate.getTime();
            const now = Date.now();

            if (now >= target) {
                setIsLocked(false);
            }
        }
    }, [isConfigLoaded, unlockDate, teaser?.isEnabled]);

    const handleUnlock = () => {
        // Wait a moment for the countdown hitting 0 visual state
        setTimeout(() => {
            setIsLocked(false);
        }, 1000);
    };

    if (!isConfigLoaded) return <LoadingScreen message="Sincronizando tiempo..." />;

    return (
        <AnimatePresence mode="wait">
            {isLocked ? (
                <motion.div
                    key="locked"
                    className="time-lock-screen"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 1.5, ease: "easeInOut" } }}
                >
                    <div className="lock-content">
                        {/* Reusing Countdown with custom title and date */}
                        <Countdown
                            visible={true}
                            targetDate={unlockDate || new Date()}
                            onComplete={handleUnlock}
                            title="El contenido no está disponible aún. Espera un poquito..."
                        />
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    style={{ width: '100%', height: '100%' }}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default TimeLock;
