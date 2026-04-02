import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button/Button';
import LoadingScreen from '../../components/ui/LoadingScreen/LoadingScreen';
import styles from './WelcomeScreen.module.css';

export default function WelcomeScreen() {
    const { user, role, completeWelcome } = useAuth();
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleContinue = async () => {
        if (!name.trim()) {
            setError('Por favor, dinos cómo te llamas ✨');
            return;
        }

        setIsSaving(true);
        try {
            if (completeWelcome) {
                await completeWelcome(name.trim());
            }
            
            setTimeout(() => {
                if (navigate) navigate('/app');
            }, 100);
        } catch (error) {
            console.error("Error updating welcome status:", error);
            setIsSaving(false);
        }
    };

    const isPartner = role === 'partner';

    return (
        <div className={styles.welcomeContainer}>
            <AnimatePresence mode="wait">
                {isSaving ? (
                    <motion.div
                        key="saving"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={styles.savingOverlay}
                    >
                        <LoadingScreen message="Preparando tu espacio..." />
                    </motion.div>
                ) : (
                    <motion.div
                        key="content"
                        className={styles.welcomeCard}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.8, type: 'spring' }}
                    >
                        <h1 className={styles.welcomeTitle}>
                            {isPartner ? '¡Bienvenida, mi amora! 💖' : '¡Bienvenido al inicio! ✨'}
                        </h1>
                        
                        <p className={styles.welcomeText}>
                            {isPartner 
                                ? 'Aquí el tiempo se detiene y solo existimos nosotros. Para empezar este viaje, ¿cómo debería llamarte nuestro pequeño universo?'
                                : 'Estás a punto de crear un espacio único para tu historia. Antes de entrar, ¿cuál es tu nombre?'}
                        </p>

                        <div className={styles.inputSection}>
                            <input 
                                type="text"
                                className={`${styles.nameInput} ${error ? styles.inputError : ''}`}
                                placeholder="Escribe tu nombre aquí..."
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (error) setError('');
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                                autoFocus
                            />
                            {error && <p className={styles.errorMessage}>{error}</p>}
                        </div>

                        <div className={styles.actions}>
                            <Button 
                                variant="primary" 
                                size="lg" 
                                onClick={handleContinue}
                                className={styles.continueBtn}
                                disabled={!name.trim()}
                            >
                                Abrir nuestro mundo →
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
