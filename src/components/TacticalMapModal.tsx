import React, { useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import { BANGALORE_LANDMARKS } from '../utils/geoBangalore';
import { X, MapPin, Navigation, Compass, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TacticalMapModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const TacticalMapModal: React.FC<TacticalMapModalProps> = ({ engine, onClose }) => {
  const [waypoint, setWaypoint] = useState<{ x: number; z: number } | null>(null);

  const zone = engine.zoneSystem?.state;
  const mapScale = 0.85; // pixels per meter on map

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left - rect.width / 2;
    const clickY = e.clientY - rect.top - rect.height / 2;

    // Convert map pixel offsets back to world coordinates
    const worldX = clickX / mapScale;
    const worldZ = clickY / mapScale;

    setWaypoint({ x: worldX, z: worldZ });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono select-none">
      <div className="bg-zinc-950 border border-white/20 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Top Header */}
        <div className="p-4 bg-zinc-900 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Compass className="w-5 h-5 text-yellow-400" />
            <h2 className="text-base font-extrabold uppercase tracking-wider text-yellow-400">
              BENGALURU TACTICAL GRID • BANASHANKARI BDA COMPLEX & KANAKAPURA CORRIDOR
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-zinc-400">
              GPS: 12.9254° N, 77.5753° E (EPSG:4326)
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Map Canvas Area */}
        <div
          onClick={handleMapClick}
          className="relative flex-1 bg-[#1a221b] overflow-hidden cursor-crosshair border-b border-white/10 flex items-center justify-center"
        >
          {/* Topographic contours and grid lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          {/* Coordinate Axis Lines */}
          <div className="absolute left-0 right-0 h-[1px] bg-white/10 top-1/2 pointer-events-none" />
          <div className="absolute top-0 bottom-0 w-[1px] bg-white/10 left-1/2 pointer-events-none" />

          {/* Banashankari Metro Corridor Highway overlay line */}
          <div
            className="absolute bg-zinc-600/60 pointer-events-none"
            style={{
              left: `calc(50% + ${-120 * mapScale}px)`,
              top: '0',
              bottom: '0',
              width: `${24 * mapScale}px`,
            }}
          />
          {/* Green Line Metro Elevated Tracks */}
          <div
            className="absolute bg-emerald-500/80 pointer-events-none shadow-[0_0_8px_#10b981]"
            style={{
              left: `calc(50% + ${-120 * mapScale + 10}px)`,
              top: '0',
              bottom: '0',
              width: '4px',
            }}
          />

          {/* Outer Ring Road Avenue overlay */}
          <div
            className="absolute bg-zinc-600/50 pointer-events-none"
            style={{
              top: `calc(50% + ${140 * mapScale}px)`,
              left: '0',
              right: '0',
              height: `${20 * mapScale}px`,
            }}
          />

          {/* Blue Zone (Electric Wall) */}
          {zone && (
            <div
              className="absolute rounded-full border-2 border-blue-500 bg-blue-500/15 pointer-events-none shadow-[0_0_20px_#3b82f6] -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
              style={{
                left: `calc(50% + ${zone.blueCenter.x * mapScale}px)`,
                top: `calc(50% + ${zone.blueCenter.z * mapScale}px)`,
                width: `${zone.blueRadius * 2 * mapScale}px`,
                height: `${zone.blueRadius * 2 * mapScale}px`,
              }}
            />
          )}

          {/* White Safe Zone */}
          {zone && (
            <div
              className="absolute rounded-full border-2 border-dashed border-white bg-white/5 pointer-events-none shadow-[0_0_15px_#ffffff] -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
              style={{
                left: `calc(50% + ${zone.safeCenter.x * mapScale}px)`,
                top: `calc(50% + ${zone.safeCenter.z * mapScale}px)`,
                width: `${zone.safeRadius * 2 * mapScale}px`,
                height: `${zone.safeRadius * 2 * mapScale}px`,
              }}
            />
          )}

          {/* Bengaluru Landmarks Icons */}
          {BANGALORE_LANDMARKS.map((lm) => (
            <div
              key={lm.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center group"
              style={{
                left: `calc(50% + ${lm.worldX * mapScale}px)`,
                top: `calc(50% + ${lm.worldZ * mapScale}px)`,
              }}
            >
              <div
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] font-black shadow-lg ${
                  lm.category === 'bda_complex'
                    ? 'bg-amber-500 border-amber-300 text-black'
                    : lm.category === 'metro_station'
                    ? 'bg-emerald-600 border-emerald-300 text-white'
                    : 'bg-zinc-800 border-white/40 text-white'
                }`}
              >
                {lm.category === 'bda_complex' ? '★' : 'M'}
              </div>
              <span className="text-[10px] font-bold text-white/90 bg-black/75 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap border border-white/20">
                {lm.name}
              </span>
            </div>
          ))}

          {/* Player Position & Vision Heading Arrow */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 flex flex-col items-center"
            style={{
              left: `calc(50% + ${engine.playerPosition.x * mapScale}px)`,
              top: `calc(50% + ${engine.playerPosition.z * mapScale}px)`,
            }}
          >
            <div
              className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-black flex items-center justify-center shadow-lg"
              style={{ transform: `rotate(${(-engine.playerRotation.yaw * 180) / Math.PI}deg)` }}
            >
              <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-black -mt-1" />
            </div>
            <span className="text-[9px] font-black text-yellow-400 bg-black/80 px-1 rounded mt-0.5">
              YOU
            </span>
          </div>

          {/* User Tactical Waypoint Marker */}
          {waypoint && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 flex flex-col items-center animate-bounce"
              style={{
                left: `calc(50% + ${waypoint.x * mapScale}px)`,
                top: `calc(50% + ${waypoint.z * mapScale}px)`,
              }}
            >
              <MapPin className="w-5 h-5 text-red-500 fill-red-500" />
              <span className="text-[9px] font-black text-white bg-red-600 px-1 rounded">
                PING [{(Math.hypot(engine.playerPosition.x - waypoint.x, engine.playerPosition.z - waypoint.z)).toFixed(0)}m]
              </span>
            </div>
          )}
        </div>

        {/* Legend & Instructions Footer */}
        <div className="p-4 bg-zinc-900 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-dashed bg-white/20" />
              <span className="text-zinc-300">White Circle: Safe Zone</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-blue-500/20" />
              <span className="text-zinc-300">Blue Circle: Shrinking Forcefield</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-amber-500 rounded" />
              <span className="text-zinc-300">★ Banashankari BDA Complex (Origin 0,0)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              <span className="text-zinc-300">Namma Metro Green Line</span>
            </div>
          </div>

          <div className="text-zinc-400 text-xs">
            LEFT CLICK MAP TO PLACE TACTICAL SQUAD WAYPOINT PING
          </div>
        </div>
      </div>
    </div>
  );
};
