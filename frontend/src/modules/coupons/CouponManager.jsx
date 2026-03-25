import { useState } from 'react';
import Button from '../../components/ui/Button/Button';
import Card from '../../components/ui/Card/Card';
import PageHeader from '../../components/ui/PageHeader/PageHeader';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import { useCoupons } from '../../hooks/useCoupons';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import styles from './CouponManager.module.css';

export default function CouponManager() {
    const { 
        coupons, 
        isLoading, 
        createCoupon, 
        updateCoupon, 
        deleteCoupon 
    } = useCoupons({ adminMode: true });

    const [activeTab, setActiveTab] = useState('active'); // 'active', 'inactive', 'claimed'
    const [showForm, setShowForm] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [assigningCoupon, setAssigningCoupon] = useState(null);

    // Form state
    const [formData, setFormData] = useState({ 
        emoji: '🎁', title: '', type: 'wish', description: '', instructions: '', expiryDate: '', isActive: true, maxRedemptions: 1 
    });

    const handleCreated = async (e) => {
        e.preventDefault();
        
        try {
            const couponData = {
                ...formData,
                status: formData.isActive ? 'activo' : 'inactivo',
                redemptionsLeft: formData.maxRedemptions
            };

            if (editingCoupon) {
                await toast.promise(updateCoupon(editingCoupon.id, couponData), {
                    loading: 'Guardando cambios...',
                    success: 'Cupón actualizado ✨',
                    error: 'Error al actualizar'
                });
            } else {
                await toast.promise(createCoupon(couponData), {
                    loading: 'Creando cupón...',
                    success: '¡Cupón creado con éxito! 🎁',
                    error: 'Error al crear'
                });
            }
            setShowForm(false);
            setEditingCoupon(null);
            setFormData({ emoji: '🎁', title: '', type: 'wish', description: '', instructions: '', expiryDate: '', isActive: true, maxRedemptions: 1 });
        } catch (err) {
            console.error('[CouponManager] Form error:', err);
        }
    };

    const handleEdit = (c) => {
        setEditingCoupon(c);
        setFormData({
            emoji: c.emoji, title: c.title || c.name, type: c.type, description: c.description,
            instructions: c.instructions || '', expiryDate: c.expiryDate || '', 
            isActive: c.status === 'activo', maxRedemptions: c.maxRedemptions || 1
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (confirm('¿Seguro que quieres eliminar este cupón permanentemente?')) {
            try {
                await toast.promise(deleteCoupon(id), {
                    loading: 'Eliminando...',
                    success: 'Cupón eliminado 🗑️',
                    error: 'No se pudo eliminar'
                });
            } catch (err) {
                console.error('[CouponManager] Delete error:', err);
            }
        }
    };

    const toggleActive = async (coupon) => {
        try {
            const newStatus = coupon.status === 'activo' ? 'inactivo' : 'activo';
            await updateCoupon(coupon.id, { 
                status: newStatus,
                isActive: newStatus === 'activo'
            });
        } catch (err) {
            toast.error('Error al cambiar estado');
        }
    };

    const handleAssign = async (userId) => {
        if (!assigningCoupon) return;
        try {
            // This will be implemented in useCoupons or a direct service call
            await toast.promise(assignCouponDirectly(assigningCoupon.id, userId), {
                loading: 'Asignando cupón...',
                success: 'Cupón asignado con éxito 🎁',
                error: 'Error al asignar'
            });
            setAssigningCoupon(null);
        } catch (err) {
            console.error('[CouponManager] Assign error:', err);
        }
    };

    // Filter coupons based on activeTab
    const filteredCoupons = coupons.filter(c => {
        if (activeTab === 'active') return c.status === 'activo' || (c.isActive && c.status !== 'cobrado' && c.status !== 'inactivo');
        if (activeTab === 'inactive') return c.status === 'inactivo' || (!c.isActive && c.status !== 'cobrado');
        if (activeTab === 'claimed') return c.status === 'cobrado' || c.isUsed;
        return true;
    });

    return (
        <div className={styles.root}>
            <PageHeader
                title="Gestión de Cupones"
                subtitle="Configura recompensas y asigna detalles especiales."
                actionLabel="Nuevo Cupón"
                actionIcon="✨"
                onAction={() => { 
                    setEditingCoupon(null); 
                    setFormData({ emoji: '🎁', title: '', type: 'wish', description: '', instructions: '', expiryDate: '', isActive: true, maxRedemptions: 1 }); 
                    setShowForm(true); 
                }}
            />

            <div className={styles.tabsContainer}>
                <button 
                    className={`${styles.tab} ${activeTab === 'active' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('active')}
                >
                    🟢 Activos
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'inactive' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('inactive')}
                >
                    ⚪ Inactivos
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'claimed' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('claimed')}
                >
                    ✅ Cobrados
                </button>
            </div>

            {/* Form panel */}
            {showForm && (
                <Card className={styles.formPanel} glass>
                    <div className={styles.formPanelHeader}>
                        <h2>{editingCoupon ? '✍️ Editar Cupón' : '✨ Nuevo Cupón'}</h2>
                        <button type="button" onClick={() => setShowForm(false)} className={styles.closeBtn} title="Cerrar">✕</button>
                    </div>
                    <form onSubmit={handleCreated} className={styles.form}>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup} style={{ flex: '0 0 100px' }}>
                                <KawaiiInput 
                                    type="text" 
                                    label="Emoji" 
                                    maxLength="2" 
                                    required 
                                    value={formData.emoji} 
                                    onChange={e => setFormData({ ...formData, emoji: e.target.value })} 
                                />
                            </div>
                            <div className={styles.formGroup} style={{ flex: '1' }}>
                                <KawaiiInput 
                                    type="text" 
                                    label="Título" 
                                    required 
                                    placeholder="Ej. Vale por un abrazo..." 
                                    value={formData.title} 
                                    onChange={e => setFormData({ ...formData, title: e.target.value })} 
                                />
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup} style={{ flex: '1' }}>
                                <KawaiiInput 
                                    type="select" 
                                    label="Categoría" 
                                    value={formData.type} 
                                    onChange={e => setFormData({ ...formData, type: e.target.value })} 
                                    options={[
                                        { value: 'massage', label: '💆‍♀️ Masaje / Relax' },
                                        { value: 'date_night', label: '🍷 Date Night' },
                                        { value: 'free_pass', label: '🃏 Pase Libre' },
                                        { value: 'wish', label: '✨ Deseo Libre' },
                                        { value: 'naughty', label: '🌶️ Picante' }
                                    ]} 
                                />
                            </div>
                            <div className={styles.formGroup} style={{ flex: '1' }}>
                                <KawaiiInput 
                                    type="number" 
                                    label="Max Canjes" 
                                    min="1"
                                    value={formData.maxRedemptions} 
                                    onChange={e => setFormData({ ...formData, maxRedemptions: parseInt(e.target.value) || 1 })} 
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <KawaiiInput 
                                type="textarea" 
                                label="Descripción" 
                                required 
                                rows="2" 
                                placeholder="¿Qué incluye este cupón?" 
                                value={formData.description} 
                                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                            />
                        </div>

                        <div className={styles.toggleGroup}>
                            <KawaiiInput 
                                type="toggle" 
                                label="Cupón Activo" 
                                value={formData.isActive} 
                                onChange={e => setFormData({ ...formData, isActive: e.target.checked || e.target.value === true })} 
                            />
                        </div>

                        <div className={styles.formActions}>
                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                            <Button type="submit">{editingCoupon ? 'Guardar' : 'Crear'}</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Grid */}
            {isLoading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Cargando cupones...</p>
                </div>
            ) : filteredCoupons.length === 0 ? (
                <EmptyState
                    icon={activeTab === 'active' ? '🎟️' : activeTab === 'inactive' ? '⚪' : '✅'}
                    title={activeTab === 'active' ? 'Sin cupones activos' : activeTab === 'inactive' ? 'Sin cupones inactivos' : 'Sin historial de cobros'}
                    description={activeTab === 'active' ? 'Crea cupones para que tu partner pueda canjearlos.' : ''}
                />
            ) : (
                <div className={styles.grid}>
                    {filteredCoupons.map(coupon => (
                        <CouponCard 
                            key={coupon.id} 
                            coupon={coupon} 
                            onEdit={() => handleEdit(coupon)} 
                            onDelete={() => handleDelete(coupon.id)} 
                            onToggleActive={() => toggleActive(coupon)} 
                            onAssign={() => setAssigningCoupon(coupon)}
                            showAssign={activeTab === 'active'}
                        />
                    ))}
                </div>
            )}

            {/* Assignment Modal (Future-proof Selector) */}
            {assigningCoupon && (
                <div className={styles.modalOverlay} onClick={() => setAssigningCoupon(null)}>
                    <Card className={styles.assignModal} onClick={e => e.stopPropagation()}>
                        <h3>🎁 Asignar "{assigningCoupon.title || assigningCoupon.name}"</h3>
                        <p>El cupón aparecerá directamente en "Disponibles" del Partner.</p>
                        
                        <div className={styles.partnerList}>
                            {/* For now we assume one partner, but could be fetched from a useUsers hook */}
                            <button className={styles.partnerBtn} onClick={() => handleAssign('partner_uid')}>
                                <span className={styles.partnerAvatar}>💖</span>
                                <span className={styles.partnerName}>Partner</span>
                            </button>
                        </div>
                        
                        <Button variant="ghost" className={styles.cancelModal} onClick={() => setAssigningCoupon(null)}>Cancelar</Button>
                    </Card>
                </div>
            )}
        </div>
    );
}

function CouponCard({ coupon, onEdit, onDelete, onToggleActive, onAssign, showAssign }) {
    const typeLabels = {
        massage: 'Relax', date_night: 'Cita', free_pass: 'Pase Libre', wish: 'Deseo', naughty: 'Intimo'
    };

    const isInactive = coupon.status === 'inactivo' || !coupon.isActive;
    const isClaimed = coupon.status === 'cobrado' || coupon.isUsed;

    return (
        <Card className={`${styles.card} ${isInactive ? styles.cardInactive : ''} ${isClaimed ? styles.cardClaimed : ''}`}>
            <div className={styles.cardHeader}>
                <div className={styles.couponIcon}>{coupon.emoji}</div>
                <div className={styles.cardHeaderActions}>
                    <span className={styles.typeBadge}>{typeLabels[coupon.type] || coupon.type}</span>
                    <button className={`${styles.toggleBtn} ${!isInactive ? styles.toggleOn : styles.toggleOff}`} onClick={onToggleActive} title={!isInactive ? "Desactivar" : "Activar"}>
                        {!isInactive ? '👁️' : '🙈'}
                    </button>
                </div>
            </div>

            <h3 className={styles.cardTitle}>{coupon.title || coupon.name}</h3>
            <p className={styles.cardDesc}>{coupon.description}</p>
            
            <div className={styles.cardStats}>
                {coupon.maxRedemptions > 1 && (
                    <span className={styles.statBadge}>
                        🔢 {coupon.redemptionsLeft} / {coupon.maxRedemptions}
                    </span>
                )}
                {isClaimed && <span className={styles.claimedBadge}>COBRADO</span>}
            </div>

            <div className={styles.cardFooter}>
                {showAssign && !isClaimed && (
                    <Button size="sm" className={styles.assignBtn} onClick={onAssign}>
                        🎁 Asignar
                    </Button>
                )}
                <div className={styles.footerActions}>
                    <button className={styles.miniBtn} onClick={onEdit} title="Editar">✏️</button>
                    <button className={`${styles.miniBtn} ${styles.deleteBtn}`} onClick={onDelete} title="Eliminar">🗑️</button>
                </div>
            </div>

            <div className={styles.tearLine}></div>
        </Card>
    );
}
