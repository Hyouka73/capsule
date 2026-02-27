import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';
import './LetterReveal.css';

// Content structure from the "Better" snippet
// Including "Una carta para ti" etc.
const LETTER_BODY = [
    { type: 'greeting', text: 'Mi amor,' },

    { type: 'paragraph', text: 'Sé que la distancia a veces pesa. Hay días en que un mensaje no alcanza, una llamada se queda corta y simplemente extraño tenerte cerca.' },

    { type: 'paragraph', text: 'Llevamos casi 4 años juntos. Y aunque estoy acostumbrado a estar solo, cuando estás conmigo todo cambia. Puedo dormir tranquilo, profundo, sin dar vueltas. Contigo el sueño llega fácil, como si mi cuerpo supiera que está en el lugar correcto.' },

    { type: 'paragraph', text: 'Eso es lo que más extraño: no las cosas grandes o locas, sino lo cotidiano. Dormir a tu lado, despertar y verte ahí, saber que no estoy solo en la cama. Es simple, pero para mí significa mucho.' },

    { type: 'paragraph', text: 'Admiro tu paciencia, cómo me aguantas incluso cuando no soy el más fácil. Y aunque a veces pienso que podrías tener más carácter o ser más "intensa", la verdad es que tu forma tranquila y constante de quererme me ha mantenido aquí todo este tiempo. Me demuestras amor en cosas que nadie más nota, de maneras no convencionales, y eso me llega más hondo que cualquier gesto exagerado.' },

    { type: 'paragraph', text: 'Quiero que sepas que pienso en el día en que esta distancia termine. No sé exactamente cuándo, pero sé que va a pasar. Y cuando llegue, voy a abrazarte fuerte, vamos a dormir juntos todas las noches que queramos, y voy a recordarte cada día lo agradecido que estoy de tenerte.' },

    { type: 'paragraph', text: 'Pronto estos mensajes y llamadas serán solo el comienzo de algo mejor. Vamos a construir más recuerdos, más noches tranquilas, más mañanas sin prisa. Porque aunque ahora estemos lejos, tú sigues siendo mi lugar favorito para descansar.' },

    { type: 'closing', text: 'Te quiero mucho, más de lo que sé decir.\nCon todo mi cariño,' },

    { type: 'signature', text: '-Church' }
];

const LetterReveal = ({ visible, onComplete, onFinished, skipTriggered = false }) => {
    const [isVisible, setIsVisible] = useState(false);

    // Typing state
    const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
    const [currentCharIndex, setCurrentCharIndex] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [isSkipped, setIsSkipped] = useState(false); // Track if user skipped

    const containerRef = useRef(null);
    const shouldReduceMotion = useReducedMotion();

    // Start animation loop
    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => {
                setIsVisible(true);
                if (shouldReduceMotion) {
                    setIsFinished(true);
                } else {
                    setIsTyping(true);
                }
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [visible, shouldReduceMotion]);

    // Typing effect logic
    useEffect(() => {
        if (!isTyping || isFinished || currentBlockIndex >= LETTER_BODY.length) return;

        const currentBlock = LETTER_BODY[currentBlockIndex];

        if (currentCharIndex < currentBlock.text.length) {
            const char = currentBlock.text[currentCharIndex];
            const speed = char === ',' || char === '.' ? 50 : 30 + Math.random() * 20;

            const timer = setTimeout(() => {
                setCurrentCharIndex(prev => prev + 1);
            }, speed);
            return () => clearTimeout(timer);
        } else {
            // Block finished, move to next
            const timer = setTimeout(() => {
                setCurrentBlockIndex(prev => prev + 1);
                setCurrentCharIndex(0);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [isTyping, isFinished, currentBlockIndex, currentCharIndex]);

    // Check completion
    useEffect(() => {
        if (currentBlockIndex >= LETTER_BODY.length && !isFinished) {
            setIsFinished(true);
            setIsTyping(false);
        }
    }, [currentBlockIndex, isFinished]);

    // Auto-scroll logic targeting the .letter-wrapper
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        // Basic scroll to bottom if content expands
        // Checking if isTyping to allow user manual scroll override if they want? 
        // For now, gentle scroll to bottom is good.
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, [currentBlockIndex, currentCharIndex]);

    // Link internal status to parent
    useEffect(() => {
        if (isFinished) {
            onFinished?.(true);
        }
    }, [isFinished, onFinished]);

    // Handle external skip trigger from Teaser.jsx
    useEffect(() => {
        if (skipTriggered && !isFinished) {
            setIsTyping(false);
            setIsFinished(true);
            setIsSkipped(true);
            setCurrentBlockIndex(LETTER_BODY.length);
        }
    }, [skipTriggered, isFinished]);

    // Auto-advance logic: if finished naturally (not skipped), wait 6s and proceed
    useEffect(() => {
        if (isFinished && !isSkipped) {
            const timer = setTimeout(() => {
                onComplete();
            }, 6000); // 6 seconds to read signature
            return () => clearTimeout(timer);
        }
    }, [isFinished, isSkipped, onComplete]);

    // Helper to render text up to current point
    const renderBlockContent = (block, index) => {
        if (isFinished) return block.text;
        if (index > currentBlockIndex) return '';
        if (index < currentBlockIndex) return block.text;

        return block.text.substring(0, currentCharIndex);
    };

    return (
        <div className={`night-sky ${!isVisible ? 'hidden' : ''}`}>
            {/* Stars Layer Removed - Global Background Used */}


            <div className={`letter-container ${isVisible ? 'visible' : ''}`}>
                <div className="letter-wrapper" ref={containerRef}>


                    {/* Countdown would go here, but omitted as per user request */}

                    <div className="content">
                        {LETTER_BODY.map((block, i) => {
                            if (!isFinished && i > currentBlockIndex) return null;

                            const text = renderBlockContent(block, i);
                            const isTypingThis = !isFinished && i === currentBlockIndex;

                            const renderedText = text.split('\n').map((line, lineIdx, arr) => (
                                <span key={lineIdx}>
                                    {line}
                                    {lineIdx < arr.length - 1 && <br />}
                                </span>
                            ));

                            return (
                                <p key={i} className={block.type}>
                                    {renderedText}
                                    {isTypingThis && <span className="typing-cursor">|</span>}
                                </p>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LetterReveal;
