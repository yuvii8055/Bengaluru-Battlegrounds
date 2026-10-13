import React, { useEffect, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import { CameraPerspective, KillFeedEntry } from '../types/game';
import { Shield, HardHat, Crosshair, Volume2, Mic, Map, Package, Activity, Award, RefreshCw, Zap } from 'lucide-react';

interface HUDProps {
  engine: GameEngine | null;
  onOpenInventory: () => void;
  onOpenMap: () => void;
  onOpenArchitectDocs: () => void;
  onOpenVoiceChat: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  onOpenInventory,
  onOpenMap,
  onOpenArchitectDocs,
  onOpenVoiceChat,
}) => {
  const [, setTick] = useState(0);
  const [hitmarker, setHitmarker] = useState<{ active: boolean; isHeadshot: boolean }>({
    active: false,
    isHeadshot: false,
  });

  useEffect(() => {
    if (!engine) return;

    engine.onStateUpdate = () => setTick((t) => t + 1);
    engine.onHitmarker = (isHeadshot) => {
      setHitmarker({ active: true, isHeadshot });
      setTimeout(() => setHitmarker({ active: false, isHeadshot: false }), 180);
    };

    const interval = setInterval(() => setTick((t) => t + 1), 60);
    return () => clearInterval(interval);
  }, [engine]);

  if (!engine) return null;

  // Derive compass degree from player yaw
  // Three.js yaw 0 is facing negative Z (North)
  let degrees = Math.round(((-engine.playerRotation.yaw * 180) / Math.PI) % 360);
  if (degrees < 0) degrees += 360;

  // Format zone timer
  const zoneTimer = engine.zoneSystem?.state.phaseTimer ?? 0;
  const minutes = Math.floor(zoneTimer / 60);
  const seconds = Math.floor(zoneTimer % 60);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isShrinking = engine.zoneSystem?.state.isShrinking ?? false;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-mono text-white">
      {/* 1. TOP COMPASS BAR */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-80 md:w-96 flex flex-col items-center">
        {/* Cardinal degrees marker */}
        <div className="relative w-full h-8 bg-black/60 backdrop-blur-md rounded-md border border-white/20 overflow-hidden flex items-center justify-center">
          <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10" />
          <div
            className="flex items-center space-x-8 text-xs font-bold text-white/80 transition-transform duration-75"
            style={{ transform: `translateX(${((180 - degrees) * 2)}px)` }}
          >
            {[-180, -90, 0, 45, 90, 135, 180, 225, 270, 315, 360, 405, 450, 540].map((deg, i) => {
              const norm = ((deg % 360) + 360) % 360;
              let label = norm.toString();
              if (norm === 0) label = 'N';
              else if (norm === 45) label = 'NE';
              else if (norm === 90) label = 'E';
              else if (norm === 135) label = 'SE';
              else if (norm === 180) label = 'S';
              else if (norm === 225) label = 'SW';
              else if (norm === 270) label = 'W';
              else if (norm === 315) label = 'NW';

              const isCardinal = ['N', 'E', 'S', 'W'].includes(label);
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center min-w-[28px] ${
                    isCardinal ? 'text-yellow-400 font-extrabold text-sm' : 'text-zinc-300'
                  }`}
                >
                  <span>{label}</span>
                  <div className="w-0.5 h-1.5 bg-white/40 mt-0.5" />
                </div>
              );
            })}
          </div>
        </div>
        <div className="text-[11px] font-black text-yellow-400 mt-0.5 drop-shadow">
          {degrees}° {engine.playerPosition.x.toFixed(0)}m E, {engine.playerPosition.z.toFixed(0)}m S
        </div>
      </div>

      {/* 2. TOP-LEFT: MATCH STATS & VOICE STATUS */}
      <div className="absolute top-3 left-3 flex flex-col gap-2">
        {/* Game Mode & Location Title */}
        <div className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded border border-white/20 shadow-lg flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            {engine.mode === 'battle_royale'
              ? 'BATTLE ROYALE • BANASHANKARI BDA'
              : engine.mode === 'zombie_survival'
              ? `ZOMBIE SURVIVAL • WAVE ${engine.waveNumber}`
              : `TDM 4v4 • BDA COMPLEX PLAZA`}
          </span>
        </div>

        {/* Alive & Kill Counters */}
        <div className="flex items-center space-x-2">
          {engine.mode === 'team_deathmatch' ? (
            <div className="bg-black/80 px-3 py-1.5 rounded border border-white/20 text-xs font-bold flex items-center space-x-3">
              <span className="text-blue-400">BLUE: {engine.tdmScore.blue}</span>
              <span className="text-zinc-400">/</span>
              <span className="text-red-400">RED: {engine.tdmScore.red}</span>
              <span className="text-zinc-400">(Goal: 40)</span>
            </div>
          ) : (
            <>
              <div className="bg-black/80 px-3 py-1 rounded border border-white/20 text-xs font-bold flex items-center space-x-1.5">
                <span className="text-zinc-400">ALIVE</span>
                <span className="text-lg text-yellow-400 font-extrabold">{engine.aliveCount}</span>
              </div>
              <div className="bg-black/80 px-3 py-1 rounded border border-white/20 text-xs font-bold flex items-center space-x-1.5">
                <span className="text-zinc-400">KILLS</span>
                <span className="text-lg text-emerald-400 font-extrabold">{engine.playerKills}</span>
              </div>
            </>
          )}

          {/* Shrinking Zone Countdown Timer */}
          {engine.mode === 'battle_royale' && (
            <div
              className={`px-3 py-1 rounded border text-xs font-bold flex items-center space-x-1.5 ${
                isShrinking
                  ? 'bg-blue-950/80 border-blue-400 text-blue-300 animate-pulse'
                  : 'bg-black/80 border-white/20 text-zinc-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>{isShrinking ? 'SHRINKING' : 'ZONE WAIT'}:</span>
              <span className="font-mono text-sm font-extrabold text-white">{formattedTime}</span>
            </div>
          )}
        </div>

        {/* Squad Voice Chat Indicator Button */}
        <button
          onClick={onOpenVoiceChat}
          className="pointer-events-auto bg-black/70 hover:bg-black/90 px-3 py-1.5 rounded border border-white/20 text-xs font-medium flex items-center space-x-2 text-zinc-300 cursor-pointer transition w-fit"
        >
          <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Radio: <strong className="text-white">Squad Ch. 1 (Live)</strong></span>
        </button>
      </div>

      {/* 3. TOP-RIGHT: DYNAMIC MINIMAP & KILL FEED */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
        {/* Dynamic Minimap Canvas View */}
        <div
          onClick={onOpenMap}
          className="pointer-events-auto relative w-36 h-36 md:w-44 md:h-44 rounded-full border-2 border-yellow-500/80 bg-zinc-950/90 shadow-2xl overflow-hidden cursor-pointer hover:border-yellow-400 transition"
        >
          {/* Topographic background grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:12px_12px]" />

          {/* Minimap World representation (scale: 1px = 2.5m) */}
          <div
            className="absolute inset-0"
            style={{
              transform: `rotate(${(-engine.playerRotation.yaw * 180) / Math.PI}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {/* Center Origin: Banashankari BDA Complex Landmark */}
            <div
              className="absolute w-4 h-4 bg-orange-500/60 border border-orange-400 rounded -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[7px] font-bold"
              style={{
                left: `${50 + (-engine.playerPosition.x / 4.5)}%`,
                top: `${50 + (-engine.playerPosition.z / 4.5)}%`,
              }}
            >
              BDA
            </div>

            {/* Blue Zone Circle on Minimap */}
            {engine.zoneSystem && (
              <div
                className="absolute rounded-full border-2 border-blue-500 bg-blue-500/10 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300"
                style={{
                  left: `${50 + ((engine.zoneSystem.state.blueCenter.x - engine.playerPosition.x) / 4.5)}%`,
                  top: `${50 + ((engine.zoneSystem.state.blueCenter.z - engine.playerPosition.z) / 4.5)}%`,
                  width: `${(engine.zoneSystem.state.blueRadius * 2) / 4.5}%`,
                  height: `${(engine.zoneSystem.state.blueRadius * 2) / 4.5}%`,
                }}
              />
            )}

            {/* White Safe Zone Circle on Minimap */}
            {engine.zoneSystem && (
              <div
                className="absolute rounded-full border-2 border-white/80 border-dashed -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300"
                style={{
                  left: `${50 + ((engine.zoneSystem.state.safeCenter.x - engine.playerPosition.x) / 4.5)}%`,
                  top: `${50 + ((engine.zoneSystem.state.safeCenter.z - engine.playerPosition.z) / 4.5)}%`,
                  width: `${(engine.zoneSystem.state.safeRadius * 2) / 4.5}%`,
                  height: `${(engine.zoneSystem.state.safeRadius * 2) / 4.5}%`,
                }}
              />
            )}

            {/* Sound Pings (Audio Footsteps & Gunfire blips) */}
            {engine.soundPings.map((ping, idx) => (
              <div
                key={idx}
                className={`absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 animate-ping ${
                  ping.type === 'shot' ? 'bg-red-500' : 'bg-amber-400'
                }`}
                style={{
                  left: `${50 + ((ping.x - engine.playerPosition.x) / 4.5)}%`,
                  top: `${50 + ((ping.z - engine.playerPosition.z) / 4.5)}%`,
                }}
              />
            ))}
          </div>

          {/* Player Center Icon & Vision Cone */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
            {/* Vision Cone */}
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[24px] border-b-yellow-400/30 -mb-2" />
            <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 border-2 border-black shadow" />
          </div>

          {/* Minimap Overlay Label */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-yellow-300 uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded">
            BDA SEC-2 (TAP MAP)
          </div>
        </div>

        {/* Real-time Kill Feed Stream */}
        <div className="w-64 flex flex-col items-end space-y-1 mt-1">
          {engine.killFeed.slice(0, 4).map((k) => (
            <div
              key={k.id}
              className="bg-black/75 backdrop-blur-sm border-l-2 border-red-500 px-2 py-1 rounded-r text-[11px] font-medium flex items-center space-x-1.5 shadow"
            >
              <span className={k.killer === 'Player' ? 'text-yellow-400 font-bold' : 'text-zinc-200'}>
                {k.killer}
              </span>
              <span className="text-zinc-400">[{k.weapon}]</span>
              {k.isHeadshot && <span className="text-red-400 font-bold">🎯</span>}
              <span className={k.victim === 'Player' ? 'text-red-400 font-bold' : 'text-zinc-300'}>
                {k.victim}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. CENTER RETICLE & HITMARKER */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
        {/* Dynamic Crosshair */}
        {!engine.isAimingADS ? (
          <div className="relative w-7 h-7 flex items-center justify-center">
            <div className="absolute w-1 h-1 bg-white rounded-full opacity-80" />
            <div className="absolute top-0 w-0.5 h-2 bg-white/90" />
            <div className="absolute bottom-0 w-0.5 h-2 bg-white/90" />
            <div className="absolute left-0 h-0.5 w-2 bg-white/90" />
            <div className="absolute right-0 h-0.5 w-2 bg-white/90" />
          </div>
        ) : (
          /* ADS Optical Sight (ACOG 4x or Red Dot) */
          <div className="relative w-48 h-48 rounded-full border-2 border-black/80 bg-black/20 backdrop-blur-[1px] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
            <div className="absolute top-0 bottom-0 w-[1px] bg-black/60" />
            <div className="absolute left-0 right-0 h-[1px] bg-black/60" />
            {engine.inventory.equippedScope.includes('4x') && (
              <div className="absolute bottom-10 text-[9px] font-bold text-red-400 tracking-widest">
                [4X ACOG]
              </div>
            )}
          </div>
        )}

        {/* Dynamic Hitmarker X */}
        {hitmarker.active && (
          <div className="absolute w-9 h-9 flex items-center justify-center pointer-events-none">
            <div
              className={`absolute w-4 h-0.5 rotate-45 ${
                hitmarker.isHeadshot ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-white'
              }`}
            />
            <div
              className={`absolute w-4 h-0.5 -rotate-45 ${
                hitmarker.isHeadshot ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-white'
              }`}
            />
          </div>
        )}
      </div>

      {/* 5. TOP RIGHT UTILITY ACTION BUTTONS */}
      <div className="absolute top-48 right-3 flex flex-col space-y-2 pointer-events-auto">
        <button
          onClick={onOpenInventory}
          className="bg-black/75 hover:bg-black/90 p-2.5 rounded-lg border border-white/20 text-yellow-400 flex items-center space-x-1.5 text-xs font-bold cursor-pointer shadow-lg transition"
        >
          <Package className="w-4 h-4" />
          <span className="hidden md:inline">BAG [TAB]</span>
        </button>

        <button
          onClick={onOpenArchitectDocs}
          className="bg-emerald-950/80 hover:bg-emerald-900/90 p-2.5 rounded-lg border border-emerald-500/40 text-emerald-300 flex items-center space-x-1.5 text-xs font-bold cursor-pointer shadow-lg transition"
        >
          <Award className="w-4 h-4" />
          <span className="hidden md:inline">ARCHITECT CODE (C++/C#)</span>
        </button>
      </div>

      {/* 6. BOTTOM HUD: HEALTH, ARMOR, WEAPONS, AMMO & QUICK HEALS */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 flex flex-col items-center gap-2">
        {/* Health, Boost & Armor Status Bar */}
        <div className="w-full max-w-xl flex flex-col gap-1 bg-black/70 backdrop-blur-md p-2.5 rounded-xl border border-white/20 shadow-2xl">
          <div className="flex items-center justify-between text-xs font-bold px-1">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1 text-zinc-300">
                <HardHat className="w-3.5 h-3.5 text-amber-400" />
                <span>HELMET L{engine.inventory.helmetTier} ({engine.inventory.helmetDurability}%)</span>
              </span>
              <span className="flex items-center space-x-1 text-zinc-300">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>VEST L{engine.inventory.vestTier} ({engine.inventory.vestDurability}%)</span>
              </span>
            </div>
            <div className="text-sm font-extrabold text-white">
              HP {Math.round(engine.playerHealth)} / {engine.playerMaxHealth}
            </div>
          </div>

          {/* Health Bar */}
          <div className="w-full h-3.5 bg-zinc-800 rounded-full overflow-hidden border border-white/10 relative">
            <div
              className={`h-full transition-all duration-150 rounded-full ${
                engine.playerHealth > 50
                  ? 'bg-gradient-to-r from-emerald-500 to-lime-400'
                  : engine.playerHealth > 25
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, engine.playerHealth))}%` }}
            />
          </div>

          {/* Energy Drink Boost Bar */}
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-200"
              style={{ width: `${Math.max(0, Math.min(100, engine.playerBoost))}%` }}
            />
          </div>
        </div>

        {/* Weapons, Quick Heals & Mode Controls */}
        <div className="w-full flex items-center justify-between gap-3 pointer-events-auto">
          {/* Quick Heals & Perspective Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => engine.useMedkit()}
              className="bg-black/80 hover:bg-black/95 px-3 py-2 rounded-lg border border-white/20 flex items-center space-x-1.5 text-xs font-bold text-emerald-400 cursor-pointer shadow transition"
            >
              <span>🩹</span>
              <span>MEDKIT</span>
            </button>
            <button
              onClick={() => engine.useEnergyDrink()}
              className="bg-black/80 hover:bg-black/95 px-3 py-2 rounded-lg border border-white/20 flex items-center space-x-1.5 text-xs font-bold text-amber-400 cursor-pointer shadow transition"
            >
              <span>⚡</span>
              <span>BOOST</span>
            </button>
            <button
              onClick={() => engine.togglePerspective()}
              className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-2 rounded-lg font-black text-xs cursor-pointer shadow-lg transition flex items-center space-x-1"
            >
              <span>{engine.perspective}</span>
              <span className="text-[10px] text-zinc-900 opacity-70">[V]</span>
            </button>
          </div>

          {/* Weapon Slots (PUBG dual primary + sidearm) */}
          <div className="flex items-center space-x-2">
            {/* Primary Weapon (e.g. M416) */}
            <div
              onClick={() => engine.switchWeapon(engine.activeWeapon.id === 'm416' ? engine.activeWeapon : { ...engine.activeWeapon, id: 'm416' })}
              className={`p-2.5 rounded-xl border backdrop-blur-md cursor-pointer transition flex items-center space-x-3 shadow-xl ${
                engine.activeWeapon.id === 'm416'
                  ? 'bg-zinc-900/90 border-yellow-400 ring-2 ring-yellow-400/40'
                  : 'bg-black/70 border-white/20 hover:border-white/40'
              }`}
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">[1] PRIMARY</span>
                <span className="text-sm font-extrabold text-white">{engine.activeWeapon.name}</span>
                <span className="text-[10px] text-yellow-400">AUTO • {engine.inventory.equippedScope}</span>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-2xl font-black text-white">
                  {engine.currentAmmoInMag}
                  <span className="text-xs text-zinc-400 font-medium ml-1">/ {engine.reserveAmmo}</span>
                </div>
                <span className="text-[10px] text-zinc-400">{engine.activeWeapon.ammoType}</span>
              </div>
            </div>

            {/* Reload Button */}
            <button
              onClick={() => engine.reloadWeapon()}
              disabled={engine.isReloading}
              className="bg-black/80 hover:bg-black/95 p-3 rounded-xl border border-white/20 text-yellow-400 cursor-pointer shadow transition flex flex-col items-center"
            >
              <RefreshCw className={`w-5 h-5 ${engine.isReloading ? 'animate-spin' : ''}`} />
              <span className="text-[9px] font-bold mt-0.5">[R]</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7. MOBILE ON-SCREEN TOUCH CONTROLS (Responsive overlay) */}
      <div className="md:hidden absolute inset-0 pointer-events-none">
        {/* Left Virtual Joystick Area */}
        <div className="absolute bottom-28 left-6 w-28 h-28 rounded-full border-2 border-white/20 bg-black/40 pointer-events-auto flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-yellow-400/80 shadow" />
        </div>

        {/* Right Touch Action Cluster: Fire, Jump, Crouch, ADS */}
        <div className="absolute bottom-28 right-6 flex flex-col items-end space-y-3 pointer-events-auto">
          {/* Fire Button */}
          <button
            onMouseDown={() => engine.fireActiveWeapon()}
            className="w-16 h-16 rounded-full bg-red-600 active:bg-red-700 border-2 border-red-400 flex items-center justify-center font-black text-sm text-white shadow-xl cursor-pointer"
          >
            FIRE
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                engine.isAimingADS = !engine.isAimingADS;
              }}
              className="w-11 h-11 rounded-full bg-black/80 border border-yellow-400 text-yellow-400 flex items-center justify-center text-xs font-bold"
            >
              ADS
            </button>
            <button
              onClick={() => {
                engine.isCrouching = !engine.isCrouching;
              }}
              className="w-11 h-11 rounded-full bg-black/80 border border-white/30 text-white flex items-center justify-center text-xs font-bold"
            >
              CROUCH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
