import { useEffect, useRef, useState } from 'react';
import Button from '../../components/ui/Button/Button';
import Card from '../../components/ui/Card/Card';
import KawaiiInput from '../../components/ui/KawaiiInput/KawaiiInput';
import KawaiiSwitch from '../../components/ui/KawaiiSwitch/KawaiiSwitch';
import PageHeader from '../../components/ui/PageHeader/PageHeader';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import { useCoupons } from '../../hooks/useCoupons';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import styles from './CouponManager.module.css';

const COUPON_CATEGORIES = [
    { value: 'wellness', label: 'Bienestar', icon: 'spa' },
    { value: 'dates', label: 'Citas', icon: 'celebration' },
    { value: 'tasks', label: 'Tareas', icon: 'confirmation_number' },
    { value: 'romance', label: 'Romance', icon: 'favorite' },
    { value: 'adventures', label: 'Aventura', icon: 'explore' },
    { value: 'diamond', label: 'Pase Diamante', icon: 'diamond' }
];

const TIER_NAMES = {
    1: 'Mini Capricho',
    2: 'Mimo Especial',
    3: 'Sorpresa VIP',
    4: 'Deseo Infinito'
};

export default function CouponManager() {
    const { 
        coupons, 
        redemptions,
        isLoading, 
        createCoupon,
        updateCoupon
    } = useCoupons({ adminMode: true });

    const [activeTab, setActiveTab] = useState('activos'); // 'activos', 'asignados', 'pendientes', 'cobrados'
    const [showForm, setShowForm] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [assigningCoupon, setAssigningCoupon] = useState(null);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    // Form state
    const [formData, setFormData] = useState({ 
        title: '', type: 'wellness', description: '', instructions: '', expiryDate: '', isActive: true, maxRedemptions: 1, tier: 1 
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
                await toast.promise(updateCoupon(editingCoupon.id, couponData), {
                    loading: 'Actualizando cupón...',
                    success: '¡Cupón actualizado! ✨',
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
            toast.error('Error en el formulario de cupones');
        }
    };

    const handleEdit = (c) => {
        setEditingCoupon(c);
        const isDiamond = c.type === 'diamond' || c.tier === 4;
        setFormData({
            title: isDiamond ? 'Vale por lo que quieras' : (c.title || c.name), 
            type: isDiamond ? 'diamond' : (c.type || 'wellness'), 
            description: isDiamond ? 'Tus deseos son órdenes. Pide lo que quieras.' : c.description,
            instructions: c.instructions || '', 
            expiryDate: c.expiryDate || '', 
            isActive: c.status === 'active' || c.status === 'activo', 
            maxRedemptions: isDiamond ? 1 : (c.maxRedemptions || 1), 
            tier: isDiamond ? 4 : (c.tier || 1)
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        toast.error('La eliminación no está disponible en esta versión.');
    };

    const toggleActive = async (coupon) => {
        toast.error('El cambio de estado no está disponible en esta versión.');
    };

    const handleAssign = async () => {
        if (!assigningCoupon) return;
        try {
            await toast.promise(updateCoupon(assigningCoupon.id, { assignedToOption: 'partner' }), {
                loading: 'Asignando cupón...',
                success: 'Cupón asignado con éxito 🎁',
                error: 'Error al asignar'
            });
            setAssigningCoupon(null);
        } catch (err) {
            // Error handled by toast.promise
        }
    };

    // Filter logic
    const filteredCoupons = coupons.filter(c => {
        if (activeTab === 'activos') return c.status !== 'inactive' && !c.assignedTo;
        if (activeTab === 'asignados') return c.status !== 'inactive' && c.assignedTo;
        return false;
    });

    const filteredRedemptions = redemptions.filter(r => {
        if (activeTab === 'pendientes') return r.status === 'pending_approval' || r.status === 'approved';
        if (activeTab === 'cobrados') return r.status === 'claimed';
        return false;
    });

    if (showForm) {
        return (
            <div className={styles.root}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <button 
                        onClick={() => setShowForm(false)} 
                        style={{ border: 'none', background: 'var(--bg-card)', padding: '0.8rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    >
                        <span className="material-symbols-rounded">arrow_back</span>
                    </button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--accent-primary)' }}>
                            {editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}
                        </h1>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {editingCoupon ? 'Ajusta los detalles de este beneficio.' : 'Crea una nueva recompensa especial.'}
                        </p>
                    </div>
                </div>

                <Card className={styles.editorCard}>
                    <form onSubmit={handleCreated} className={styles.form}>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup} style={{ flex: '1' }}>
                                <KawaiiInput 
                                    type="select" 
                                    label="Categoría" 
                                    value={formData.type} 
                                    onChange={e => {
                                        const t = e.target.value;
                                        const isDiamond = t === 'diamond';
                                        setFormData({ 
                                            ...formData, 
                                            type: t, 
                                            tier: isDiamond ? 4 : (formData.tier === 4 ? 1 : formData.tier),
                                            title: isDiamond ? 'Vale por lo que quieras' : (formData.type === 'diamond' ? '' : formData.title),
                                            description: isDiamond ? 'Tus deseos son órdenes. Pide lo que quieras.' : (formData.type === 'diamond' ? '' : formData.description),
                                            maxRedemptions: isDiamond ? 1 : formData.maxRedemptions
                                        });
                                    }} 
                                    options={COUPON_CATEGORIES} 
                                />
                            </div>
                            <div className={styles.formGroup} style={{ flex: '1' }}>
                                <KawaiiInput 
                                    type="select" 
                                    label="Rareza / Tier (Gacha)" 
                                    value={formData.tier} 
                                    onChange={e => setFormData({ ...formData, tier: parseInt(e.target.value) })}
                                    disabled={formData.type === 'diamond'}
                                    options={[
                                        { value: 1, label: `🥉 ${TIER_NAMES[1]} (Tier 1)` },
                                        { value: 2, label: `🥈 ${TIER_NAMES[2]} (Tier 2)` },
                                        { value: 3, label: `🥇 ${TIER_NAMES[3]} (Tier 3)` },
                                        { value: 4, label: `💎 ${TIER_NAMES[4]} (Tier 4)` }
                                    ]}
                                />
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup} style={{ flex: '2' }}>
                                <KawaiiInput 
                                    type="text" 
                                    label="Título" 
                                    required 
                                    placeholder={formData.type === 'diamond' ? 'Automático' : 'Ej. Vale por un masaje...'} 
                                    value={formData.title} 
                                    onChange={e => setFormData({ ...formData, title: e.target.value })} 
                                    disabled={formData.type === 'diamond'}
                                />
                            </div>
                            <div className={styles.formGroup} style={{ flex: '1' }}>
                                <KawaiiInput 
                                    type="number" 
                                    label="Max Canjes" 
                                    min="1"
                                    value={formData.maxRedemptions} 
                                    onChange={e => setFormData({ ...formData, maxRedemptions: parseInt(e.target.value) || 1 })} 
                                    disabled={formData.type === 'diamond'}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <KawaiiInput 
                                type="textarea" 
                                label="Descripción" 
                                required 
                                rows="2" 
                                placeholder={formData.type === 'diamond' ? 'Automático' : '¿Qué incluye este cupón?'} 
                                value={formData.description} 
                                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                disabled={formData.type === 'diamond'}
                            />
                        </div>

                        <div className={styles.toggleGroup}>
                            <KawaiiSwitch 
                                label="Cupón Activo" 
                                checked={formData.isActive} 
                                onChange={val => setFormData({ ...formData, isActive: val })} 
                                variant="mint"
                            />
                        </div>

                        <div className={styles.formActions}>
                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                            <Button type="submit" variant="primary">{editingCoupon ? 'Guardar Cambios' : 'Crear Cupón'}</Button>
                        </div>
                    </form>
                </Card>
            </div>
        );
    }

    return (
        <div className={styles.root}>

            <PageHeader
                title="Gestión de Cupones"
                subtitle="Configura recompensas y asigna detalles especiales."
                actionLabel="Nuevo Cupón"
                actionIcon="✨"
                onAction={() => { 
                    setEditingCoupon(null); 
                    setFormData({ title: '', type: 'wellness', description: '', instructions: '', expiryDate: '', isActive: true, maxRedemptions: 1, tier: 1 }); 
                    setShowForm(true); 
                }}
            />

            <div className={styles.tabsContainer}>
                <button 
                    className={`${styles.tab} ${activeTab === 'activos' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('activos')}
                >
                    🟢 Activos
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'asignados' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('asignados')}
                >
                    🎁 Asignados
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'pendientes' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('pendientes')}
                >
                    ⏳ Pendientes
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'cobrados' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('cobrados')}
                >
                    ✅ Cobrados
                </button>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Cargando cupones...</p>
                </div>
            ) : (filteredCoupons.length === 0 && filteredRedemptions.length === 0) ? (
                <EmptyState
                    icon={activeTab === 'activos' ? '🎟️' : activeTab === 'asignados' ? '🎁' : activeTab === 'pendientes' ? '⏳' : '✅'}
                    title={
                        activeTab === 'activos' ? 'Sin cupones activos' : 
                        activeTab === 'asignados' ? 'Sin cupones asignados' : 
                        activeTab === 'pendientes' ? 'Sin canjes pendientes' : 
                        'Sin historial de cobros'
                    }
                    description={activeTab === 'activos' ? 'Crea cupones para que tu partner pueda canjearlos.' : ''}
                />
            ) : (
                <div className={styles.grid}>
                    {/* Render Coupons */}
                    {filteredCoupons.map(coupon => (
                        <CouponCard 
                            key={coupon.id} 
                            coupon={coupon} 
                            onEdit={() => handleEdit(coupon)} 
                            onDelete={() => handleDelete(coupon.id)} 
                            onToggleActive={() => toggleActive(coupon)} 
                            onAssign={() => setAssigningCoupon(coupon)}
                            showAssign={activeTab === 'activos'}
                        />
                    ))}
                    {/* Render Redemptions (wrapped as cards or special items) */}
                    {filteredRedemptions.map(red => (
                        <RedemptionItem 
                            key={red.id}
                            redemption={red}
                        />
                    ))}
                </div>
            )}

            <ConfirmModal
                isOpen={!!assigningCoupon}
                title="Asignar Cupón"
                message={`Deseas asignar "${assigningCoupon?.title || assigningCoupon?.name}" a tu pareja? Aparecerá directamente en sus disponibles.`}
                confirmText="Aceptar"
                cancelText="Cancelar"
                emoji="🎁"
                onConfirm={handleAssign}
                onCancel={() => setAssigningCoupon(null)}
            />
        </div>
    );
}

function RedemptionItem({ redemption }) {
    const isDiamond = redemption.tier === 4;
    const category = COUPON_CATEGORIES.find(c => c.value === redemption.type) || COUPON_CATEGORIES[0];
    
    let cardBg = 'var(--bg-card)';
    if (isDiamond) cardBg = 'var(--gradient-lavender)';
    else if (category.value === 'wellness' || category.value === 'adventures') cardBg = 'var(--gradient-mint)';
    else if (category.value === 'dates') cardBg = 'var(--gradient-amber)';
    else if (category.value === 'romance') cardBg = 'var(--gradient-rose)';
    else cardBg = 'var(--gradient-peach)';

    const isPending = redemption.status === 'pending_approval';

    return (
        <Card className={`${styles.card} ${styles.redemptionCard}`} style={{ background: cardBg }}>
            <div className={styles.cardHeader}>
                <div className={styles.couponIcon}>
                    <span className="material-symbols-rounded">
                        {category.icon}
                    </span>
                </div>
                {isPending && <div className={styles.pendingIndicator}>SOLICITADO</div>}
            </div>

            <h3 className={styles.cardTitle}>{redemption.couponTitle}</h3>
            {redemption.notes && <p className={styles.redemptionNotes}>"{redemption.notes}"</p>}
            
            <div className={styles.cardFooter}>
                <span className={styles.dateLabel}>
                    {new Date(redemption.updatedAt || redemption.createdAt).toLocaleDateString()}
                </span>
                <span className={styles.statusLabel}>{redemption.status.replace('_', ' ')}</span>
            </div>

            <div className={styles.tearLine}></div>
        </Card>
    );
}

function CouponCard({ coupon, onEdit, onDelete, onToggleActive, onAssign, showAssign }) {
    const isInactive = coupon.status === 'inactive' || !coupon.isActive;
    const isClaimed = coupon.status === 'redeemed' || coupon.isUsed;
    const isAssigned = !!coupon.assignedTo;
    const isDiamond = coupon.type === 'diamond' || coupon.tier === 4;

    const category = COUPON_CATEGORIES.find(c => c.value === coupon.type) || COUPON_CATEGORIES[0];
    const tierName = isDiamond ? TIER_NAMES[4] : (TIER_NAMES[coupon.tier] || TIER_NAMES[1]);

    let cardBg = 'var(--bg-card)';
    if (isDiamond) cardBg = 'var(--gradient-lavender)';
    else if (category.value === 'wellness' || category.value === 'adventures') cardBg = 'var(--gradient-mint)';
    else if (category.value === 'dates') cardBg = 'var(--gradient-amber)';
    else if (category.value === 'romance') cardBg = 'var(--gradient-rose)';
    else cardBg = 'var(--gradient-peach)';

    return (
        <Card className={`${styles.card} ${isInactive ? styles.cardInactive : ''} ${isClaimed ? styles.cardClaimed : ''}`} style={{ background: cardBg }}>
            <div className={styles.cardHeader}>
                <div className={styles.couponIcon}>
                    <span className="material-symbols-rounded" style={{ fontSize: 'inherit', color: isDiamond ? '#8b5cf6' : 'inherit' }}>
                        {category.icon}
                    </span>
                </div>
                <div className={styles.cardHeaderActions}>
                    <span className={styles.typeBadge} style={{ background: 'rgba(255,255,255,0.6)', color: 'var(--text-primary)' }}>
                        {isDiamond ? `💎 ${tierName}` : tierName}
                    </span>
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
                {isAssigned && <span className={styles.assignedBadge}>ASIGNADO</span>}
            </div>

            <div className={styles.cardFooter}>
                {showAssign && !isClaimed && !isAssigned && (
                    <Button size="sm" variant="primary" className={styles.assignBtn} onClick={onAssign}>
                        🎁 Asignar
                    </Button>
                )}
                <div className={styles.footerActions}>
                    <button className={styles.miniBtn} onClick={onEdit} title="Editar">
                        <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span>
                    </button>
                    <button className={styles.miniBtn} onClick={onDelete} title="Eliminar" style={{ color: 'var(--color-error)' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                    </button>
                </div>
            </div>

            <div className={styles.tearLine}></div>
        </Card>
    );
}
