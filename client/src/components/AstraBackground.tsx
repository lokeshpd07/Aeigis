import { useEffect, useRef } from "react";

interface Particle3D {
  x0: number;
  y0: number;
  z0: number;
  radius: number;
  colorType: "amber" | "gold" | "cyan" | "white";
  freq: number;
  phase: number;
  amp: number;
  pulseSpeed: number;
  pulseOffset: number;
}

export default function AstraBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    // Mouse tracking with smooth lerp
    const mouse = {
      x: width * 0.5,
      y: height * 0.45,
      targetX: width * 0.5,
      targetY: height * 0.45,
      active: false,
      hoverRadius: 150,
    };

    // Scroll tracking
    let scrollY = window.scrollY || 0;
    let targetScrollY = scrollY;

    // 3D rotation state
    let rotX = 0;
    let rotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let frame = 0;

    const FOV = 420;
    const isMobile = width < 768;
    const PARTICLE_COUNT = isMobile ? 65 : 95;
    // No fixed world bounds — use perspective-aware seeding instead
    const BOUNDS_Z_MIN = 140;
    const BOUNDS_Z_MAX = 1050;
    // World-space Y wrap range (keep particles looping vertically on scroll)
    const WRAP_Y = 900;

    // ── Pre-render glowing particle sprites for ultra-high 60fps performance ──
    const createSprite = (
      coreColor: string,
      glowColor: string,
      size = 64
    ): HTMLCanvasElement => {
      const off = document.createElement("canvas");
      off.width = size;
      off.height = size;
      const offCtx = off.getContext("2d");
      if (!offCtx) return off;

      const center = size / 2;
      const grad = offCtx.createRadialGradient(
        center,
        center,
        0,
        center,
        center,
        center
      );
      grad.addColorStop(0, coreColor);
      grad.addColorStop(0.22, glowColor);
      grad.addColorStop(0.65, glowColor.replace(/[\d.]+\)$/, "0.08)"));
      grad.addColorStop(1, "rgba(0,0,0,0)");

      offCtx.fillStyle = grad;
      offCtx.beginPath();
      offCtx.arc(center, center, center, 0, Math.PI * 2);
      offCtx.fill();

      // Solid bright core dot in the exact center
      offCtx.fillStyle = coreColor;
      offCtx.beginPath();
      offCtx.arc(center, center, size * 0.12, 0, Math.PI * 2);
      offCtx.fill();

      return off;
    };

    const sprites: Record<string, HTMLCanvasElement> = {
      amber: createSprite("#ffb078", "rgba(255, 138, 61, 0.52)"),
      gold: createSprite("#ffe0b2", "rgba(255, 185, 115, 0.49)"),
      cyan: createSprite("#b2fff2", "rgba(69, 227, 198, 0.49)"),
      white: createSprite("#ffffff", "rgba(255, 255, 255, 0.38)"),
    };

    // Initialize 3D particle positions
    const particles: Particle3D[] = [];
    const colorTypes: ("amber" | "gold" | "cyan" | "white")[] = [
      "amber",
      "amber",
      "amber",
      "gold",
      "gold",
      "cyan",
      "white",
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const z0 = BOUNDS_Z_MIN + Math.random() * (BOUNDS_Z_MAX - BOUNDS_Z_MIN);
      // Seed x0/y0 in perspective-corrected space so every depth layer
      // fills the full screen width/height uniformly (no sparse edges).
      // screen_half_x = (z0 / FOV) * (width / 2) → gives exact screen-edge coverage
      const halfScreenX = (z0 / FOV) * (width * 0.52);
      const halfScreenY = (z0 / FOV) * (height * 0.54);
      const x0 = (Math.random() - 0.5) * 2 * halfScreenX;
      const y0 = (Math.random() - 0.5) * 2 * halfScreenY;
      const colorType = colorTypes[Math.floor(Math.random() * colorTypes.length)];

      particles.push({
        x0,
        y0,
        z0,
        radius: colorType === "white" ? 0.7 : 1.0 + Math.random() * 0.9,
        colorType,
        // Slow, gentle freq range — no more jumpy fast particles
        freq: 0.25 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        amp: 8 + Math.random() * 10,
        pulseSpeed: 0.006 + Math.random() * 0.008,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    const onMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;

      // 3D parallax angle — halved sensitivity for gentler tilt
      const normX = e.clientX / width - 0.5;
      const normY = e.clientY / height - 0.5;
      targetRotY = normX * 0.18;
      targetRotX = -normY * 0.14;
    };

    const onMouseLeave = () => {
      mouse.active = false;
      targetRotX = 0;
      targetRotY = 0;
    };

    const onScroll = () => {
      targetScrollY = window.scrollY || 0;
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    // Projected particle buffer
    const projected: {
      p: Particle3D;
      sx: number;
      sy: number;
      sz: number;
      scale: number;
      alpha: number;
      distToMouse: number;
    }[] = [];

    // Render loop
    const render = () => {
      frame++;

      // Smooth mouse lerp
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      // Smooth scroll lerp
      scrollY += (targetScrollY - scrollY) * 0.09;

      // 3D rotation — slow lerp for dreamy glide
      rotX += (targetRotX - rotX) * 0.025;
      rotY += (targetRotY - rotY) * 0.025;

      // Very slow, barely perceptible auto-drift
      const autoTiltX = Math.sin(frame * 0.0012) * 0.012;
      const autoTiltY = Math.cos(frame * 0.0009) * 0.016;
      const curRotX = rotX + autoTiltX;
      const curRotY = rotY + autoTiltY;

      const cosX = Math.cos(curRotX);
      const sinX = Math.sin(curRotX);
      const cosY = Math.cos(curRotY);
      const sinY = Math.sin(curRotY);

      const centerX = width * 0.5;
      const centerY = height * 0.48;

      ctx.clearRect(0, 0, width, height);

      // Project particles in 3D
      projected.length = 0;
      // Reduced scroll parallax coefficient for slower vertical drift
      const scrollOffset = scrollY * 0.12;
      const totalYRange = WRAP_Y * 2;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Very slow harmonic drift — reduced freq multipliers ~4× vs before
        const waveY =
          Math.sin(p.x0 * 0.003 + frame * 0.005 * p.freq + scrollOffset * 0.001) *
          p.amp;
        const waveZ =
          Math.cos(p.y0 * 0.002 + frame * 0.004 + scrollOffset * 0.0008) *
          (p.amp * 0.4);

        let rawY = p.y0 - scrollOffset + waveY;
        rawY = (((rawY + WRAP_Y) % (WRAP_Y * 2)) + WRAP_Y * 2) % (WRAP_Y * 2) - WRAP_Y;

        const rawX = p.x0;
        const rawZ = p.z0 + waveZ;

        // Apply 3D Y-axis rotation (yaw)
        const xRot = rawX * cosY + rawZ * sinY;
        const zMid = -rawX * sinY + rawZ * cosY;

        // Apply 3D X-axis rotation (pitch)
        const yRot = rawY * cosX - zMid * sinX;
        const zFinal = rawY * sinX + zMid * cosX;

        if (zFinal < 40) continue;

        const scale = FOV / zFinal;
        let sx = centerX + xRot * scale;
        let sy = centerY + yRot * scale;

        // Interactive mouse repulsion/attraction in screen space
        const dx = sx - mouse.x;
        const dy = sy - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (mouse.active && dist < mouse.hoverRadius) {
          const force = Math.pow(1 - dist / mouse.hoverRadius, 1.5) * 32;
          const angle = Math.atan2(dy, dx);
          sx += Math.cos(angle) * force;
          sy += Math.sin(angle) * force;
        }

        // Depth-based alpha
        const depthNorm = Math.max(0, 1 - (zFinal - BOUNDS_Z_MIN) / (BOUNDS_Z_MAX - BOUNDS_Z_MIN));
        const pulse = 0.85 + Math.sin(frame * p.pulseSpeed + p.pulseOffset) * 0.15;
        const baseAlpha = (0.21 + depthNorm * 0.42) * pulse;

        let hoverBoost = 0;
        if (mouse.active && dist < mouse.hoverRadius) {
          hoverBoost = (1 - dist / mouse.hoverRadius) * 0.28;
        }

        const finalAlpha = Math.min(baseAlpha + hoverBoost, 0.66);

        projected.push({
          p,
          sx,
          sy,
          sz: zFinal,
          scale,
          alpha: finalAlpha,
          distToMouse: dist,
        });
      }

      // ── Batch render 3D constellation filament lines ──
      const MAX_DIST_2D = isMobile ? 65 : 88;
      const MAX_DIST_SQ = MAX_DIST_2D * MAX_DIST_2D;
      const MAX_Z_DIFF = 200;

      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 145, 70, 0.10)";
      ctx.lineWidth = 0.6;

      const len = projected.length;
      for (let i = 0; i < len; i++) {
        const p1 = projected[i];

        for (let j = i + 1; j < len; j++) {
          const p2 = projected[j];

          if (Math.abs(p1.sz - p2.sz) > MAX_Z_DIFF) continue;

          const dx = p1.sx - p2.sx;
          if (Math.abs(dx) > MAX_DIST_2D) continue;
          const dy = p1.sy - p2.sy;
          if (Math.abs(dy) > MAX_DIST_2D) continue;

          const distSq = dx * dx + dy * dy;
          if (distSq < MAX_DIST_SQ) {
            ctx.moveTo(p1.sx, p1.sy);
            ctx.lineTo(p2.sx, p2.sy);
          }
        }
      }
      ctx.stroke();

      // ── Render 3D pre-rendered particle sprites ──
      for (let i = 0; i < len; i++) {
        const { p, sx, sy, scale, alpha } = projected[i];
        const sprite = sprites[p.colorType] || sprites.amber;
        const spriteSize = Math.max(8, p.radius * scale * 13);

        ctx.globalAlpha = alpha;
        ctx.drawImage(
          sprite,
          sx - spriteSize * 0.5,
          sy - spriteSize * 0.5,
          spriteSize,
          spriteSize
        );
      }

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="astra-background-canvas"
      aria-hidden="true"
    />
  );
}
