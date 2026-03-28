import { useEffect, useRef, useState } from 'react';
import PastelButton from '../../components/ui/PastelButton/PastelButton';
import PastelCard from '../../components/ui/PastelCard/PastelCard';
import PastelInput from '../../components/ui/PastelInput/PastelInput';
import PageHeader from '../../components/ui/PageHeader/PageHeader';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import { useCoupons } from '../../hooks/useCoupons';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import styles from './CouponManager.module.css';

export default function CouponManager() {
    const { 
        coupons, 
        isLoading, 
        createCoupon 
    } = useCoupons({ adminMode: true });

    const [activeTab, setActiveTab] = useState('active'); // 'active', 'redeemed', 'expired'
    const [showForm, setShowForm] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [assigningCoupon, setAssigningCoupon] = useState(null);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    // Form state
    const [formData, setFormData] = useState({ 
        emoji: '🎁', title: '', type: 'wish', description: '', instructions: '', expiryDate: '', isActive: true, maxRedemptions: 1 
    });

    const handleCreated = async (e) => {
        e.preventDefault();
        
        try {
            const couponData = {
                ...formData,
                status: formData.isActive ? 'active' : 'inactive',
                redemptionsLeft: formData.maxRedemptions
            };

            if (editingCoupon) {
                // In v1.0 update is not supported, so we just return or show a message
                toast.error('La edición no está disponible en esta versión.');
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
            toast.error('Error en el formulario de cupones');
        }
    };

    const handleEdit = (c) => {
        setEditingCoupon(c);
        setFormData({
            emoji: c.emoji, title: c.title || c.name, type: c.type, description: c.description,
            instructions: c.instructions || '', expiryDate: c.expiryDate || '', 
            isActive: c.status === 'active', maxRedemptions: c.maxRedemptions || 1
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        toast.error('La eliminación no está disponible en esta versión.');
    };

    const toggleActive = async (coupon) => {
        toast.error('El cambio de estado no está disponible en esta versión.');
    };

    const handleAssign = async (userId) => {
        if (!assigningCoupon) return;
        try {
            // Future implementation: assignCouponDirectly(assigningCoupon.id, userId)
            toast.success('Cupón asignado con éxito 🎁 (Mock)');
            setAssigningCoupon(null);
        } catch (err) {
            toast.error('Error al asignar el cupón');
        }
    };

    // Filter coupons based on activeTab
    const filteredCoupons = coupons.filter(c => {
        if (activeTab === 'active') return c.status === 'active';
        if (activeTab === 'redeemed') return c.status === 'redeemed';
        if (activeTab === 'expired') return c.status === 'expired';
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
                    className={`${styles.tab} ${activeTab === 'redeemed' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('redeemed')}
                >
                    ✅ Cobrados
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'expired' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('expired')}
                >
                    ⚪ Expirados
                </button>
            </div>

            {/* Form panel */}
            {showForm && (
                <PastelCard className={styles.formPanel}>
                    <div className={styles.formPanelHeader}>
                        <h2>{editingCoupon ? '✍️ Editar Cupón' : '✨ Nuevo Cupón'}</h2>
                        <button type="button" onClick={() => setShowForm(false)} className={styles.closeBtn} title="Cerrar">✕</button>
                    </div>
                    <form onSubmit={handleCreated} className={styles.form}>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup} style={{ flex: '0 0 100px' }}>
                                <PastelInput 
                                    type="text" 
                                    label="Emoji" 
                                    maxLength="2" 
                                    required 
                                    value={formData.emoji} 
                                    onChange={e => setFormData({ ...formData, emoji: e.target.value })} 
                                />
                            </div>
                            <div className={styles.formGroup} style={{ flex: '1' }}>
                                <PastelInput 
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
                                <PastelInput 
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
                                <PastelInput 
                                    type="number" 
                                    label="Max Canjes" 
                                    min="1"
                                    value={formData.maxRedemptions} 
                                    onChange={e => setFormData({ ...formData, maxRedemptions: parseInt(e.target.value) || 1 })} 
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <PastelInput 
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
                            <PastelInput 
                                type="checkbox" 
                                label="Cupón Activo" 
                                checked={formData.isActive} 
                                onChange={e => setFormData({ ...formData, isActive: e.target.checked })} 
                            />
                        </div>

                        <div className={styles.formActions}>
                            <PastelButton type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</PastelButton>
                            <PastelButton type="submit">{editingCoupon ? 'Guardar' : 'Crear'}</PastelButton>
                        </div>
                    </form>
                </PastelCard>
            )}

            {/* Grid */}
            {isLoading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Cargando cupones...</p>
                </div>
            ) : filteredCoupons.length === 0 ? (
                <EmptyState
                    icon={activeTab === 'active' ? '🎟️' : activeTab === 'redeemed' ? '✅' : '⚪'}
                    title={activeTab === 'active' ? 'Sin cupones activos' : activeTab === 'redeemed' ? 'Sin historial de cobros' : 'Sin cupones expirados'}
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
                    <PastelCard className={styles.assignModal} onClick={e => e.stopPropagation()}>
                        <h3>🎁 Asignar "{assigningCoupon.title || assigningCoupon.name}"</h3>
                        <p>El cupón aparecerá directamente en "Disponibles" del Partner.</p>
                        
                        <div className={styles.partnerList}>
                            <button className={styles.partnerBtn} onClick={() => handleAssign('partner_uid')}>
                                <span className={styles.partnerAvatar}>💖</span>
                                <span className={styles.partnerName}>Partner</span>
                            </button>
                        </div>
                        
                        <PastelButton variant="secondary" className={styles.cancelModal} onClick={() => setAssigningCoupon(null)}>Cancelar</PastelButton>
                    </PastelCard>
                </div>
            )}
        </div>
    );
}

function CouponCard({ coupon, onEdit, onDelete, onToggleActive, onAssign, showAssign }) {
    const typeLabels = {
        massage: 'Relax', date_night: 'Cita', free_pass: 'Pase Libre', wish: 'Deseo', naughty: 'Intimo'
    };

    const isInactive = coupon.status === 'inactive' || !coupon.isActive;
    const isClaimed = coupon.status === 'redeemed' || coupon.isUsed;

    return (
        <PastelCard className={`${styles.card} ${isInactive ? styles.cardInactive : ''} ${isClaimed ? styles.cardClaimed : ''}`}>
            <div className={styles.cardHeader}>
                <div className={styles.couponIcon}>{coupon.emoji}</div>
                <div className={styles.cardHeaderActions}>
                    <span className={styles.typeBadge}>{typeLabels[coupon.type] || coupon.type}</span>
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
                    <PastelButton size="sm" className={styles.assignBtn} onClick={onAssign}>
                        🎁 Asignar
                    </PastelButton>
                )}
                <div className={styles.footerActions}>
                    {/* Edición/Eliminación desactivada en v1.0 */}
                </div>
            </div>

            <div className={styles.tearLine}></div>
        </PastelCard>
    );
}
