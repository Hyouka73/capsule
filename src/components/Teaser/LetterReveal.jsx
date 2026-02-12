import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import './LetterReveal.css';

const LETTER_CONTENT = [
    'Mi amor,',
    '',
    'Sé que la distancia a veces pesa, que hay días donde un mensaje no alcanza y una llamada se queda corta.',
    '',
    'Pero quiero que sepas algo:',
    'cada momento contigo ha sido un regalo que guardo con todo el corazón.',
    '',
    'Por eso construí este lugar.',
    'Un rincón digital solo para nosotros.',
    'Donde cada recuerdo tiene su espacio,',
    'donde cada foto cuenta una historia,',
    'y donde puedo recordarte — todos los días —',
    'lo mucho que significas para mí.',
    '',
    'Esto es solo el comienzo.',
    'El 4 de abril, nuestro aniversario,',
    'se abrirá algo especial.',
    '',
    'Mientras tanto... mira las estrellas.',
    'Cada una es un momento nuestro. ✨',
    '',
    'Te amo.',
    '— Tu persona favorita',
];

const BOLD_LINES = new Set(['Mi amor,', 'Te amo.', '— Tu persona favorita']);

function LetterReveal({ visible }) {
    const [displayedLines, setDisplayedLines] = useState([]);
    const [currentLine, setCurrentLine] = useState(0);
    const [currentChar, setCurrentChar] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const containerRef = useRef(null);
    const shouldReduceMotion = useReducedMotion();

    // For reduced motion, show everything immediately
    useEffect(() => {
        if (!visible) return;

        if (shouldReduceMotion) {
            setDisplayedLines(LETTER_CONTENT);
            setCurrentLine(LETTER_CONTENT.length);
            return;
        }

        const startDelay = setTimeout(() => setIsTyping(true), 800);
        return () => clearTimeout(startDelay);
    }, [visible, shouldReduceMotion]);

    useEffect(() => {
        if (!isTyping || currentLine >= LETTER_CONTENT.length) {
            if (currentLine >= LETTER_CONTENT.length) {
                setIsTyping(false);
            }
            return;
        }

        const line = LETTER_CONTENT[currentLine];

        // Empty lines appear instantly
        if (line === '') {
            setDisplayedLines(prev => [...prev, '']);
            setCurrentLine(prev => prev + 1);
            setCurrentChar(0);
            return;
        }

        if (currentChar < line.length) {
            const char = line[currentChar];
            const speed = char === ',' || char === '.'
                ? 80
                : char === '—'
                    ? 120
                    : 30 + Math.random() * 25;

            const timer = setTimeout(() => {
                setCurrentChar(prev => prev + 1);
            }, speed);
            return () => clearTimeout(timer);
        }

        // Line complete
        setDisplayedLines(prev => [...prev, line]);
        setCurrentLine(prev => prev + 1);
        setCurrentChar(0);
    }, [isTyping, currentLine, currentChar]);

    // Auto-scroll when new lines appear
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, [displayedLines]);

    const typingText = useMemo(() => {
        if (currentLine >= LETTER_CONTENT.length) return '';
        return LETTER_CONTENT[currentLine]?.substring(0, currentChar) || '';
    }, [currentLine, currentChar]);

    if (!visible) return null;

    const isBoldLine = currentLine < LETTER_CONTENT.length && BOLD_LINES.has(LETTER_CONTENT[currentLine]);

    return (
        <motion.div
            className="letter-reveal"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            role="article"
            aria-label="Carta de amor"
        >
            <div className="letter-header">
                <div className="letter-seal" aria-hidden="true">
                    <span className="seal-heart">♥</span>
                </div>
                <h2 className="letter-title">Una carta para ti</h2>
                <time className="letter-date" dateTime="2026-02-14">14 de febrero, 2026</time>
            </div>

            <div className="letter-body" ref={containerRef}>
                <div className="letter-paper">
                    {displayedLines.map((line, i) => (
                        <p key={i} className={`letter-line ${line === '' ? 'letter-line--empty' : ''}`}>
                            {BOLD_LINES.has(line) ? <strong>{line}</strong> : line}
                        </p>
                    ))}
                    {isTyping && currentLine < LETTER_CONTENT.length && (
                        <p className="letter-line letter-line--typing" aria-live="off">
                            {isBoldLine ? <strong>{typingText}</strong> : typingText}
                            <span className="typing-cursor" aria-hidden="true">|</span>
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default LetterReveal;
