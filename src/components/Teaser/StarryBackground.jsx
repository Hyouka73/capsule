import { useEffect, useRef } from 'react';
import './StarryBackground.css';

function StarryBackground() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let stars = [];
    let shootingStars = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createStars = () => {
      stars = [];
      const count = Math.floor((canvas.width * canvas.height) / 3000);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
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
    };

    const maybeCreateShootingStar = () => {
      if (Math.random() < 0.003 && shootingStars.length < 2) {
        shootingStars.push({
          x: Math.random() * canvas.width * 0.8,
          y: Math.random() * canvas.height * 0.3,
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
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
      const opacity = star.opacity * (0.6 + 0.4 * twinkle);
      const size = star.size * (0.8 + 0.2 * twinkle);

      ctx.beginPath();
      ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
      ctx.fillStyle = star.color;
      ctx.globalAlpha = opacity;
      ctx.fill();

      // Glow
      if (star.size > 1.2) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, size * 3, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, size * 3
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
    const animate = () => {
      time++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw stars
      stars.forEach(star => drawStar(star, time));

      // Shooting stars
      maybeCreateShootingStar();
      shootingStars.forEach(ss => {
        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;
        ss.life++;
        drawShootingStar(ss);
      });
      shootingStars = shootingStars.filter(ss => ss.life < ss.maxLife);

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    resize();
    createStars();
    animate();

    window.addEventListener('resize', () => {
      resize();
      createStars();
    });

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="starry-background">
      <canvas ref={canvasRef} className="starry-canvas" />
      <div className="nebula-overlay" />
    </div>
  );
}

export default StarryBackground;
