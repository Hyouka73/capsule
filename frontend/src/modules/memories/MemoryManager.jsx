import { useState, useMemo, useEffect } from 'react';
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

    // Toolbar states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, public, hidden
    const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, title

    useEffect(() => {
        loadMemories();
    }, []);

    async function loadMemories() {
        setIsLoading(true);
        try {
            const { docs } = await getMemories({ pageSize: 50 });
            setMemories(docs ?? []);
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

    // Filter and Sort Logic
    const filteredMemories = useMemo(() => {
        let result = memories;

        // Search text
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(m =>
                m.title?.toLowerCase().includes(q) ||
                m.placeName?.toLowerCase().includes(q) ||
                m.tags?.some(t => t.toLowerCase().includes(q))
            );
        }

        // Status filter
        if (filterStatus === 'public') result = result.filter(m => !m.isHidden);
        if (filterStatus === 'hidden') result = result.filter(m => m.isHidden);

        // Sort
        result = [...result].sort((a, b) => {
            const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
            const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;

            if (sortBy === 'date_desc') return dateB - dateA;
            if (sortBy === 'date_asc') return dateA - dateB;
            if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
            return 0;
        });

        return result;
    }, [memories, searchQuery, filterStatus, sortBy]);

    // Mock actions
    const handleToggleVisibility = (id) => {
        setMemories(prev => prev.map(m => m.id === id ? { ...m, isHidden: !m.isHidden } : m));
    };

    const handleDelete = (id) => {
        if (confirm('¿Seguro que quieres eliminar este recuerdo? (UI mock)')) {
            setMemories(prev => prev.filter(m => m.id !== id));
        }
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
                    className={styles.newBtn}
                >
                    <span className={styles.btnIcon}>✨</span> Nuevo recuerdo
                </Button>
            </div>

            {/* ── Toolbar ── */}
            {!isLoading && memories.length > 0 && !showForm && (
                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <span className={styles.searchIcon}>🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar por título, lugar o tag..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <div className={styles.filters}>
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className={styles.select}
                        >
                            <option value="all">Todos los estados</option>
                            <option value="public">Públicos 👁️</option>
                            <option value="hidden">Ocultos 🙈</option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            className={styles.select}
                        >
                            <option value="date_desc">Más recientes primero</option>
                            <option value="date_asc">Más antiguos primero</option>
                            <option value="title">Alfabético</option>
                        </select>
                    </div>
                </div>
            )}

            {/* ── Form panel ── */}
            {showForm && (
                <Card className={styles.formPanel} glass>
                    <div className={styles.formPanelHeader}>
                        <h2>{editingMemory ? '✍️ Editar recuerdo' : '✨ Nuevo recuerdo'}</h2>
                        <button onClick={() => setShowForm(false)} className={styles.closeBtn} title="Cerrar">✕</button>
                    </div>
                    <MemoryForm
                        initialData={editingMemory}
                        onSuccess={handleCreated}
                        onCancel={() => setShowForm(false)}
                    />
                </Card>
            )}

            {/* ── Memory grid ── */}
            {isLoading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Cargando recuerdos...</p>
                </div>
            ) : memories.length === 0 ? (
                <div className={styles.empty}>
                    <div className={styles.emptyIllustration}>📸</div>
                    <h3>Aún no hay recuerdos</h3>
                    <p>Sube fotos y documenta sus mejores momentos juntos.</p>
                    <Button onClick={() => setShowForm(true)} className={styles.newBtn}>
                        ¡Crea el primero!
                    </Button>
                </div>
            ) : (
                <div className={styles.grid}>
                    {filteredMemories.map(memory => (
                        <MemoryCard
                            key={memory.id}
                            memory={memory}
                            onEdit={() => { setEditingMemory(memory); setShowForm(true); }}
                            onToggleVisibility={() => handleToggleVisibility(memory.id)}
                            onDelete={() => handleDelete(memory.id)}
                        />
                    ))}

                    {filteredMemories.length === 0 && (
                        <div className={styles.emptySearch}>
                            <p className={styles.emptySearchIcon}>🕵️‍♀️</p>
                            <p>No se encontraron recuerdos con esos filtros.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function MemoryCard({ memory, onEdit, onToggleVisibility, onDelete }) {
    const date = memory.eventDate ? new Date(memory.eventDate).toLocaleDateString('es-MX', {
        day: 'numeric', month: 'short', year: 'numeric',
    }) : '—';

    return (
        <Card className={`${styles.card} ${memory.isHidden ? styles.cardHidden : ''}`}>
            {/* Image Header */}
            <div className={styles.cardHeader}>
                {memory.mainPhotoUrl ? (
                    <img
                        src={memory.mainPhotoUrl}
                        alt={memory.title ?? 'Recuerdo'}
                        className={styles.cardPhoto}
                    />
                ) : (
                    <div className={styles.cardPhotoEmpty}>📷</div>
                )}

                {/* Status Badges */}
                <div className={styles.badges}>
                    {memory.isHidden && <span className={styles.badgeHidden}>🙈 Oculto</span>}
                    <span className={styles.badgePhotos}>📸 {memory.photoCount ?? 0}</span>
                </div>

                {/* Cover Actions Overlay */}
                <div className={styles.cardActionsOverlay}>
                    <button className={styles.actionBtn} onClick={onToggleVisibility} title={memory.isHidden ? "Mostrar" : "Ocultar"}>
                        {memory.isHidden ? '👁️' : '🙈'}
                    </button>
                    <button className={styles.actionBtn} onClick={onEdit} title="Editar">
                        ✏️
                    </button>
                    <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={onDelete} title="Eliminar">
                        🗑️
                    </button>
                </div>
            </div>

            {/* Card Body */}
            <div className={styles.cardInfo}>
                <h3 className={styles.cardTitle}>{memory.title ?? 'Sin título'}</h3>
                <p className={styles.cardMeta}>{date}</p>

                {memory.placeName && (
                    <p className={styles.cardPlace} title={memory.placeName}>
                        <span className={styles.placeIcon}>📍</span> {memory.placeName}
                    </p>
                )}

                {memory.tags?.length > 0 && (
                    <div className={styles.tags}>
                        {memory.tags.slice(0, 3).map(tag => (
                            <span key={tag} className={styles.tag}>{tag}</span>
                        ))}
                        {memory.tags.length > 3 && (
                            <span className={styles.tagMore}>+{memory.tags.length - 3}</span>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}

