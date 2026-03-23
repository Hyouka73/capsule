import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { COLLECTIONS } from '../../config/constants';
import Button from '../../components/ui/Button/Button';
import LoadingScreen from '../../components/ui/LoadingScreen/LoadingScreen';
import styles from './WelcomeScreen.module.css';

export default function WelcomeScreen() {
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();

    const handleContinue = async () => {
        setIsSaving(true);
        try {
            const userRef = doc(db, COLLECTIONS.USERS, user.uid);
            await updateDoc(userRef, { welcomeSeen: true });
            navigate('/app');
        } catch (error) {
            console.error('Error updating welcomeSeen:', error);
            setIsSaving(false);
        }
    };

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
                            ¡Bienvenida, {user?.displayName || 'amor'}! 💖
                        </h1>
                        <p className={styles.welcomeText}>
                            Este rincón digital fue creado pieza por pieza con todo el amor del mundo.
                            Aquí guardaremos nuestros mejores momentos, jugaremos y recordaremos por qué
                            somos el mejor equipo.
                        </p>
                        <div className={styles.actions}>
                            <Button 
                                variant="primary" 
                                size="lg" 
                                onClick={handleContinue}
                                className={styles.continueBtn}
                            >
                                Abrir mi Capsule →
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
