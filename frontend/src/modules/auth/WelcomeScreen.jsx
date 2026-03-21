import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useAppConfig } from '../../context/AppConfigContext';
import { COLLECTIONS } from '../../config/constants';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import Button from '../../components/ui/Button/Button';
import styles from './WelcomeScreen.module.css';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.5
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
};

export default function WelcomeScreen() {
    const { user } = useAuth();
    const { partner } = useAppConfig();
    const navigate = useNavigate();
    const [isUpdating, setIsUpdating] = useState(false);

    const handleEnterApp = async () => {
        if (!user) return;
        
        setIsUpdating(true);
        try {
            const userRef = doc(db, COLLECTIONS.USERS, user.uid);
            await updateDoc(userRef, {
                welcomeSeen: true
            });
            navigate('/app');
        } catch (err) {
            console.error('Error updating welcomeSeen:', err);
            toast.error('¡Ups!', 'No pudimos guardar tu progreso. Inténtalo de nuevo.');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <motion.div 
            className={styles.root}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className={styles.content}>
                <motion.div variants={itemVariants} className={styles.emojiWrapper}>
                    <span className={styles.mainEmoji}>✨</span>
                </motion.div>

                <motion.h1 variants={itemVariants} className={styles.title}>
                    Hola, {user?.displayName || 'amor'}
                </motion.h1>

                <motion.div variants={itemVariants} className={styles.messageCard}>
                    <p className={styles.message}>
                        {partner?.welcomeMessage || '¡Bienvenida a nuestro espacio! 💖'}
                    </p>
                </motion.div>

                <motion.div variants={itemVariants} className={styles.actions}>
                    <Button 
                        variant="primary" 
                        size="lg" 
                        onClick={handleEnterApp} 
                        disabled={isUpdating}
                        className={styles.enterBtn}
                    >
                        {isUpdating ? 'Abriendo...' : 'Abrir mi Capsule →'}
                    </Button>
                </motion.div>
            </div>
        </motion.div>
    );
}
