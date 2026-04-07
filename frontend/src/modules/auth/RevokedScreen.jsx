import { motion } from 'framer-motion';
import { Lock, Mail, RefreshCw } from 'lucide-react';
import Button from '../../components/ui/Button/Button';
import { useAuth } from '../../hooks/useAuth';
import styles from './RevokedScreen.module.css';

/**
 * RevokedScreen — Premium blocking screen for revoked access.
 */
export default function RevokedScreen() {
    const { signOut, isPartner } = useAuth();

    const handleContactAdmin = () => {
        window.location.href = 'mailto:admin@capsule.app?subject=Acceso Revocado';
    };

    const handleReload = () => {
        window.location.reload();
    };

    return (
        <div className={styles.root}>
            {/* Background elements (Subtle glows) */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-rose-500/05 blur-[100px] rounded-full" />
            
            <motion.div 
                className={styles.card}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 20 }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent pointer-events-none rounded-[inherit]" />

                <div className="relative z-10 flex flex-col items-center">
                    <motion.div 
                        initial={{ y: -20 }}
                        animate={{ y: 0 }}
                        className="w-20 h-20 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20"
                    >
                        <Lock className="w-10 h-10 text-rose-500" />
                    </motion.div>

                    <h1 className="text-3xl font-bold text-zinc-800 mb-4 tracking-tight">
                        Acceso Revocado
                    </h1>
                    
                    <p className="text-zinc-500 mb-8 leading-relaxed max-w-sm">
                        Tu acceso a <span className="text-rose-400 font-medium italic">Capsule</span> ha sido desactivado por el administrador. 
                        No podrás acceder a los recuerdos compartidos por el momento.
                    </p>

                    <div className="w-full space-y-4">
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={handleContactAdmin}
                            className="flex items-center justify-center gap-2"
                        >
                            <Mail className="w-5 h-5" />
                            Contactar Administrador
                        </Button>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="secondary"
                                onClick={handleReload}
                                className="flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reintentar
                            </Button>

                            <button
                                onClick={signOut}
                                className="text-sm text-zinc-400 hover:text-rose-500 transition-colors font-medium"
                            >
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>

                    <p className="mt-8 text-[10px] text-zinc-400 uppercase tracking-widest opacity-50">
                        Relationship Security & Isolation
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
