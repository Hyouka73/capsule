import { useEffect, useRef, useCallback } from 'react';
import './StarryBackground.css';

// Respect user's motion preferences
const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function StarryBackground() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const starsRef = useRef([]);
  const shootingStarsRef = useRef([]);

  const createStars = useCallback((width, height) => {
    const count = prefersReducedMotion()
      ? Math.floor((width * height) / 8000)
      : Math.floor((width * height) / 3000);

    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.3,
        opacity: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
        color: Math.random() > 0.85
          ? `hsl(${40 + Math.random() * 20}, 80%, 90%)`
          : Math.random() > 0.7
            ? `hsl(${280 + Math.random() * 40}, 40%, 85%)`
            : '#fffbe6',
      });
    }
    return stars;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reducedMotion = prefersReducedMotion();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      starsRef.current = createStars(window.innerWidth, window.innerHeight);
    };

    const maybeCreateShootingStar = () => {
      if (reducedMotion) return;
      if (Math.random() < 0.003 && shootingStarsRef.current.length < 2) {
        shootingStarsRef.current.push({
          x: Math.random() * window.innerWidth * 0.8,
          y: Math.random() * window.innerHeight * 0.3,
          length: Math.random() * 80 + 40,
          speed: Math.random() * 6 + 4,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
          opacity: 1,
          life: 0,
          maxLife: 60 + Math.random() * 40,
        });
      }
    };

    const drawStar = (star, time) => {
      const twinkle = reducedMotion
        ? 1
        : Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
      const opacity = star.opacity * (0.6 + 0.4 * twinkle);
      const size = star.size * (0.8 + 0.2 * twinkle);

      ctx.beginPath();
      ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
      ctx.fillStyle = star.color;
      ctx.globalAlpha = opacity;
      ctx.fill();

      // Glow for larger stars
      if (star.size > 1.2) {
        const glowRadius = size * 3;
        ctx.beginPath();
        ctx.arc(star.x, star.y, glowRadius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, glowRadius
        );
        gradient.addColorStop(0, star.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = opacity * 0.15;
        ctx.fill();
      }
    };

    const drawShootingStar = (ss) => {
      const progress = ss.life / ss.maxLife;
      const fadeIn = Math.min(progress * 5, 1);
      const fadeOut = Math.max(1 - (progress - 0.6) / 0.4, 0);
      const alpha = fadeIn * fadeOut * ss.opacity;

      const tailX = ss.x - Math.cos(ss.angle) * ss.length;
      const tailY = ss.y - Math.sin(ss.angle) * ss.length;

      const gradient = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.7, `rgba(255, 251, 230, ${alpha * 0.3})`);
      gradient.addColorStop(1, `rgba(255, 251, 230, ${alpha})`);

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(ss.x, ss.y);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 1;
      ctx.stroke();

      // Head glow
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fffbe6';
      ctx.globalAlpha = alpha;
      ctx.fill();
    };

    let time = 0;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const animate = () => {
      time++;
      ctx.clearRect(0, 0, w, h);

      // Draw stars
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        drawStar(stars[i], time);
      }

      // Shooting stars
      maybeCreateShootingStar();
      const shooting = shootingStarsRef.current;
      for (let i = 0; i < shooting.length; i++) {
        const ss = shooting[i];
        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;
        ss.life++;
        drawShootingStar(ss);
      }
      shootingStarsRef.current = shooting.filter(ss => ss.life < ss.maxLife);

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    resize();

    // Static render for reduced motion — no animation loop
    if (reducedMotion) {
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        drawStar(stars[i], 0);
      }
      ctx.globalAlpha = 1;
    } else {
      animate();
    }

    // Properly reference the same function for cleanup
    const handleResize = () => resize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [createStars]);

  return (
    <div className="starry-background" aria-hidden="true">
      <canvas ref={canvasRef} className="starry-canvas" />
      <div className="nebula-overlay" />
    </div>
  );
}

export default StarryBackground;
