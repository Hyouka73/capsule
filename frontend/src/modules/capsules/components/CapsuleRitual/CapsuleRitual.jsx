import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CapsuleRitual.module.css';
import { EnvelopeBack, EnvelopeFront, EnvelopeFlap } from './Envelope';
import WaxSeal from './WaxSeal';

import LetterReveal from './LetterReveal';
import PolaroidReveal from './PolaroidReveal';
import FilmStripReveal from './FilmStripReveal';
import TicketReveal from './TicketReveal';

/**
 * CapsuleRitual v14.0 — CLEAN SINGLE-PHASE.
 * El contenido NUNCA está dentro del DOM del sobre.
 * Siempre vive en el overlay (fixed), animando desde abajo hacia el centro.
 * Sin layoutId en el contenido — evita conflictos con CSS transforms.
 */
export default function CapsuleRitual({ capsule, onClose, layoutId }) {
    const [step, setStep] = useState('sealed');

    const handleBreak = () => setStep('opening_flap');
    const handleFlapComplete = () => setStep('emerging_letter');

    // Dispara cuando el vuelo hacia arriba termina → despliega la carta
    const handleRevealComplete = () => {
        if (step === 'emerging_letter') {
            setStep('unfolded');
        }
    };

    const getContent = () => {
        const { message, files, links } = capsule;

        if (links?.length > 0) {
            return <TicketReveal link={links[0]} />;
        }

        if (files?.length > 0) {
            const hasVideo = files.some(f =>
                f.mimeType?.includes('video') ||
                /\.(mp4|mov|webm)$/i.test(f.fileName || '')
            );
            return (files.length === 1 && !hasVideo)
                ? <PolaroidReveal file={files[0]} caption={message} />
                : <FilmStripReveal files={files} caption={message} />;
        }

        return (
            <LetterReveal
                content={message}
                title={capsule.title}
                isUnfolded={step === 'unfolded'}
            />
        );
    };

    const isContentVisible = step === 'emerging_letter' || step === 'unfolded';

    return (
        <div
            className={styles.ritualOverlay}
            onClick={(e) => step === 'unfolded' && e.target === e.currentTarget && onClose?.()}
        >
            {/* EL SOBRE — Sin ningún contenido dentro */}
            <motion.div
                layoutId={layoutId}
                className={styles.ritualContainer}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
            >
                <div className={styles.envelopeWithSeal}>

                    <EnvelopeBack layoutId={`back-${layoutId}`} />
                    <EnvelopeFront layoutId={`front-${layoutId}`} />

                    <EnvelopeFlap
                        isOpen={step !== 'sealed'}
                        onFlapComplete={handleFlapComplete}
                        layoutId={`flap-${layoutId}`}
                    />

                    {/* Máscara inferior */}
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '-50%',
                        right: '-50%',
                        height: '500px',
                        background: 'var(--bg-overlay-black)',
                        zIndex: 4
                    }} />

                    <AnimatePresence>
                        {step === 'sealed' && (
                            <motion.div
                                exit={{ scale: 1.5, opacity: 0, filter: 'blur(10px)' }}
                                className={styles.sealPositioner}
                                style={{ zIndex: 100 }}
                            >
                                <WaxSeal onBreak={handleBreak} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/*
                EL CONTENIDO — Siempre en el overlay (fixed), NUNCA dentro del sobre.
                Empieza 220px ABAJO del centro (donde está el sobre) y sube al centro.
                No usa layoutId para evitar que Framer Motion sobrescriba el centrado CSS.
            */}
            <AnimatePresence>
                {isContentVisible && (
                    <motion.div
                        className={styles.contentStage}
                        style={{ pointerEvents: step === 'unfolded' ? 'auto' : 'none' }}
                        initial={{ y: 220, opacity: 0, scale: 0.88 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -40, opacity: 0, scale: 0.95 }}
                        transition={{
                            y: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
                            opacity: { duration: 0.35 },
                            scale: { duration: 0.85, ease: [0.22, 1, 0.36, 1] }
                        }}
                        onAnimationComplete={handleRevealComplete}
                    >
                        {getContent()}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {step === 'unfolded' && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={styles.closeBtn}
                        onClick={onClose}
                    >
                        Cerrar Cápsula
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}