import React from 'react';
import ConfirmModal from '../../../components/ui/ConfirmModal/ConfirmModal';

export default function DraftRecoveryPrompt({ foundDraft, onResume, onDiscard }) {
    return (
        <ConfirmModal 
            isOpen={!!foundDraft}
            emoji="✨"
            title="¡Cita a medias!"
            message="Encontramos una cita que no terminaste. ¿Quieres continuar donde te quedaste?"
            confirmText="Continuar ✨"
            cancelText="Empezar de cero"
            onConfirm={onResume}
            onCancel={onDiscard}
        />
    );
}
