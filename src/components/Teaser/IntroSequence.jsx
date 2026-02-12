import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './IntroSequence.css';

const INTRO_STEPS = [
    { text: null, duration: 1500, type: 'star' },
    { text: 'Hace 1,460 días...', duration: 3000, type: 'text' },
    { text: 'Comenzó algo que cambió todo', duration: 3000, type: 'text' },
    { text: null, duration: 4000, type: 'constellation' },
    { text: 'Este es nuestro universo privado', duration: 3000, type: 'text' },
];

function ConstellationCanvas({ visible }) {
    useEffect(() => {
        if (!visible) return;

        const canvas = document.getElementById('constellation-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = 300;
        canvas.height = 200;

        // Define constellation points for "B & S" (placeholder initials — update these!)
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
        lines.push([0, 3]); lines.push([2, 7]);

        // & connections
        const aOff = pointsB.length;
        for (let i = 0; i < pointsAnd.length - 1; i++) lines.push([aOff + i, aOff + i + 1]);
        lines.push([aOff + 3, aOff]);

        // S connections
        const sOff = aOff + pointsAnd.length;
        for (let i = 0; i < pointsS.length - 1; i++) lines.push([sOff + i, sOff + i + 1]);

        let progress = 0;
        const totalDuration = 120; // frames
        let animFrame;

        const draw = () => {
            progress++;
            const t = Math.min(progress / totalDuration, 1);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

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
                ctx.beginPath();
                ctx.arc(x, y, 8 * pointT, 0, Math.PI * 2);
                const glow = ctx.createRadialGradient(x, y, 0, x, y, 8 * pointT);
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
            id="constellation-canvas"
            className="constellation-canvas"
            style={{ opacity: visible ? 1 : 0 }}
        />
    );
}

function IntroSequence({ onComplete }) {
    const [currentStep, setCurrentStep] = useState(-1);
    const [started, setStarted] = useState(false);

    useEffect(() => {
        // Small initial delay
        const startTimer = setTimeout(() => {
            setStarted(true);
            setCurrentStep(0);
        }, 800);
        return () => clearTimeout(startTimer);
    }, []);

    useEffect(() => {
        if (currentStep < 0 || currentStep >= INTRO_STEPS.length) return;

        const step = INTRO_STEPS[currentStep];
        const timer = setTimeout(() => {
            if (currentStep < INTRO_STEPS.length - 1) {
                setCurrentStep(prev => prev + 1);
            } else {
                // Intro complete — trigger transition
                setTimeout(() => onComplete(), 500);
            }
        }, step.duration);

        return () => clearTimeout(timer);
    }, [currentStep, onComplete]);

    if (!started) return <div className="intro-sequence" />;

    const step = INTRO_STEPS[currentStep];

    return (
        <motion.div
            className="intro-sequence"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
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
                        transition={{
                            enter: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
                            exit: { duration: 0.6 },
                        }}
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
        </motion.div>
    );
}

export default IntroSequence;
