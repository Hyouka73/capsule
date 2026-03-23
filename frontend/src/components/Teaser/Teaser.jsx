import { useState, useCallback } from 'react';
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
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import './Teaser.css';

/**
 * Teaser flow:
 * 1. intro     — Star → text → PhotoMosaic (C ♥ I) → text
 * 2. flowers   — CSS flower garden animation with floating hearts
 * 3. letter    — Typing love letter in glassmorphism card
 * 4. countdown — Timer to April 4 anniversary (reveals after letter finishes)
 *
 * Photo config:
 * Place couple photos in /public/photos/teaser/ as 1.jpg, 2.jpg, etc.
 * Set PHOTO_COUNT to the number of photos you've added.
 * Minimum: 10 photos. Ideal: 27+ for no repeats.
 * If 0, placeholder glow dots are shown instead.
 */
const PHOTO_COUNT = 0; // ← Change this when you add photos!

function Teaser() {
    const [phase, setPhase] = useState('intro');
    const [showCountdown, setShowCountdown] = useState(false);
    const [showSakura, setShowSakura] = useState(false);
    const [isLetterFinished, setIsLetterFinished] = useState(false);
    const [letterSkipTriggered, setLetterSkipTriggered] = useState(false);
    const [isExploding, setIsExploding] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const navigate = useNavigate();
    const { teaser } = useAppConfig();
    const { user } = useAuth();

    const unlockAt = teaser?.unlockAt 
        ? new Date(teaser.unlockAt) 
        : new Date('2026-04-04T00:00:00');

    const handleIntroComplete = useCallback(() => {
        setPhase('flowers');
    }, []);

    const handleSkipToLetter = useCallback(() => {
        setShowSakura(false); // hide petals on skip
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

    const handleCountdownComplete = useCallback(async () => {
        setIsExploding(true);
        
        // Start fade to dark poetic background at 2s
        setTimeout(() => setIsFadingOut(true), 2000);

        // Final transition after 10s (2s sakura + 8s text)
        setTimeout(async () => {
            if (user?.uid) {
                try {
                    // 1. Mark teaser as completed in Firestore
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, { teaserCompleted: true });
                } catch (err) {
                    console.error('Error updating teaser status:', err);
                }
            }
            // 2. Navigate to welcome screen
            navigate('/welcome');
        }, 10000);
    }, [navigate, user?.uid]);

    return (
        <div className="teaser-app">
            <StarryBackground />

            {/* Floating petals appear after intro */}
            {phase !== 'intro' && <FloatingPetals />}

            <AnimatePresence mode="wait">
                    {/* Phase 1: Intro with PhotoMosaic */}
                    {phase === 'intro' && (
                        <IntroSequence
                            key="intro"
                            onComplete={handleIntroComplete}
                            onSkipToLetter={handleSkipToLetter}
                            onSakuraTrigger={handleSakuraTrigger}
                            photoCount={PHOTO_COUNT}
                        />
                    )}

                    {/* Phase 2: Flower Garden */}
                    {phase === 'flowers' && (
                        <FlowerGarden
                            key="flowers"
                            visible={true}
                            onComplete={handleFlowersComplete}
                        />
                    )}

                    {/* Phase 3 & 4: Letter + Countdown */}
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
                                                targetDate={unlockAt}
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

            {/* 🌸 Sakura petals — rendered at App level so they persist above flower garden */}
            {/* We hide them when fade-out (Phase 5 dark bg) starts for a cleaner transition */}
            {(showSakura || (isExploding && !isFadingOut)) && <SakuraOverlay />}

            {/* Final Explosion Flash */}
            {isExploding && (
                <motion.div
                    className="explosion-flash"
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 4, opacity: 0 }}
                    transition={{ duration: 2.0, ease: "easeInOut" }}
                />
            )}

            {/* Cinematic Fade Out to Dark with Poetic Text */}
            {isFadingOut && (
                <motion.div
                    className="welcome-fade-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2.0, ease: "easeInOut" }}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: '#110c14', // dark theme color
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5, duration: 3.0, ease: "easeInOut" }}
                        style={{
                            color: '#fff',
                            fontSize: '1.4rem',
                            fontFamily: 'serif',
                            fontStyle: 'italic',
                            textAlign: 'center',
                            lineHeight: '1.6',
                            padding: '0 2rem'
                        }}
                    >
                        Ya llegó el momento...<br/>
                        <span style={{ fontSize: '1rem', opacity: 0.7, marginTop: '2rem', display: 'block' }}>
                            Nuestro viaje continúa.
                        </span>
                    </motion.div>
                </motion.div>
            )}

            {/* Centralized Buttons */}
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
