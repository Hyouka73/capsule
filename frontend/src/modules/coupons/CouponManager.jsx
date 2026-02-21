import { useState, useEffect } from 'react';
import Button from '../../components/ui/Button/Button';
import Card from '../../components/ui/Card/Card';
import PageHeader from '../../components/ui/PageHeader/PageHeader';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import styles from './CouponManager.module.css';

export default function CouponManager() {
    const [coupons, setCoupons] = useState([
        // Mock data to test UI
        { id: '1', emoji: '💆‍♀️', title: 'Masaje Relajante (30 min)', type: 'massage', description: 'Vale por un masaje completo de 30 minutos sin quejas.', instructions: 'Canjear en un lugar con privacidad y luz tenue.', expiryDate: '2026-12-31', isActive: true, isRedeemed: false },
        { id: '2', emoji: '🎬', title: 'Tarde de Cine', type: 'date_night', description: 'Tú eliges la película, yo pago las palomitas.', instructions: 'Válido para cualquier cine local o peli en casa.', expiryDate: null, isActive: true, isRedeemed: true, redeemedAt: '2025-10-14T20:00:00Z' },
        { id: '3', emoji: '🃏', title: 'Pase Libre', type: 'free_pass', description: 'Vale por salirte con la tuya en una discusión pequeña.', instructions: 'Úsalo con sabiduría. Aplican restricciones.', expiryDate: '2026-05-15', isActive: false, isRedeemed: false }
    ]);
    const [isLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);

    // Form state
    const [formData, setFormData] = useState({ emoji: '🎁', title: '', type: 'wish', description: '', instructions: '', expiryDate: '', isActive: true });

    const handleCreated = (e) => {
        e.preventDefault();
        const newCoupon = { id: Date.now().toString(), ...formData, isRedeemed: false };
        if (editingCoupon) {
            setCoupons(prev => prev.map(c => c.id === editingCoupon.id ? { ...c, ...formData } : c));
        } else {
            setCoupons(prev => [newCoupon, ...prev]);
        }
        setShowForm(false);
        setEditingCoupon(null);
        setFormData({ emoji: '🎁', title: '', type: 'wish', description: '', instructions: '', expiryDate: '', isActive: true });
    };

    const handleEdit = (c) => {
        setEditingCoupon(c);
        setFormData({
            emoji: c.emoji, title: c.title, type: c.type, description: c.description,
            instructions: c.instructions, expiryDate: c.expiryDate || '', isActive: c.isActive
        });
        setShowForm(true);
    };

    const handleDelete = (id) => {
        if (confirm('¿Seguro que quieres eliminar este cupón?')) {
            setCoupons(prev => prev.filter(c => c.id !== id));
        }
    };

    const toggleActive = (id) => {
        setCoupons(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
    };

    const availableCoupons = coupons.filter(c => !c.isRedeemed);
    const redeemedCoupons = coupons.filter(c => c.isRedeemed);

    return (
        <div className={styles.root}>
            <PageHeader
                title="Talonario de Cupones"
                subtitle={`${availableCoupons.length} disponibles, ${redeemedCoupons.length} canjeados`}
                actionLabel="Nuevo Cupón"
                actionIcon="✨"
                onAction={() => { setEditingCoupon(null); setFormData({ emoji: '🎁', title: '', type: 'wish', description: '', instructions: '', expiryDate: '', isActive: true }); setShowForm(true); }}
            />

            {/* Form panel */}
            {showForm && (
                <Card className={styles.formPanel} glass>
                    <div className={styles.formPanelHeader}>
                        <h2>{editingCoupon ? '✍️ Editar Cupón' : '✨ Nuevo Cupón Sorpresa'}</h2>
                        <button type="button" onClick={() => setShowForm(false)} className={styles.closeBtn} title="Cerrar">✕</button>
                    </div>
                    <form onSubmit={handleCreated} className={styles.form}>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup} style={{ flex: '0 0 80px' }}>
                                <label>Emoji</label>
                                <input type="text" maxLength="2" required value={formData.emoji} onChange={e => setFormData({ ...formData, emoji: e.target.value })} className={styles.emojiInput} />
                            </div>
                            <div className={styles.formGroup} style={{ flex: '1' }}>
                                <label>Título del Cupón</label>
                                <input type="text" required placeholder="Ej. Vale por un abrazo..." value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className={styles.input} />
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup} style={{ flex: '1' }}>
                                <label>Categoría</label>
                                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className={styles.input}>
                                    <option value="massage">💆‍♀️ Masaje / Relax</option>
                                    <option value="date_night">🍷 Date Night</option>
                                    <option value="free_pass">🃏 Pase Libre</option>
                                    <option value="wish">✨ Deseo Libre</option>
                                    <option value="naughty">🌶️ Picante</option>
                                </select>
                            </div>
                            <div className={styles.formGroup} style={{ flex: '1' }}>
                                <label>Expiración (Opcional)</label>
                                <input type="date" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} className={styles.input} />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Descripción corta</label>
                            <textarea required rows="2" placeholder="¿Qué incluye este cupón?" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className={styles.textarea} />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Reglas o instrucciones (Opcional)</label>
                            <input type="text" placeholder="Ej. Válido solo los fines de semana" value={formData.instructions} onChange={e => setFormData({ ...formData, instructions: e.target.value })} className={styles.input} />
                        </div>

                        <div className={styles.toggleGroup}>
                            <label className={styles.checkboxLabel}>
                                <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                                <span className={styles.checkboxText}>Cupón Activo (Visible para ella)</span>
                            </label>
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
                    <p>Buscando talones...</p>
                </div>
            ) : availableCoupons.length === 0 ? (
                <EmptyState
                    icon="🎟️"
                    title="El talonario está vacío"
                    description="Crea cupones con favores o citas divertidas para que ella los canjee cuando quiera."
                />
            ) : (
                <div className={styles.grid}>
                    {availableCoupons.map(coupon => (
                        <CouponCard key={coupon.id} coupon={coupon} onEdit={() => handleEdit(coupon)} onDelete={() => handleDelete(coupon.id)} onToggleActive={() => toggleActive(coupon.id)} />
                    ))}
                </div>
            )}

            {/* Redemption History */}
            {redeemedCoupons.length > 0 && (
                <div className={styles.historySection}>
                    <h3 className={styles.historyTitle}>📓 Historial de Canjes</h3>
                    <div className={styles.historyList}>
                        {redeemedCoupons.map(coupon => (
                            <div key={coupon.id} className={styles.historyItem}>
                                <div className={styles.historyItemIcon}>{coupon.emoji}</div>
                                <div className={styles.historyItemContent}>
                                    <h4>{coupon.title}</h4>
                                    <p>Canjeado el {new Date(coupon.redeemedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                </div>
                                <Button size="sm" variant="ghost" className={styles.reactivateBtn} onClick={() => setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, isRedeemed: false, isActive: true } : c))}>Reactivar</Button>
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
