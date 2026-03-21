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

    const [showForm, setShowForm] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);

    // Form state
    const [formData, setFormData] = useState({ 
        emoji: '🎁', title: '', type: 'wish', description: '', instructions: '', expiryDate: '', isActive: true 
    });

    const handleCreated = async (e) => {
        e.preventDefault();
        
        try {
            if (editingCoupon) {
                await toast.promise(updateCoupon(editingCoupon.id, formData), {
                    loading: 'Guardando cambios...',
                    success: 'Cupón actualizado ✨',
                    error: 'Error al actualizar'
                });
            } else {
                await toast.promise(createCoupon(formData), {
                    loading: 'Creando cupón...',
                    success: '¡Cupón creado con éxito! 🎁',
                    error: 'Error al crear'
                });
            }
            setShowForm(false);
            setEditingCoupon(null);
            setFormData({ emoji: '🎁', title: '', type: 'wish', description: '', instructions: '', expiryDate: '', isActive: true });
        } catch (err) {
            console.error('[CouponManager] Form error:', err);
        }
    };

    const handleEdit = (c) => {
        setEditingCoupon(c);
        setFormData({
            emoji: c.emoji, title: c.title, type: c.type, description: c.description,
            instructions: c.instructions, expiryDate: c.expiryDate || '', isActive: c.isActive
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
            await updateCoupon(coupon.id, { isActive: !coupon.isActive });
        } catch (err) {
            toast.error('Error al cambiar estado');
        }
    };

    const availableCoupons = coupons.filter(c => !c.isUsed);
    const redeemedCoupons = coupons.filter(c => c.isUsed);

    return (
        <div className={styles.root}>
            <PageHeader
                title="Talonario de Cupones"
                subtitle={`${availableCoupons.length} disponibles, ${redeemedCoupons.length} canjeados`}
                actionLabel="Nuevo Cupón"
                actionIcon="✨"
                onAction={() => { 
                    setEditingCoupon(null); 
                    setFormData({ emoji: '🎁', title: '', type: 'wish', description: '', instructions: '', expiryDate: '', isActive: true }); 
                    setShowForm(true); 
                }}
            />

            {/* Form panel */}
            {showForm && (
                <Card className={styles.formPanel} glass>
                    <div className={styles.formPanelHeader}>
                        <h2>{editingCoupon ? '✍️ Editar Cupón' : '✨ Nuevo Cupón Real'}</h2>
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
                                    label="Título del Cupón" 
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
                                    type="date" 
                                    label="Expiración (Opcional)" 
                                    value={formData.expiryDate} 
                                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} 
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <KawaiiInput 
                                type="textarea" 
                                label="Descripción corta" 
                                required 
                                rows="2" 
                                placeholder="¿Qué incluye este cupón?" 
                                value={formData.description} 
                                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <KawaiiInput 
                                type="text" 
                                label="Reglas o instrucciones" 
                                placeholder="Ej. Válido solo los fines de semana" 
                                value={formData.instructions} 
                                onChange={e => setFormData({ ...formData, instructions: e.target.value })} 
                            />
                        </div>

                        <div className={styles.toggleGroup}>
                            <KawaiiInput 
                                type="toggle" 
                                label="Cupón Activo (Visible para ella)" 
                                value={formData.isActive} 
                                onChange={e => setFormData({ ...formData, isActive: e.target.checked || e.target.value === true })} 
                            />
                        </div>

                        <div className={styles.formActions}>
                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                            <Button type="submit">{editingCoupon ? 'Guardar Cambios' : 'Crear Cupón'}</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Grid */}
            {isLoading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Conectando con Firestore...</p>
                </div>
            ) : availableCoupons.length === 0 ? (
                <EmptyState
                    icon="🎟️"
                    title="El talonario está vacío"
                    description="Crea cupones reales que ella podrá ver en su dashboard de inmediato."
                />
            ) : (
                <div className={styles.grid}>
                    {availableCoupons.map(coupon => (
                        <CouponCard 
                            key={coupon.id} 
                            coupon={coupon} 
                            onEdit={() => handleEdit(coupon)} 
                            onDelete={() => handleDelete(coupon.id)} 
                            onToggleActive={() => toggleActive(coupon)} 
                        />
                    ))}
                </div>
            )}

            {/* Redemption History */}
            {redeemedCoupons.length > 0 && (
                <div className={styles.historySection}>
                    <h3 className={styles.historyTitle}>📓 Historial de Canjes (Real)</h3>
                    <div className={styles.historyList}>
                        {redeemedCoupons.map(coupon => (
                            <div key={coupon.id} className={styles.historyItem}>
                                <div className={styles.historyItemIcon}>{coupon.emoji}</div>
                                <div className={styles.historyItemContent}>
                                    <h4>{coupon.title}</h4>
                                    <p>Canjeado el {coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Fecha desconocida'}</p>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className={styles.reactivateBtn} 
                                    onClick={() => updateCoupon(coupon.id, { isUsed: false, isActive: true, usedAt: null })}
                                >
                                    Reactivar
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function CouponCard({ coupon, onEdit, onDelete, onToggleActive }) {
    const typeLabels = {
        massage: 'Relax', date_night: 'Cita', free_pass: 'Pase Libre', wish: 'Deseo', naughty: 'Intimo'
    };

    return (
        <Card className={`${styles.card} ${!coupon.isActive ? styles.cardInactive : ''}`}>
            <div className={styles.cardHeader}>
                <div className={styles.couponIcon}>{coupon.emoji}</div>
                <div className={styles.cardHeaderActions}>
                    <span className={styles.typeBadge}>{typeLabels[coupon.type] || coupon.type}</span>
                    <button className={`${styles.toggleBtn} ${coupon.isActive ? styles.toggleOn : styles.toggleOff}`} onClick={onToggleActive} title={coupon.isActive ? "Desactivar" : "Activar"}>
                        {coupon.isActive ? '👁️' : '🙈'}
                    </button>
                </div>
            </div>

            <h3 className={styles.cardTitle}>{coupon.title}</h3>
            <p className={styles.cardDesc}>{coupon.description}</p>

            <div className={styles.cardFooter}>
                <div className={styles.expiryLabel}>
                    {coupon.expiryDate ? (<span>⏳ Hasta: <strong>{new Date(coupon.expiryDate).toLocaleDateString()}</strong></span>) : (<span>✨ Sin caducidad</span>)}
                </div>
            </div>

            {/* Hover actions */}
            <div className={styles.cardActionsOverlay}>
                <button className={styles.actionBtn} onClick={onEdit} title="Editar">✏️</button>
                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={onDelete} title="Eliminar">🗑️</button>
            </div>

            <div className={styles.tearLine}></div>
        </Card>
    );
}
