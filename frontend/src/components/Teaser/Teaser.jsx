import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import StarryBackground from './StarryBackground';
import IntroSequence, { SakuraOverlay } from './IntroSequence';
import FlowerGarden from './FlowerGarden';
import LetterReveal from './LetterReveal';
import Countdown from './Countdown';
import FloatingPetals from './FloatingPetals';
import { useAppConfig } from '../../context/AppConfigContext';
import { useAuth } from '../../hooks/useAuth';
import './Teaser.css';

const PHOTO_COUNT = 22;

function Teaser() {
    const [phase, setPhase] = useState('intro');
    const [showCountdown, setShowCountdown] = useState(false);
    const [showSakura, setShowSakura] = useState(false);
    const [isLetterFinished, setIsLetterFinished] = useState(false);
    const [letterSkipTriggered, setLetterSkipTriggered] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const navigate = useNavigate();
    const isMounted = useRef(true);
    const { teaser } = useAppConfig();
    const { user, completeTeaser } = useAuth();
    
    const completeTeaserRef = useRef(completeTeaser);
    const navigateRef = useRef(navigate);

    useEffect(() => {
        completeTeaserRef.current = completeTeaser;
        navigateRef.current = navigate;
    }, [completeTeaser, navigate]);

    const revealDate = useMemo(() => {
        if (!teaser?.revealDate) return new Date('2026-04-04T00:00:00').getTime();
        // Since the model already normalizes this to milliseconds, 
        // we handle Firestore Timestamp objects just in case of race conditions during load.
        if (teaser.revealDate && typeof teaser.revealDate === 'object') {
            if (teaser.revealDate.seconds) return teaser.revealDate.seconds * 1000;
            if (teaser.revealDate._seconds) return teaser.revealDate._seconds * 1000;
        }
        if (typeof teaser.revealDate === 'number') return teaser.revealDate;
        const d = new Date(teaser.revealDate);
        return isNaN(d.getTime()) ? new Date('2026-04-04T00:00:00').getTime() : d.getTime();
    }, [teaser?.revealDate]);

    const handleIntroComplete = useCallback(() => {
        setPhase('flowers');
    }, []);

    const handleSkipToLetter = useCallback(() => {
        setShowSakura(false);
        setPhase('letter');
    }, []);

    const handleSakuraTrigger = useCallback(() => {
        setShowSakura(true);
    }, []);

    const handleFlowersComplete = useCallback(() => {
        setPhase('letter');
    }, []);

    const handleLetterComplete = useCallback(() => {
        setIsLetterFinished(true);
        setShowCountdown(true);
    }, []);

    const [completionPhase, setCompletionPhase] = useState(0);

    const handleCountdownComplete = useCallback(() => {
        if (completionPhase === 0) {
            setCompletionPhase(1);
        }
    }, [completionPhase]);

    useEffect(() => {
        // Stage 1: Intense Sakura (0s - 2s)
        if (completionPhase === 1) {
            setShowSakura(true);
            const t = setTimeout(() => {
                setCompletionPhase(2);
            }, 2000);
            return () => clearTimeout(t);
        }

        // Stage 2: Sakura + Dark Fade (2s - 10s)
        if (completionPhase === 2) {
            setIsFadingOut(true);
            const t = setTimeout(() => {
                setCompletionPhase(3);
            }, 8000); 
            return () => clearTimeout(t);
        }

        // Stage 3: End sequence & Navigation
        if (completionPhase === 3) {
            setCompletionPhase(4);
            const finalize = async () => {
                try {
                    const stableComplete = completeTeaserRef.current;
                    const stableNavigate = navigateRef.current;
                    if (stableComplete) await stableComplete();
                    
                    if (isMounted.current) {
                        setTimeout(() => stableNavigate('/welcome'), 500);
                    } else {
                        stableNavigate('/welcome');
                    }
                } catch (err) {
                    if (navigateRef.current) navigateRef.current('/welcome');
                }
            };
            finalize();
        }
    }, [completionPhase]);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    return (
        <div className="teaser-app">
            <StarryBackground />

            {phase !== 'intro' && <FloatingPetals />}

            <AnimatePresence mode="wait">
                {phase === 'intro' && (
                    <IntroSequence
                        key="intro"
                        onComplete={handleIntroComplete}
                        onSkipToLetter={handleSkipToLetter}
                        onSakuraTrigger={handleSakuraTrigger}
                        photoCount={PHOTO_COUNT}
                    />
                )}

                {phase === 'flowers' && (
                    <FlowerGarden
                        key="flowers"
                        visible={true}
                        onComplete={handleFlowersComplete}
                    />
                )}

                {phase === 'letter' && (
                    <motion.div
                        key="main"
                        className="main-content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                    >
                        <div className="main-scroll">
                            <LetterReveal
                                visible={!showCountdown}
                                onComplete={handleLetterComplete}
                                onFinished={setIsLetterFinished}
                                skipTriggered={letterSkipTriggered}
                            />

                            <AnimatePresence>
                                {showCountdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                    >
                                        <Countdown 
                                            visible={true} 
                                            targetDate={revealDate}
                                            onComplete={handleCountdownComplete}
                                        />

                                        <motion.div
                                            className="teaser-footer"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 1.5, duration: 1 }}
                                        >
                                            <p className="footer-text">
                                                Hecho con todo mi amor 💜
                                            </p>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {isFadingOut && (
                <div className="welcome-fade-overlay">
                    <motion.div
                        className="fade-message-container"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: { transition: { staggerChildren: 1.5 } }
                        }}
                    >
                        <motion.p 
                            variants={{
                                hidden: { opacity: 0, y: 15 },
                                visible: { opacity: 1, y: 0 }
                            }}
                            transition={{ duration: 2, ease: "easeOut" }}
                        >
                            Cada recuerdo es solo una semilla...
                        </motion.p>
                        <motion.p 
                            variants={{
                                hidden: { opacity: 0, y: 15 },
                                visible: { opacity: 1, y: 0 }
                            }}
                            transition={{ duration: 2, ease: "easeOut" }}
                        >
                            Nuestra verdadera historia apenas está por escribirse.
                        </motion.p>
                        <motion.p 
                            className="fade-message-accent"
                            variants={{
                                hidden: { opacity: 0, scale: 0.9 },
                                visible: { opacity: 1, scale: 1 }
                            }}
                            transition={{ duration: 2.5, ease: "easeOut" }}
                        >
                            ¿Lista para descubrir lo que viene?
                        </motion.p>
                    </motion.div>
                </div>
            )}

            {(showSakura || completionPhase >= 1) && <SakuraOverlay />}

            {phase === 'intro' && (
                <button className="skip-intro-btn" onClick={handleIntroComplete}>
                    Saltar ›
                </button>
            )}
            {phase === 'flowers' && (
                <button className="skip-intro-btn" onClick={handleFlowersComplete}>
                    Saltar ›
                </button>
            )}
            {phase === 'letter' && !showCountdown && (
                <button className="skip-letter-btn" onClick={() => {
                    if (isLetterFinished) {
                        handleLetterComplete();
                    } else {
                        setLetterSkipTriggered(true);
                    }
                }}>
                    {isLetterFinished ? "Continuar ›" : "Omitir ›"}
                </button>
            )}
        </div>
    );
}

export default Teaser;
