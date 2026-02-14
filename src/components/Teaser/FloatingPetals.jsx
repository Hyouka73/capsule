import './FloatingPetals.css';

/**
 * CSS-only floating petals — lightweight ambient effect
 * Creates ~12 drifting particles (gold/rose) for romantic atmosphere
 */
function FloatingPetals() {
    return (
        <div className="floating-petals" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
                <div
                    key={i}
                    className={`petal petal--${(i % 3) + 1}`}
                    style={{
                        '--delay': `${i * 2.5}s`,
                        '--x-start': `${10 + Math.random() * 80}%`,
                        '--drift': `${(Math.random() - 0.5) * 100}px`,
                        '--size': `${3 + Math.random() * 4}px`,
                        '--duration': `${12 + Math.random() * 10}s`,
                    }}
                />
            ))}
        </div>
    );
}

export default FloatingPetals;
