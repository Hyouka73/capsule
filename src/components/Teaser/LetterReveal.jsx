import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
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

function LetterReveal({ visible }) {
    const [displayedLines, setDisplayedLines] = useState([]);
    const [currentLine, setCurrentLine] = useState(0);
    const [currentChar, setCurrentChar] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!visible) return;

        // Start typing after a brief delay
        const startDelay = setTimeout(() => setIsTyping(true), 800);
        return () => clearTimeout(startDelay);
    }, [visible]);

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
            const speed = line[currentChar] === ',' || line[currentChar] === '.'
                ? 80
                : line[currentChar] === '—'
                    ? 120
                    : 30 + Math.random() * 25;

            const timer = setTimeout(() => {
                setCurrentChar(prev => prev + 1);
            }, speed);
            return () => clearTimeout(timer);
        } else {
            // Line complete
            setDisplayedLines(prev => [...prev, line]);
            setCurrentLine(prev => prev + 1);
            setCurrentChar(0);

            // Auto-scroll
            if (containerRef.current) {
                setTimeout(() => {
                    containerRef.current?.scrollTo({
                        top: containerRef.current.scrollHeight,
                        behavior: 'smooth',
                    });
                }, 50);
            }
        }
    }, [isTyping, currentLine, currentChar]);

    const scrollToBottom = useCallback(() => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [displayedLines, scrollToBottom]);

    if (!visible) return null;

    const currentTypingLine = LETTER_CONTENT[currentLine];
    const typingText = currentTypingLine?.substring(0, currentChar) || '';

    return (
        <motion.div
            className="letter-reveal"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="letter-header">
                <div className="letter-seal">
                    <span className="seal-heart">♥</span>
                </div>
                <h2 className="letter-title">Una carta para ti</h2>
                <div className="letter-date">14 de febrero, 2026</div>
            </div>

            <div className="letter-body" ref={containerRef}>
                <div className="letter-paper">
                    {displayedLines.map((line, i) => (
                        <p key={i} className={`letter-line ${line === '' ? 'letter-line--empty' : ''}`}>
                            {line === 'Mi amor,' || line === 'Te amo.' || line === '— Tu persona favorita'
                                ? <strong>{line}</strong>
                                : line}
                        </p>
                    ))}
                    {isTyping && currentLine < LETTER_CONTENT.length && (
                        <p className="letter-line letter-line--typing">
                            {LETTER_CONTENT[currentLine] === 'Mi amor,' ||
                                LETTER_CONTENT[currentLine] === 'Te amo.' ||
                                LETTER_CONTENT[currentLine] === '— Tu persona favorita'
                                ? <strong>{typingText}</strong>
                                : typingText}
                            <span className="typing-cursor">|</span>
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default LetterReveal;
