import React from 'react';
import PhotoUploader from '../PhotoUploader';
import Button from '../../../components/ui/Button/Button';
import styles from '../MemoryForm.module.css';

export default function MemoryPhotoSection({
    isPartner,
    isEditing,
    memoryId,
    draftPhotos,
    onPhotosChange,
    onDone,
    onMetadataDetected,
    onFinalSave,
    step
}) {
    return (
        <div className={styles.photoSection}>
            {!isPartner && <div className={styles.sectionLabel}>📸 Fotos del momento</div>}
            <PhotoUploader
                memoryId={memoryId}
                initialFiles={draftPhotos}
                onPhotosChange={onPhotosChange}
                onDone={onDone}
                onMetadataDetected={onMetadataDetected}
            />
            {step === 'unified' && (
                <div className={styles.unifiedActions}>
                    <Button onClick={onFinalSave}>Finalizar y Guardar Recuerdo ✨</Button>
                </div>
            )}
        </div>
    );
}
