import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import './IntroSequence.css';

const INTRO_STEPS = [
    { text: null, duration: 1500, type: 'star' },
    { text: 'Hace 1,460 días...', duration: 3000, type: 'text' },
    { text: 'Comenzó algo que cambió todo', duration: 3000, type: 'text' },
    { text: null, duration: 4000, type: 'constellation' },
    { text: 'Este es nuestro universo privado', duration: 3000, type: 'text' },
];

function ConstellationCanvas({ visible }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!visible) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const dpr = window.devicePixelRatio || 1;
        const logicalW = 300;
        const logicalH = 200;
        canvas.width = logicalW * dpr;
        canvas.height = logicalH * dpr;
        canvas.style.width = `${logicalW}px`;
        canvas.style.height = `${logicalH}px`;
        ctx.scale(dpr, dpr);

        // Constellation points for initials (B & S placeholder — customize!)
        const pointsB = [
            [30, 20], [30, 100], [30, 180],
            [70, 10], [80, 55], [70, 100], [80, 145], [70, 180],
        ];
        const pointsAnd = [
            [110, 120], [120, 100], [130, 120], [120, 140],
        ];
        const pointsS = [
            [175, 30], [210, 20], [240, 35],
            [230, 70], [200, 90],
            [180, 115], [175, 150],
            [195, 175], [230, 180], [260, 165],
        ];

        const allPoints = [...pointsB, ...pointsAnd, ...pointsS];
        const lines = [];

        // B connections
        for (let i = 0; i < pointsB.length - 1; i++) lines.push([i, i + 1]);
        lines.push([0, 3]);
        lines.push([2, 7]);

        // & connections
        const aOff = pointsB.length;
        for (let i = 0; i < pointsAnd.length - 1; i++) lines.push([aOff + i, aOff + i + 1]);
        lines.push([aOff + 3, aOff]);

        // S connections
        const sOff = aOff + pointsAnd.length;
        for (let i = 0; i < pointsS.length - 1; i++) lines.push([sOff + i, sOff + i + 1]);

        let progress = 0;
        const totalDuration = 120;
        let animFrame;

        const draw = () => {
            progress++;
            const t = Math.min(progress / totalDuration, 1);
            ctx.clearRect(0, 0, logicalW, logicalH);

            // Draw lines
            const linesToDraw = Math.floor(t * lines.length);
            for (let i = 0; i < linesToDraw; i++) {
                const [a, b] = lines[i];
                const pA = allPoints[a];
                const pB = allPoints[b];

                const lineProgress = i === linesToDraw - 1
                    ? (t * lines.length - i)
                    : 1;

                const endX = pA[0] + (pB[0] - pA[0]) * lineProgress;
                const endY = pA[1] + (pB[1] - pA[1]) * lineProgress;

                ctx.beginPath();
                ctx.moveTo(pA[0], pA[1]);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = 'rgba(212, 168, 83, 0.4)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Draw points
            const pointsToDraw = Math.floor(t * allPoints.length);
            for (let i = 0; i <= pointsToDraw && i < allPoints.length; i++) {
                const [x, y] = allPoints[i];
                const pointT = i === pointsToDraw
                    ? (t * allPoints.length - i)
                    : 1;

                // Glow
                const glowR = 8 * pointT;
                ctx.beginPath();
                ctx.arc(x, y, glowR, 0, Math.PI * 2);
                const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
                glow.addColorStop(0, `rgba(255, 251, 230, ${0.3 * pointT})`);
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.fill();

                // Star point
                ctx.beginPath();
                ctx.arc(x, y, 2.5 * pointT, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 251, 230, ${pointT})`;
                ctx.fill();
            }

            if (progress < totalDuration + 30) {
                animFrame = requestAnimationFrame(draw);
            }
        };

        draw();
        return () => cancelAnimationFrame(animFrame);
    }, [visible]);

    return (
        <canvas
            ref={canvasRef}
            className="constellation-canvas"
            aria-hidden="true"
            style={{ opacity: visible ? 1 : 0 }}
        />
    );
}

function IntroSequence({ onComplete }) {
    const [currentStep, setCurrentStep] = useState(-1);
    const [started, setStarted] = useState(false);
    const shouldReduceMotion = useReducedMotion();

    const handleComplete = useCallback(() => {
        onComplete();
    }, [onComplete]);

    useEffect(() => {
        // For reduced motion, skip directly to main content
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
        const timer = setTimeout(() => {
            if (currentStep < INTRO_STEPS.length - 1) {
                setCurrentStep(prev => prev + 1);
            } else {
                setTimeout(handleComplete, 500);
            }
        }, step.duration);

        return () => clearTimeout(timer);
    }, [currentStep, handleComplete]);

    // Skip button for impatient users
    const handleSkip = useCallback(() => {
        handleComplete();
    }, [handleComplete]);

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

                {step?.type === 'constellation' && (
                    <motion.div
                        key="constellation"
                        className="constellation-wrapper"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <ConstellationCanvas visible={true} />
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

export default IntroSequence;
