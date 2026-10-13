import React from 'react';
import { GameEngine, WEAPON_REGISTRY } from '../game/GameEngine';
import { InventoryItem } from '../types/game';
import { X, Shield, HardHat, Package, Trash2, Zap, Crosshair } from 'lucide-react';

interface InventoryModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ engine, onClose }) => {
  const inv = engine.inventory;

  // Calculate current weight
  const currentWeight = inv.items.reduce((acc, item) => acc + item.weight * item.count, 0) + 40;
  const maxCapacity = inv.backpackTier === 3 ? 400 : inv.backpackTier === 2 ? 280 : 180;

  const handleUseItem = (item: InventoryItem) => {
    if (item.type === 'med') {
      if (item.id === 'medkit') engine.useMedkit();
      else engine.useEnergyDrink();
    } else if (item.type === 'attachment') {
      inv.equippedScope = item.name.includes('4x') ? '4x Scope' : '8x Scope';
    }
    engine.onStateUpdate?.();
  };

  const handleEquipWeapon = (weaponKey: string) => {
    if (WEAPON_REGISTRY[weaponKey]) {
      engine.switchWeapon(WEAPON_REGISTRY[weaponKey]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-mono select-none">
      <div className="bg-zinc-900 border border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center space-x-3">
            <Package className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-black tracking-wider uppercase text-yellow-400">
              TACTICAL GEAR & INVENTORY • BANASHANKARI BDA LOADOUT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Backpack Capacity Meter */}
        <div className="px-6 py-3 bg-zinc-950/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-zinc-400">BACKPACK LEVEL {inv.backpackTier} CAPACITY:</span>
            <span className="font-bold text-white">
              {currentWeight} / {maxCapacity} KG
            </span>
          </div>
          <div className="w-48 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 rounded-full"
              style={{ width: `${Math.min(100, (currentWeight / maxCapacity) * 100)}%` }}
            />
          </div>
        </div>

        {/* Main Grid: Left Ground Loot, Center Weapons, Right Backpack Items */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Ground Loot (Proximity items) */}
          <div className="flex flex-col space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>NEARBY GROUND LOOT</span>
              <span className="text-[10px] text-yellow-400">AUTO-PICK ON WALK</span>
            </h3>
            <div className="space-y-2 bg-black/40 p-3 rounded-xl border border-white/10 min-h-[220px]">
              {engine.worldBuilder.groundLoots.slice(0, 6).map((loot) => (
                <div
                  key={loot.id}
                  onClick={() => {
                    engine.collectLoot(loot);
                    engine.onStateUpdate?.();
                  }}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/90 border border-white/10 cursor-pointer transition"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{loot.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">{loot.name}</span>
                      <span className="text-[10px] text-zinc-400">{loot.category.toUpperCase()}</span>
                    </div>
                  </div>
                  <span className="text-xs text-yellow-400 font-bold">PICK</span>
                </div>
              ))}
              {engine.worldBuilder.groundLoots.length === 0 && (
                <div className="text-xs text-zinc-500 text-center py-10">No items on ground nearby.</div>
              )}
            </div>
          </div>

          {/* Column 2: Equipped Weapons & Armor */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">EQUIPPED WEAPON LOADOUT</h3>

            {/* Primary Weapon */}
            <div
              onClick={() => handleEquipWeapon('m416')}
              className={`p-3 rounded-xl border cursor-pointer transition ${
                engine.activeWeapon.id === 'm416'
                  ? 'bg-zinc-800/90 border-yellow-400 ring-2 ring-yellow-400/30'
                  : 'bg-black/40 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400">[1] PRIMARY AR</span>
                <span className="text-xs font-black text-yellow-400">EQUIPPED</span>
              </div>
              <div className="text-sm font-extrabold text-white mt-1">M416 Tactical</div>
              <div className="flex items-center space-x-2 mt-2 text-[10px] text-zinc-300">
                <span className="bg-zinc-700 px-1.5 py-0.5 rounded">Scope: {inv.equippedScope}</span>
                <span className="bg-zinc-700 px-1.5 py-0.5 rounded">5.56mm</span>
              </div>
            </div>

            {/* Secondary Weapon */}
            <div
              onClick={() => handleEquipWeapon('akm')}
              className={`p-3 rounded-xl border cursor-pointer transition ${
                engine.activeWeapon.id === 'akm'
                  ? 'bg-zinc-800/90 border-yellow-400 ring-2 ring-yellow-400/30'
                  : 'bg-black/40 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400">[2] SECONDARY AR</span>
                <span className="text-xs font-bold text-zinc-400">CLICK TO EQUIP</span>
              </div>
              <div className="text-sm font-extrabold text-white mt-1">AKM Heavy</div>
              <div className="flex items-center space-x-2 mt-2 text-[10px] text-zinc-300">
                <span className="bg-zinc-700 px-1.5 py-0.5 rounded">Iron Sights</span>
                <span className="bg-zinc-700 px-1.5 py-0.5 rounded">7.62mm</span>
              </div>
            </div>

            {/* Sniper Weapon Option */}
            <div
              onClick={() => handleEquipWeapon('awm')}
              className={`p-3 rounded-xl border cursor-pointer transition ${
                engine.activeWeapon.id === 'awm'
                  ? 'bg-zinc-800/90 border-yellow-400 ring-2 ring-yellow-400/30'
                  : 'bg-black/40 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400">[3] MAGNUM SNIPER</span>
                <span className="text-xs font-bold text-zinc-400">CLICK TO EQUIP</span>
              </div>
              <div className="text-sm font-extrabold text-white mt-1">AWM .300 Sniper</div>
              <div className="flex items-center space-x-2 mt-2 text-[10px] text-zinc-300">
                <span className="bg-zinc-700 px-1.5 py-0.5 rounded">8x Optic</span>
                <span className="bg-zinc-700 px-1.5 py-0.5 rounded">.300 Mag</span>
              </div>
            </div>

            {/* Armor Status */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-black/40 p-2.5 rounded-xl border border-white/10 flex items-center space-x-2">
                <HardHat className="w-5 h-5 text-amber-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-400">HELMET TIER {inv.helmetTier}</span>
                  <span className="text-xs font-bold text-white">{inv.helmetDurability}% HP</span>
                </div>
              </div>
              <div className="bg-black/40 p-2.5 rounded-xl border border-white/10 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-400">VEST TIER {inv.vestTier}</span>
                  <span className="text-xs font-bold text-white">{inv.vestDurability}% HP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Backpack Items & Consumables */}
          <div className="flex flex-col space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">BACKPACK INVENTORY</h3>
            <div className="space-y-2 bg-black/40 p-3 rounded-xl border border-white/10 min-h-[220px]">
              {inv.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleUseItem(item)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/90 border border-white/10 cursor-pointer transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">{item.name}</span>
                      <span className="text-[10px] text-zinc-400">Count: {item.count}</span>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold">
                    {item.type === 'med' ? 'USE' : item.type === 'attachment' ? 'ATTACH' : 'KEEP'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-zinc-400">
          <span>HOTKEYS: [1] Primary • [2] Secondary • [3] Sniper • [R] Reload • [C] Crouch • [V] TPP/FPP</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold cursor-pointer transition"
          >
            RESUME COMBAT
          </button>
        </div>
      </div>
    </div>
  );
};
