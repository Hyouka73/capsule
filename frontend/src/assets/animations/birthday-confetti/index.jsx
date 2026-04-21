/**
 * birthday-confetti — Placeholder animation component.
 *
 * Props:
 *   event    {object}   — The full specialEvent document from Firestore
 *   onClose  {function} — Call to mark event as seen and dismiss overlay
 *
 * Replace this file with your actual animation implementation.
 * The component receives `event` and `onClose` as props.
 */
export default function BirthdayConfetti({ event, onClose }) {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a0022, #3a0050)',
            gap: '1.5rem',
            textAlign: 'center',
            padding: '2rem',
        }}>
            <div style={{ fontSize: '6rem', lineHeight: 1 }}>🎂</div>
            <h1 style={{
                fontFamily: "'Fredoka', sans-serif",
                fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                fontWeight: 700,
                color: '#ffadc7',
                margin: 0,
            }}>
                {event.title || '¡Feliz Cumpleaños!'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>
                {event.animationSlug}
            </p>
            {event.isPersistent && (
                <button
                    onClick={onClose}
                    style={{
                        marginTop: '1rem',
                        padding: '0.85rem 2.5rem',
                        borderRadius: '1.875rem',
                        background: '#ffadc7',
                        color: '#4a3232',
                        fontFamily: "'Fredoka', sans-serif",
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 6px 0 #c06080',
                    }}
                >
                    ¡Gracias! 🌸
                </button>
            )}
        </div>
    );
}
