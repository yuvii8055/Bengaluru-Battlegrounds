import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameMode } from './types/game';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { TacticalMapModal } from './components/TacticalMapModal';
import { ArchitectDocsModal } from './components/ArchitectDocsModal';
import { VoiceChatPanel } from './components/VoiceChatPanel';
import { GameOverModal } from './components/GameOverModal';
import { soundEngine } from './utils/audio';
import { Volume2, VolumeX, Shield, Play, HelpCircle } from 'lucide-react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [engineState, setEngineState] = useState<GameEngine | null>(null);

  // Modals state
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isArchitectDocsOpen, setIsArchitectDocsOpen] = useState(false);
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControlsHint, setShowControlsHint] = useState(true);
  const [selectedMode, setSelectedMode] = useState<GameMode>('battle_royale');

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, selectedMode);
    engineRef.current = engine;
    setEngineState(engine);

    let lastTime = performance.now();
    let animId: number;

    const gameLoop = (now: number) => {
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      engine.update(delta);
      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);

    // Resize handler
    const handleResize = () => {
      if (!canvasRef.current) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      engine.camera.aspect = width / height;
      engine.camera.updateProjectionMatrix();
      engine.renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Global Hotkeys for modals
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setIsInventoryOpen((prev) => !prev);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        setIsMapOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      engine.dispose();
    };
  }, [selectedMode]);

  const handleRestart = (mode: GameMode) => {
    setSelectedMode(mode);
    if (engineRef.current) {
      engineRef.current.restartGame(mode);
    }
  };

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-mono">
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

      {/* Primary Battle Royale & Tactical HUD */}
      {engineState && (
        <HUD
          engine={engineState}
          onOpenInventory={() => setIsInventoryOpen(true)}
          onOpenMap={() => setIsMapOpen(true)}
          onOpenArchitectDocs={() => setIsArchitectDocsOpen(true)}
          onOpenVoiceChat={() => setIsVoiceChatOpen(true)}
        />
      )}

      {/* Top Center Mode Bar Switcher */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 bg-black/75 backdrop-blur-md px-2 py-1 rounded-xl border border-white/20 shadow-xl z-20">
        {(['battle_royale', 'zombie_survival', 'team_deathmatch'] as GameMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => handleRestart(mode)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer ${
              selectedMode === mode
                ? 'bg-yellow-500 text-black shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {mode === 'battle_royale' ? 'Battle Royale' : mode === 'zombie_survival' ? 'Zombie Horde' : 'TDM 4v4'}
          </button>
        ))}
      </div>

      {/* Floating Sound Toggle Button */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-2 z-30">
        <button
          onClick={toggleSound}
          className="p-2.5 rounded-xl bg-black/80 hover:bg-black text-yellow-400 border border-white/20 shadow-lg cursor-pointer transition flex items-center space-x-1.5 text-xs font-bold"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          <span>{isMuted ? 'UNMUTE SFX' : 'SOUND ON'}</span>
        </button>

        <button
          onClick={() => setShowControlsHint(!showControlsHint)}
          className="p-2.5 rounded-xl bg-black/80 hover:bg-black text-zinc-300 border border-white/20 shadow-lg cursor-pointer transition flex items-center space-x-1 text-xs"
        >
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">CONTROLS</span>
        </button>
      </div>

      {/* Controls Hint Card Overlay */}
      {showControlsHint && (
        <div className="hidden md:flex absolute bottom-16 left-4 bg-black/85 backdrop-blur-md p-3 rounded-xl border border-white/20 shadow-2xl flex-col space-y-1 text-[11px] text-zinc-300 z-30 max-w-xs">
          <div className="text-yellow-400 font-extrabold uppercase mb-1">KEYBOARD / MOUSE CONTROLS:</div>
          <div><strong className="text-white">WASD:</strong> Tactical Move</div>
          <div><strong className="text-white">Mouse:</strong> Look & Aim (Click canvas to lock)</div>
          <div><strong className="text-white">Left Click:</strong> Fire Weapon</div>
          <div><strong className="text-white">Right Click:</strong> ADS Iron Sights / 4x Scope</div>
          <div><strong className="text-white">V:</strong> Toggle TPP / FPP Dual Camera</div>
          <div><strong className="text-white">1, 2, 3:</strong> Switch AR / Sniper Loadout</div>
          <div><strong className="text-white">R:</strong> Reload • <strong className="text-white">C:</strong> Crouch</div>
          <div><strong className="text-white">Tab:</strong> Tactical Bag • <strong className="text-white">M:</strong> Full Map</div>
        </div>
      )}

      {/* Modals */}
      {isInventoryOpen && engineState && (
        <InventoryModal engine={engineState} onClose={() => setIsInventoryOpen(false)} />
      )}

      {isMapOpen && engineState && (
        <TacticalMapModal engine={engineState} onClose={() => setIsMapOpen(false)} />
      )}

      {isArchitectDocsOpen && (
        <ArchitectDocsModal onClose={() => setIsArchitectDocsOpen(false)} />
      )}

      {isVoiceChatOpen && (
        <VoiceChatPanel onClose={() => setIsVoiceChatOpen(false)} />
      )}

      {engineState && engineState.isGameOver && (
        <GameOverModal engine={engineState} onRestart={handleRestart} />
      )}
    </div>
  );
}
