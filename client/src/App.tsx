import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Toaster } from "sonner";
import AstraBackground from "@/components/AstraBackground";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Ban,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  CloudUpload,
  Copy,
  Download,
  EyeOff,
  FileAudio,
  FileCheck2,
  FileText,
  Fingerprint,
  Flag,
  Headphones,
  Hexagon,
  History,
  Home,
  KeyRound,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  MoreHorizontal,
  Phone,
  Play,
  Plus,
  Radio,
  ScanLine,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import "./index.css";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type View =
  | "landing"
  | "login"
  | "register"
  | "dashboard"
  | "analysis"
  | "result"
  | "history"
  | "reports"
  | "report-detail"
  | "evidence"
  | "settings";

const VALID_VIEWS: View[] = [
  "landing",
  "login",
  "register",
  "dashboard",
  "analysis",
  "result",
  "history",
  "reports",
  "report-detail",
  "evidence",
  "settings",
];

type Verdict = "HUMAN" | "AI CLONED" | "REPLAY ATTACK";

type User = {
  name: string;
  email: string;
  password: string;
  role: string;
};

type AuthState = {
  isAuthenticated: boolean;
  user: Omit<User, "password"> | null;
};

type DemoAudio = {
  id: string;
  name: string;
  detail: string;
  duration: string;
  verdict: Verdict;
  confidence: number;
  human: number;
  ai: number;
  replay: number;
  threat: number;
  color: string;
  isDemo: boolean;
};

type Analysis = DemoAudio & {
  analysisId: string;
  timestamp: string;
  hash: string;
  flagged?: boolean;
  reportGenerated?: boolean;
  actions?: string[];
};

type Report = {
  reportId: string;
  analysis: Analysis;
  generatedAt: string;
};

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const STAGES = [
  { label: "Audio received", detail: "Signal lock acquired at 48.02 kHz" },
  { label: "Audio processing", detail: "Normalising and filtering input stream" },
  { label: "Acoustic analysis", detail: "Mapping spectral and timbre fingerprint" },
  { label: "Replay detection", detail: "Scanning for device / room artifacts" },
  { label: "Voice behaviour analysis", detail: "Comparing cadence and formant vectors" },
  { label: "Threat fusion", detail: "Fusing evidence streams into posture score" },
  { label: "Classification", detail: "Running final multi-layer inference" },
  { label: "Evidence generation", detail: "Sealing tamper-evident record" },
];

const DEMO_AUDIOS: DemoAudio[] = [
  { id: "h01", name: "Human Voice 01", detail: "Neutral speaker · studio capture", duration: "00:18", verdict: "HUMAN", confidence: 94, human: 94, ai: 3, replay: 3, threat: 6, color: "mint", isDemo: true },
  { id: "h02", name: "Human Voice 02", detail: "Conversational · room tone", duration: "00:23", verdict: "HUMAN", confidence: 91, human: 91, ai: 5, replay: 4, threat: 9, color: "mint", isDemo: true },
  { id: "a01", name: "AI Clone 01", detail: "Synthetic timbre · neural render", duration: "00:16", verdict: "AI CLONED", confidence: 87, human: 8, ai: 87, replay: 5, threat: 87, color: "violet", isDemo: true },
  { id: "a02", name: "AI Clone 02", detail: "Voice transfer · low artifacts", duration: "00:21", verdict: "AI CLONED", confidence: 89, human: 4, ai: 89, replay: 7, threat: 82, color: "violet", isDemo: true },
  { id: "r01", name: "Replay Attack 01", detail: "Speaker playback · reflected room", duration: "00:11", verdict: "REPLAY ATTACK", confidence: 84, human: 10, ai: 6, replay: 84, threat: 91, color: "amber", isDemo: true },
  { id: "r02", name: "Replay Attack 02", detail: "Device playback · compression", duration: "00:14", verdict: "REPLAY ATTACK", confidence: 88, human: 7, ai: 5, replay: 88, threat: 94, color: "amber", isDemo: true },
];

const DEFAULT_USERS: User[] = [
  { name: "Jordan Davis", email: "analyst@aegis.local", password: "demo1234", role: "Security Analyst" },
];

const INITIAL_HISTORY: Analysis[] = [
  { ...DEMO_AUDIOS[4], analysisId: "AEG-7F21-91C4", timestamp: "Today, 14:28", hash: "a9f3…7c02", flagged: false, reportGenerated: true },
  { ...DEMO_AUDIOS[2], analysisId: "AEG-7E88-6B9A", timestamp: "Today, 11:06", hash: "2e71…c840", flagged: false, reportGenerated: false },
  { ...DEMO_AUDIOS[0], analysisId: "AEG-7D05-4AF1", timestamp: "Yesterday, 18:42", hash: "7d18…0a6e", flagged: false, reportGenerated: true },
  { ...DEMO_AUDIOS[1], analysisId: "AEG-7B19-2E77", timestamp: "Yesterday, 10:15", hash: "3c55…d019", flagged: false, reportGenerated: false },
];

const NAV_ITEMS: { id: View; label: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Overview", icon: Home },
  { id: "analysis", label: "Voice analysis", icon: ScanLine },
  { id: "history", label: "Analysis history", icon: History },
  { id: "reports", label: "Threat reports", icon: BarChart3 },
  { id: "evidence", label: "Evidence vault", icon: Fingerprint },
];

// ─────────────────────────────────────────────────────────────
// AUTH STORE
// ─────────────────────────────────────────────────────────────
function useAuthStore() {
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const saved = localStorage.getItem("aegis-auth");
      return saved ? JSON.parse(saved) : { isAuthenticated: false, user: null };
    } catch {
      return { isAuthenticated: false, user: null };
    }
  });

  const getUsers = (): User[] => {
    try {
      const saved = localStorage.getItem("aegis-users");
      return saved ? JSON.parse(saved) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  };

  const login = (email: string, password: string): string | null => {
    const users = getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) return "Invalid email or access key. Please try again.";
    const next: AuthState = { isAuthenticated: true, user: { name: user.name, email: user.email, role: user.role } };
    localStorage.setItem("aegis-auth", JSON.stringify(next));
    setAuth(next);
    return null;
  };

  const register = (name: string, email: string, password: string, confirm: string): string | null => {
    if (!name.trim()) return "Name is required.";
    if (!email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return "Valid email address required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirm) return "Passwords do not match.";
    const users = getUsers();
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) return "An account with this email already exists.";
    const newUser: User = { name: name.trim(), email: email.trim(), password, role: "Security Analyst" };
    const updated = [...users, newUser];
    localStorage.setItem("aegis-users", JSON.stringify(updated));
    const next: AuthState = { isAuthenticated: true, user: { name: newUser.name, email: newUser.email, role: newUser.role } };
    localStorage.setItem("aegis-auth", JSON.stringify(next));
    setAuth(next);
    return null;
  };

  const logout = () => {
    localStorage.removeItem("aegis-auth");
    setAuth({ isAuthenticated: false, user: null });
  };

  return { auth, login, register, logout };
}

// ─────────────────────────────────────────────────────────────
// HISTORY STORE
// ─────────────────────────────────────────────────────────────
function useLocalHistory() {
  const [history, setHistory] = useState<Analysis[]>(() => {
    try {
      const saved = localStorage.getItem("aegis-history");
      return saved ? JSON.parse(saved) : INITIAL_HISTORY;
    } catch {
      return INITIAL_HISTORY;
    }
  });

  const add = useCallback((analysis: Analysis) => {
    setHistory((current) => {
      const next = [analysis, ...current.filter((item) => item.analysisId !== analysis.analysisId)].slice(0, 50);
      localStorage.setItem("aegis-history", JSON.stringify(next));
      return next;
    });
  }, []);

  const update = useCallback((analysisId: string, patch: Partial<Analysis>) => {
    setHistory((current) => {
      const next = current.map((item) => item.analysisId === analysisId ? { ...item, ...patch } : item);
      localStorage.setItem("aegis-history", JSON.stringify(next));
      return next;
    });
  }, []);

  return [history, add, update] as const;
}

// ─────────────────────────────────────────────────────────────
// REPORTS STORE
// ─────────────────────────────────────────────────────────────
function useReports() {
  const [reports, setReports] = useState<Report[]>(() => {
    try {
      const saved = localStorage.getItem("aegis-reports");
      if (saved) return JSON.parse(saved);
      // Seed from initial history items that have reportGenerated
      return INITIAL_HISTORY.filter((a) => a.reportGenerated).map((a) => ({
        reportId: `RPT-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
        analysis: a,
        generatedAt: a.timestamp,
      }));
    } catch {
      return [];
    }
  });

  const addReport = useCallback((analysis: Analysis): Report => {
    const report: Report = {
      reportId: `RPT-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
      analysis,
      generatedAt: new Date().toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", year: "numeric" }),
    };
    setReports((current) => {
      const next = [report, ...current.filter((r) => r.analysis.analysisId !== analysis.analysisId)];
      localStorage.setItem("aegis-reports", JSON.stringify(next));
      return next;
    });
    return report;
  }, []);

  return [reports, addReport] as const;
}

// ─────────────────────────────────────────────────────────────
// MOTION VARS HOOK
// ─────────────────────────────────────────────────────────────
function useMotionVars() {
  useEffect(() => {
    const root = document.documentElement;
    const onMove = (event: MouseEvent) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      root.style.setProperty("--mx", `${(x * 10).toFixed(2)}deg`);
      root.style.setProperty("--my", `${(y * 10).toFixed(2)}deg`);
      root.style.setProperty("--cursor-x", `${event.clientX}px`);
      root.style.setProperty("--cursor-y", `${event.clientY}px`);
    };
    const onScroll = () => root.style.setProperty("--scroll-y", `${window.scrollY}`);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
}

// ─────────────────────────────────────────────────────────────
// SMALL UTILITY COMPONENTS
// ─────────────────────────────────────────────────────────────
function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-lockup ${compact ? "brand-lockup--compact" : ""}`}>
      <div className="brand-mark"><Hexagon size={compact ? 18 : 22} strokeWidth={1.6} /><span /></div>
      {!compact && <div><div className="brand-name">AEGIS</div><div className="brand-sub">ACOUSTICTRUST</div></div>}
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <div className="kicker"><span className="kicker-line" />{children}</div>;
}

function Button({
  children, variant = "primary", onClick, className = "", type = "button", disabled = false, style,
}: {
  children: React.ReactNode; variant?: "primary" | "ghost" | "outline" | "quiet"; onClick?: () => void; className?: string; type?: "button" | "submit"; disabled?: boolean; style?: React.CSSProperties;
}) {
  return <button type={type} disabled={disabled} onClick={onClick} className={`btn btn--${variant} ${className}`} style={style}>{children}</button>;
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "mint" | "violet" | "amber" | "red" }) {
  return <span className={`pill pill--${tone}`}><span className="pill-dot" />{children}</span>;
}

function Waveform({ tone = "mint", dense = false }: { tone?: string; dense?: boolean }) {
  const bars = useMemo(() => Array.from({ length: dense ? 72 : 52 }, (_, i) => 16 + ((i * 37) % 42) + (i % 5 === 0 ? 15 : 0)), [dense]);
  return <div className={`waveform waveform--${tone}`} aria-label="Audio waveform visualization">{bars.map((h, i) => <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 28}ms` }} />)}</div>;
}

function ParticleSignal({ compact = false }: { compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0, animId = 0;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const bounds = canvas.getBoundingClientRect();
      canvas.width = bounds.width * ratio;
      canvas.height = bounds.height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const render = () => {
      const bounds = canvas.getBoundingClientRect();
      const W = bounds.width, H = bounds.height, cy = H * 0.52;
      ctx.clearRect(0, 0, W, H);
      if (W === 0 || H === 0) {
        frame++;
        animId = requestAnimationFrame(render);
        return;
      }

      const pts = compact ? 130 : 280;
      const t = frame * 0.038;

      // Audio rhythm and cadence modulation (simulating active speech bursts and cadence)
      const cadence = 0.88 + 0.32 * Math.sin(t * 0.6) * Math.cos(t * 0.28);
      const ampScale = compact ? 0.62 : 1.0;

      // Compute wave points for primary and secondary waves with alternating large/small wave packets
      const mainPoints: { x: number; y: number; isLarge: boolean; amp: number; p: number }[] = [];
      const subPoints: { x: number; y: number }[] = [];

      for (let i = 0; i <= pts; i++) {
        const p = i / pts;
        const x = p * W;
        // Edge envelope to taper smoothly at ends
        const env = Math.sin(p * Math.PI) ** 0.62;

        // Alternating wave packet pattern: distinct large peak zones alternating with small ripple zones
        const altPattern = Math.sin(p * Math.PI * 7 + t * 0.45);
        const altWeight = (altPattern + 1) * 0.5; // 0 (small wave region) to 1 (large wave region)

        // Large wave component (bold, expressive acoustic vocal crests)
        const largeWave = (
          Math.sin(p * 14 - t * 1.25) * 38 +
          Math.sin(p * 26 + t * 0.95) * 22 +
          Math.sin(p * 8 - t * 0.55) * 18
        );

        // Small wave component (fine, rapid audio harmonics & crisp ripple texture)
        const smallWave = (
          Math.sin(p * 48 + t * 1.8) * 9.5 +
          Math.sin(p * 92 - t * 2.3) * 5.5 +
          Math.sin(p * 135 + t * 3.1) * 2.8
        );

        // Blend alternating large & small waves
        // When altWeight is high -> largeWave expands dramatically; when low -> smallWave ripples tightly
        const combinedWave = (largeWave * (0.22 + 0.98 * (altWeight ** 1.35)) + smallWave * (1.15 - 0.45 * altWeight)) * env * cadence * ampScale;
        const y = cy + combinedWave;

        const isLarge = altWeight > 0.52;
        const amp = Math.abs(combinedWave);
        mainPoints.push({ x, y, isLarge, amp, p });

        // Secondary harmonic counter-wave
        const subAltPattern = Math.cos(p * Math.PI * 7 + t * 0.45);
        const subAltWeight = (subAltPattern + 1) * 0.5;
        const subLarge = Math.sin(p * 18 + t * 1.15 + 1.2) * 26 + Math.sin(p * 34 - t * 0.85) * 14;
        const subSmall = Math.sin(p * 64 - t * 1.7) * 6.5 + Math.sin(p * 110 + t * 2.5) * 3;
        const subY = cy + (subLarge * (0.18 + 0.92 * subAltWeight) + subSmall * (1.05 - 0.35 * subAltWeight)) * env * cadence * ampScale * 0.72;
        subPoints.push({ x, y: subY });
      }

      // 1. Subtle area fill under primary wave
      ctx.beginPath();
      ctx.moveTo(0, cy);
      for (let i = 0; i <= pts; i++) {
        ctx.lineTo(mainPoints[i].x, mainPoints[i].y);
      }
      ctx.lineTo(W, cy);
      ctx.closePath();
      const areaGrad = ctx.createLinearGradient(0, cy - 65 * ampScale, 0, cy + 65 * ampScale);
      areaGrad.addColorStop(0, "rgba(255, 138, 61, 0.08)");
      areaGrad.addColorStop(0.5, "rgba(255, 185, 115, 0.035)");
      areaGrad.addColorStop(1, "rgba(255, 138, 61, 0.08)");
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // 2. Vertical frequency spectral stems connecting baseline to waveform
      const stemStep = compact ? 5 : 3;
      for (let i = 0; i <= pts; i += stemStep) {
        const pt = mainPoints[i];
        const dist = Math.abs(pt.y - cy);
        if (dist > 2) {
          const stemAlpha = Math.min(0.36, 0.05 + (dist / 60) * 0.3);
          ctx.beginPath();
          ctx.moveTo(pt.x, cy);
          ctx.lineTo(pt.x, pt.y);
          ctx.strokeStyle = pt.isLarge
            ? `rgba(255, 138, 61, ${stemAlpha})`
            : `rgba(255, 195, 130, ${stemAlpha * 0.65})`;
          ctx.lineWidth = pt.isLarge ? 1.0 : 0.6;
          ctx.stroke();
        }
      }

      // 3. Secondary harmonic resonant wave (subtle golden accent wave)
      ctx.beginPath();
      ctx.moveTo(0, cy);
      for (let i = 0; i <= pts; i++) {
        ctx.lineTo(subPoints[i].x, subPoints[i].y);
      }
      ctx.strokeStyle = "rgba(255, 195, 130, 0.28)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Primary high-definition active audio wave
      ctx.beginPath();
      ctx.moveTo(0, cy);
      for (let i = 0; i <= pts; i++) {
        ctx.lineTo(mainPoints[i].x, mainPoints[i].y);
      }
      const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
      lineGrad.addColorStop(0, "rgba(255, 138, 61, 0.45)");
      lineGrad.addColorStop(0.25, "rgba(255, 185, 115, 0.95)");
      lineGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.98)");
      lineGrad.addColorStop(0.75, "rgba(255, 185, 115, 0.95)");
      lineGrad.addColorStop(1, "rgba(255, 138, 61, 0.45)");
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = compact ? 1.2 : 1.8;
      ctx.shadowColor = "rgba(255, 138, 61, 0.65)";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow for performance

      // 5. Active particle nodes along the wave (larger glowing nodes on large waves, fine dots on small waves)
      const particleStep = compact ? 3 : 2;
      for (let i = 0; i <= pts; i += particleStep) {
        const pt = mainPoints[i];
        const env = Math.sin(pt.p * Math.PI) ** 0.65;
        if (env < 0.05) continue;

        let r: number;
        let alpha: number;
        let colorStr: string;

        if (pt.isLarge && pt.amp > 16 * ampScale) {
          // Large wave peak node - bright & pulsing
          const pulse = Math.sin(pt.p * 30 + t * 2) * 0.6;
          r = (1.8 + pulse) * (compact ? 0.75 : 1.0);
          alpha = 0.55 + env * 0.42;
          colorStr = `rgba(255, 220, 180, ${alpha})`;

          // Halo around prominent peaks
          if (i % 6 === 0 && pt.amp > 26 * ampScale) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, r * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 138, 61, ${0.16 * env})`;
            ctx.fill();
          }
        } else {
          // Small wave node - fine pinpoint
          r = (0.9 + Math.abs(Math.sin(pt.p * 45 + t)) * 0.5) * (compact ? 0.7 : 1.0);
          alpha = 0.3 + env * 0.45;
          const orange = 120 + Math.round(pt.p * 90);
          colorStr = `rgba(255, ${orange}, 70, ${alpha})`;
        }

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(0.6, r), 0, Math.PI * 2);
        ctx.fillStyle = colorStr;
        ctx.fill();
      }

      frame++;
      animId = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    render();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [compact]);
  return (
    <div className={`particle-signal ${compact ? "particle-signal--compact" : ""}`}>
      <div className="particle-signal__glow" />
      <canvas ref={canvasRef} />
      <div className="particle-signal__label">AUDIO SIGNATURE<strong>LIVE / 48.02 KHZ</strong></div>
      <div className="particle-signal__axis" />
    </div>
  );
}

function OrbArt({ compact = false }: { compact?: boolean }) {
  return <ParticleSignal compact={compact} />;
}

function ArrowUpRightIcon() { return <ArrowRight size={16} className="arrow-up-right" />; }

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: React.ReactNode; description?: string; action?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <Kicker>{eyebrow}</Kicker>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-header__action">{action}</div>}
    </div>
  );
}

function StatCard({ label, value, change, tone, icon: Icon }: { label: string; value: string; change: string; tone: string; icon: typeof Activity }) {
  return (
    <div className={`stat-card stat-card--${tone} tilt-card`}>
      <div className="stat-card__top"><span>{label}</span><span className="stat-card__icon"><Icon size={17} /></span></div>
      <strong>{value}</strong>
      <div className="stat-card__bottom"><span className="trend"><ArrowUpRightIcon /> {change}</span><span>vs last 30 days</span></div>
    </div>
  );
}

function Probability({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="probability">
      <div><span>{label}</span><strong>{value}%</strong></div>
      <div className="probability__track"><span className={`fill fill--${tone}`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MOCK RESULT FOR UPLOADED FILE
// ─────────────────────────────────────────────────────────────
function getMockResultForFile(fileName: string): DemoAudio {
  let hash = 0;
  for (let i = 0; i < fileName.length; i++) hash = (hash * 31 + fileName.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % 3;
  if (idx === 0) return { id: "custom", name: fileName, detail: "Uploaded file · user audio", duration: "--:--", verdict: "HUMAN", confidence: 91, human: 91, ai: 5, replay: 4, threat: 9, color: "mint", isDemo: false };
  if (idx === 1) return { id: "custom", name: fileName, detail: "Uploaded file · user audio", duration: "--:--", verdict: "AI CLONED", confidence: 84, human: 9, ai: 84, replay: 7, threat: 84, color: "violet", isDemo: false };
  return { id: "custom", name: fileName, detail: "Uploaded file · user audio", duration: "--:--", verdict: "REPLAY ATTACK", confidence: 81, human: 12, ai: 7, replay: 81, threat: 88, color: "amber", isDemo: false };
}

// ─────────────────────────────────────────────────────────────
// LANDING PAGE
// ─────────────────────────────────────────────────────────────
function Landing({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="landing-page">
      <header className="public-nav container">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", textAlign: "left" }}
        >
          <Logo />
        </button>
        <nav className="public-nav__links">
          <a
            href="#signal"
            onClick={(e) => {
              e.preventDefault();
              scrollTo("signal");
            }}
          >
            Signal intelligence
          </a>
          <a
            href="#workflow"
            onClick={(e) => {
              e.preventDefault();
              scrollTo("workflow");
            }}
          >
            How it works
          </a>
          <a
            href="#trust"
            onClick={(e) => {
              e.preventDefault();
              scrollTo("trust");
            }}
          >
            Trust layer
          </a>
        </nav>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" onClick={onRegister}>Register</Button>
          <Button variant="outline" onClick={onLogin}>Access console <ArrowRight size={15} /></Button>
        </div>
      </header>
      <main>
        <section className="hero container" id="signal">
          <div className="hero__copy">
            <Kicker>Acoustic authenticity infrastructure <span className="live-pulse" /></Kicker>
            <h1>Know the voice<br /><em>before you trust it.</em></h1>
            <p className="hero__lede">AEGIS analyzes the hidden fingerprints inside a voice signal—separating human presence from synthetic clones and replay attacks in real time.</p>
            <div className="hero__actions">
              <Button onClick={onLogin}>Enter interactive demo <ArrowUpRightIcon /></Button>
              <button className="text-link" onClick={() => document.getElementById("workflow")?.scrollIntoView({ behavior: "smooth" })}>Explore the signal <ArrowDownRight size={16} /></button>
            </div>
            <div className="hero__meta">
              <div><span className="meta-value">99.2%</span><span className="meta-label">signal fidelity</span></div>
              <div><span className="meta-value">&lt; 2.4s</span><span className="meta-label">decision latency</span></div>
              <div><span className="meta-value">3×</span><span className="meta-label">threat vectors</span></div>
            </div>
          </div>
          <div className="hero__visual">
            <div className="visual-grid" />
            <div className="visual-orbit visual-orbit--a" /><div className="visual-orbit visual-orbit--b" />
            <OrbArt />
            <div className="signal-tag signal-tag--top"><span className="signal-tag__pulse" />LIVE SIGNAL<span>48.02 kHz</span></div>
            <div className="signal-tag signal-tag--bottom"><span>AUTHENTICITY INDEX</span><strong>94.8</strong><small>+ 4.2%</small></div>
            <div className="hero__coordinate">43° 18' 22.6" N<br />72° 41' 04.1" W</div>
          </div>
        </section>
        <section className="proof-strip container"><div className="proof-strip__line" /><span>Built for the moment when "sounds right" isn't enough.</span><div className="proof-strip__line" /></section>
        <section className="story-section container" id="workflow">
          <div className="story-section__intro"><Kicker>From waveform to verdict</Kicker><h2>Every voice leaves<br /><em>a trace.</em></h2><p>Trust is not a binary. AEGIS fuses acoustic, behavioral, and replay signals into one explainable decision layer.</p></div>
          <div className="signal-cards">
            {[{ num: "01", title: "Capture", text: "Preserve the raw signal before noise or compression can hide its origin.", icon: Radio }, { num: "02", title: "Decompose", text: "Read micro-patterns across timbre, cadence, and device resonance.", icon: Activity }, { num: "03", title: "Decide", text: "Turn competing evidence into a clear, defensible threat posture.", icon: ShieldCheck }].map(({ num, title, text, icon: Icon }) => (
              <div className="signal-card tilt-card" key={num}>
                <div className="signal-card__num">{num}</div>
                <div className="signal-card__icon"><Icon size={20} /></div>
                <h3>{title}</h3><p>{text}</p>
                <span className="signal-card__arrow"><ArrowUpRightIcon /></span>
              </div>
            ))}
          </div>
        </section>
        <section className="trust-section container" id="trust">
          <div className="trust-section__panel">
            <div>
              <Kicker>One console. Three threat vectors.</Kicker>
              <h2>Clarity in the<br /><em>signal noise.</em></h2>
              <p>Preview the same analysis language your security team will use in the field—without the black box.</p>
            </div>
            <div className="trust-radar">
              <div className="radar-grid" />
              <div className="radar-sweep" />
              <div className="radar-dot radar-dot--one" /><div className="radar-dot radar-dot--two" />
              <div className="radar-label radar-label--top">HUMAN <strong>94</strong></div>
              <div className="radar-label radar-label--right">AI <strong>87</strong></div>
              <div className="radar-label radar-label--bottom">REPLAY <strong>91</strong></div>
            </div>
          </div>
        </section>
        <section className="cta-section container">
          <div className="cta-section__inner">
            <div><Kicker>Ready when you are</Kicker><h2>Make every voice<br /><em>accountable.</em></h2></div>
            <div style={{ display: "flex", gap: 12 }}>
              <Button variant="outline" onClick={onRegister}><UserPlus size={15} /> Create account</Button>
              <Button onClick={onLogin}>Launch the console <ArrowRight size={16} /></Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="public-footer container">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", textAlign: "left" }}
        >
          <Logo />
        </button>
        <span>Prototype environment · Local simulated data only</span>
        <span>© 2026 AEGIS Security Systems</span>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────────
function Login({ onLogin, onBack, onRegister, doLogin }: { onLogin: () => void; onBack: () => void; onRegister: () => void; doLogin: (email: string, pw: string) => string | null }) {
  const [email, setEmail] = useState("analyst@aegis.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setError("");
    if (!email.trim() || !password.trim()) { setError("Email and access key are required."); return; }
    setLoading(true);
    setTimeout(() => {
      const err = doLogin(email, password);
      if (err) { setError(err); setLoading(false); }
      else { onLogin(); }
    }, 600);
  };

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow--one" /><div className="auth-glow auth-glow--two" />
      <div className="auth-shell">
        <div className="auth-aside">
          <button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to signal</button>
          <Logo />
          <div className="auth-aside__content">
            <Kicker>Secure access layer</Kicker>
            <h1>Trust starts<br /><em>with context.</em></h1>
            <p>Enter the AEGIS demonstration console to inspect acoustic evidence, simulate threats, and issue an explainable verdict.</p>
            <div className="auth-aside__orb"><OrbArt compact /></div>
          </div>
          <div className="auth-aside__foot"><LockKeyhole size={14} /> Demo environment · analyst@aegis.local / demo1234</div>
        </div>
        <div className="auth-form-wrap">
          <div className="auth-form">
            <div className="auth-form__top">
              <span className="eyebrow">AEGIS / CONSOLE 01</span>
              <span className="status-chip"><span />Systems nominal</span>
            </div>
            <h2>Welcome back.</h2>
            <p className="auth-form__lead">Sign in to your acoustic intelligence workspace.</p>
            {error && <div className="auth-error"><AlertTriangle size={13} />{error}</div>}
            <label>Email address<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} /></label>
            <label>Access key
              <div className="input-with-icon">
                <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPw ? "text" : "password"} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: "none", position: "absolute", right: 12, top: 22, color: "#789092" }}>
                  {showPw ? <EyeOff size={15} /> : <KeyRound size={16} />}
                </button>
              </div>
            </label>
            <div className="auth-options">
              <label className="checkbox-row"><input type="checkbox" defaultChecked /> Keep me signed in</label>
              <button className="text-button" onClick={() => toast("Reset link simulated for this prototype.")}>Forgot key?</button>
            </div>
            <Button className="auth-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? "Authenticating…" : <><span>Open console</span> <LogIn size={16} /></>}
            </Button>
            <div className="auth-divider"><span>or</span></div>
            <Button variant="outline" className="auth-demo" onClick={onRegister}><UserPlus size={15} /> Create new account</Button>
            <p className="auth-note">By continuing, you acknowledge this is a <strong>simulated prototype</strong> with pre-registered audio samples.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REGISTER PAGE
// ─────────────────────────────────────────────────────────────
function Register({ onRegister, onBack, onLogin, doRegister }: { onRegister: () => void; onBack: () => void; onLogin: () => void; doRegister: (name: string, email: string, pw: string, confirm: string) => string | null }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setError("");
    setLoading(true);
    setTimeout(() => {
      const err = doRegister(name, email, password, confirm);
      if (err) { setError(err); setLoading(false); }
      else { toast.success("Account created. Welcome to AEGIS."); onRegister(); }
    }, 700);
  };

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow--one" /><div className="auth-glow auth-glow--two" />
      <div className="auth-shell">
        <div className="auth-aside">
          <button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to signal</button>
          <Logo />
          <div className="auth-aside__content">
            <Kicker>New analyst onboarding</Kicker>
            <h1>Join the<br /><em>trust layer.</em></h1>
            <p>Create your analyst identity to access the AEGIS demonstration console and simulate acoustic threat detection.</p>
            <div className="auth-aside__orb"><OrbArt compact /></div>
          </div>
          <div className="auth-aside__foot"><LockKeyhole size={14} /> Prototype environment · credentials stored locally</div>
        </div>
        <div className="auth-form-wrap">
          <div className="auth-form">
            <div className="auth-form__top">
              <span className="eyebrow">AEGIS / NEW IDENTITY</span>
              <span className="status-chip"><span />Registration open</span>
            </div>
            <h2>Create account.</h2>
            <p className="auth-form__lead">Set up your acoustic intelligence workspace.</p>
            {error && <div className="auth-error"><AlertTriangle size={13} />{error}</div>}
            <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="Jordan Davis" /></label>
            <label>Email address<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@domain.com" /></label>
            <label>Access key (password)<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Min. 6 characters" /></label>
            <label>Confirm access key<input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" placeholder="Repeat password" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} /></label>
            <Button className="auth-submit" onClick={handleSubmit} disabled={loading} style={{ marginTop: 24 }}>
              {loading ? "Creating account…" : <><UserPlus size={16} /> Create analyst account</>}
            </Button>
            <div className="auth-divider"><span>already have access</span></div>
            <Button variant="outline" className="auth-demo" onClick={onLogin}><LogIn size={15} /> Sign in to console</Button>
            <p className="auth-note">This is a <strong>simulated prototype</strong>. No real security operations will be performed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────
function Sidebar({ view, onNavigate, onLogout, mobileOpen, onClose, user }: { view: View; onNavigate: (v: View) => void; onLogout: () => void; mobileOpen: boolean; onClose: () => void; user: { name: string; email: string } | null }) {
  const initials = user ? user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() : "??";
  return (
    <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar__top"><Logo /><button className="sidebar__close" onClick={onClose}><X size={18} /></button></div>
      <div className="workspace-chip">
        <div className="workspace-avatar">AS</div>
        <div><strong>Acoustic Security</strong><span>Demo workspace</span></div>
        <MoreHorizontal size={16} />
      </div>
      <div className="sidebar__label">Workspace</div>
      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={view === id || (view === "result" && id === "analysis") || (view === "report-detail" && id === "reports") ? "is-active" : ""} onClick={() => { onNavigate(id); onClose(); }}>
            <Icon size={17} /><span>{label}</span>
            {id === "analysis" && <span className="nav-badge">+</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar__label sidebar__label--lower">System</div>
      <nav className="sidebar__nav">
        <button className={view === "settings" ? "is-active" : ""} onClick={() => { onNavigate("settings"); onClose(); }}><Settings size={17} /><span>Profile &amp; settings</span></button>
        <button onClick={() => toast("Help center is simulated in this prototype.")}><CircleHelp size={17} /><span>Help center</span></button>
      </nav>
      <div className="sidebar__bottom">
        <div className="security-status">
          <span className="security-status__icon"><ShieldCheck size={17} /></span>
          <div><strong>Signal engine online</strong><span>All systems nominal</span></div>
          <span className="status-dot" />
        </div>
        <button className="user-mini" onClick={() => onNavigate("settings")}>
          <div className="user-mini__avatar">{initials}</div>
          <div><strong>{user?.name || "Demo User"}</strong><span>{user?.email || "demo@aegis.local"}</span></div>
          <MoreHorizontal size={15} />
        </button>
        <button className="logout-button" onClick={onLogout}><LogOut size={15} /> Exit console</button>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// TOPBAR
// ─────────────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  dashboard: "Overview",
  analysis: "Voice analysis",
  result: "Detection result",
  history: "Analysis history",
  reports: "Threat reports",
  "report-detail": "Threat reports",
  evidence: "Evidence vault",
  settings: "Profile & settings",
};

function Topbar({ onMenu, onNavigate, view, user }: { onMenu: () => void; onNavigate: (v: View) => void; view: View; user: { name: string } | null }) {
  const initials = user ? user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() : "??";
  return (
    <header className="app-topbar">
      <div className="topbar__mobile-brand"><button onClick={onMenu}><Menu size={20} /></button><Logo compact /></div>
      <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{PAGE_TITLES[view] || "Acoustic intelligence"}</strong></div>
      <div className="topbar__actions">
        <div className="topbar-search"><Search size={16} /><span>Search workspace</span><kbd>⌘ K</kbd></div>
        <button className="icon-button" onClick={() => toast("No new alerts in the demo workspace.")}><Bell size={17} /><span className="notification-dot" /></button>
        <button className="topbar-avatar" onClick={() => onNavigate("settings")}>{initials}</button>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────────────────────
function AppShell({ children, view, onNavigate, onLogout, user }: { children: React.ReactNode; view: View; onNavigate: (v: View) => void; onLogout: () => void; user: { name: string; email: string } | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar view={view} onNavigate={onNavigate} onLogout={onLogout} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} user={user} />
      <div className="app-main">
        <Topbar onMenu={() => setMobileOpen(true)} onNavigate={onNavigate} view={view} user={user} />
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────
function Dashboard({ history, onNavigate, currentResult, user }: { history: Analysis[]; onNavigate: (v: View) => void; currentResult: Analysis | null; user: { name: string } | null }) {
  const human = history.filter((h) => h.verdict === "HUMAN").length;
  const ai = history.filter((h) => h.verdict === "AI CLONED").length;
  const replay = history.filter((h) => h.verdict === "REPLAY ATTACK").length;
  const highRisk = history.filter((h) => h.threat > 80).length;
  const firstName = user?.name?.split(" ")[0] || "Analyst";

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) + " · " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) + " UTC";

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow={dateStr}
        title={<>{greeting}, <em>{firstName}.</em></>}
        description="The signal room is clear. Here's what your trust layer is seeing."
        action={<Button onClick={() => onNavigate("analysis")}><ScanLine size={16} /> Analyze a voice</Button>}
      />
      <div className="dashboard-hero">
        <div>
          <div className="dashboard-hero__kicker"><span className="live-pulse" /> Live protection posture</div>
          <h2>Signal integrity is<br /><em>holding strong.</em></h2>
          <p>AEGIS has screened {184 + history.length} voice interactions across your workspace this month.</p>
          <div className="dashboard-hero__footer">
            <span><span className="status-dot" /> Engine active</span>
            <span>Last sync {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          </div>
        </div>
        <div className="dashboard-hero__visual">
          <div className="dashboard-ring dashboard-ring--outer" />
          <div className="dashboard-ring dashboard-ring--inner" />
          <div className="dashboard-ring__score">92<span>/100</span><small>TRUST SCORE</small></div>
          <div className="dashboard-ring__orbit" />
        </div>
        <div className="dashboard-hero__noise" />
      </div>
      <div className="stat-grid">
        <StatCard label="Total analyses" value={String(184 + history.length)} change="12.4%" tone="blue" icon={Activity} />
        <StatCard label="Human voices" value={String(132 + human)} change="8.1%" tone="mint" icon={Users} />
        <StatCard label="AI detected" value={String(27 + ai)} change="4.6%" tone="violet" icon={Sparkles} />
        <StatCard label="Replay attacks" value={String(25 + replay)} change="2.3%" tone="amber" icon={Radio} />
      </div>
      <div className="dashboard-grid">
        <div className="panel recent-panel">
          <div className="panel__header">
            <div><span className="eyebrow">Signal log</span><h3>Recent analyses</h3></div>
            <button className="text-button" onClick={() => onNavigate("history")}>View all <ArrowRight size={14} /></button>
          </div>
          <div className="recent-list">
            {history.slice(0, 5).map((item) => (
              <button className="recent-row" key={item.analysisId} onClick={() => onNavigate("result")}>
                <div className={`recent-row__icon recent-row__icon--${item.color}`}><FileAudio size={17} /></div>
                <div className="recent-row__main">
                  <strong>{item.name}</strong>
                  <span>{item.timestamp} · {item.analysisId}</span>
                </div>
                <Pill tone={item.color === "mint" ? "mint" : item.color === "violet" ? "violet" : "amber"}>{item.verdict}</Pill>
                <div className="confidence"><strong>{item.confidence}%</strong><span>confidence</span></div>
                {item.flagged && <Flag size={13} color="#ff8a3d" />}
                <ChevronRight size={15} className="row-chevron" />
              </button>
            ))}
          </div>
        </div>
        <div className="panel posture-panel">
          <div className="panel__header">
            <div><span className="eyebrow">Threat posture</span><h3>Classification mix</h3></div>
            <button className="icon-button icon-button--small" onClick={() => toast("Threat posture is based on local demo history.")}><MoreHorizontal size={16} /></button>
          </div>
          <div className="posture-bars">
            <div className="posture-total"><strong>{184 + history.length}</strong><span>events screened</span></div>
            <div className="bar-stack">
              <span style={{ width: "71%" }} />
              <span style={{ width: "15%" }} />
              <span style={{ width: "14%" }} />
            </div>
            <div className="legend-list">
              <div><i className="legend-dot legend-dot--mint" /><span>Human voice</span><strong>71%</strong></div>
              <div><i className="legend-dot legend-dot--violet" /><span>AI cloned</span><strong>15%</strong></div>
              <div><i className="legend-dot legend-dot--amber" /><span>Replay attack</span><strong>14%</strong></div>
            </div>
          </div>
          <div className="posture-foot"><Shield size={14} /> No critical incidents unresolved</div>
        </div>
      </div>
      <div className="activity-strip">
        <div className="activity-strip__label"><span className="eyebrow">Live activity</span><strong>Threat telemetry</strong></div>
        <div className="activity-chart">
          <div className="activity-chart__line" /><div className="activity-chart__glow" />
          {Array.from({ length: 26 }, (_, i) => <span key={i} style={{ height: `${18 + ((i * 23) % 54)}%` }} />)}
        </div>
        <div className="activity-strip__meta"><span><span className="status-dot" /> Streaming</span><strong>1.8k<span> signals / hr</span></strong></div>
      </div>
      {highRisk > 0 && (
        <div className="high-risk-banner">
          <ShieldAlert size={16} />
          <div>
            <strong>High-risk threats detected</strong>
            <span>{highRisk} analysis{highRisk > 1 ? "es" : ""} with threat score &gt; 80 in your workspace history.</span>
          </div>
          <button className="text-button" onClick={() => onNavigate("history")}>Review <ArrowRight size={14} /></button>
        </div>
      )}
      {currentResult && (
        <button className="last-result-callout" onClick={() => onNavigate("result")}>
          <div>
            <span className="eyebrow">Last opened verdict</span>
            <strong>{currentResult.verdict}</strong>
            <span>{currentResult.name} · {currentResult.analysisId}</span>
          </div>
          <ArrowRight size={17} />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ANALYSIS PAGE
// ─────────────────────────────────────────────────────────────
function AnalysisPage({ selected, setSelected, onAnalyze, analyzing, stageIndex, fileName, onFile, onClearFile }: {
  selected: DemoAudio; setSelected: (a: DemoAudio) => void; onAnalyze: () => void; analyzing: boolean; stageIndex: number; fileName: string; onFile: (name: string) => void; onClearFile: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const stageMessages = [
    "Locking signal at 48.02 kHz…",
    "Normalising and filtering input…",
    "Mapping spectral fingerprint…",
    "Scanning for device artifacts…",
    "Comparing voice behaviour vectors…",
    "Fusing evidence streams…",
    "Running final inference…",
    "Sealing tamper-evident record…",
  ];

  return (
    <div className="analysis-page">
      <PageHeader
        eyebrow="Voice analysis / new scan"
        title={<>Read the <em>signal.</em></>}
        description="Select a pre-registered sample or upload local audio to simulate an AEGIS detection run."
        action={<div className="demo-badge"><span className="status-dot" /> DEMONSTRATION MODE</div>}
      />
      <div className="analysis-layout">
        <div className="analysis-left">
          {/* Upload zone */}
          {!fileName ? (
            <div className="panel dropzone" onClick={() => fileInput.current?.click()}>
              <input ref={fileInput} type="file" accept="audio/*" hidden onChange={(e) => { if (e.target.files?.[0]) { const f = e.target.files[0]; onFile(f.name); setSelected(getMockResultForFile(f.name)); } }} />
              <div className="dropzone__icon"><CloudUpload size={23} /></div>
              <h3>Drop an audio file here</h3>
              <p>or browse from your device · WAV, MP3, M4A up to 25 MB</p>
              <Button variant="outline" onClick={() => { fileInput.current?.click(); }}><Upload size={15} /> Browse files</Button>
              <div className="dropzone__note"><LockKeyhole size={13} /> Processed locally for this prototype</div>
            </div>
          ) : (
            <div className="panel dropzone dropzone--staged">
              <div className="dropzone__icon" style={{ background: "rgba(255,138,61,.12)" }}><FileAudio size={23} color="#ff8a3d" /></div>
              <h3>{fileName}</h3>
              <p>Local file staged for demonstration analysis.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="outline" onClick={() => fileInput.current?.click()}><Upload size={15} /> Replace</Button>
                <Button variant="ghost" onClick={onClearFile}><X size={15} /> Remove</Button>
              </div>
              <input ref={fileInput} type="file" accept="audio/*" hidden onChange={(e) => { if (e.target.files?.[0]) { const f = e.target.files[0]; onFile(f.name); setSelected(getMockResultForFile(f.name)); } }} />
              <div className="dropzone__note"><LockKeyhole size={13} /> Processed locally · mock result will be generated</div>
            </div>
          )}

          {/* Selected sample preview */}
          <div className="panel selected-sample">
            <div className="panel__header">
              <div><span className="eyebrow">Selected signal</span><h3>{selected.name}</h3></div>
              <Pill tone={selected.color === "mint" ? "mint" : selected.color === "violet" ? "violet" : "amber"}>{selected.verdict}</Pill>
            </div>
            <div className="selected-sample__meta"><span>{selected.detail}</span><span>{selected.duration}</span></div>
            <Waveform tone={selected.color} dense />
            <div className="audio-controls">
              <button className="play-button" onClick={() => toast("Audio playback is simulated in this prototype.")}><Play size={15} fill="currentColor" /></button>
              <div className="audio-progress"><span style={{ width: "34%" }} /></div>
              <span>00:06 / {selected.duration}</span>
              <button className="icon-button icon-button--small" onClick={() => toast("Volume controls are simulated.")}><Headphones size={15} /></button>
            </div>
            {selected.isDemo && (
              <div className="demo-sample-note">
                <Sparkles size={12} /> Pre-registered prototype sample · result is predetermined
              </div>
            )}
            <Button className="analyze-button" onClick={onAnalyze} disabled={analyzing}>
              <Zap size={16} /> {analyzing ? "Analyzing signal…" : "Analyze voice"}<ArrowRight size={16} />
            </Button>
          </div>
        </div>

        {/* Demo library */}
        <div className="analysis-right">
          <div className="section-heading">
            <span className="eyebrow">Pre-registered audio library</span>
            <span className="sample-count">{DEMO_AUDIOS.length} samples</span>
          </div>
          <div className="library-list">
            {DEMO_AUDIOS.map((audio) => (
              <button key={audio.id} className={`library-item ${selected.id === audio.id && !fileName ? "is-selected" : ""}`} onClick={() => { setSelected(audio); onClearFile(); }}>
                <div className={`library-item__icon library-item__icon--${audio.color}`}><FileAudio size={16} /></div>
                <div><strong>{audio.name}</strong><span>{audio.detail}</span></div>
                <span className="library-item__duration">{audio.duration}</span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
          <div className="analysis-note">
            <ShieldCheck size={16} />
            <div>
              <strong>Demonstration Mode – Results are based on pre-registered prototype samples.</strong>
              <p>AEGIS will simulate eight detection stages, then surface the pre-registered verdict for this sample with full evidence context.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis overlay */}
      {analyzing && (
        <div className="analysis-overlay">
          <div className="analysis-overlay__card">
            <div className="scan-loader"><div /><div /><div /></div>
            <span className="eyebrow">AEGIS / ACTIVE INFERENCE</span>
            <h2>Listening for <em>truth.</em></h2>
            <p>Signal is moving through the acoustic trust layer.</p>
            <div className="stage-list">
              {STAGES.map((stage, i) => (
                <div key={stage.label} className={`stage-row ${i < stageIndex ? "is-done" : ""} ${i === stageIndex ? "is-active" : ""}`}>
                  <span className="stage-row__marker">{i < stageIndex ? <Check size={13} /> : i === stageIndex ? <span /> : i + 1}</span>
                  <span>{stage.label}</span>
                  {i === stageIndex && <small>RUNNING</small>}
                </div>
              ))}
            </div>
            {stageIndex < STAGES.length && (
              <p className="stage-detail-text">{stageMessages[stageIndex]}</p>
            )}
            <div className="analysis-progress"><span style={{ width: `${((stageIndex + 1) / STAGES.length) * 100}%` }} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RESULT PAGE
// ─────────────────────────────────────────────────────────────
function ResultPage({ result, onNavigate, onAnalyze, onFlag, onGenerateReport, history }: {
  result: Analysis; onNavigate: (v: View) => void; onAnalyze: () => void; onFlag: (id: string) => void; onGenerateReport: (a: Analysis) => void; history: Analysis[];
}) {
  const tone = result.color === "mint" ? "mint" : result.color === "violet" ? "violet" : "amber";
  const currentItem = history.find((h) => h.analysisId === result.analysisId) || result;
  const isFlagged = currentItem.flagged;

  const indicators = result.verdict === "HUMAN"
    ? ["Natural pitch micro-variation detected", "Breath cadence follows live speech profile", "No replay surface reflections found", "Physical room impulse present – consistent with live environment"]
    : result.verdict === "AI CLONED"
    ? ["Spectral smoothness exceeds human variance threshold", "Neural formant transitions detected in timbre layer", "No physical room impulse response found", "Voice consistency anomaly across 4 of 6 inference windows"]
    : ["Room impulse response repeats across frames", "High-frequency playback roll-off detected at 16 kHz", "Device resonance signature present at 3.2 kHz", "Phase/magnitude anomaly inconsistent with live speech"];

  const response = result.verdict === "HUMAN"
    ? "Voice appears authentic. Continue standard monitoring."
    : result.verdict === "AI CLONED"
    ? "Potential AI-generated voice detected. Request secondary verification before extending trust."
    : "Potential replay attack detected. Treat as high-risk authentication event.";

  return (
    <div className="result-page">
      <div className="result-back">
        <button className="back-link back-link--dark" onClick={() => onNavigate("analysis")}><ArrowLeft size={15} /> Back to analysis</button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {result.isDemo && <span className="demo-badge"><Sparkles size={13} /> DEMONSTRATION ANALYSIS</span>}
          {isFlagged && <span className="demo-badge" style={{ color: "#ff8a3d", borderColor: "rgba(255,138,61,.4)" }}><Flag size={13} /> FLAGGED</span>}
        </div>
      </div>

      {/* Verdict hero */}
      <div className={`verdict-hero verdict-hero--${tone}`}>
        <div className="verdict-hero__copy">
          <span className="eyebrow">Final classification · {result.analysisId}</span>
          <div className="verdict-lockup">
            <div className="verdict-icon"><ShieldCheck size={28} /></div>
            <div>
              <h1>{result.verdict}</h1>
              <p>{result.verdict === "HUMAN" ? "Acoustic signature consistent with a live human speaker." : result.verdict === "AI CLONED" ? "Synthetic voice markers detected across the neural timbre layer." : "Playback artifacts indicate a recorded signal being reintroduced."}</p>
            </div>
          </div>
          <div className="verdict-hero__meta">
            <div><span>Confidence</span><strong>{result.confidence}%</strong></div>
            <div><span>Threat score</span><strong>{result.threat}<small>/100</small></strong></div>
            <div><span>File</span><strong style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{result.name}</strong></div>
            <div><span>Processed</span><strong>{result.timestamp}</strong></div>
          </div>
        </div>
        <div className="verdict-hero__seal">
          <div className="seal-ring seal-ring--one" />
          <div className="seal-ring seal-ring--two" />
          <div className="seal-core"><Check size={27} /><span>VERIFIED<br />SIGNAL</span></div>
        </div>
      </div>

      {/* Threat response box */}
      <div className={`threat-response threat-response--${tone}`}>
        <div className="threat-response__icon">
          {result.verdict === "HUMAN" ? <ShieldCheck size={19} /> : <ShieldAlert size={19} />}
        </div>
        <div className="threat-response__body">
          <span className="eyebrow">Recommended response</span>
          <strong>{response}</strong>
        </div>
        <div className="threat-response__actions">
          <button className="action-chip" onClick={() => { onFlag(result.analysisId); toast.success(isFlagged ? "Flag removed from signal." : "Signal flagged and added to activity log."); }}>
            <Flag size={13} /> {isFlagged ? "Unflag" : "Flag call"}
          </button>
          <button className="action-chip" onClick={() => toast("Alert contact simulated – no real notification sent.")}><Phone size={13} /> Alert contact</button>
          <button className="action-chip action-chip--danger" onClick={() => toast("Block/Mute action simulated in this prototype.")}><Ban size={13} /> Block / Mute</button>
        </div>
      </div>

      <div className="result-grid">
        {/* Probabilities */}
        <div className="panel probability-panel">
          <div className="panel__header"><div><span className="eyebrow">Signal probabilities</span><h3>Evidence distribution</h3></div><Target size={18} className="panel-header-icon" /></div>
          <Probability label="Human voice" value={result.human} tone="mint" />
          <Probability label="AI cloned" value={result.ai} tone="violet" />
          <Probability label="Replay attack" value={result.replay} tone="amber" />
          <div className="result-wave">
            <div className="result-wave__label"><span>Acoustic signature</span><span>48.02 kHz · {result.duration}</span></div>
            <Waveform tone={tone} dense />
          </div>
        </div>

        {/* Detection explanation */}
        <div className="panel explanation-panel">
          <div className="panel__header"><div><span className="eyebrow">Detection rationale</span><h3>Why this verdict?</h3></div><Sparkles size={18} className="panel-header-icon" /></div>
          <div className="rationale-list">
            {indicators.map((item) => <div key={item}><span><Check size={12} /></span><p>{item}</p></div>)}
          </div>
          <div className="recommendation">
            <span className="recommendation__icon"><Shield size={15} /></span>
            <div>
              <span className="eyebrow">Threat level</span>
              <strong style={{ color: result.threat > 80 ? "#ffb887" : result.threat > 40 ? "#ff9a5d" : "#a8c5a0" }}>
                {result.threat > 80 ? "HIGH RISK" : result.threat > 40 ? "MEDIUM RISK" : "LOW RISK"} · {result.threat}/100
              </strong>
            </div>
          </div>
        </div>

        {/* Analysis timeline */}
        <div className="panel timeline-panel">
          <div className="panel__header"><div><span className="eyebrow">Analysis timeline</span><h3>Eight-stage trace</h3></div><span className="duration-label">2.4 sec</span></div>
          <div className="timeline">
            {STAGES.map((stage, i) => (
              <div className="timeline__item" key={stage.label}>
                <span className="timeline__dot"><Check size={11} /></span>
                <div><strong>{stage.label}</strong><span>{stage.detail}</span></div>
                <small>{`${(0.25 + i * 0.32).toFixed(2)}s`}</small>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence mini */}
        <div className="panel evidence-mini">
          <div className="panel__header"><div><span className="eyebrow">Evidence record</span><h3>Simulated trust seal</h3></div><Fingerprint size={18} className="panel-header-icon" /></div>
          <div className="evidence-mini__row"><span>Analysis ID</span><strong>{result.analysisId}</strong><button className="icon-button icon-button--small" onClick={() => { navigator.clipboard?.writeText(result.analysisId); toast.success("Analysis ID copied"); }}><Copy size={14} /></button></div>
          <div className="evidence-mini__row"><span>Audio hash</span><strong>{result.hash}</strong><button className="icon-button icon-button--small" onClick={() => { navigator.clipboard?.writeText(result.hash); toast.success("Hash copied"); }}><Copy size={14} /></button></div>
          <div className="evidence-mini__row"><span>Verification status</span><Pill tone="mint">Verified</Pill></div>
          <div className="evidence-mini__row"><span>Blockchain</span><span className="eyebrow" style={{ color: "#ff9a5d" }}>SIMULATED</span></div>
          <Button variant="outline" className="full-width" onClick={() => onNavigate("evidence")}>Open evidence vault <ArrowRight size={15} /></Button>
        </div>
      </div>

      <div className="result-actions">
        <Button variant="outline" onClick={() => { onGenerateReport(result); onNavigate("report-detail"); }}><FileText size={15} /> Generate threat report</Button>
        <Button variant="outline" onClick={() => onNavigate("evidence")}><Fingerprint size={15} /> View evidence</Button>
        <Button onClick={onAnalyze}><ScanLine size={15} /> Analyze another voice</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HISTORY PAGE
// ─────────────────────────────────────────────────────────────
function HistoryPage({ history, onOpen, onGenerateReport }: { history: Analysis[]; onOpen: (item: Analysis) => void; onGenerateReport: (a: Analysis) => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "HUMAN" | "AI CLONED" | "REPLAY ATTACK">("all");

  const filtered = history.filter((item) => {
    const matchFilter = filter === "all" || item.verdict === filter;
    const matchSearch = !search.trim() || item.name.toLowerCase().includes(search.toLowerCase()) || item.analysisId.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="history-page">
      <PageHeader
        eyebrow="Workspace / audit trail"
        title={<>Analysis <em>history.</em></>}
        description="Every simulated decision, preserved with its acoustic evidence context."
        action={<Button variant="outline" onClick={() => toast.success("CSV export simulated")}><Download size={15} /> Export log</Button>}
      />
      <div className="history-summary">
        <div><span className="eyebrow">Total records</span><strong>{history.length + 180}</strong></div>
        <div><span className="eyebrow">Average confidence</span><strong>{history.length ? Math.round(history.reduce((s, h) => s + h.confidence, 0) / history.length) : 91}%</strong></div>
        <div><span className="eyebrow">Highest threat</span><strong className="text-amber">{history.length ? Math.max(...history.map((h) => h.threat)) : 94}<span>/100</span></strong></div>
        <div><span className="eyebrow">Evidence sealed</span><strong>100%</strong></div>
      </div>

      {/* Search and filter */}
      <div className="history-controls">
        <div className="history-search">
          <Search size={15} />
          <input placeholder="Search by name or analysis ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch("")}><X size={13} /></button>}
        </div>
        <div className="filter-tabs">
          {(["all", "HUMAN", "AI CLONED", "REPLAY ATTACK"] as const).map((f) => (
            <button key={f} className={`filter-tab ${filter === f ? "is-active" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "HUMAN" ? "Human" : f === "AI CLONED" ? "AI Clone" : "Replay"}
              <span>{f === "all" ? history.length : history.filter((h) => h.verdict === f).length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel history-table">
        <div className="history-table__head">
          <span>Audio signal</span><span>Classification</span><span>Confidence</span><span>Threat</span><span>Timestamp</span><span>Actions</span>
        </div>
        {filtered.length === 0 ? (
          <div className="history-empty"><Shield size={28} /><p>No analyses match your filter.</p></div>
        ) : (
          filtered.map((item) => (
            <div className="history-table__row-wrap" key={item.analysisId}>
              <button className="history-table__row" onClick={() => onOpen(item)}>
                <div className="history-signal">
                  <div className={`recent-row__icon recent-row__icon--${item.color}`}><FileAudio size={16} /></div>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.analysisId}{item.flagged ? " · 🚩" : ""}</span>
                  </div>
                </div>
                <Pill tone={item.color === "mint" ? "mint" : item.color === "violet" ? "violet" : "amber"}>{item.verdict}</Pill>
                <strong>{item.confidence}%</strong>
                <strong className={item.threat > 80 ? "text-amber" : ""}>{item.threat}<span className="table-muted">/100</span></strong>
                <span className="table-muted">{item.timestamp}</span>
                <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="row-action-btn" onClick={() => onOpen(item)} title="View result"><FileAudio size={13} /></button>
                  <button className="row-action-btn" onClick={() => { onGenerateReport(item); toast.success("Report generated"); }} title="Generate report"><FileText size={13} /></button>
                </div>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REPORTS PAGE (list)
// ─────────────────────────────────────────────────────────────
function ReportsPage({ reports, onViewReport, onViewResult, onViewEvidence }: { reports: Report[]; onViewReport: (r: Report) => void; onViewResult: (a: Analysis) => void; onViewEvidence: (a: Analysis) => void }) {
  return (
    <div className="reports-page">
      <PageHeader
        eyebrow="Workspace / intelligence export"
        title={<>Threat <em>reports.</em></>}
        description="Package simulated signal evidence into a concise incident brief."
        action={<Button onClick={() => toast.success("Reports are generated from the analysis result page.")}><Plus size={15} /> New report</Button>}
      />
      {reports.length === 0 ? (
        <div className="panel" style={{ padding: 48, textAlign: "center" }}>
          <FileText size={38} color="#4a6060" style={{ margin: "0 auto 14px" }} />
          <h3 style={{ margin: "0 0 8px", color: "#eeeeee" }}>No reports yet</h3>
          <p style={{ color: "#7a9092", fontSize: 12 }}>Analyze a voice and click "Generate Threat Report" to create your first report.</p>
        </div>
      ) : (
        <div className="report-list">
          {reports.map((report) => (
            <div className="report-card" key={report.reportId}>
              <div className="report-card__left">
                <div className={`report-card__icon report-card__icon--${report.analysis.color}`}><FileCheck2 size={18} /></div>
                <div>
                  <strong>{report.analysis.verdict}</strong>
                  <span>{report.analysis.name}</span>
                </div>
              </div>
              <div className="report-card__meta">
                <div><span className="eyebrow">Report ID</span><strong>{report.reportId}</strong></div>
                <div><span className="eyebrow">Analysis ID</span><strong>{report.analysis.analysisId}</strong></div>
                <div><span className="eyebrow">Threat score</span><strong className={report.analysis.threat > 80 ? "text-amber" : ""}>{report.analysis.threat}/100</strong></div>
                <div><span className="eyebrow">Generated</span><strong>{report.generatedAt}</strong></div>
              </div>
              <Pill tone={report.analysis.color === "mint" ? "mint" : report.analysis.color === "violet" ? "violet" : "amber"}>{report.analysis.verdict}</Pill>
              <div className="report-card__actions">
                <button className="row-action-btn" onClick={() => onViewReport(report)} title="View report"><FileText size={14} /></button>
                <button className="row-action-btn" onClick={() => onViewResult(report.analysis)} title="View analysis"><ScanLine size={14} /></button>
                <button className="row-action-btn" onClick={() => onViewEvidence(report.analysis)} title="View evidence"><Fingerprint size={14} /></button>
                <button className="row-action-btn" onClick={() => window.print()} title="Print / Download"><Download size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REPORT DETAIL PAGE
// ─────────────────────────────────────────────────────────────
function ReportDetailPage({ report, onBack, onOpenResult }: { report: Report; onBack: () => void; onOpenResult: () => void }) {
  const { analysis: result } = report;
  const indicators = result.verdict === "HUMAN"
    ? ["Natural acoustic characteristics consistent with live human speaker", "Breath cadence follows live speech profile", "No significant replay indicators detected", "Physical room impulse present"]
    : result.verdict === "AI CLONED"
    ? ["Synthetic voice characteristics detected across timbre layer", "Unnatural spectral patterns – smoothness exceeds human variance", "Voice consistency anomaly across inference windows", "AI probability significantly above classification threshold"]
    : ["Replay artifacts detected in frequency domain", "Acoustic environment inconsistency – repeated room impulse", "Phase/magnitude anomaly inconsistent with live speech", "Replay probability significantly above classification threshold"];

  return (
    <div className="reports-page">
      <div className="result-back">
        <button className="back-link back-link--dark" onClick={onBack}><ArrowLeft size={15} /> Back to reports</button>
        <span className="demo-badge"><span className="status-dot" /> SIMULATED INCIDENT BRIEF</span>
      </div>
      <div className="report-preview">
        <div className="report-paper">
          <div className="report-paper__mast"><Logo compact /><span>SIMULATED INCIDENT BRIEF · {report.reportId}</span></div>
          <div className="report-paper__head">
            <div>
              <span className="eyebrow">AcousticTrust / analysis report</span>
              <h2>{result.verdict}</h2>
              <p>Voice authenticity assessment</p>
            </div>
            <div className={`report-status report-status--${result.color}`}><span /> {result.threat > 80 ? "HIGH THREAT" : result.threat > 40 ? "MEDIUM THREAT" : "LOW THREAT"}</div>
          </div>
          <div className="report-paper__rule" />
          <div className="report-paper__grid">
            <div><span>Report ID</span><strong>{report.reportId}</strong></div>
            <div><span>Analysis ID</span><strong>{result.analysisId}</strong></div>
            <div><span>Confidence</span><strong>{result.confidence}%</strong></div>
            <div><span>Threat score</span><strong>{result.threat}/100</strong></div>
            <div><span>Audio file</span><strong>{result.name}</strong></div>
            <div><span>Captured</span><strong>{result.timestamp}</strong></div>
            <div><span>Generated</span><strong>{report.generatedAt}</strong></div>
            <div><span>Evidence ID</span><strong>SIM-BLK-{result.analysisId.slice(-8)}</strong></div>
          </div>
          <div className="report-paper__wave"><span className="eyebrow">Acoustic signature trace</span><Waveform tone={result.color} dense /></div>
          <div className="report-paper__body">
            <div>
              <span className="eyebrow">Executive readout</span>
              <p>{result.verdict === "HUMAN" ? "The analyzed sample exhibits a consistent live human acoustic signature with no material evidence of synthesis or playback." : result.verdict === "AI CLONED" ? "The analyzed sample contains spectral and behavioral markers consistent with a synthetic voice clone. Secondary verification is recommended before trust is extended." : "The analyzed sample contains repeated room and device artifacts consistent with a replayed recording. Treat as a high-risk authentication event."}</p>
            </div>
            <div className="report-seal"><ShieldCheck size={23} /><span>Evidence<br />sealed</span></div>
          </div>
          <div className="report-paper__section">
            <span className="eyebrow">Detection indicators</span>
            <div className="report-indicators">
              {indicators.map((ind) => <div key={ind}><Check size={12} /><span>{ind}</span></div>)}
            </div>
          </div>
          <div className="report-paper__section">
            <span className="eyebrow">Probability distribution</span>
            <div style={{ margin: "10px 0" }}>
              <Probability label="Human voice" value={result.human} tone="mint" />
              <Probability label="AI cloned" value={result.ai} tone="violet" />
              <Probability label="Replay attack" value={result.replay} tone="amber" />
            </div>
          </div>
          <div className="report-paper__foot">
            <span>SIMULATED PROTOTYPE REPORT · NOT A REAL SECURITY DECISION</span>
            <div style={{ display: "flex", gap: 16 }}>
              <button className="text-button" onClick={onOpenResult}>View source analysis <ArrowRight size={14} /></button>
              <button className="text-button" onClick={() => window.print()}>Print / Download <Download size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EVIDENCE PAGE
// ─────────────────────────────────────────────────────────────
function EvidencePage({ result }: { result: Analysis }) {
  const evidenceId = `SIM-BLK-${result.analysisId.slice(-8)}`;
  const rows = [
    { label: "Analysis ID", value: result.analysisId, copy: true },
    { label: "Audio hash (SHA-256)", value: `sha256:${result.hash}`, copy: true },
    { label: "Detection result", value: result.verdict },
    { label: "Confidence", value: `${result.confidence}%` },
    { label: "Threat score", value: `${result.threat}/100` },
    { label: "Timestamp", value: result.timestamp },
    { label: "Evidence ID", value: evidenceId, copy: true },
    { label: "Verification status", value: "VERIFIED" },
    { label: "Blockchain status", value: "SIMULATED" },
  ];
  return (
    <div className="evidence-page">
      <PageHeader
        eyebrow="Workspace / verification layer"
        title={<>Evidence <em>vault.</em></>}
        description="Inspect the simulated, tamper-evident record generated for the selected analysis."
        action={<div className="demo-badge"><Fingerprint size={14} /> SIMULATED PROTOTYPE EVIDENCE</div>}
      />
      <div className="evidence-layout">
        <div className="evidence-seal-card">
          <div className="evidence-seal-card__grid" />
          <div className="evidence-seal"><div className="evidence-seal__orbit" /><ShieldCheck size={41} /></div>
          <span className="eyebrow">Verification status</span>
          <h2>Record <em>verified.</em></h2>
          <p>The evidence chain is intact within this local demonstration environment.</p>
          <Pill tone="mint">Integrity confirmed</Pill>
          <div className="evidence-seal-card__note"><LockKeyhole size={13} /> No blockchain network connected · cryptographic anchoring represented visually</div>
          <div className="blockchain-sim">
            <div className="blockchain-sim__block"><span className="eyebrow">Block</span><strong>#0x{result.hash.replace("…", "")}</strong></div>
            <div className="blockchain-sim__arrow">→</div>
            <div className="blockchain-sim__block blockchain-sim__block--active"><span className="eyebrow">Evidence</span><strong>{evidenceId}</strong></div>
            <div className="blockchain-sim__arrow">→</div>
            <div className="blockchain-sim__block"><span className="eyebrow">Status</span><strong style={{ color: "#ff9a5d" }}>SIMULATED</strong></div>
          </div>
        </div>
        <div className="panel evidence-record">
          <div className="panel__header"><div><span className="eyebrow">Record detail</span><h3>Trust seal metadata</h3></div><FileCheck2 size={18} className="panel-header-icon" /></div>
          {rows.map((row) => (
            <div className="record-row" key={row.label}>
              <span>{row.label}</span>
              <strong style={row.value === "SIMULATED" ? { color: "#ff9a5d" } : row.value === "VERIFIED" ? { color: "#a8d5a2" } : undefined}>{row.value}</strong>
              {row.copy && <button className="icon-button icon-button--small" onClick={() => { navigator.clipboard?.writeText(row.value); toast.success(`${row.label} copied`); }}><Copy size={13} /></button>}
            </div>
          ))}
          <div className="record-chain">
            <div className="record-chain__icon"><Shield size={16} /></div>
            <div>
              <span className="eyebrow">Simulated evidence ledger</span>
              <strong>Local record committed</strong>
              <p>Prototype only · in a production deployment, this record would be cryptographically anchored to a distributed ledger via zero-knowledge proof.</p>
            </div>
            <span className="status-dot" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────────
function SettingsPage({ user, onLogout }: { user: { name: string; email: string; role?: string } | null; onLogout: () => void }) {
  const displayName = user?.name || "Demo User";
  const displayEmail = user?.email || "demo@aegis.local";
  const displayRole = user?.role || "Security Analyst";
  const initials = displayName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const [settings, setSettings] = useState({ telemetry: true, evidence: true, motion: false, demo: true });
  const toggle = (key: keyof typeof settings) => setSettings((s) => { const next = { ...s, [key]: !s[key] }; toast("Preference updated for this session."); return next; });

  return (
    <div className="settings-page">
      <PageHeader eyebrow="Workspace / identity" title={<>Profile &amp; <em>settings.</em></>} description="Configure the analyst identity and local demonstration preferences." />
      <div className="settings-layout">
        <div className="panel profile-card">
          <div className="profile-card__avatar">{initials}<span className="status-dot" /></div>
          <span className="eyebrow">Analyst identity</span>
          <h2>{displayName}</h2>
          <p>{displayRole}</p>
          <div className="profile-card__rule" />
          <div className="profile-meta"><span>Email</span><strong>{displayEmail}</strong></div>
          <div className="profile-meta"><span>Workspace</span><strong>Acoustic Security</strong></div>
          <div className="profile-meta"><span>Role</span><strong>Admin · Demo</strong></div>
          <div className="profile-meta"><span>Prototype mode</span><strong style={{ color: "#ff9a5d" }}>Active</strong></div>
          <Button variant="outline" onClick={() => toast.success("Profile update simulated")}>Edit profile <ArrowRight size={14} /></Button>
          <button className="logout-button" style={{ marginTop: 18, width: "100%", justifyContent: "center" }} onClick={onLogout}><LogOut size={15} /> Sign out of console</button>
        </div>
        <div className="panel settings-panel">
          <div className="panel__header"><div><span className="eyebrow">Preferences</span><h3>Console behaviour</h3></div><Settings size={18} className="panel-header-icon" /></div>
          {[
            { key: "telemetry" as const, title: "Live signal telemetry", body: "Show animated activity traces across the console" },
            { key: "evidence" as const, title: "Evidence reminders", body: "Surface verification context after each analysis" },
            { key: "demo" as const, title: "Demonstration mode indicators", body: "Show prototype badges and demonstration banners" },
            { key: "motion" as const, title: "Reduced motion", body: "Respect system accessibility preferences" },
          ].map((s) => (
            <div className="setting-row" key={s.key}>
              <div><strong>{s.title}</strong><span>{s.body}</span></div>
              <button className={`toggle ${settings[s.key] ? "is-on" : ""}`} onClick={() => toggle(s.key)}><span /></button>
            </div>
          ))}
          <div className="settings-divider" />
          <div className="panel__header panel__header--sub"><div><span className="eyebrow">Environment</span><h3>Prototype constraints</h3></div><CircleHelp size={18} className="panel-header-icon" /></div>
          <div className="constraint-list">
            <div><Check size={14} /> Pre-registered local audio only</div>
            <div><Check size={14} /> No external API or AI model calls</div>
            <div><Check size={14} /> No real security decisions made</div>
            <div><Check size={14} /> All data stored in browser localStorage</div>
            <div><Check size={14} /> Blockchain anchoring is simulated visually</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  useMotionVars();

  const { auth, login, register, logout } = useAuthStore();
  const [history, addHistory, updateHistory] = useLocalHistory();
  const [reports, addReport] = useReports();

  const [view, setView] = useState<View>(() => {
    const hash = window.location.hash.replace("#", "") as View;
    return VALID_VIEWS.includes(hash) ? hash : "landing";
  });

  const [selected, setSelected] = useState<DemoAudio>(DEMO_AUDIOS[0]);
  const [currentResult, setCurrentResult] = useState<Analysis | null>(() => {
    const saved = localStorage.getItem("aegis-history");
    try { return saved ? JSON.parse(saved)[0] || null : null; } catch { return null; }
  });
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [fileName, setFileName] = useState("");

  // Navigation
  const navigate = useCallback((next: View) => {
    setView(next);
    window.history.pushState({}, "", `#${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace("#", "") as View;
      if (VALID_VIEWS.includes(hash)) {
        setView(hash);
      } else if (["signal", "workflow", "trust"].includes(hash)) {
        setView("landing");
        setTimeout(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
        }, 80);
      } else if (!hash) {
        setView("landing");
      }
    };
    window.addEventListener("popstate", onHash);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("popstate", onHash);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  // Route guard: redirect to login if not authenticated
  useEffect(() => {
    const publicViews: View[] = ["landing", "login", "register"];
    if (!auth.isAuthenticated && !publicViews.includes(view)) {
      navigate("login");
    }
  }, [auth.isAuthenticated, view, navigate]);

  // Analysis state machine
  useEffect(() => {
    if (!analyzing) return;
    if (stageIndex < STAGES.length - 1) {
      const t = window.setTimeout(() => setStageIndex((i) => i + 1), 480);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      const audioToAnalyze = fileName ? getMockResultForFile(fileName) : selected;
      const next: Analysis = {
        ...audioToAnalyze,
        analysisId: `AEG-${Math.random().toString(16).slice(2, 6).toUpperCase()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
        timestamp: "Today, " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        hash: `${Math.random().toString(16).slice(2, 6)}…${Math.random().toString(16).slice(2, 6)}`,
        flagged: false,
        reportGenerated: false,
      };
      setCurrentResult(next);
      addHistory(next);
      setAnalyzing(false);
      navigate("result");
      toast.success("Signal classified and evidence sealed.");
    }, 600);
    return () => window.clearTimeout(t);
  }, [analyzing, stageIndex, selected, fileName, addHistory, navigate]);

  const startAnalysis = () => { setStageIndex(0); setAnalyzing(true); };
  const handleLogout = () => { logout(); navigate("landing"); toast("You have exited the AEGIS console."); };

  const handleFlag = (analysisId: string) => {
    const item = history.find((h) => h.analysisId === analysisId);
    if (!item) return;
    updateHistory(analysisId, { flagged: !item.flagged });
    if (currentResult?.analysisId === analysisId) {
      setCurrentResult((prev) => prev ? { ...prev, flagged: !prev.flagged } : prev);
    }
  };

  const handleGenerateReport = useCallback((analysis: Analysis) => {
    const report = addReport(analysis);
    updateHistory(analysis.analysisId, { reportGenerated: true });
    setCurrentReport(report);
    toast.success("Threat report generated.");
    return report;
  }, [addReport, updateHistory]);

  const result = currentResult || history[0];



  // Protected view shell helper
  const shell = (content: React.ReactNode) => (
    <AppShell view={view} onNavigate={navigate} onLogout={handleLogout} user={auth.user}>
      {content}
    </AppShell>
  );

  let pageContent: React.ReactNode = null;

  if (view === "landing") {
    pageContent = <Landing onLogin={() => navigate("login")} onRegister={() => navigate("register")} />;
  } else if (view === "login") {
    pageContent = <Login onLogin={() => navigate("dashboard")} onBack={() => navigate("landing")} onRegister={() => navigate("register")} doLogin={login} />;
  } else if (view === "register") {
    pageContent = <Register onRegister={() => navigate("dashboard")} onBack={() => navigate("landing")} onLogin={() => navigate("login")} doRegister={register} />;
  } else if (view === "analysis") {
    pageContent = shell(
      <AnalysisPage selected={selected} setSelected={setSelected} onAnalyze={startAnalysis} analyzing={analyzing} stageIndex={stageIndex} fileName={fileName} onFile={setFileName} onClearFile={() => { setFileName(""); setSelected(DEMO_AUDIOS[0]); }} />
    );
  } else if (view === "result" && result) {
    pageContent = shell(
      <ResultPage result={result} onNavigate={navigate} onAnalyze={() => navigate("analysis")} onFlag={handleFlag} onGenerateReport={handleGenerateReport} history={history} />
    );
  } else if (view === "history") {
    pageContent = shell(
      <HistoryPage history={history} onOpen={(item) => { setCurrentResult(item); navigate("result"); }} onGenerateReport={(a) => { handleGenerateReport(a); navigate("reports"); }} />
    );
  } else if (view === "reports") {
    pageContent = shell(
      <ReportsPage reports={reports} onViewReport={(r) => { setCurrentReport(r); navigate("report-detail"); }} onViewResult={(a) => { setCurrentResult(a); navigate("result"); }} onViewEvidence={(a) => { setCurrentResult(a); navigate("evidence"); }} />
    );
  } else if (view === "report-detail") {
    const rpt = currentReport || (reports.length > 0 ? reports[0] : null);
    if (rpt) {
      pageContent = shell(<ReportDetailPage report={rpt} onBack={() => navigate("reports")} onOpenResult={() => { setCurrentResult(rpt.analysis); navigate("result"); }} />);
    } else {
      pageContent = shell(<Dashboard history={history} onNavigate={navigate} currentResult={currentResult} user={auth.user} />);
    }
  } else if (view === "evidence" && result) {
    pageContent = shell(<EvidencePage result={result} />);
  } else if (view === "settings") {
    pageContent = shell(<SettingsPage user={auth.user} onLogout={handleLogout} />);
  } else {
    pageContent = shell(<Dashboard history={history} onNavigate={navigate} currentResult={currentResult} user={auth.user} />);
  }

  return (
    <>
      <AstraBackground />
      {pageContent}
      <Toaster theme="dark" position="bottom-right" />
    </>
  );
}
