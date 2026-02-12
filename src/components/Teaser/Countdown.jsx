import { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import './Countdown.css';

function getTimeUntil(targetDate) {
    const diff = targetDate - Date.now();

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
    };
}

function FlipUnit({ value, label }) {
    const prevRef = useRef(value);
    const [isFlipping, setIsFlipping] = useState(false);

    useEffect(() => {
        if (value !== prevRef.current) {
            prevRef.current = value;
            setIsFlipping(true);
            const timer = setTimeout(() => setIsFlipping(false), 300);
            return () => clearTimeout(timer);
        }
    }, [value]);

    const display = String(value).padStart(2, '0');

    return (
        <div className="flip-unit">
            <div
                className={`flip-card ${isFlipping ? 'flipping' : ''}`}
                aria-label={`${value} ${label}`}
            >
                <span className="flip-value" aria-hidden="true">{display}</span>
            </div>
            <span className="flip-label" aria-hidden="true">{label}</span>
        </div>
    );
}

// April 4, 2026, 00:00:00 CST (UTC-6)
const TARGET_DATE = new Date('2026-04-04T00:00:00-06:00');

function Countdown({ visible }) {
    const [time, setTime] = useState(() => getTimeUntil(TARGET_DATE));
    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        if (!visible) return;

        const interval = setInterval(() => {
            setTime(getTimeUntil(TARGET_DATE));
        }, 1000);

        return () => clearInterval(interval);
    }, [visible]);

    if (!visible) return null;

    const ariaLabel = `Faltan ${time.days} días, ${time.hours} horas, ${time.minutes} minutos y ${time.seconds} segundos`;

    return (
        <motion.div
            className="countdown-section"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            role="timer"
            aria-label={ariaLabel}
            aria-live="off"
        >
            <p className="countdown-teaser">Algo especial está en camino…</p>

            <div className="countdown-grid" aria-hidden="true">
                <FlipUnit value={time.days} label="días" />
                <span className="countdown-separator">:</span>
                <FlipUnit value={time.hours} label="horas" />
                <span className="countdown-separator">:</span>
                <FlipUnit value={time.minutes} label="min" />
                <span className="countdown-separator">:</span>
                <FlipUnit value={time.seconds} label="seg" />
            </div>

            <p className="countdown-date">
                <time dateTime="2026-04-04">4 de abril, 2026</time>
            </p>
        </motion.div>
    );
}

export default Countdown;
