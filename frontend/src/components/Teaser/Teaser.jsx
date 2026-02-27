import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import StarryBackground from './StarryBackground';
import IntroSequence, { SakuraOverlay } from './IntroSequence';
import FlowerGarden from './FlowerGarden';
import LetterReveal from './LetterReveal';
import Countdown from './Countdown';
import FloatingPetals from './FloatingPetals';
import TimeLock from './TimeLock';
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

    return (
        <div className="teaser-app">
            <StarryBackground />

            {/* Floating petals appear after intro */}
            {phase !== 'intro' && <FloatingPetals />}

            <TimeLock>
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
                                            <Countdown visible={true} />

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
            </TimeLock>

            {/* 🌸 Sakura petals — rendered at App level so they persist above flower garden */}
            {showSakura && <SakuraOverlay />}

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
