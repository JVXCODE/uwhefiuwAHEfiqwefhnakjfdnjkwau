import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, Terminal, ShoppingCart, Play, RefreshCcw, Palette, Pause, Home, Cpu, Rocket, Star } from 'lucide-react';

// --- Types ---
type Point = { x: number; y: number };
type Theme = 'green' | 'red' | 'blue' | 'pink' | 'purple' | 'matrix';
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number };

interface PlayerState {
  level: number;
  xp: number;
  bytes: number;
  baseSpeed: number;
  hasShield: boolean;
  hasWarpDrive: boolean;
  multiplier: number;
  theme: Theme;
}

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];

export default function App() {
  // --- State ---
  const [player, setPlayer] = useState<PlayerState>(() => {
    const defaultState: PlayerState = {
      level: 1,
      xp: 0,
      bytes: 0,
      baseSpeed: 160,
      hasShield: false,
      hasWarpDrive: false,
      multiplier: 1,
      theme: 'green'
    };

    const saved = localStorage.getItem('snake_rpg_player_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultState,
          ...parsed,
          // Fix corrupted NaN values if they exist
          bytes: isNaN(parsed.bytes) || parsed.bytes === null ? 0 : parsed.bytes,
          multiplier: isNaN(parsed.multiplier) || parsed.multiplier === null ? 1 : parsed.multiplier,
          baseSpeed: isNaN(parsed.baseSpeed) || parsed.baseSpeed === null ? 160 : parsed.baseSpeed,
          xp: isNaN(parsed.xp) || parsed.xp === null ? 0 : parsed.xp,
          level: isNaN(parsed.level) || parsed.level === null ? 1 : parsed.level,
        };
      } catch (e) {
        return defaultState;
      }
    }
    return defaultState;
  });

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 400 });
  const [tileCount, setTileCount] = useState({ x: 20, y: 20 });
  const [easterEggClicks, setEasterEggClicks] = useState(0);

  // --- Refs for Game Loop ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakeRef = useRef<Point[]>(INITIAL_SNAKE);
  const directionRef = useRef<Point>({ x: 0, y: -1 });
  const nextDirectionRef = useRef<Point>({ x: 0, y: -1 });
  const dataNodeRef = useRef<Point>({ x: 5, y: 5 });
  const goldenNodeRef = useRef<{ x: number; y: number; timer: number } | null>(null);
  const firewallsRef = useRef<Point[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const renderLoopRef = useRef<number | null>(null);
  const speedRef = useRef<number>(player.baseSpeed);
  
  // Refs to access latest state in loops without rebinding
  const playerRef = useRef(player);
  const isRunningRef = useRef(isRunning);
  const isPausedRef = useRef(isPaused);

  // --- Persistence & Sync ---
  useEffect(() => {
    localStorage.setItem('snake_rpg_player_v3', JSON.stringify(player));
    document.documentElement.setAttribute('data-theme', player.theme);
    playerRef.current = player;
  }, [player]);

  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // --- Initialization & Resize ---
  const handleResize = useCallback(() => {
    const maxSize = Math.min(window.innerWidth - 40, 400);
    const tilesX = Math.floor(maxSize / GRID_SIZE);
    const tilesY = Math.floor(maxSize / GRID_SIZE);
    setCanvasSize({ width: tilesX * GRID_SIZE, height: tilesY * GRID_SIZE });
    setTileCount({ x: tilesX, y: tilesY });
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // --- Game Logic ---
  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        x: x * GRID_SIZE + GRID_SIZE / 2,
        y: y * GRID_SIZE + GRID_SIZE / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 0,
        maxLife: 20 + Math.random() * 30,
        color,
        size: Math.random() * 4 + 2
      });
    }
    particlesRef.current.push(...newParticles);
  }, []);

  const spawnDataNode = useCallback(() => {
    let newX = 0, newY = 0;
    let valid = false;
    while (!valid) {
      newX = Math.floor(Math.random() * tileCount.x);
      newY = Math.floor(Math.random() * tileCount.y);
      const onSnake = snakeRef.current.some(p => p.x === newX && p.y === newY);
      const onFirewall = firewallsRef.current.some(p => p.x === newX && p.y === newY);
      if (!onSnake && !onFirewall) valid = true;
    }
    dataNodeRef.current = { x: newX, y: newY };

    // 10% chance for golden node
    if (Math.random() < 0.1 && !goldenNodeRef.current) {
      let gx = 0, gy = 0;
      let gValid = false;
      while (!gValid) {
        gx = Math.floor(Math.random() * tileCount.x);
        gy = Math.floor(Math.random() * tileCount.y);
        const onSnake = snakeRef.current.some(p => p.x === gx && p.y === gy);
        const onFirewall = firewallsRef.current.some(p => p.x === gx && p.y === gy);
        const onData = gx === newX && gy === newY;
        if (!onSnake && !onFirewall && !onData) gValid = true;
      }
      goldenNodeRef.current = { x: gx, y: gy, timer: 60 }; // 60 ticks
    }
  }, [tileCount]);

  const spawnFirewalls = useCallback(() => {
    const count = Math.min(Math.floor(playerRef.current.level / 2), 15); // Max 15 firewalls
    const newFirewalls: Point[] = [];
    for (let i = 0; i < count; i++) {
      let fx = 0, fy = 0;
      let valid = false;
      while (!valid) {
        fx = Math.floor(Math.random() * tileCount.x);
        fy = Math.floor(Math.random() * tileCount.y);
        const onSnake = snakeRef.current.some(p => p.x === fx && p.y === fy);
        const onData = dataNodeRef.current.x === fx && dataNodeRef.current.y === fy;
        const nearCenter = Math.abs(fx - 10) < 4 && Math.abs(fy - 10) < 4;
        if (!onSnake && !onData && !nearCenter) valid = true;
      }
      newFirewalls.push({ x: fx, y: fy });
    }
    firewallsRef.current = newFirewalls;
  }, [tileCount]);

  const gameOver = useCallback((reason: string) => {
    setIsRunning(false);
    setGameOverReason(reason);
    setIsMenuOpen(true);
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
  }, []);

  const addXP = useCallback((amount: number) => {
    setPlayer(prev => {
      let newXP = prev.xp + amount;
      let newLevel = prev.level;
      let newBytes = prev.bytes;
      const xpToNext = prev.level * 100;

      if (newXP >= xpToNext) {
        newXP -= xpToNext;
        newLevel++;
        newBytes += 50; // Level up bonus
        spawnFirewalls(); // Update firewalls on level up
      }

      return { ...prev, xp: newXP, level: newLevel, bytes: newBytes };
    });
  }, [spawnFirewalls]);

  const gameTick = useCallback(() => {
    if (isPausedRef.current || !isRunningRef.current) return;

    directionRef.current = nextDirectionRef.current;
    const { x: dx, y: dy } = directionRef.current;

    if (dx === 0 && dy === 0) return; // Paused by shield hit

    let headX = snakeRef.current[0].x + dx;
    let headY = snakeRef.current[0].y + dy;

    // Warp Drive Mechanic
    if (playerRef.current.hasWarpDrive) {
      if (headX < 0) headX = tileCount.x - 1;
      if (headX >= tileCount.x) headX = 0;
      if (headY < 0) headY = tileCount.y - 1;
      if (headY >= tileCount.y) headY = 0;
    }

    const head = { x: headX, y: headY };

    // Collision Check
    let hit = false;
    if (head.x < 0 || head.x >= tileCount.x || head.y < 0 || head.y >= tileCount.y) hit = true;
    if (snakeRef.current.some(p => p.x === head.x && p.y === head.y)) hit = true;
    if (firewallsRef.current.some(p => p.x === head.x && p.y === head.y)) hit = true;

    if (hit) {
      if (playerRef.current.hasShield) {
        // One-time shield consumption
        setPlayer(prev => ({ ...prev, hasShield: false }));
        playerRef.current.hasShield = false;
        
        spawnParticles(head.x, head.y, '#60a5fa', 40); // Shield break effect
        
        nextDirectionRef.current = { x: 0, y: 0 }; // Pause movement
        directionRef.current = { x: 0, y: 0 };
        return;
      } else {
        // Screen shake effect
        const container = document.getElementById('game-container');
        if (container) {
          container.classList.add('shake');
          setTimeout(() => container.classList.remove('shake'), 500);
        }
        gameOver("SYSTEM_CRITICAL_FAILURE");
        return;
      }
    }

    const newSnake = [head, ...snakeRef.current];
    let ate = false;

    // Eat Data Node
    if (head.x === dataNodeRef.current.x && head.y === dataNodeRef.current.y) {
      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
      spawnParticles(head.x, head.y, primaryColor, 15);
      
      setPlayer(prev => ({ ...prev, bytes: prev.bytes + (10 * prev.multiplier) }));
      addXP(20);
      spawnDataNode();
      ate = true;
      
      speedRef.current = Math.max(80, speedRef.current - 1);
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = window.setInterval(gameTick, speedRef.current);
      }
    }

    // Eat Golden Node
    if (goldenNodeRef.current && head.x === goldenNodeRef.current.x && head.y === goldenNodeRef.current.y) {
      spawnParticles(head.x, head.y, '#fbbf24', 30);
      setPlayer(prev => ({ ...prev, bytes: prev.bytes + (50 * prev.multiplier) }));
      addXP(50);
      goldenNodeRef.current = null;
      ate = true;
    }

    if (!ate) {
      newSnake.pop();
    }

    snakeRef.current = newSnake;

    // Update Golden Node Timer
    if (goldenNodeRef.current) {
      goldenNodeRef.current.timer--;
      if (goldenNodeRef.current.timer <= 0) {
        goldenNodeRef.current = null;
      }
    }
  }, [tileCount, addXP, spawnDataNode, gameOver, spawnParticles]);

  // --- Render Loop ---
  const render = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= tileCount.x; i++) {
      ctx.beginPath(); ctx.moveTo(i * GRID_SIZE, 0); ctx.lineTo(i * GRID_SIZE, canvasSize.height); ctx.stroke();
    }
    for (let i = 0; i <= tileCount.y; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * GRID_SIZE); ctx.lineTo(canvasSize.width, i * GRID_SIZE); ctx.stroke();
    }

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
    const primaryDimColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary-dim').trim();

    // Firewalls
    ctx.fillStyle = "#ff3131";
    ctx.shadowBlur = 5;
    ctx.shadowColor = "#ff3131";
    firewallsRef.current.forEach(fw => {
      ctx.fillRect(fw.x * GRID_SIZE + 2, fw.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
    });

    // Data Node
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 15;
    ctx.shadowColor = primaryColor;
    ctx.fillRect(dataNodeRef.current.x * GRID_SIZE + 4, dataNodeRef.current.y * GRID_SIZE + 4, GRID_SIZE - 8, GRID_SIZE - 8);

    // Golden Node
    if (goldenNodeRef.current) {
      ctx.fillStyle = "#fbbf24";
      ctx.shadowColor = "#fbbf24";
      // Pulse effect based on timer
      const pulse = Math.abs(Math.sin(goldenNodeRef.current.timer * 0.2)) * 4;
      ctx.fillRect(
        goldenNodeRef.current.x * GRID_SIZE + 4 - pulse/2, 
        goldenNodeRef.current.y * GRID_SIZE + 4 - pulse/2, 
        GRID_SIZE - 8 + pulse, 
        GRID_SIZE - 8 + pulse
      );
    }

    // Snake
    ctx.shadowBlur = 0;
    snakeRef.current.forEach((part, i) => {
      if (i === 0) {
        ctx.fillStyle = playerRef.current.hasShield ? "#60a5fa" : primaryColor;
      } else {
        ctx.fillStyle = primaryDimColor;
      }
      ctx.fillRect(part.x * GRID_SIZE + 1, part.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });

    // Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.life >= p.maxLife) {
        particlesRef.current.splice(i, 1);
        continue;
      }
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 1 - (p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    renderLoopRef.current = requestAnimationFrame(render);
  }, [canvasSize, tileCount]);

  useEffect(() => {
    renderLoopRef.current = requestAnimationFrame(render);
    return () => {
      if (renderLoopRef.current) cancelAnimationFrame(renderLoopRef.current);
    };
  }, [render]);

  const startGame = () => {
    snakeRef.current = [...INITIAL_SNAKE];
    directionRef.current = { x: 0, y: -1 };
    nextDirectionRef.current = { x: 0, y: -1 };
    speedRef.current = player.baseSpeed;
    goldenNodeRef.current = null;
    particlesRef.current = [];
    spawnDataNode();
    spawnFirewalls();
    
    setIsRunning(true);
    setIsPaused(false);
    setIsMenuOpen(false);
    setGameOverReason(null);
    
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    gameLoopRef.current = window.setInterval(gameTick, speedRef.current);
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  const quitToMenu = () => {
    setIsRunning(false);
    setIsPaused(false);
    setIsMenuOpen(true);
    setGameOverReason("PROCESS_TERMINATED_BY_USER");
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
  };

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRunningRef.current) {
        togglePause();
        return;
      }

      if (!isRunningRef.current || isPausedRef.current) return;
      const { x: dx, y: dy } = directionRef.current;
      
      if (e.key === 'ArrowUp' && dy === 0) nextDirectionRef.current = { x: 0, y: -1 };
      if (e.key === 'ArrowDown' && dy === 0) nextDirectionRef.current = { x: 0, y: 1 };
      if (e.key === 'ArrowLeft' && dx === 0) nextDirectionRef.current = { x: -1, y: 0 };
      if (e.key === 'ArrowRight' && dx === 0) nextDirectionRef.current = { x: 1, y: 0 };
    };

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isRunningRef.current || isPausedRef.current) return;
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 30) {
          changeDir(diffX > 0 ? 1 : -1, 0);
        }
      } else {
        if (Math.abs(diffY) > 30) {
          changeDir(0, diffY > 0 ? 1 : -1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const changeDir = useCallback((x: number, y: number) => {
    if (!isRunningRef.current || isPausedRef.current) return;
    const { x: dx, y: dy } = directionRef.current;
    if (x !== 0 && dx === 0) nextDirectionRef.current = { x, y: 0 };
    if (y !== 0 && dy === 0) nextDirectionRef.current = { x: 0, y };
  }, []);

  // --- Shop Actions ---
  const buyOptimization = () => {
    if (player.bytes >= 50) {
      setPlayer(prev => ({ ...prev, bytes: prev.bytes - 50, baseSpeed: Math.max(80, prev.baseSpeed - 10) }));
    }
  };

  const buyShield = () => {
    if (player.bytes >= 150 && !player.hasShield) {
      setPlayer(prev => ({ ...prev, bytes: prev.bytes - 150, hasShield: true }));
    }
  };

  const buyWarpDrive = () => {
    if (player.bytes >= 500 && !player.hasWarpDrive) {
      setPlayer(prev => ({ ...prev, bytes: prev.bytes - 500, hasWarpDrive: true }));
    }
  };

  const buyMultiplier = () => {
    if (player.bytes >= 300) {
      setPlayer(prev => ({ ...prev, bytes: prev.bytes - 300, multiplier: prev.multiplier + 1 }));
    }
  };

  const switchTheme = (theme: Theme) => {
    setPlayer(prev => ({ ...prev, theme }));
  };

  const handleTitleClick = () => {
    const newClicks = easterEggClicks + 1;
    setEasterEggClicks(newClicks);
    if (newClicks === 7) {
      setPlayer(prev => ({ ...prev, bytes: prev.bytes + 777, theme: 'matrix' }));
      spawnParticles(tileCount.x / 2, tileCount.y / 2, '#00ff00', 100);
      setEasterEggClicks(0);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 select-none relative">
      {/* --- Header Stats --- */}
      <div className="w-full max-w-[400px] mb-4 z-20">
        <div className="flex justify-between items-end mb-2">
          <div>
            <div className="flex gap-2 mb-1">
              <span className="stat-badge text-white font-bold">LVL {player.level}</span>
              {player.hasShield && (
                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="stat-badge text-blue-400 flex items-center gap-1">
                  <Shield size={10} /> SHIELD_ACTIVE
                </motion.span>
              )}
              {player.hasWarpDrive && (
                <span className="stat-badge text-purple-400 flex items-center gap-1"><Rocket size={10} /> WARP</span>
              )}
            </div>
            <h1 onClick={handleTitleClick} className="text-sm font-bold terminal-text uppercase tracking-widest flex items-center gap-2 cursor-pointer">
              <Terminal size={14} /> NetRunner_v3.0
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] opacity-50 uppercase tracking-tighter">Encrypted_Bytes</p>
            <p className="text-2xl font-bold text-yellow-500 tabular-nums">
              {player.bytes} <span className="text-xs">B</span>
              {player.multiplier > 1 && <span className="text-[10px] ml-1 opacity-70">x{player.multiplier}</span>}
            </p>
          </div>
        </div>
        
        <div className="relative h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"
            initial={{ width: 0 }}
            animate={{ width: `${(player.xp / (player.level * 100)) * 100}%` }}
            transition={{ type: 'spring', stiffness: 50 }}
          />
        </div>
      </div>

      {/* --- Game Container --- */}
      <div id="game-container" className="relative border border-white/10 shadow-2xl rounded-sm overflow-hidden bg-black">
        <div className="crt-overlay"></div>
        <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="block relative z-0" />

        {/* Pause Button during gameplay */}
        {isRunning && !isMenuOpen && (
          <button onClick={togglePause} className="absolute top-2 right-2 z-30 p-2 bg-black/50 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-md hover:bg-[var(--color-primary-glow)] transition-colors">
            <Pause size={16} />
          </button>
        )}

        {/* --- Pause Overlay --- */}
        <AnimatePresence>
          {isPaused && !isMenuOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-40">
              <h2 className="text-3xl font-black mb-8 tracking-widest terminal-text">PAUSED</h2>
              <button onClick={togglePause} className="w-full max-w-[200px] border-2 border-[var(--color-primary)] py-3 mb-4 font-bold hover:bg-[var(--color-primary)] hover:text-black transition-all flex items-center justify-center gap-2">
                <Play size={16} /> RESUME
              </button>
              <button onClick={quitToMenu} className="w-full max-w-[200px] border-2 border-red-500 text-red-500 py-3 font-bold hover:bg-red-500 hover:text-black transition-all flex items-center justify-center gap-2">
                <Home size={16} /> EXIT TO MENU
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Overlay Menu --- */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-start p-6 z-50 overflow-y-auto custom-scrollbar">
              <motion.h2 initial={{ y: -20 }} animate={{ y: 0 }} className="text-2xl font-black mb-6 text-center uppercase tracking-tighter terminal-text mt-4">
                {gameOverReason || "System_Ready"}
              </motion.h2>

              {/* Shop */}
              <div className="w-full max-w-[300px] space-y-2 mb-6">
                <p className="text-[10px] uppercase opacity-50 flex items-center gap-2">
                  <ShoppingCart size={12} /> Marketplace
                </p>
                
                <button onClick={buyOptimization} disabled={player.bytes < 50} className={`shop-item w-full p-2 flex justify-between items-center rounded-sm text-left ${player.bytes < 50 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <div>
                    <div className="text-xs font-bold uppercase flex items-center gap-1"><Cpu size={12}/> Optimization</div>
                    <div className="text-[9px] opacity-60">Speed -10ms</div>
                  </div>
                  <span className="text-yellow-500 font-bold text-sm">50 B</span>
                </button>

                <button onClick={buyShield} disabled={player.bytes < 150 || player.hasShield} className={`shop-item w-full p-2 flex justify-between items-center rounded-sm text-left ${(player.bytes < 150 || player.hasShield) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <div>
                    <div className="text-xs font-bold uppercase flex items-center gap-1"><Shield size={12}/> Proxy Shield</div>
                    <div className="text-[9px] opacity-60">Absorb 1 hit</div>
                  </div>
                  <span className="text-yellow-500 font-bold text-sm">150 B</span>
                </button>

                <button onClick={buyMultiplier} disabled={player.bytes < 300} className={`shop-item w-full p-2 flex justify-between items-center rounded-sm text-left ${player.bytes < 300 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <div>
                    <div className="text-xs font-bold uppercase flex items-center gap-1"><Star size={12}/> Data Multiplier</div>
                    <div className="text-[9px] opacity-60">Bytes x{player.multiplier + 1}</div>
                  </div>
                  <span className="text-yellow-500 font-bold text-sm">300 B</span>
                </button>

                <button onClick={buyWarpDrive} disabled={player.bytes < 500 || player.hasWarpDrive} className={`shop-item w-full p-2 flex justify-between items-center rounded-sm text-left ${(player.bytes < 500 || player.hasWarpDrive) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <div>
                    <div className="text-xs font-bold uppercase flex items-center gap-1"><Rocket size={12}/> Warp Drive</div>
                    <div className="text-[9px] opacity-60">Pass through walls</div>
                  </div>
                  <span className="text-yellow-500 font-bold text-sm">500 B</span>
                </button>
              </div>

              {/* Theme Selector */}
              <div className="w-full max-w-[300px] mb-6">
                <p className="text-[10px] uppercase opacity-50 mb-2 flex items-center gap-2">
                  <Palette size={12} /> Visual_Themes
                </p>
                <div className="flex justify-between gap-2">
                  {(['green', 'red', 'blue', 'pink', 'purple', ...(player.theme === 'matrix' ? ['matrix'] : [])] as Theme[]).map(t => (
                    <button
                      key={t}
                      onClick={() => switchTheme(t)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${player.theme === t ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                      style={{ 
                        backgroundColor: t === 'green' ? '#00ff41' : 
                                         t === 'red' ? '#ff3131' : 
                                         t === 'blue' ? '#3182ff' : 
                                         t === 'pink' ? '#ff31f6' : 
                                         t === 'purple' ? '#9b31ff' : '#00ff00'
                      }}
                    />
                  ))}
                </div>
              </div>

              <button onClick={startGame} className="w-full max-w-[300px] border-2 border-[var(--color-primary)] py-4 font-black uppercase tracking-widest hover:bg-[var(--color-primary)] hover:text-black transition-all flex items-center justify-center gap-2 shrink-0">
                {gameOverReason ? <RefreshCcw size={18} /> : <Play size={18} />}
                {gameOverReason ? "Reboot_Process" : "Initialize_Sequence"}
              </button>
              
              <p className="mt-4 text-[9px] opacity-30 font-mono pb-4">LOCAL_STORAGE_SYNC: ACTIVE</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- Mobile Controls --- */}
      <div className="grid grid-cols-3 gap-3 mt-8 w-[200px] sm:hidden z-20">
        <div />
        <button className="d-btn h-14 rounded-xl flex items-center justify-center" onClick={() => changeDir(0, -1)}>
          <Zap size={24} className="rotate-0" />
        </button>
        <div />
        <button className="d-btn h-14 rounded-xl flex items-center justify-center" onClick={() => changeDir(-1, 0)}>
          <Zap size={24} className="-rotate-90" />
        </button>
        <button className="d-btn h-14 rounded-xl flex items-center justify-center" onClick={() => changeDir(0, 1)}>
          <Zap size={24} className="rotate-180" />
        </button>
        <button className="d-btn h-14 rounded-xl flex items-center justify-center" onClick={() => changeDir(1, 0)}>
          <Zap size={24} className="rotate-90" />
        </button>
      </div>

      {/* Desktop Hint */}
      <p className="mt-8 text-[10px] opacity-20 hidden sm:block uppercase tracking-[0.2em]">
        Use Arrow Keys to Navigate the Grid | ESC to Pause
      </p>
    </div>
  );
}
