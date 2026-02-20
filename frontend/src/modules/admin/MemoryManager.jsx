import { useState, useEffect } from 'react';
import { getMemories } from '../../apiClient';
import MemoryForm from './MemoryForm';
import Button from '../../components/ui/Button/Button';
import Card from '../../components/ui/Card/Card';
import styles from './MemoryManager.module.css';

export default function MemoryManager() {
    const [memories, setMemories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingMemory, setEditingMemory] = useState(null);

    useEffect(() => {
        loadMemories();
    }, []);

    async function loadMemories() {
        setIsLoading(true);
        try {
            const { docs } = await getMemories({ pageSize: 50 });
            setMemories(docs);
        } catch (err) {
            console.error('Error loading memories:', err);
        } finally {
            setIsLoading(false);
        }
    }

    const handleCreated = () => {
        setShowForm(false);
        setEditingMemory(null);
        loadMemories();
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Recuerdos</h1>
                    <p className={styles.subtitle}>{memories.length} momentos documentados</p>
                </div>
                <Button
                    onClick={() => { setEditingMemory(null); setShowForm(true); }}
                    icon="+"
                >
                    Nuevo recuerdo
                </Button>
            </div>

            {/* Form panel */}
            {showForm && (
                <Card className={styles.formPanel} glass>
                    <div className={styles.formPanelHeader}>
                        <h2>{editingMemory ? 'Editar recuerdo' : 'Nuevo recuerdo'}</h2>
                        <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className={styles.closeBtn}>✕</Button>
                    </div>
                    <MemoryForm
                        initialData={editingMemory}
                        onSuccess={handleCreated}
                        onCancel={() => setShowForm(false)}
                    />
                </Card>
            )}

            {/* Memory grid */}
            {isLoading ? (
                <div className={styles.loading}>Cargando...</div>
            ) : memories.length === 0 ? (
                <div className={styles.empty}>
                    <p className={styles.emptyIcon}>📸</p>
                    <p>Aún no hay recuerdos.</p>
                    <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
                        ¡Crea el primero!
                    </Button>
                </div>
            ) : (
                <div className={styles.grid}>
                    {memories.map(memory => (
                        <MemoryCard
                            key={memory.id}
                            memory={memory}
                            onEdit={() => { setEditingMemory(memory); setShowForm(true); }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function MemoryCard({ memory, onEdit }) {
    const date = memory.eventDate ? new Date(memory.eventDate).toLocaleDateString('es-MX', {
        day: 'numeric', month: 'short', year: 'numeric',
    }) : '—';

    return (
        <Card className={styles.card}>
            {memory.mainPhotoUrl ? (
                <img
                    src={memory.mainPhotoUrl}
                    alt={memory.title ?? 'Recuerdo'}
                    className={styles.cardPhoto}
                />
            ) : (
                <div className={styles.cardPhotoEmpty}>📷</div>
            )}
            <div className={styles.cardInfo}>
                <p className={styles.cardTitle}>{memory.title ?? 'Sin título'}</p>
                <p className={styles.cardMeta}>{date} · {memory.photoCount ?? 0} fotos</p>
                {memory.placeName && <p className={styles.cardPlace}>📍 {memory.placeName}</p>}
                {memory.tags?.length > 0 && (
                    <div className={styles.tags}>
                        {memory.tags.map(tag => (
                            <span key={tag} className={styles.tag}>{tag}</span>
                        ))}
                    </div>
                )}
            </div>
            <Button
                variant="ghost"
                size="sm"
                className={styles.editBtn}
                onClick={onEdit}
                title="Editar"
            >
                ✎
            </Button>
        </Card>
    );
}

