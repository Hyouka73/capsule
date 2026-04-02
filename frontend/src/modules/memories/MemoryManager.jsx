import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMemories, updateMemory, deleteMemory } from '../../apiClient';
import MemoryForm from './MemoryForm';
import MemoryCard from './components/MemoryCard';
import MemorySkeleton from './components/MemorySkeleton';
import Button from '../../components/ui/Button/Button';
import Card from '../../components/ui/Card/Card';
import PageHeader from '../../components/ui/PageHeader/PageHeader';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import { usePlaces } from '../map/hooks/usePlaces';
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
            const { docs } = await getMemories({ pageSize: 50, includeHidden: true });
            setMemories(docs ?? []);
        } catch (err) {
            // silent fail
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

    // Conectado a Firestore vía Backend
    async function handleToggleVisibility(id) {
        const memory = memories.find(m => m.id === id);
        if (!memory) return;
        try {
            await updateMemory({ memoryId: id, isHidden: !memory.isHidden });
            setMemories(prev => prev.map(m => m.id === id ? { ...m, isHidden: !m.isHidden } : m));
        } catch (err) {
            // silent fail
        }
    }

    async function handleDelete(id) {
        if (!confirm('¿Seguro que quieres eliminar este recuerdo?')) return;
        try {
            await deleteMemory({ memoryId: id });
            setMemories(prev => prev.filter(m => m.id !== id));
        } catch (err) {
            // silent fail
        }
    }

    const { places } = usePlaces();

    if (showForm) {
        return (
            <div className={styles.editorView}>
                <div className={styles.editorHeader}>
                    <button className={styles.backBtnHeader} onClick={() => { setShowForm(false); setEditingMemory(null); }}>
                        <span className="material-symbols-rounded">arrow_back</span>
                    </button>
                    <div className={styles.editorTitles}>
                        <h2>{editingMemory ? 'Editando Momento ✨' : 'Nuevo Recuerdo 📸'}</h2>
                        <p>{editingMemory ? 'Perfecciona esta memoria para el futuro' : 'Documenta un nuevo capítulo de su historia'}</p>
                    </div>
                </div>

                <Card className={styles.editorCard}>
                    <MemoryForm
                        initialData={editingMemory}
                        onSuccess={handleCreated}
                        onCancel={() => { setShowForm(false); setEditingMemory(null); }}
                        role="admin"
                        defaultPlaces={places}
                    />
                </Card>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            <PageHeader
                title="Recuerdos"
                subtitle={`${memories.length} momentos documentados`}
                actionLabel="Nuevo recuerdo"
                actionIcon="✨"
                onAction={() => { setEditingMemory(null); setShowForm(true); }}
            />

            {/* ── Toolbar ── */}
            {!isLoading && (memories.length > 0 || searchQuery) && (
                <div className={styles.toolbarWrapper}>
                    <div className={styles.toolbar}>
                        <div className={styles.searchBox}>
                            <span className="material-symbols-rounded">search</span>
                            <input
                                type="text"
                                placeholder="Buscar por título, lugar o tag..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>

                        <div className={styles.filters}>
                            <div className={styles.selectWrapper}>
                                <select
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value)}
                                    className={styles.select}
                                >
                                    <option value="all">Todos los estados</option>
                                    <option value="public">Públicos 👁️</option>
                                    <option value="hidden">Ocultos 🙈</option>
                                </select>
                                <span className="material-symbols-rounded">expand_more</span>
                            </div>

                            <div className={styles.selectWrapper}>
                                <select
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value)}
                                    className={styles.select}
                                >
                                    <option value="date_desc">Más recientes primero</option>
                                    <option value="date_asc">Más antiguos primero</option>
                                    <option value="title">Alfabético</option>
                                </select>
                                <span className="material-symbols-rounded">sort</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Memory grid ── */}
            <div className={styles.gridContainer}>
                {isLoading ? (
                    <div className={styles.grid}>
                        {[1, 2, 3, 4, 5, 6].map(i => <MemorySkeleton key={i} />)}
                    </div>
                ) : memories.length === 0 ? (
                    <EmptyState
                        icon="📸"
                        title="Aún no hay recuerdos"
                        description="Sube fotos y documenta sus mejores momentos juntos."
                        action={
                            <Button onClick={() => setShowForm(true)} className={styles.newBtn}>
                                ¡Crea el primero!
                            </Button>
                        }
                    />
                ) : (
                    <>
                        <div className={styles.grid}>
                            <AnimatePresence mode="popLayout">
                                {filteredMemories.map((memory, idx) => (
                                    <MemoryCard
                                        key={memory.id}
                                        memory={memory}
                                        index={idx}
                                        onEdit={() => { setEditingMemory(memory); setShowForm(true); }}
                                        onToggleVisibility={() => handleToggleVisibility(memory.id)}
                                        onDelete={() => handleDelete(memory.id)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>

                        {filteredMemories.length === 0 && (
                            <motion.div 
                                className={styles.emptySearch}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className={styles.emptySearchIcon}>🕵️‍♀️</div>
                                <h3>No se encontraron recuerdos</h3>
                                <p>Prueba con otros términos de búsqueda o filtros.</p>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                                >
                                    Limpiar filtros
                                </Button>
                            </motion.div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
