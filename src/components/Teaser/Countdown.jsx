import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './Countdown.css';

function getTimeUntil(targetDate) {
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
    };
}

function FlipUnit({ value, label }) {
    const [prevValue, setPrevValue] = useState(value);
    const [isFlipping, setIsFlipping] = useState(false);

    useEffect(() => {
        if (value !== prevValue) {
            setIsFlipping(true);
            const timer = setTimeout(() => {
                setPrevValue(value);
                setIsFlipping(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [value, prevValue]);

    const display = String(value).padStart(2, '0');

    return (
        <div className="flip-unit">
            <div className={`flip-card ${isFlipping ? 'flipping' : ''}`}>
                <span className="flip-value">{display}</span>
            </div>
            <span className="flip-label">{label}</span>
        </div>
    );
}

// April 4, 2026, 00:00:00 CST (UTC-6)
const TARGET_DATE = new Date('2026-04-04T00:00:00-06:00');

function Countdown({ visible }) {
    const [time, setTime] = useState(getTimeUntil(TARGET_DATE));

    useEffect(() => {
        if (!visible) return;

        const interval = setInterval(() => {
            setTime(getTimeUntil(TARGET_DATE));
        }, 1000);

        return () => clearInterval(interval);
    }, [visible]);

    if (!visible) return null;

    return (
        <motion.div
            className="countdown-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        >
            <p className="countdown-teaser">Algo especial está en camino...</p>

            <div className="countdown-grid">
                <FlipUnit value={time.days} label="días" />
                <span className="countdown-separator">:</span>
                <FlipUnit value={time.hours} label="horas" />
                <span className="countdown-separator">:</span>
                <FlipUnit value={time.minutes} label="min" />
                <span className="countdown-separator">:</span>
                <FlipUnit value={time.seconds} label="seg" />
            </div>

            <p className="countdown-date">4 de abril, 2026</p>
        </motion.div>
    );
}

export default Countdown;
