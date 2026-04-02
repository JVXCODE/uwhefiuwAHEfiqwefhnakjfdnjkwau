import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Zap, Terminal, ShoppingCart, Play, RefreshCcw, Palette, Pause, Home, Cpu, Rocket, Star, Flame } from 'lucide-react';

// --- Types & Constants ---
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
  hasFirewallBypass: boolean;
  multiplier: number;
  theme: Theme;
}

const GRID_SIZE = 20;
const CANVAS_SIZE = 400;

const THEME_COLORS: Record<Theme, string> = {
  green: '#00ff41',
  red: '#ff3131',
  blue: '#3182ff',
  pink: '#ff31f6',
  purple: '#9b31ff',
  matrix: '#00ff00'
};

const safeNum = (val: any, fallback: number) => {
  if (val === null || val === undefined) return fallback;
  const n = Number(val);
  return Number.isFinite(n) && !isNaN(n) ? n : fallback;
};

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
      hasFirewallBypass: false,
      multiplier: 1,
      theme: 'green'
    };

    // Migrate from v3 or load v4, with strict NaN protection
    const saved = localStorage.getItem('snake_rpg_player_v4') || localStorage.getItem('snake_rpg_player_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          level: safeNum(parsed.level, 1),
          xp: safeNum(parsed.xp, 0),
          bytes: safeNum(parsed.bytes, 0),
          baseSpeed: safeNum(parsed.baseSpeed, 160),
          hasShield: !!parsed.hasShield,
          hasWarpDrive: !!parsed.hasWarpDrive,
          hasFirewallBypass: !!parsed.hasFirewallBypass,
          multiplier: safeNum(parsed.multiplier, 1),
          theme: parsed.theme || 'green'
        };
      } catch (e) {
        return defaultState;
      }
    }
    return defaultState;
  });

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOverMsg, setGameOverMsg] = useState<string | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [titleClicks, setTitleClicks] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);

  // --- Refs for Game Loop ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
  const directionRef = useRef<Point>({ x: 0, y: 0 });
  const nextDirectionRef = useRef<Point>({ x: 0, y: 0 });
  const dataNodeRef = useRef<Point>({ x: 15, y: 10 });
  const goldenNodeRef = useRef<{ x: number; y: number; timer: number } | null>(null);
  const glitchNodeRef = useRef<{ x: number; y: number; timer: number } | null>(null);
  const firewallsRef = useRef<Point[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const loopRef = useRef<number>();
  const lastTickRef = useRef<number>(0);
  const playerRef = useRef(player); // Keep ref synced for game loop

  const tileCount = { x: CANVAS_SIZE / GRID_SIZE, y: CANVAS_SIZE / GRID_SIZE };

  // Sync player state to ref and localStorage
  useEffect(() => {
    playerRef.current = player;
    localStorage.setItem('snake_rpg_player_v4', JSON.stringify(player));
    document.documentElement.setAttribute('data-theme', player.theme);
  }, [player]);

  // --- Game Mechanics ---
  const spawnParticles = (x: number, y: number, color: string, count: number = 10) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: x * GRID_SIZE + GRID_SIZE / 2,
        y: y * GRID_SIZE + GRID_SIZE / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 0,
        maxLife: 20 + Math.random() * 20,
        color,
        size: Math.random() * 4 + 2
      });
    }
  };

  const spawnFirewalls = useCallback((levelOverride?: number) => {
    const lvl = levelOverride !== undefined ? levelOverride : playerRef.current.level;
    const count = Math.min(Math.floor(lvl / 2), 15);
    const newFirewalls: Point[] = [];
    for (let i = 0; i < count; i++) {
      newFirewalls.push({
        x: Math.floor(Math.random() * tileCount.x),
        y: Math.floor(Math.random() * tileCount.y)
      });
    }
    firewallsRef.current = newFirewalls;
  }, [tileCount]);

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

    // 10% chance for Golden Node
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
      goldenNodeRef.current = { x: gx, y: gy, timer: 50 }; // 50 ticks to collect
    }

    // 5% chance for Glitch Node
    if (Math.random() < 0.05 && !glitchNodeRef.current) {
      let gx = 0, gy = 0;
      let gValid = false;
      while (!gValid) {
        gx = Math.floor(Math.random() * tileCount.x);
        gy = Math.floor(Math.random() * tileCount.y);
        const onSnake = snakeRef.current.some(p => p.x === gx && p.y === gy);
        const onFirewall = firewallsRef.current.some(p => p.x === gx && p.y === gy);
        const onData = gx === newX && gy === newY;
        const onGolden = goldenNodeRef.current && goldenNodeRef.current.x === gx && goldenNodeRef.current.y === gy;
        if (!onSnake && !onFirewall && !onData && !onGolden) gValid = true;
      }
      glitchNodeRef.current = { x: gx, y: gy, timer: 80 };
    }
  }, [tileCount]);

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
        spawnFirewalls(newLevel);
        spawnParticles(snakeRef.current[0].x, snakeRef.current[0].y, '#ffffff', 30);
      }

      return { ...prev, xp: newXP, level: newLevel, bytes: newBytes };
    });
  }, [spawnFirewalls]);

  const gameOver = (msg: string) => {
    setIsRunning(false);
    setGameOverMsg(msg);
  };

  const gameTick = useCallback((time: number) => {
    if (!isRunning || isPaused) {
      lastTickRef.current = time;
      loopRef.current = requestAnimationFrame(gameTick);
      return;
    }

    const currentSpeed = Math.max(50, playerRef.current.baseSpeed - (playerRef.current.level * 2));
    
    if (time - lastTickRef.current > currentSpeed) {
      lastTickRef.current = time;

      directionRef.current = nextDirectionRef.current;
      const dir = directionRef.current;

      // Only move if we have a direction
      if (dir.x !== 0 || dir.y !== 0) {
        const newSnake = [...snakeRef.current];
        let headX = newSnake[0].x + dir.x;
        let headY = newSnake[0].y + dir.y;

        // Warp Drive Logic
        let usedWarp = false;
        let originalHeadX = headX;
        let originalHeadY = headY;

        if (headX < 0) { headX = tileCount.x - 1; usedWarp = true; }
        else if (headX >= tileCount.x) { headX = 0; usedWarp = true; }
        else if (headY < 0) { headY = tileCount.y - 1; usedWarp = true; }
        else if (headY >= tileCount.y) { headY = 0; usedWarp = true; }

        if (usedWarp) {
          if (playerRef.current.hasWarpDrive) {
            setPlayer(prev => ({ ...prev, hasWarpDrive: false }));
            playerRef.current.hasWarpDrive = false;
            spawnParticles(headX, headY, '#a855f7', 30);
          } else {
            // Revert headX/Y to trigger wall collision
            headX = originalHeadX;
            headY = originalHeadY;
          }
        }

        const head = { x: headX, y: headY };

        // Collision Check
        let hit = false;
        
        // Walls
        if (head.x < 0 || head.x >= tileCount.x || head.y < 0 || head.y >= tileCount.y) hit = true;
        // Self
        if (newSnake.some(p => p.x === head.x && p.y === head.y)) hit = true;
        
        // Firewalls
        const fwIndex = firewallsRef.current.findIndex(p => p.x === head.x && p.y === head.y);
        if (fwIndex !== -1) {
          if (playerRef.current.hasFirewallBypass) {
            // Eat firewall
            firewallsRef.current.splice(fwIndex, 1);
            setPlayer(prev => ({ ...prev, bytes: Number(prev.bytes) + (20 * prev.multiplier), hasFirewallBypass: false }));
            playerRef.current.hasFirewallBypass = false;
            spawnParticles(head.x, head.y, '#ff3131', 20);
          } else {
            hit = true;
          }
        }

        if (hit) {
          if (playerRef.current.hasShield) {
            setPlayer(prev => ({ ...prev, hasShield: false }));
            playerRef.current.hasShield = false;
            spawnParticles(head.x, head.y, '#60a5fa', 40);
            // Bounce back
            nextDirectionRef.current = { x: 0, y: 0 };
            directionRef.current = { x: 0, y: 0 };
            loopRef.current = requestAnimationFrame(gameTick);
            return;
          } else {
            // Lose items on death
            setPlayer(prev => ({ ...prev, hasWarpDrive: false, hasFirewallBypass: false }));
            
            const container = document.getElementById('game-container');
            if (container) {
              container.classList.add('shake');
              setTimeout(() => container.classList.remove('shake'), 500);
            }
            gameOver("SYSTEM_CRITICAL_FAILURE");
            return;
          }
        }

        newSnake.unshift(head);

        let ate = false;

        // Eat Data Node
        if (head.x === dataNodeRef.current.x && head.y === dataNodeRef.current.y) {
          spawnParticles(head.x, head.y, 'var(--theme-color)', 15);
          setPlayer(prev => ({ ...prev, bytes: prev.bytes + (10 * prev.multiplier) }));
          addXP(20);
          spawnDataNode();
          ate = true;
        }

        // Eat Golden Node
        if (goldenNodeRef.current && head.x === goldenNodeRef.current.x && head.y === goldenNodeRef.current.y) {
          spawnParticles(head.x, head.y, '#fbbf24', 30);
          setPlayer(prev => ({ ...prev, bytes: prev.bytes + (50 * prev.multiplier) }));
          addXP(50);
          goldenNodeRef.current = null;
          ate = true;
        }

        // Eat Glitch Node
        if (glitchNodeRef.current && head.x === glitchNodeRef.current.x && head.y === glitchNodeRef.current.y) {
          spawnParticles(head.x, head.y, '#ff00ff', 40);
          setPlayer(prev => ({ ...prev, bytes: prev.bytes + (100 * prev.multiplier) }));
          addXP(100);
          glitchNodeRef.current = null;
          ate = true;
          spawnFirewalls(); // Randomize firewalls
          const container = document.getElementById('game-container');
          if (container) {
            container.classList.add('glitch-anim');
            setTimeout(() => container.classList.remove('glitch-anim'), 300);
          }
        }

        if (!ate) {
          newSnake.pop();
        }

        snakeRef.current = newSnake;

        // Update Timers
        if (goldenNodeRef.current) {
          goldenNodeRef.current.timer--;
          if (goldenNodeRef.current.timer <= 0) goldenNodeRef.current = null;
        }
        if (glitchNodeRef.current) {
          glitchNodeRef.current.timer--;
          if (glitchNodeRef.current.timer <= 0) glitchNodeRef.current = null;
        }
      }
    }

    // Render
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Draw Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= CANVAS_SIZE; i += GRID_SIZE) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
        }

        // Draw Firewalls
        const fwColor = playerRef.current.theme === 'red' ? '#f97316' : '#ff3131';
        ctx.shadowBlur = 10;
        ctx.shadowColor = fwColor;
        firewallsRef.current.forEach(fw => {
          ctx.fillStyle = fwColor;
          ctx.fillRect(fw.x * GRID_SIZE + 2, fw.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
          // Add a dark center to make firewalls look like hollow blocks/barriers
          ctx.fillStyle = '#000000';
          ctx.fillRect(fw.x * GRID_SIZE + 6, fw.y * GRID_SIZE + 6, GRID_SIZE - 12, GRID_SIZE - 12);
        });

        // Draw Data Node
        ctx.fillStyle = 'var(--theme-color)';
        ctx.shadowColor = 'var(--theme-color)';
        ctx.fillRect(dataNodeRef.current.x * GRID_SIZE + 4, dataNodeRef.current.y * GRID_SIZE + 4, GRID_SIZE - 8, GRID_SIZE - 8);

        // Draw Golden Node
        if (goldenNodeRef.current) {
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = '#fbbf24';
          const size = GRID_SIZE - 6 + Math.sin(time / 100) * 2;
          const offset = (GRID_SIZE - size) / 2;
          ctx.fillRect(goldenNodeRef.current.x * GRID_SIZE + offset, goldenNodeRef.current.y * GRID_SIZE + offset, size, size);
        }

        // Draw Glitch Node
        if (glitchNodeRef.current) {
          ctx.fillStyle = Math.random() > 0.5 ? "#ff00ff" : "#00ffff";
          ctx.shadowColor = ctx.fillStyle;
          const xOff = (Math.random() - 0.5) * 4;
          const yOff = (Math.random() - 0.5) * 4;
          ctx.fillRect(
            glitchNodeRef.current.x * GRID_SIZE + 4 + xOff,
            glitchNodeRef.current.y * GRID_SIZE + 4 + yOff,
            GRID_SIZE - 8,
            GRID_SIZE - 8
          );
        }

        // Draw Snake
        ctx.shadowBlur = 15;
        snakeRef.current.forEach((segment, index) => {
          ctx.fillStyle = index === 0 ? '#ffffff' : 'var(--theme-color)';
          ctx.shadowColor = index === 0 ? '#ffffff' : 'var(--theme-color)';
          ctx.globalAlpha = 1 - (index / snakeRef.current.length) * 0.5;
          ctx.fillRect(segment.x * GRID_SIZE + 1, segment.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        });
        ctx.globalAlpha = 1;

        // Draw Particles
        ctx.shadowBlur = 5;
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life++;
          
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.globalAlpha = 1 - (p.life / p.maxLife);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          if (p.life >= p.maxLife) {
            particlesRef.current.splice(i, 1);
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    loopRef.current = requestAnimationFrame(gameTick);
  }, [isRunning, isPaused, tileCount, addXP, spawnDataNode, spawnFirewalls]);

  useEffect(() => {
    loopRef.current = requestAnimationFrame(gameTick);
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [gameTick]);

  // --- Controls ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isRunning && !gameOverMsg) setIsPaused(p => !p);
        return;
      }

      if (!isRunning || isPaused) return;
      
      const dir = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dir.y !== 1) nextDirectionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dir.y !== -1) nextDirectionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dir.x !== 1) nextDirectionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dir.x !== -1) nextDirectionRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, isPaused, gameOverMsg]);

  // Touch Controls
  const handleTouch = (dx: number, dy: number) => {
    if (!isRunning || isPaused) return;
    const dir = directionRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && dir.x !== -1) nextDirectionRef.current = { x: 1, y: 0 };
      else if (dx < 0 && dir.x !== 1) nextDirectionRef.current = { x: -1, y: 0 };
    } else {
      if (dy > 0 && dir.y !== -1) nextDirectionRef.current = { x: 0, y: 1 };
      else if (dy < 0 && dir.y !== 1) nextDirectionRef.current = { x: 0, y: -1 };
    }
  };

  // --- Actions ---
  const startGame = () => {
    snakeRef.current = [{ x: 10, y: 10 }];
    directionRef.current = { x: 0, y: 0 };
    nextDirectionRef.current = { x: 0, y: 0 };
    goldenNodeRef.current = null;
    glitchNodeRef.current = null;
    particlesRef.current = [];
    spawnFirewalls();
    spawnDataNode();
    setIsRunning(true);
    setIsPaused(false);
    setGameOverMsg(null);
    setShowShop(false);
  };

  const exitToMenu = () => {
    setIsRunning(false);
    setIsPaused(false);
    setGameOverMsg(null);
  };

  const buyUnderclock = () => {
    if (Number(player.bytes) >= 50 && player.baseSpeed < 300) {
      setPlayer(prev => ({ ...prev, bytes: Number(prev.bytes) - 50, baseSpeed: prev.baseSpeed + 15 }));
    }
  };

  const buyShield = () => {
    if (Number(player.bytes) >= 150 && !player.hasShield) {
      setPlayer(prev => ({ ...prev, bytes: Number(prev.bytes) - 150, hasShield: true }));
    }
  };

  const buyMultiplier = () => {
    if (Number(player.bytes) >= 300) {
      setPlayer(prev => ({ ...prev, bytes: Number(prev.bytes) - 300, multiplier: prev.multiplier + 1 }));
    }
  };

  const buyWarpDrive = () => {
    if (Number(player.bytes) >= 500 && !player.hasWarpDrive) {
      setPlayer(prev => ({ ...prev, bytes: Number(prev.bytes) - 500, hasWarpDrive: true }));
    }
  };

  const buyFirewallBypass = () => {
    if (Number(player.bytes) >= 600 && !player.hasFirewallBypass) {
      setPlayer(prev => ({ ...prev, bytes: Number(prev.bytes) - 600, hasFirewallBypass: true }));
    }
  };

  const setTheme = (theme: Theme) => {
    setPlayer(prev => ({ ...prev, theme }));
  };

  const handleTitleClick = () => {
    setTitleClicks(p => p + 1);
    if (titleClicks + 1 === 7) {
      setPlayer(prev => ({ ...prev, theme: 'matrix', bytes: Number(prev.bytes) + 777 }));
      spawnParticles(CANVAS_SIZE/2/GRID_SIZE, CANVAS_SIZE/2/GRID_SIZE, '#00ff00', 100);
      setTitleClicks(0);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="crt-overlay pointer-events-none"></div>
      
      {/* Header Stats */}
      <div className="w-full max-w-[400px] mb-4">
        <div className="flex justify-between items-end mb-2">
          <div className="flex items-center gap-2">
            <span className="border border-theme text-theme px-2 py-1 text-xs font-bold rounded-sm">SYS_LVL {player.level}</span>
            {player.hasShield && (
              <span className="stat-badge text-blue-400 flex items-center gap-1"><Shield size={10} /> PROXY</span>
            )}
            {player.hasWarpDrive && (
              <span className="stat-badge text-purple-400 flex items-center gap-1"><Rocket size={10} /> WARP</span>
            )}
            {player.hasFirewallBypass && (
              <span className="stat-badge text-red-400 flex items-center gap-1"><Flame size={10} /> BYPASS</span>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] text-theme opacity-70">ENCRYPTED_BYTES</div>
            <div className="text-xl font-bold text-yellow-500 flex items-center gap-1 justify-end">
              {player.bytes} <span className="text-xs">B</span>
            </div>
          </div>
        </div>
        
        {/* XP Bar */}
        <div className="flex justify-between text-[9px] text-gray-500 font-bold mb-1 px-1">
          <span>PROGRESS</span>
          <span>{Math.floor(player.xp)} / {player.level * 100} XP</span>
        </div>
        <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800">
          <div 
            className="h-full bg-theme transition-all duration-300"
            style={{ width: `${(player.xp / (player.level * 100)) * 100}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <h1 
            className="text-theme font-bold tracking-widest cursor-pointer select-none"
            onClick={handleTitleClick}
          >
            &gt;_ NETRUNNER_V3.0
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-xs opacity-50 flex items-center gap-1">
              <Star size={10} /> x{player.multiplier}
            </div>
            <button 
              onClick={() => { if (isRunning && !gameOverMsg) setIsPaused(true); }}
              className={`text-theme hover:text-white transition-colors ${(!isRunning || gameOverMsg) ? 'opacity-0 pointer-events-none' : ''}`}
              title="Pause (ESC)"
            >
              <Pause size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div id="game-container" className="relative border-2 border-theme rounded-sm shadow-[0_0_20px_var(--theme-color)] bg-gray-950">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="block"
        />

        {/* Overlays */}
        {!isRunning && !showShop && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
            {gameOverMsg ? (
              <>
                <h2 className="text-2xl font-bold text-red-500 mb-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">{gameOverMsg}</h2>
                <p className="text-xs text-gray-400 mb-6">Connection lost. Rebooting sequence required.</p>
              </>
            ) : (
              <h2 className="text-2xl font-bold text-theme mb-6 drop-shadow-[0_0_10px_var(--theme-color)]">SYSTEM_READY</h2>
            )}
            
            <div className="flex flex-col gap-3 w-full max-w-[200px]">
              <button className="btn-primary flex items-center justify-center gap-2" onClick={startGame}>
                <Play size={16} /> {gameOverMsg ? 'REBOOT' : 'INITIALIZE'}
              </button>
              <button className="btn-secondary flex items-center justify-center gap-2" onClick={() => setShowShop(true)}>
                <ShoppingCart size={16} /> MARKETPLACE
              </button>
            </div>
          </div>
        )}

        {isPaused && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm z-10">
            <h2 className="text-2xl font-bold text-yellow-500 mb-6 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]">SYSTEM_PAUSED</h2>
            <div className="flex flex-col gap-3 w-full max-w-[200px]">
              <button className="btn-primary flex items-center justify-center gap-2" onClick={() => setIsPaused(false)}>
                <Play size={16} /> RESUME
              </button>
              <button className="btn-secondary flex items-center justify-center gap-2" onClick={exitToMenu}>
                <Home size={16} /> DISCONNECT
              </button>
            </div>
          </div>
        )}

        {showShop && !isRunning && (
          <div className="absolute inset-0 bg-black/95 p-6 flex flex-col overflow-hidden backdrop-blur-md">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
              <h2 className="text-lg font-bold text-theme flex items-center gap-2"><ShoppingCart size={18}/> MARKETPLACE</h2>
              <button onClick={() => setShowShop(false)} className="text-gray-400 hover:text-white"><RefreshCcw size={16}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
              <button onClick={buyUnderclock} disabled={Number(player.bytes) < 50 || player.baseSpeed >= 300} className={`shop-item w-full p-2 flex justify-between items-center rounded-sm text-left ${(Number(player.bytes) < 50 || player.baseSpeed >= 300) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                <div>
                  <div className="text-xs font-bold uppercase flex items-center gap-1"><Cpu size={12}/> Underclocking</div>
                  <div className="text-[9px] opacity-60">Slower Snake (+15ms)</div>
                </div>
                <span className="text-yellow-500 font-bold text-sm">
                  {player.baseSpeed >= 300 ? 'MAX' : '50 B'}
                </span>
              </button>

              <button onClick={buyShield} disabled={Number(player.bytes) < 150 || player.hasShield} className={`shop-item w-full p-2 flex justify-between items-center rounded-sm text-left ${(Number(player.bytes) < 150 || player.hasShield) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                <div>
                  <div className="text-xs font-bold uppercase flex items-center gap-1"><Shield size={12}/> Proxy Shield</div>
                  <div className="text-[9px] opacity-60">Absorb 1 hit</div>
                </div>
                <span className="text-yellow-500 font-bold text-sm">150 B</span>
              </button>

              <button onClick={buyMultiplier} disabled={Number(player.bytes) < 300} className={`shop-item w-full p-2 flex justify-between items-center rounded-sm text-left ${Number(player.bytes) < 300 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                <div>
                  <div className="text-xs font-bold uppercase flex items-center gap-1"><Star size={12}/> Data Multiplier</div>
                  <div className="text-[9px] opacity-60">Bytes x{player.multiplier + 1}</div>
                </div>
                <span className="text-yellow-500 font-bold text-sm">300 B</span>
              </button>

              <button onClick={buyWarpDrive} disabled={Number(player.bytes) < 500 || player.hasWarpDrive} className={`shop-item w-full p-2 flex justify-between items-center rounded-sm text-left ${(Number(player.bytes) < 500 || player.hasWarpDrive) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                <div>
                  <div className="text-xs font-bold uppercase flex items-center gap-1"><Rocket size={12}/> Warp Drive</div>
                  <div className="text-[9px] opacity-60">Pass through a wall once</div>
                </div>
                <span className="text-yellow-500 font-bold text-sm">500 B</span>
              </button>

              <button onClick={buyFirewallBypass} disabled={Number(player.bytes) < 600 || player.hasFirewallBypass} className={`shop-item w-full p-2 flex justify-between items-center rounded-sm text-left ${(Number(player.bytes) < 600 || player.hasFirewallBypass) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                <div>
                  <div className="text-xs font-bold uppercase flex items-center gap-1"><Flame size={12}/> Firewall Bypass</div>
                  <div className="text-[9px] opacity-60">Eat 1 firewall for +20B</div>
                </div>
                <span className="text-yellow-500 font-bold text-sm">600 B</span>
              </button>

              <div className="pt-4 border-t border-gray-800">
                <div className="text-xs font-bold mb-3 flex items-center gap-2 text-gray-400"><Palette size={14}/> VISUAL_THEMES</div>
                <div className="flex gap-2 flex-wrap">
                  {(['green', 'red', 'blue', 'pink', 'purple'] as Theme[]).map(t => (
                    <button 
                      key={t} 
                      onClick={() => setTheme(t)}
                      className={`w-8 h-8 rounded-full border-2 ${player.theme === t ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                      style={{ backgroundColor: THEME_COLORS[t] }}
                    />
                  ))}
                  {player.theme === 'matrix' && (
                    <button 
                      onClick={() => setTheme('matrix')}
                      className={`w-8 h-8 rounded-full border-2 border-white scale-110 bg-green-500 relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-[8px] text-black font-bold">01</div>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-gray-800">
                <button 
                  onClick={() => {
                    if (confirmReset) {
                      localStorage.removeItem('snake_rpg_player_v4');
                      localStorage.removeItem('snake_rpg_player_v3');
                      localStorage.removeItem('snake_rpg_player_v2');
                      localStorage.removeItem('snake_rpg_player');
                      window.location.reload();
                    } else {
                      setConfirmReset(true);
                      setTimeout(() => setConfirmReset(false), 3000);
                    }
                  }}
                  className={`w-full p-2 text-xs font-bold uppercase tracking-widest rounded-sm border transition-colors ${confirmReset ? 'bg-red-500/20 border-red-500 text-red-500' : 'border-gray-800 text-gray-600 hover:text-red-400 hover:border-red-900/50'}`}
                >
                  {confirmReset ? 'CONFIRM RESET?' : 'FACTORY RESET'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Controls (Visible only on small screens) */}
      <div className="mt-6 grid grid-cols-3 gap-2 sm:hidden w-full max-w-[200px]">
        <div />
        <button className="bg-gray-900 p-4 rounded-lg active:bg-theme active:text-black border border-gray-800" onClick={() => handleTouch(0, -1)}>↑</button>
        <div />
        <button className="bg-gray-900 p-4 rounded-lg active:bg-theme active:text-black border border-gray-800" onClick={() => handleTouch(-1, 0)}>←</button>
        <button className="bg-gray-900 p-4 rounded-lg active:bg-theme active:text-black border border-gray-800" onClick={() => handleTouch(0, 1)}>↓</button>
        <button className="bg-gray-900 p-4 rounded-lg active:bg-theme active:text-black border border-gray-800" onClick={() => handleTouch(1, 0)}>→</button>
      </div>

      <div className="mt-8 text-[10px] text-gray-600 tracking-widest uppercase hidden sm:block">
        USE ARROW KEYS TO NAVIGATE THE GRID | ESC TO PAUSE
      </div>
    </div>
  );
}
