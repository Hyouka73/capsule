import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import InteractivePhotoReveal from './InteractivePhotoReveal';
import './IntroSequence.css';

// Calculate days since April 4, 2022
function getDaysSinceStart() {
    const start = new Date(2022, 3, 4);
    const now = new Date();
    const diffMs = now - start;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

const COUNTER_START_OFFSET = 120; // Start 120 days before for clearer rolling

const INTRO_STEPS = [
    { text: null, duration: 1500, type: 'star' },
    { text: null, duration: 0, type: 'day-counter' },
    { text: 'Comenzó algo que cambió todo', duration: 3000, type: 'text' },
    { text: null, duration: 0, type: 'photos' },
];

function IntroSequence({ onComplete, onSkipToLetter, onSakuraTrigger, photoCount = 0 }) {
    const [currentStep, setCurrentStep] = useState(-1);
    const [started, setStarted] = useState(false);
    const shouldReduceMotion = useReducedMotion();

    const handleComplete = useCallback(() => {
        onComplete();
    }, [onComplete]);

    useEffect(() => {
        if (shouldReduceMotion) {
            handleComplete();
            return;
        }
        const startTimer = setTimeout(() => {
            setStarted(true);
            setCurrentStep(0);
        }, 800);
        return () => clearTimeout(startTimer);
    }, [shouldReduceMotion, handleComplete]);

    useEffect(() => {
        if (currentStep < 0 || currentStep >= INTRO_STEPS.length) return;
        const step = INTRO_STEPS[currentStep];
        if (step.type === 'photos' || step.type === 'day-counter') return;

        const timer = setTimeout(() => {
            if (currentStep < INTRO_STEPS.length - 1) {
                setCurrentStep(prev => prev + 1);
            } else {
                setTimeout(handleComplete, 500);
            }
        }, step.duration);
        return () => clearTimeout(timer);
    }, [currentStep, handleComplete]);

    const handlePhotoRevealComplete = useCallback(() => {
        // Wait 5s for petals to fall before transitioning to flower garden
        setTimeout(() => handleComplete(), 5000);
    }, [handleComplete]);

    const handleDayCounterComplete = useCallback(() => {
        setCurrentStep(prev => prev + 1);
    }, []);

    const handleSkip = useCallback(() => {
        if (onSkipToLetter) {
            onSkipToLetter();
        } else {
            handleComplete();
        }
    }, [onSkipToLetter, handleComplete]);

    if (!started) return <div className="intro-sequence" role="status" aria-label="Cargando..." />;

    const step = INTRO_STEPS[currentStep];

    return (
        <motion.div
            className="intro-sequence"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            role="status"
            aria-live="polite"
        >
            <AnimatePresence mode="wait">
                {step?.type === 'star' && (
                    <motion.div
                        key="first-star"
                        className="first-star"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 3, opacity: 0 }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="star-point" />
                        <div className="star-glow" />
                    </motion.div>
                )}

                {step?.type === 'text' && (
                    <motion.p
                        key={step.text}
                        className="intro-text"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {step.text}
                    </motion.p>
                )}

                {step?.type === 'day-counter' && (
                    <motion.div
                        key="day-counter"
                        className="intro-text"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <DayCounter onComplete={handleDayCounterComplete} />
                    </motion.div>
                )}

                {step?.type === 'photos' && (
                    <motion.div
                        key="photo-reveal"
                        className="mosaic-wrapper"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.8 }}
                    >
                        <InteractivePhotoReveal
                            photoCount={photoCount}
                            onComplete={handlePhotoRevealComplete}
                            onSakuraTrigger={onSakuraTrigger}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                className="skip-intro-btn"
                onClick={handleSkip}
                aria-label="Saltar introducción"
            >
                Saltar ›
            </button>
        </motion.div>
    );
}

/**
 * DayCounter — Physics-based Mechanical Odometer
 */
function DayCounter({ onComplete }) {
    const realDays = getDaysSinceStart();
    const startFrom = realDays - COUNTER_START_OFFSET;

    // Spring physics for smooth "rolling" arrival
    const outputValue = useSpring(startFrom, {
        stiffness: 40, // Low stiffness = loose spring = slow acceleration
        damping: 15,   // Low damping = nice smooth settle
        mass: 1
    });

    useEffect(() => {
        // Trigger the animation to the final value
        outputValue.set(realDays);

        // Detect completion roughly
        const unsubscribe = outputValue.on("change", (latest) => {
            if (latest >= realDays - 0.5) {
                setTimeout(() => onComplete?.(), 2000);
                unsubscribe();
            }
        });
        return () => unsubscribe();
    }, [realDays, outputValue, onComplete]);

    return (
        <span className="odometer-wrapper">
            Hace{' '}
            <span className="odometer">
                {/* 
                  We split into places: 1000s, 100s, 10s, 1s 
                  Example: 1409 days
                */}
                <Digit place={1000} value={outputValue} />
                <span className="comma">,</span>
                <Digit place={100} value={outputValue} />
                <Digit place={10} value={outputValue} />
                <Digit place={1} value={outputValue} />
            </span>
            {' '}días...
        </span>
    );
}

function Digit({ place, value }) {
    // Transform the raw total value into this digit's 0-10 scrolling value
    // Logic: 
    // If place is 1 (ones): value % 10.
    // If place is 10 (tens): (value / 10) % 10.
    // But we want the "mechanical snap" when lower digits roll over.
    // value = 129.5 -> ones is 9.5 (rolling). Tens should be 2.
    // value = 129.9 -> ones is 9.9. Tens should be 2.
    // value = 130.0 -> ones is 0.0. Tens should be 3.
    // The tens digit moves from 2->3 ONLY when ones is between 9 and 10.

    const digitY = useTransform(value, (val) => {
        const valAtPlace = val / place;
        const digit = Math.floor(valAtPlace % 10);

        // Calculate "remainder" of the lower place to see if we should scroll
        // previous place remainder: val % place.
        // If place=10, previous remainder is (val % 10).
        // If (val % 10) > 9, we add the fractional part.

        let offset = 0;
        if (place > 1) {
            const lowerRemainder = val % place;
            const threshold = place * 0.9; // e.g., for tens, 9.
            // Wait, for tens (place=10), we roll when ones (val % 10) is > 9? 
            // No, standard odometer rolls continuously? No, it snaps.
            // Odometer: Tens digit turns from N to N+1 whilst Ones digit turns 9->0.

            // The lower digit goes 0..9. 
            // When lower digit is between 9 and 10, this digit moves.
            // normalized lower = (val % place) / (place / 10).
            // max = 10.
            // range 9..10 -> shift 0..1.

            const lowerVal = val % place;       // 0..10 (for tens step? No 0..10*previous)
            // Example: place=10. val % 10 is the ones digit (0..9.99).
            const prevPlaceVal = val % place;   // e.g. 9.5
            const limit = place / 10 * 9;       // e.g. 9

            // If we are in the last 10% of the cycle, we move.
            // prevPlaceVal goes 0..10.
            // We want to add (prevPlaceVal - 9) restricted to 0..1.

            // Since `val` is continuous float:
            // prevPlaceVal = val % place. (Wait, for 100s, val % 100 goes 0..99.99)
            // We roll when val % 100 > 90.

            const wrapPoint = place * 0.9;
            if (prevPlaceVal > wrapPoint) {
                offset = (prevPlaceVal - wrapPoint) / (place * 0.1);
            }
        } else {
            // Ones digit always rolls continuously with the value
            offset = (val % 1);
        }

        // Final vertical position: digit + offset
        // height of one number is 1.3em (from CSS).
        // We translate the strip up by (digit + offset) * 1.3em.

        return -((digit + offset) * 1.3) + "em";
    });

    return (
        <span className="odometer-digit">
            <motion.span className="odometer-digit-inner" style={{ y: digitY }}>
                {/* 0-9 and then 0 again for smooth wrap */}
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n, i) => (
                    <span key={i} className="odometer-num">{n}</span>
                ))}
            </motion.span>
        </span>
    );
}

/**
 * SakuraOverlay — Realistic Falling Petal Animation
 *
 * 4-layer architecture (like GSAP's separate tweens):
 *   .sakura-leaf     → BURST: explosive radial trajectory (~1.5s)
 *     .petal-fall    → GRAVITY: slow linear descent (8-15s)
 *       .petal-sway  → SWAY: horizontal oscillation + Z-rock (sine ∞)
 *         .petal-tumble → TUMBLE: 3D X/Y flip (sine ∞)
 *           .petal-visual → CSS leaf shape
 */
const PETAL_PRIMARY = 70;
const PETAL_SECONDARY = 30;
const PETAL_TOTAL = PETAL_PRIMARY + PETAL_SECONDARY;

function SakuraOverlay() {
    const [done, setDone] = useState(false);
    const layerRef = useRef(null);

    const petalData = useMemo(() => {
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

        const createPetal = (i, total, isPrimary) => {
            const angle = (i / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const power = isPrimary ? 200 + Math.random() * 320 : 130 + Math.random() * 240;
            const tx = Math.cos(angle) * power;
            const ty = Math.sin(angle) * power - (isPrimary ? 120 + Math.random() * 200 : 80 + Math.random() * 150);
            const gravity = vh * 0.9 + Math.random() * vh * 0.6;
            const drift = (Math.random() - 0.5) * 200;
            const size = isPrimary ? 0.7 + Math.random() * 1.3 : 0.4 + Math.random() * 0.9;

            // Durations — key: burst is SHORT, fall is LONG
            const burstDur = 1.2 + Math.random() * 0.6;   // 1.2-1.8s
            const fallDur = isPrimary ? 8 + Math.random() * 5 : 9 + Math.random() * 6;

            return {
                key: `${isPrimary ? 'a' : 'b'}-${i}`,
                style: {
                    '--tx': `${tx}px`,
                    '--ty': `${ty}px`,
                    '--gravity': `${gravity}px`,
                    '--drift': `${drift}px`,
                    '--size': size.toFixed(2),
                    '--burst-dur': `${burstDur}s`,
                    '--fall-dur': `${fallDur}s`,
                    '--delay': `${isPrimary ? Math.random() * 0.2 : 0.15 + Math.random() * 0.25}s`,
                    // Sway: horizontal oscillation + Z-axis rocking
                    '--sway': `${8 + Math.random() * 25}px`,
                    '--sway-dur': `${1.5 + Math.random() * 2}s`,
                    '--rock': `${10 + Math.random() * 25}deg`,
                    // Tumble: gentle partial rotations (NOT full 360°)
                    '--tumble-x': `${30 + Math.random() * 90}deg`,
                    '--tumble-y': `${20 + Math.random() * 70}deg`,
                    '--tumble-dur': `${2 + Math.random() * 3}s`,
                    '--hue': Math.round(Math.random() * 20 - 5),
                },
            };
        };

        const primary = Array.from({ length: PETAL_PRIMARY }, (_, i) =>
            createPetal(i, PETAL_PRIMARY, true)
        );
        const secondary = Array.from({ length: PETAL_SECONDARY }, (_, i) =>
            createPetal(i, PETAL_SECONDARY, false)
        );
        return [...primary, ...secondary];
    }, []);

    // Track gravity animationend (longest finite animation) for cleanup
    useEffect(() => {
        const layer = layerRef.current;
        if (!layer) return;

        let completed = 0;
        const handleEnd = (e) => {
            if (e.animationName === 'petal-gravity') {
                completed++;
                if (completed >= PETAL_TOTAL) setDone(true);
            }
        };

        layer.addEventListener('animationend', handleEnd);
        return () => layer.removeEventListener('animationend', handleEnd);
    }, []);

    if (done) return null;

    return (
        <>
            {/* CSS Firework Burst */}
            <div className="sakura-firework-container">
                <div className="sakura-firework"></div>
                <div className="sakura-firework"></div>
                <div className="sakura-firework"></div>
            </div>

            {/* Petal burst layer */}
            <div className="sakura-burst-layer" ref={layerRef} aria-hidden="true">
                {petalData.map((petal) => (
                    <div key={petal.key} className="sakura-leaf" style={petal.style}>
                        <div className="petal-fall">
                            <div className="petal-sway">
                                <div className="petal-tumble">
                                    <div className="petal-visual" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

export default IntroSequence;
export { SakuraOverlay };

