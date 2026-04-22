import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './FelizCumpleanos.module.css';

const ALL_PHOTOS = Array.from({ length: 21 }).map(
    (_, i) => `/photos/teaser/photo-${String(i + 1).padStart(2, '0')}.jpeg`
);

const CAPTIONS_POOL = [
    "Me encanta la forma tan tuya de hacerme sonreír...",
    "Cuando me abrazas y de repente todo está bien...",
    "Nuestras escapadas y aventuras favoritas...",
    "Tus ojitos cuando me cuentas algo que te emociona...",
    "Canjear nuestros cupones y hacer un día cualquiera, especial...",
    "Ese rinconcito en tus brazos que se siente como llegar a casa...",
    "Cantar a todo pulmón en el carro juntos...",
    "La paz que me da saber que te tengo a mi lado...",
    "Amo la química tan linda que tenemos...",
    "Cualquier momento es perfecto si vas tú...",
    "Coleccionando recuerdos que no cambiaría por nada...",
    "Cada detallito tuyo me enamora un poco más..."
];


const PetalsOverlay = () => {
    // Generate petals only once
    const petals = useMemo(() => Array.from({ length: 35 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}vw`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${5 + Math.random() * 5}s`,
        size: 0.6 + Math.random() * 0.6,
    })), []);

    return (
        <div className={styles.petalsContainer}>
            {petals.map(p => (
                <div 
                    key={p.id} 
                    className={styles.petal} 
                    style={{ 
                        left: p.left, 
                        animationDelay: p.animationDelay,
                        animationDuration: p.animationDuration,
                        transform: `scale(${p.size})`
                    }} 
                >
                    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <path d="M50,10 C60,40 90,40 90,60 C90,80 70,90 50,90 C30,90 10,80 10,60 C10,40 40,40 50,10 Z" fill="url(#petalGrad)"/>
                        <defs>
                            <radialGradient id="petalGrad" cx="30%" cy="30%" r="70%">
                                <stop offset="0%" stopColor="#fff0f5"/>
                                <stop offset="100%" stopColor="#ffb6c1"/>
                            </radialGradient>
                        </defs>
                    </svg>
                </div>
            ))}
        </div>
    );
};

export default function FelizCumpleanos({ event, onClose }) {
    const [phase, setPhase] = useState('countdown'); // countdown -> slideshow -> climax -> climax2 -> letter -> final
    const [countdownValue, setCountdownValue] = useState(3);
    const [photoIndex, setPhotoIndex] = useState(0);
    const [selectedPhotos, setSelectedPhotos] = useState([]);
    const [selectedCaptions, setSelectedCaptions] = useState([]);
    
    // Typewriter effect state
    const [displayedText, setDisplayedText] = useState("");
    const fullLetter = `Feliz cumpleaños, mi niña hermosa.\n\nHoy celebro tu vida, tu sonrisa y cada instante a tu lado.\nDesde nuestro primer día juntos, eres mi lugar favorito en el mundo.\n\nGracias por existir y por hacerme tan feliz.\nTe amo muchísimo, para siempre.`;

    const audioRef = useRef(null);

    const climaxPositions = [
        { top: '5%', left: '5%', rotate: -12 },
        { top: '10%', left: '45%', rotate: 8 },
        { top: '50%', left: '5%', rotate: -6 },
        { top: '55%', left: '45%', rotate: 15 },
        { top: '30%', left: '25%', rotate: 3 },
    ];

    const finalPositions = [
        { top: '0%', left: '5%', rotate: -15 },
        { top: '5%', left: '55%', rotate: 10 },
        { top: '40%', left: '10%', rotate: -5 },
        { top: '45%', left: '50%', rotate: 12 },
        { top: '20%', left: '25%', rotate: 2 },
    ];

    useEffect(() => {
        // Randomly pick 6 photos and 6 captions on mount
        const shuffledPhotos = [...ALL_PHOTOS].sort(() => 0.5 - Math.random());
        setSelectedPhotos(shuffledPhotos.slice(0, 6));

        const shuffledCaptions = [...CAPTIONS_POOL].sort(() => 0.5 - Math.random());
        setSelectedCaptions(shuffledCaptions.slice(0, 6));
    }, []);

    useEffect(() => {
        let t1;
        if (phase === 'countdown') {
            if (countdownValue > 1) {
                t1 = setTimeout(() => setCountdownValue(v => v - 1), 1000);
            } else {
                t1 = setTimeout(() => setPhase('slideshow'), 1000); // Skip intro, go to slideshow
            }
        } else if (phase === 'slideshow' && selectedPhotos.length > 0) {
            if (photoIndex < selectedPhotos.length - 1) {
                t1 = setTimeout(() => setPhotoIndex(p => p + 1), 3000); // 3.0s per photo to give time to read
            } else {
                t1 = setTimeout(() => setPhase('climax'), 3000);
            }
        } else if (phase === 'climax') {
            t1 = setTimeout(() => setPhase('climax2'), 3500); // "Y de todos los momentos..." -> "...mi favorito eres tú"
        } else if (phase === 'climax2') {
            t1 = setTimeout(() => setPhase('letter'), 4000); // Wait 4s before transitioning to the letter
        }

        return () => {
            if (t1) clearTimeout(t1);
        };
    }, [phase, countdownValue, photoIndex, selectedPhotos.length]);

    // Typewriter effect logic
    useEffect(() => {
        if (phase === 'letter') {
            let currentIndex = 0;
            const interval = setInterval(() => {
                if (currentIndex <= fullLetter.length) {
                    setDisplayedText(fullLetter.slice(0, currentIndex));
                    currentIndex++;
                } else {
                    clearInterval(interval);
                    // Move to final screen after reading time
                    setTimeout(() => setPhase('final'), 6000);
                }
            }, 75); // Speed of typing

            return () => clearInterval(interval);
        }
    }, [phase, fullLetter]);

    // Calculate dynamic rotation for polaroids so they look natural
    const getRotation = (index) => {
        const angles = [-5, 4, -3, 6, -6, 2];
        return angles[index % angles.length];
    };

    return (
        <div className={`${styles.container} ${phase === 'final' ? styles.containerFinal : ''}`}>
            
            <audio ref={audioRef} autoPlay loop src="/audio/nuestra-cancion.mp3" />

            {/* Cinematic overlays (Grain, Vignette, Flicker) */}
            {phase !== 'final' && (
                <>
                    <div className={styles.grainOverlay} />
                    <div className={styles.vignetteOverlay} />
                    <div className={styles.flickerOverlay} />
                    <div className={styles.scratch1} />
                    <div className={styles.scratch2} />
                </>
            )}

            <AnimatePresence mode="wait">
                {/* PHASE: COUNTDOWN */}
                {phase === 'countdown' && (
                    <motion.div 
                        key="countdown"
                        className={styles.countdownScreen}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className={styles.countdownCircle}>
                            <motion.span 
                                key={countdownValue}
                                className={styles.countdownText}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.5 }}
                                transition={{ duration: 0.8 }}
                            >
                                {countdownValue}
                            </motion.span>
                        </div>
                    </motion.div>
                )}

                {/* PHASE: SLIDESHOW */}
                {phase === 'slideshow' && selectedPhotos.length > 0 && (
                    <div key="slideshow" className={styles.slideshowScreen}>
                        <AnimatePresence>
                            <motion.div
                                key={photoIndex}
                                className={styles.polaroid}
                                initial={{ opacity: 0, scale: 0.8, y: 50, rotate: 0 }}
                                animate={{ opacity: 1, scale: 1, y: 0, rotate: getRotation(photoIndex) }}
                                exit={{ opacity: 0, scale: 1.1, filter: 'blur(5px)' }}
                                transition={{ duration: 0.8, ease: "easeInOut" }}
                            >
                                <img src={selectedPhotos[photoIndex]} alt="Memory" className={styles.photo} />
                            </motion.div>
                        </AnimatePresence>
                        
                        <AnimatePresence mode="wait">
                            <motion.p 
                                key={`caption-${photoIndex}`}
                                className={styles.caption}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                            >
                                {selectedCaptions[photoIndex]}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                )}

                {/* PHASE: CLIMAX */}
                {(phase === 'climax' || phase === 'climax2') && selectedPhotos.length > 0 && (
                    <motion.div 
                        key="climax"
                        className={styles.climaxScreen}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                    >
                        <div className={styles.collageContainer}>
                            {selectedPhotos.slice(0, 5).map((photo, i) => (
                                <motion.div
                                    key={`climax-${i}`}
                                    className={styles.collagePhoto}
                                    style={{ top: climaxPositions[i].top, left: climaxPositions[i].left, zIndex: i }}
                                    initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
                                    animate={{ opacity: 1, scale: 1, rotate: climaxPositions[i].rotate }}
                                    transition={{ duration: 1.5, delay: i * 0.3, ease: "easeOut" }}
                                >
                                    <img src={photo} alt="Memory" className={styles.collageImg} />
                                </motion.div>
                            ))}
                        </div>

                        <div className={styles.climaxOverlay}>
                            <AnimatePresence mode="wait">
                                {phase === 'climax' && (
                                    <motion.h2
                                        key="text1"
                                        className={styles.climaxText}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 1 }}
                                    >
                                        Pero de todos estos instantes y recuerdos inolvidables...
                                    </motion.h2>
                                )}
                                {phase === 'climax2' && (
                                    <motion.h2
                                        key="text2"
                                        className={styles.climaxText}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 1 }}
                                    >
                                        ...mi momento favorito eres tú
                                    </motion.h2>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}

                {/* PHASE: LETTER */}
                {phase === 'letter' && (
                    <motion.div
                        key="letter"
                        className={styles.letterScreen}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                    >
                        <p className={styles.letterText}>
                            {displayedText}
                            <span className={styles.typingCursor}>|</span>
                        </p>
                    </motion.div>
                )}

                {/* PHASE: FINAL */}
                {phase === 'final' && (
                    <motion.div 
                        key="final"
                        className={styles.finalScreen}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.5 }}
                    >
                        <div className={styles.ambientLight1} />
                        <div className={styles.ambientLight2} />
                        
                        <PetalsOverlay />

                        <div className={styles.finalCollageContainer}>
                            {selectedPhotos.slice(0, 5).map((photo, i) => (
                                <motion.div 
                                    key={`final-${i}`}
                                    className={styles.finalCollagePhoto}
                                    style={{ top: finalPositions[i].top, left: finalPositions[i].left, zIndex: i }}
                                    initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                                    animate={{ opacity: 1, scale: 1, rotate: finalPositions[i].rotate }}
                                    transition={{ type: 'spring', delay: 1 + i * 0.15, stiffness: 120 }}
                                >
                                    <img src={photo} alt="Memory" className={styles.finalCollageImg} />
                                </motion.div>
                            ))}
                        </div>

                        <div className={styles.finalTitleContainer}>
                            <motion.div 
                                className={styles.daysCounter}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.5, duration: 1 }}
                            >
                                847 días a tu lado
                            </motion.div>
                            <motion.h1 
                                className={styles.finalTitle}
                                initial={{ scale: 0.8, opacity: 0, y: -20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.5 }}
                            >
                                <div className={styles.beatingHeart}>❤️</div>
                                Feliz Cumpleaños
                            </motion.h1>
                        </div>

                        <motion.button
                            className={styles.actionBtn}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 2.5 }}
                            onClick={onClose}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Te amo ❤️
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
