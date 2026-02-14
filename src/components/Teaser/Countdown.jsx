import { useState, useEffect, useRef, useMemo } from 'react';
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

// April 4, 2026, 00:00:00 CST (UTC-6) by default
const DEFAULT_TARGET = new Date('2026-04-04T00:00:00-06:00');

const FlipUnit = ({ value, label }) => {
    // Helper para formato 00
    const fmt = (v) => String(v).padStart(2, '0');

    // Valor actual (Animado)
    const [current, setCurrent] = useState(fmt(value));
    // Valor previo (Estático)
    const [previous, setPrevious] = useState(fmt(value));

    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        const valStr = fmt(value);
        if (valStr !== current) {
            // 1. Guardamos el valor que se va a ir en 'previous'
            setPrevious(current);
            // 2. Actualizamos el valor nuevo en 'current'
            setCurrent(valStr);
            // 3. Disparamos la animación
            setAnimate(true);

            const timer = setTimeout(() => {
                setAnimate(false);
                // Al terminar la animación, 'previous' se iguala a 'current' 
                // para preparar el siguiente ciclo, aunque visualmente ya no importa
                setPrevious(valStr);
            }, 600); // Mismo tiempo que el CSS

            return () => clearTimeout(timer);
        }
    }, [value]);

    return (
        <div className="flip-unit">
            <div className={`flip-card ${animate ? 'flipping' : ''}`}>

                {/* 1. TOP ESTÁTICO (Fondo): Muestra el NUEVO valor */}
                {/* Cuando la carta caiga, revelará este número */}
                <div className="card-face card-top">
                    {current}
                </div>

                {/* 2. BOTTOM ESTÁTICO (Fondo): Muestra el VIEJO valor */}
                {/* Cuando la carta caiga, tapará este número */}
                <div className="card-face card-bottom">
                    {previous}
                </div>

                {/* 3. PIEZA QUE GIRA */}
                <div className="card-flip">
                    {/* Frente: Parte de ARRIBA del número VIEJO */}
                    <div className="card-face card-top face-front">
                        {previous}
                    </div>

                    {/* Reverso: Parte de ABAJO del número NUEVO */}
                    <div className="card-face card-bottom face-back">
                        {current}
                    </div>
                </div>

            </div>
            <span className="flip-label">{label}</span>
        </div>
    );
};

function Countdown({ visible, targetDate, onComplete, title = "Algo especial está en camino…" }) {
    // Fix: Memoize the Date object to prevent it from being a new reference on every render,
    // which causes the useEffect below to trigger an infinite loop.
    const finalDate = useMemo(() => targetDate ? new Date(targetDate) : DEFAULT_TARGET, [targetDate]);

    const [time, setTime] = useState(() => getTimeUntil(finalDate));
    const shouldReduceMotion = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    useEffect(() => {
        if (!visible) return;

        // Check immediately
        const initial = getTimeUntil(finalDate);
        setTime(initial);

        // If already passed, trigger complete and stop.
        if (initial.days <= 0 && initial.hours <= 0 && initial.minutes <= 0 && initial.seconds <= 0) {
            onComplete?.();
            return;
        }

        const interval = setInterval(() => {
            const t = getTimeUntil(finalDate);
            setTime(t);
            if (t.days <= 0 && t.hours <= 0 && t.minutes <= 0 && t.seconds <= 0) {
                clearInterval(interval);
                onComplete?.();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [visible, finalDate]); // Removed onComplete from dependency to avoid loop if parent recreates it without useCallback

    if (!visible) return null;

    const ariaLabel = `Faltan ${time.days} días, ${time.hours} horas, ${time.minutes} minutos y ${time.seconds} segundos`;
    const dateString = finalDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <motion.div
            className="countdown-section"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            role="timer"
            aria-label={ariaLabel}
        >
            <p className="countdown-teaser">{title}</p>

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
                <time dateTime={finalDate.toISOString()}>{dateString}</time>
            </p>
        </motion.div>
    );
}

export default Countdown;