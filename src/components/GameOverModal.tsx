import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameEngine } from '../game/GameEngine';
import { GameMode } from '../types/game';
import { Trophy, Skull, RotateCcw, Target, Shield, Award } from 'lucide-react';

interface GameOverModalProps {
  engine: GameEngine;
  onRestart: (mode: GameMode) => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ engine, onRestart }) => {
  const isVictory = engine.isVictory;

  useEffect(() => {
    if (isVictory) {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });
    }
  }, [isVictory]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 font-mono select-none">
      <div className="bg-zinc-950 border border-white/20 rounded-2xl w-full max-w-xl p-6 shadow-2xl flex flex-col items-center text-center text-white">
        {/* Banner */}
        {isVictory ? (
          <div className="flex flex-col items-center space-y-2 mb-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 border-2 border-yellow-400 flex items-center justify-center text-yellow-400">
              <Trophy className="w-9 h-9" />
            </div>
            <h1 className="text-3xl font-black text-yellow-400 tracking-wider">
              WINNER WINNER CHICKEN DINNER!
            </h1>
            <p className="text-xs text-zinc-300 max-w-md">
              You conquered the Banashankari BDA Complex sector and survived the collapsing Blue Zone!
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 mb-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-500">
              <Skull className="w-9 h-9" />
            </div>
            <h1 className="text-3xl font-black text-red-500 tracking-wider">
              BETTER LUCK NEXT TIME!
            </h1>
            <p className="text-xs text-zinc-400">
              Eliminated in the Banashankari urban warfare zone.
            </p>
          </div>
        )}

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full my-4">
          <div className="bg-zinc-900 p-3 rounded-xl border border-white/10 flex flex-col items-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">TOTAL KILLS</span>
            <span className="text-2xl font-black text-emerald-400">{engine.playerKills}</span>
          </div>
          <div className="bg-zinc-900 p-3 rounded-xl border border-white/10 flex flex-col items-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">DAMAGE DEALT</span>
            <span className="text-2xl font-black text-yellow-400">{engine.playerDamageDealt}</span>
          </div>
          <div className="bg-zinc-900 p-3 rounded-xl border border-white/10 flex flex-col items-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">ALIVE LEFT</span>
            <span className="text-2xl font-black text-white">{engine.aliveCount}</span>
          </div>
          <div className="bg-zinc-900 p-3 rounded-xl border border-white/10 flex flex-col items-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">ZONE REACHED</span>
            <span className="text-2xl font-black text-blue-400">Phase {engine.zoneSystem?.state.currentPhase ?? 1}</span>
          </div>
        </div>

        {/* Mode Selector for Next Round */}
        <div className="w-full mt-2 mb-6">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
            SELECT MODE FOR NEXT MATCH:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onRestart('battle_royale')}
              className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                engine.mode === 'battle_royale'
                  ? 'bg-yellow-500 text-black border-yellow-400'
                  : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/30'
              }`}
            >
              BATTLE ROYALE
            </button>
            <button
              onClick={() => onRestart('zombie_survival')}
              className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                engine.mode === 'zombie_survival'
                  ? 'bg-yellow-500 text-black border-yellow-400'
                  : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/30'
              }`}
            >
              ZOMBIE OUTBREAK
            </button>
            <button
              onClick={() => onRestart('team_deathmatch')}
              className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                engine.mode === 'team_deathmatch'
                  ? 'bg-yellow-500 text-black border-yellow-400'
                  : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/30'
              }`}
            >
              TEAM DEATHMATCH
            </button>
          </div>
        </div>

        {/* Restart Button */}
        <button
          onClick={() => onRestart(engine.mode)}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-sm tracking-wider cursor-pointer shadow-xl transition flex items-center justify-center space-x-2"
        >
          <RotateCcw className="w-5 h-5" />
          <span>PLAY AGAIN IN BANASHANKARI BDA</span>
        </button>
      </div>
    </div>
  );
};
