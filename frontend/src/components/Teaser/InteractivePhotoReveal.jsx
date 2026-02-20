import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import './InteractivePhotoReveal.css';

/**
 * InteractivePhotoReveal — Bidirectional Deck with CSS-Driven Explosion
 *
 * Architecture:
 *   - Framer Motion → POSITION only (x, y, uniform scale, zIndex, display)
 *   - CSS @keyframes → VISUAL DEFORMATION (scaleX/Y, rotate on .polaroid-card)
 *   - CSS firework  → explosion burst (radial-gradient, user's CodePen reference)
 *   - CSS @keyframes → sakura leaves burst from center then drift down
 *
 * This separation avoids FM scale/scaleX/scaleY compounding bugs.
 */

function InteractivePhotoReveal({ photoCount = 0, onComplete, onSakuraTrigger }) {
    // List of actual filenames from public/photos/teaser
    const PHOTO_FILENAMES = [
        "WhatsApp Image 2026-02-13 at 5.34.30 PM (1).jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.30 PM (2).jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.30 PM.jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.31 PM (1).jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.31 PM.jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.32 PM (1).jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.32 PM (2).jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.32 PM (3).jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.32 PM.jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.33 PM (1).jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.33 PM (2).jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.33 PM (3).jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.33 PM.jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.34 PM.jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.35 PM.jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.37 PM.jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.38 PM.jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.39 PM (1).jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.39 PM.jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.40 PM (1).jpeg",
        "WhatsApp Image 2026-02-13 at 5.34.40 PM.jpeg"
    ];

    const TOTAL = PHOTO_FILENAMES.length;

    // Shuffle and prepare queue
    const photoQueue = useMemo(() => {
        // Shuffle array
        const shuffled = [...PHOTO_FILENAMES];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }, []);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [finalePhase, setFinalePhase] = useState(null); // null | 'gathering' | 'finale'
    const [isLocked, setIsLocked] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    // --- Mobile Check ---
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // --- Interaction Guide (Idle Timer) ---
    // --- Interaction Guide (Idle Timer) ---
    useEffect(() => {
        let timer;

        // Function to show guide after delay
        const scheduleGuide = (delay) => {
            clearTimeout(timer);
            if (!finalePhase && !isLocked) {
                timer = setTimeout(() => setShowGuide(true), delay);
            }
        };

        const resetTimer = () => {
            setShowGuide(false);
            scheduleGuide(8000); // 8s idle (standard)
        };

        // Initial Load: Show guide quickly (1.5s) so they know what to do immediately
        scheduleGuide(1500);

        // Listen for interactions on window to catch clicks anywhere
        window.addEventListener('click', resetTimer);
        window.addEventListener('touchstart', resetTimer);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('click', resetTimer);
            window.removeEventListener('touchstart', resetTimer);
        };
    }, [finalePhase, isLocked]); // Removed currentIndex dependency to avoid guide flickering on nav

    const goNext = () => {
        if (finalePhase || isLocked) return;
        if (currentIndex === TOTAL - 1) {
            setIsLocked(true);
            setCurrentIndex(prev => prev + 1);
            setTimeout(() => startFinale(), 800);
            return;
        }
        if (currentIndex < TOTAL) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const goPrev = () => {
        if (finalePhase || isLocked || currentIndex <= 0) return;
        setCurrentIndex(prev => prev - 1);
    };

    //  0ms    → gathering: FM springs cards to center
    //  900ms  → finale: CSS @keyframes deformation on .polaroid-card
    //  2700ms → POP: card vanishes + firework burst + sakura trigger → parent
    //  4000ms → onComplete: next phase starts
    const startFinale = () => {
        setFinalePhase('gathering');
        setShowGuide(false); // Force hide
        setTimeout(() => setFinalePhase('finale'), 900);
        setTimeout(() => onSakuraTrigger?.(), 2700); // Tell parent to spawn petals
        setTimeout(() => onComplete?.(), 4000);
    };

    // ─── FM Variants: POSITION ONLY ──────────────────────────────
    // All use uniform `scale` (never scaleX/scaleY to avoid compounding)
    const cardVariants = {
        upcoming: {
            opacity: 0, scale: 0.9, x: '5vw', y: '0vh',
            rotate: 5, zIndex: 0, display: 'none'
        },
        active: {
            opacity: 1, scale: 1, x: '0vw', y: isMobile ? '-5vh' : '0vh',
            rotate: 0, zIndex: 100, display: 'flex',
            transition: { type: "spring", stiffness: 300, damping: 30 }
        },
        stashed: (i) => ({
            opacity: 1, scale: isMobile ? 0.25 : 0.45, x: '38vw', y: '35vh',
            rotate: (i * 13 % 10 - 5) * 4,
            zIndex: i, display: 'flex',
            transition: { type: "spring", stiffness: 200, damping: 25 }
        }),
        gathering: {
            opacity: 1, scale: 1, x: '0vw', y: '0vh',
            rotate: 10, zIndex: 200, display: 'flex',
            transition: { type: "spring", stiffness: 180, damping: 20 }
        },
        // finale: same position as gathering — CSS handles the visuals
        finale: {
            opacity: 1, scale: 1, x: '0vw', y: '0vh',
            rotate: 0, zIndex: 200, display: 'flex',
            transition: { duration: 0.05 }
        }
    };

    return (
        <div className="interactive-reveal">

            {/* Render Cards */}
            {photoQueue.map((photoId, i) => {
                let state = 'upcoming';
                if (i === currentIndex) state = 'active';
                if (i < currentIndex) state = 'stashed';

                // Finale overrides
                if (finalePhase === 'gathering') state = 'gathering';
                else if (finalePhase === 'finale') state = 'finale';

                if (state === 'upcoming' && i > currentIndex + 2) return null;

                const isFinale = finalePhase === 'finale';

                return (
                    <motion.div
                        key={i}
                        className="photo-item-wrapper"
                        variants={cardVariants}
                        initial="upcoming"
                        animate={state}
                        custom={i}
                    >
                        {/* CSS class drives deformation — no FM transform conflict */}
                        <div className={`polaroid-card${isFinale ? ' polaroid-card--finale' : ''}`}>
                            {photoId ? (
                                <img
                                    src={`/photos/teaser/${photoId}`}
                                    alt="Recuerdo"
                                    draggable={false}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.style.background = '#f0f0f0';
                                    }}
                                />
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: '#eaeaea' }} />
                            )}
                        </div>
                    </motion.div>
                );
            })}

            {/* Navigation Zones (Invisible but clickable) */}
            {(!finalePhase && !isLocked) && (
                <div className={`nav-zones ${showGuide ? 'guide-active' : ''}`}>
                    <div className="nav-zone nav-zone--prev" onClick={goPrev} aria-label="Anterior">
                        {/* Ripple in Prev Zone (if applicable, e.g. index > 0) */}
                        {showGuide && currentIndex > 0 && (
                            <div className="ripple-container">
                                <div className="ripple-ring"></div>
                                <div className="ripple-ring"></div>
                                <div className="ripple-ring"></div>
                            </div>
                        )}
                    </div>

                    <div className="nav-zone nav-zone--next" onClick={goNext} aria-label="Siguiente">
                        {/* Ripple in Next Zone */}
                        {showGuide && (
                            <div className="ripple-container">
                                <div className="ripple-ring"></div>
                                <div className="ripple-ring"></div>
                                <div className="ripple-ring"></div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Hint (Original text, kept but made part of new guide system logic if desired or removed. User asked for specific guide) */}
            {/* We rely on the hand icon now, so removing the text-only hint to avoid clutter */}

        </div >
    );
}

export default InteractivePhotoReveal;