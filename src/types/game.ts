export type GameMode = 'battle_royale' | 'zombie_survival' | 'team_deathmatch';
export type CameraPerspective = 'TPP' | 'FPP';
export type BotState = 'IDLE_PATROL' | 'LOOT_SEARCH' | 'HEAR_ALERT' | 'ZONE_FLEE' | 'COMBAT_ENGAGE' | 'TAKE_COVER' | 'HEAL_RETREAT';

export interface WeaponData {
  id: string;
  name: string;
  category: 'AR' | 'SMG' | 'SNIPER' | 'SHOTGUN' | 'PISTOL';
  damage: number;
  fireRate: number; // rounds per second
  magazineSize: number;
  ammoType: '5.56mm' | '7.62mm' | '.300 Magnum' | '9mm' | '12 Gauge';
  range: number;
  recoil: number;
  bulletSpeed: number;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'ammo' | 'armor' | 'helmet' | 'med' | 'attachment' | 'throwable';
  count: number;
  weight: number;
  icon: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  meta?: any;
}

export interface PlayerInventory {
  primaryWeapon: InventoryItem | null;
  secondaryWeapon: InventoryItem | null;
  sidearm: InventoryItem | null;
  helmetTier: number; // 0, 1, 2, 3
  helmetDurability: number; // 0-100
  vestTier: number; // 0, 1, 2, 3
  vestDurability: number; // 0-100
  backpackTier: number; // 1, 2, 3 (caps: 150, 250, 400)
  items: InventoryItem[];
  equippedScope: string; // 'Iron Sights' | 'Red Dot' | '4x Scope' | '8x Scope'
}

export interface ZonePhase {
  phaseNumber: number;
  waitDuration: number; // seconds to wait before shrinking
  shrinkDuration: number; // seconds taken to shrink
  safeRadius: number; // target radius in meters
  dps: number; // damage per second in blue zone
}

export interface ZoneState {
  currentPhase: number;
  totalPhases: number;
  phaseTimer: number;
  isShrinking: boolean;
  blueCenter: { x: number; z: number };
  blueRadius: number;
  safeCenter: { x: number; z: number };
  safeRadius: number;
  nextSafeCenter: { x: number; z: number };
  nextSafeRadius: number;
}

export interface KillFeedEntry {
  id: string;
  killer: string;
  victim: string;
  weapon: string;
  isHeadshot: boolean;
  isZoneKill: boolean;
  timestamp: number;
}

export interface AudioFootstepEvent {
  x: number;
  z: number;
  intensity: number; // 0-1
  sourceId: string;
  timestamp: number;
}

export interface VoiceChannel {
  mode: 'squad' | 'all' | 'mute';
  isMicActive: boolean;
  volume: number;
  activeSpeakers: string[];
}
