import * as THREE from 'three';
import { CameraPerspective, GameMode, InventoryItem, KillFeedEntry, PlayerInventory, WeaponData } from '../types/game';
import { soundEngine } from '../utils/audio';
import { WorldBuilder } from './WorldBuilder';
import { ZoneSystem } from './ZoneSystem';

export interface BotEntity {
  id: string;
  name: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  health: number;
  maxHealth: number;
  armorTier: number;
  helmetTier: number;
  weapon: WeaponData;
  state: 'IDLE_PATROL' | 'LOOT_SEARCH' | 'HEAR_ALERT' | 'ZONE_FLEE' | 'COMBAT_ENGAGE' | 'TAKE_COVER' | 'HEAL_RETREAT';
  targetPos: THREE.Vector3;
  targetEntityId: string | null;
  stateTimer: number;
  patrolWaypointIdx: number;
  isAlive: boolean;
  team: 'blue' | 'red' | 'zombie' | 'solo';
  isZombie: boolean;
  shootCooldown: number;
  strafeDir: number;
}

export const WEAPON_REGISTRY: Record<string, WeaponData> = {
  m416: {
    id: 'm416',
    name: 'M416 Tactical',
    category: 'AR',
    damage: 41,
    fireRate: 11, // rounds/sec
    magazineSize: 30,
    ammoType: '5.56mm',
    range: 300,
    recoil: 0.035,
    bulletSpeed: 880,
    icon: '🔫',
    rarity: 'rare',
  },
  akm: {
    id: 'akm',
    name: 'AKM Heavy',
    category: 'AR',
    damage: 49,
    fireRate: 9,
    magazineSize: 30,
    ammoType: '7.62mm',
    range: 280,
    recoil: 0.055,
    bulletSpeed: 715,
    icon: '🔫',
    rarity: 'rare',
  },
  awm: {
    id: 'awm',
    name: 'AWM Magnum',
    category: 'SNIPER',
    damage: 105,
    fireRate: 1.2,
    magazineSize: 5,
    ammoType: '.300 Magnum',
    range: 600,
    recoil: 0.12,
    bulletSpeed: 940,
    icon: '🎯',
    rarity: 'legendary',
  },
  vector: {
    id: 'vector',
    name: 'Vector SMG',
    category: 'SMG',
    damage: 31,
    fireRate: 18,
    magazineSize: 25,
    ammoType: '9mm',
    range: 150,
    recoil: 0.02,
    bulletSpeed: 400,
    icon: '⚡',
    rarity: 'common',
  },
  pistol_p92: {
    id: 'pistol_p92',
    name: 'P92 Sidearm',
    category: 'PISTOL',
    damage: 35,
    fireRate: 4,
    magazineSize: 15,
    ammoType: '9mm',
    range: 90,
    recoil: 0.025,
    bulletSpeed: 380,
    icon: '🔫',
    rarity: 'common',
  },
};

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public worldBuilder: WorldBuilder;
  public zoneSystem: ZoneSystem;

  // Game state
  public mode: GameMode = 'battle_royale';
  public perspective: CameraPerspective = 'TPP';
  public isAimingADS: boolean = false;
  public isGameOver: boolean = false;
  public isVictory: boolean = false;

  // Player state
  public playerPosition = new THREE.Vector3(0, 0, 15);
  public playerRotation = { yaw: 0, pitch: 0 };
  public playerVelocity = new THREE.Vector3();
  public playerMesh!: THREE.Group;
  public weaponMesh!: THREE.Group;
  public playerHealth = 100;
  public playerMaxHealth = 100;
  public playerBoost = 60; // 0-100 energy drink boost
  public isCrouching = false;
  public isSprinting = false;
  public isReloading = false;
  public reloadProgress = 0;
  public currentAmmoInMag = 30;
  public reserveAmmo = 120;
  public playerKills = 0;
  public playerDamageDealt = 0;
  public aliveCount = 50;

  // Inventory
  public inventory: PlayerInventory;
  public activeWeapon: WeaponData = WEAPON_REGISTRY.m416;

  // Bots & Zombies
  public bots: BotEntity[] = [];
  public waveNumber: number = 1;
  public tdmScore = { blue: 0, red: 0 };

  // Killfeed & UI callbacks
  public killFeed: KillFeedEntry[] = [];
  public onStateUpdate?: () => void;
  public onKillFeedAdd?: (entry: KillFeedEntry) => void;
  public onHitmarker?: (isHeadshot: boolean) => void;

  // Audio footsteps tracking
  public soundPings: { x: number; z: number; type: 'shot' | 'step'; timestamp: number }[] = [];

  // Input states
  public keys: Record<string, boolean> = {};
  public isMouseDown: boolean = false;
  public lastShotTime: number = 0;
  private footstepTimer: number = 0;
  private airdropSpawned: boolean = false;
  private isDisposed: boolean = false;

  constructor(canvas: HTMLCanvasElement, mode: GameMode = 'battle_royale') {
    this.mode = mode;
    this.scene = new THREE.Scene();

    // Camera setup with high dynamic range
    this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialize subsystems
    this.worldBuilder = new WorldBuilder(this.scene);
    this.worldBuilder.buildBengaluruEnvironment();
    this.worldBuilder.spawnInitialGroundLoot();

    this.zoneSystem = new ZoneSystem(420);

    // Initial Inventory
    this.inventory = {
      primaryWeapon: {
        id: 'm416',
        name: 'M416 Tactical',
        type: 'weapon',
        count: 1,
        weight: 30,
        icon: '🔫',
        rarity: 'rare',
      },
      secondaryWeapon: {
        id: 'akm',
        name: 'AKM Heavy',
        type: 'weapon',
        count: 1,
        weight: 32,
        icon: '🔫',
        rarity: 'rare',
      },
      sidearm: {
        id: 'pistol_p92',
        name: 'P92 Sidearm',
        type: 'weapon',
        count: 1,
        weight: 10,
        icon: '🔫',
        rarity: 'common',
      },
      helmetTier: 2,
      helmetDurability: 85,
      vestTier: 2,
      vestDurability: 90,
      backpackTier: 2,
      equippedScope: 'Red Dot',
      items: [
        { id: 'ammo_556', name: '5.56mm Ammo', type: 'ammo', count: 120, weight: 60, icon: '📦' },
        { id: 'ammo_762', name: '7.62mm Ammo', type: 'ammo', count: 90, weight: 50, icon: '📦' },
        { id: 'medkit', name: 'First Aid Kit', type: 'med', count: 2, weight: 20, icon: '🩹' },
        { id: 'energy_drink', name: 'Energy Drink', type: 'med', count: 3, weight: 15, icon: '⚡' },
        { id: 'frag_grenade', name: 'Frag Grenade', type: 'throwable', count: 2, weight: 20, icon: '💣' },
      ],
    };

    this.createPlayerMesh();
    this.spawnEntitiesForMode();
    this.setupEventListeners();
  }

  private createPlayerMesh() {
    this.playerMesh = new THREE.Group();

    // Tactical Operative Character Model (Camo fatigues & tactical vest)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d493a, roughness: 0.8 }); // Camo green
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xad7b57, roughness: 0.6 });
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x222621, roughness: 0.5 }); // Black kevlar
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x2e352c, roughness: 0.4, metalness: 0.2 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 0.4), bodyMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    this.playerMesh.add(torso);

    // Kevlar Vest
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.45), vestMat);
    vest.position.y = 1.1;
    vest.castShadow = true;
    this.playerMesh.add(vest);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.38), skinMat);
    head.position.y = 1.68;
    head.castShadow = true;
    this.playerMesh.add(head);

    // Helmet
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.42), helmetMat);
    helmet.position.y = 1.82;
    helmet.castShadow = true;
    this.playerMesh.add(helmet);

    // Arms & Weapon Model
    const armMat = bodyMat;
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), armMat);
    rightArm.position.set(0.48, 1.1, 0.2);
    rightArm.rotation.x = -Math.PI / 4;
    this.playerMesh.add(rightArm);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), armMat);
    leftArm.position.set(-0.48, 1.1, 0.2);
    leftArm.rotation.x = -Math.PI / 4;
    this.playerMesh.add(leftArm);

    // Legs
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.28), bodyMat);
    leftLeg.position.set(-0.22, 0.425, 0);
    leftLeg.castShadow = true;
    this.playerMesh.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.28), bodyMat);
    rightLeg.position.set(0.22, 0.425, 0);
    rightLeg.castShadow = true;
    this.playerMesh.add(rightLeg);

    // Held Tactical Rifle
    this.weaponMesh = new THREE.Group();
    const rifleBarrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.12, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.2 })
    );
    rifleBarrel.position.set(0.35, 1.25, 0.45);
    this.weaponMesh.add(rifleBarrel);
    this.playerMesh.add(this.weaponMesh);

    this.playerMesh.position.copy(this.playerPosition);
    this.scene.add(this.playerMesh);
  }

  private spawnEntitiesForMode() {
    this.bots = [];
    const botNames = [
      'Vikram_Rao', 'Karthik_BLR', 'BangaloreSniper', 'NammaShooter', 'Arjun_99',
      'Chetan_Apex', 'KanakapuraKing', 'BDA_Predator', 'BengaluruTiger', 'MetroRanger',
      'Suhas_Commando', 'Pradeep_Elite', 'Varun_Phantom', 'Rohan_Striker', 'Nikhil_Ghost',
      'Tejas_Viper', 'Abhinav_Blaze', 'Darshan_Bulls', 'Pavan_Warrior', 'Manoj_Sharpshooter',
    ];

    if (this.mode === 'battle_royale') {
      this.aliveCount = 40; // 1 player + 39 simulated bots
      // Spawn tactical bots distributed across Banashankari & Kanakapura Rd
      for (let i = 0; i < 39; i++) {
        const radius = 40 + Math.random() * 260;
        const angle = Math.random() * Math.PI * 2;
        const bx = Math.cos(angle) * radius;
        const bz = Math.sin(angle) * radius;

        const name = botNames[i % botNames.length] + (i >= botNames.length ? `_${i}` : '');
        this.spawnBot(name, bx, bz, 'solo', false);
      }
    } else if (this.mode === 'zombie_survival') {
      this.aliveCount = 1;
      this.spawnZombieWave(1);
    } else if (this.mode === 'team_deathmatch') {
      this.aliveCount = 8;
      // 4v4: 3 bots for Blue team (player's team), 4 bots for Red team
      for (let i = 0; i < 3; i++) {
        this.spawnBot(`Blue_Squad_${i + 1}`, -30 + i * 15, 40, 'blue', false);
      }
      for (let i = 0; i < 4; i++) {
        this.spawnBot(`Red_Squad_${i + 1}`, -30 + i * 15, -40, 'red', false);
      }
    }
  }

  public spawnZombieWave(wave: number) {
    this.waveNumber = wave;
    const count = 10 + wave * 4;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 55 + Math.random() * 40;
      const zx = this.playerPosition.x + Math.cos(angle) * dist;
      const zz = this.playerPosition.z + Math.sin(angle) * dist;
      this.spawnBot(`Infected_${i + 1}`, zx, zz, 'zombie', true);
    }
  }

  private spawnBot(name: string, x: number, z: number, team: 'blue' | 'red' | 'zombie' | 'solo', isZombie: boolean): BotEntity {
    const botGroup = new THREE.Group();

    // Distinct materials for teams/zombies
    const matColor = isZombie ? 0x2e7d32 : team === 'red' ? 0xb71c1c : team === 'blue' ? 0x0d47a1 : 0x424242;
    const botMat = new THREE.MeshStandardMaterial({ color: matColor, roughness: 0.8 });
    const headMat = new THREE.MeshStandardMaterial({ color: isZombie ? 0x689f38 : 0xad7b57 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), botMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    botGroup.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.4, 0.38), headMat);
    head.position.y = 1.65;
    head.castShadow = true;
    botGroup.add(head);

    if (!isZombie) {
      // Helmet
      const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.25, 0.42), new THREE.MeshStandardMaterial({ color: 0x263238 }));
      helmet.position.y = 1.8;
      botGroup.add(helmet);

      // Weapon
      const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.7), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
      rifle.position.set(0.35, 1.15, 0.4);
      botGroup.add(rifle);
    }

    botGroup.position.set(x, 0, z);
    this.scene.add(botGroup);

    const weaponChoice = isZombie
      ? WEAPON_REGISTRY.pistol_p92
      : Math.random() > 0.4 ? WEAPON_REGISTRY.m416 : WEAPON_REGISTRY.akm;

    const bot: BotEntity = {
      id: `bot_${Math.random().toString(36).substring(2, 9)}`,
      name,
      position: new THREE.Vector3(x, 0, z),
      mesh: botGroup,
      health: isZombie ? 60 + this.waveNumber * 10 : 100,
      maxHealth: isZombie ? 60 + this.waveNumber * 10 : 100,
      armorTier: isZombie ? 0 : Math.floor(Math.random() * 3) + 1,
      helmetTier: isZombie ? 0 : Math.floor(Math.random() * 3) + 1,
      weapon: weaponChoice,
      state: isZombie ? 'COMBAT_ENGAGE' : 'IDLE_PATROL',
      targetPos: new THREE.Vector3(x + (Math.random() - 0.5) * 30, 0, z + (Math.random() - 0.5) * 30),
      targetEntityId: isZombie ? 'player' : null,
      stateTimer: 0,
      patrolWaypointIdx: 0,
      isAlive: true,
      team,
      isZombie,
      shootCooldown: 0,
      strafeDir: Math.random() > 0.5 ? 1 : -1,
    };

    this.bots.push(bot);
    return bot;
  }

  private setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyV') {
        this.togglePerspective();
      } else if (e.code === 'KeyR') {
        this.reloadWeapon();
      } else if (e.code === 'Digit1') {
        this.switchWeapon(WEAPON_REGISTRY.m416);
      } else if (e.code === 'Digit2') {
        this.switchWeapon(WEAPON_REGISTRY.akm);
      } else if (e.code === 'Digit3') {
        this.switchWeapon(WEAPON_REGISTRY.awm);
      } else if (e.code === 'KeyC') {
        this.isCrouching = !this.isCrouching;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
        this.fireActiveWeapon();
      } else if (e.button === 2) {
        e.preventDefault();
        this.isAimingADS = true;
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      } else if (e.button === 2) {
        e.preventDefault();
        this.isAimingADS = false;
      }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse look with pointer lock support
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === canvas) {
        const sensitivity = this.isAimingADS ? 0.0012 : 0.0022;
        this.playerRotation.yaw -= e.movementX * sensitivity;
        this.playerRotation.pitch -= e.movementY * sensitivity;
        this.playerRotation.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.playerRotation.pitch));
      }
    });

    canvas.addEventListener('click', () => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    });
  }

  public togglePerspective() {
    this.perspective = this.perspective === 'TPP' ? 'FPP' : 'TPP';
    // When in FPP, hide the player torso/head mesh from clipping view
    if (this.playerMesh) {
      this.playerMesh.visible = this.perspective === 'TPP';
      // keep held weapon visible in both
      if (this.weaponMesh) {
        this.weaponMesh.visible = true;
      }
    }
  }

  public switchWeapon(weapon: WeaponData) {
    if (this.activeWeapon.id === weapon.id) return;
    this.activeWeapon = weapon;
    this.currentAmmoInMag = weapon.magazineSize;
    soundEngine.playPickup();
    if (this.onStateUpdate) this.onStateUpdate();
  }

  public reloadWeapon() {
    if (this.isReloading || this.currentAmmoInMag >= this.activeWeapon.magazineSize || this.reserveAmmo <= 0) return;
    this.isReloading = true;
    soundEngine.playReload();
    setTimeout(() => {
      const needed = this.activeWeapon.magazineSize - this.currentAmmoInMag;
      const toTake = Math.min(needed, this.reserveAmmo);
      this.currentAmmoInMag += toTake;
      this.reserveAmmo -= toTake;
      this.isReloading = false;
      if (this.onStateUpdate) this.onStateUpdate();
    }, 1800);
  }

  public useMedkit() {
    if (this.playerHealth >= 100) return;
    soundEngine.playPickup();
    this.playerHealth = Math.min(100, this.playerHealth + 75);
    if (this.onStateUpdate) this.onStateUpdate();
  }

  public useEnergyDrink() {
    soundEngine.playPickup();
    this.playerBoost = Math.min(100, this.playerBoost + 40);
    if (this.onStateUpdate) this.onStateUpdate();
  }

  /**
   * Fires the active player weapon with ballistics, spread recoil,
   * audio raycasting alert for bots, and hit detection.
   */
  public fireActiveWeapon() {
    if (this.isGameOver || this.isReloading) return;
    const now = performance.now();
    const fireInterval = 1000 / this.activeWeapon.fireRate;
    if (now - this.lastShotTime < fireInterval) return;

    if (this.currentAmmoInMag <= 0) {
      this.reloadWeapon();
      return;
    }

    this.lastShotTime = now;
    this.currentAmmoInMag--;

    // Play synthesized gunfire
    soundEngine.playGunshot(this.activeWeapon.category);

    // Record audio ping for minimap and bot auditory perception
    this.registerAudioEvent(this.playerPosition.x, this.playerPosition.z, 'shot');

    // Muzzle flash particle
    this.createMuzzleFlash();

    // Recoil kick to camera
    const recoilAmount = this.isAimingADS ? this.activeWeapon.recoil * 0.4 : this.activeWeapon.recoil;
    this.playerRotation.pitch += recoilAmount * (0.8 + Math.random() * 0.4);
    this.playerRotation.yaw += (Math.random() - 0.5) * recoilAmount * 0.3;

    // Raycast ballistics check from camera forward
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    // Test against alive bots
    let hitBot: BotEntity | null = null;
    let hitDistance = Infinity;
    let isHeadshot = false;

    for (const bot of this.bots) {
      if (!bot.isAlive) continue;
      // Skip teammates in TDM
      if (this.mode === 'team_deathmatch' && bot.team === 'blue') continue;

      const botBox = new THREE.Box3().setFromObject(bot.mesh);
      const intersection = raycaster.ray.intersectBox(botBox, new THREE.Vector3());
      if (intersection) {
        const dist = intersection.distanceTo(this.camera.position);
        if (dist < hitDistance && dist <= this.activeWeapon.range) {
          // Check line of sight (no building/metro pillar blocking)
          if (this.worldBuilder.hasLineOfSight(this.camera.position, intersection)) {
            hitDistance = dist;
            hitBot = bot;
            // Check if height was near head (y > 1.45)
            isHeadshot = intersection.y > bot.position.y + 1.45;
          }
        }
      }
    }

    if (hitBot) {
      // Calculate damage with armor absorption & headshot multiplier
      let baseDamage = this.activeWeapon.damage;
      if (isHeadshot) {
        baseDamage *= 2.2;
        soundEngine.playHeadshotDing();
      } else {
        soundEngine.playHitmarker();
      }

      // Damage reduction by vest / helmet
      const reduction = isHeadshot ? (hitBot.helmetTier * 0.15) : (hitBot.armorTier * 0.12);
      const finalDamage = Math.round(baseDamage * (1 - reduction));

      hitBot.health -= finalDamage;
      this.playerDamageDealt += finalDamage;
      if (this.onHitmarker) this.onHitmarker(isHeadshot);

      // Alert hit bot to enter combat engage immediately
      hitBot.state = 'COMBAT_ENGAGE';
      hitBot.targetEntityId = 'player';
      hitBot.targetPos.copy(this.playerPosition);

      if (hitBot.health <= 0) {
        this.handleBotKilled(hitBot, 'Player', this.activeWeapon.name, isHeadshot);
      }
    }

    if (this.onStateUpdate) this.onStateUpdate();
  }

  private handleBotKilled(bot: BotEntity, killerName: string, weaponName: string, isHeadshot: boolean) {
    bot.isAlive = false;
    this.scene.remove(bot.mesh);

    // Spawn tactical death loot crate on the spot
    this.worldBuilder.createGroundLootItem(
      `death_box_${bot.id}`,
      { itemId: 'ammo_556', name: 'Death Box (Ammo & Meds)', category: 'med', icon: '🎁', count: 1 },
      bot.position.x,
      bot.position.z
    );

    if (killerName === 'Player') {
      this.playerKills++;
    }

    if (this.mode === 'team_deathmatch') {
      if (bot.team === 'red') {
        this.tdmScore.blue++;
      } else {
        this.tdmScore.red++;
      }
      // Respawn bot after 3 seconds
      setTimeout(() => {
        if (!this.isDisposed && !this.isGameOver) {
          const respawnZ = bot.team === 'red' ? -40 : 40;
          this.spawnBot(bot.name, -20 + Math.random() * 40, respawnZ, bot.team, false);
        }
      }, 3000);
    } else {
      this.aliveCount = Math.max(1, this.aliveCount - 1);
    }

    // Add to killfeed
    const entry: KillFeedEntry = {
      id: Math.random().toString(),
      killer: killerName,
      victim: bot.name,
      weapon: weaponName,
      isHeadshot,
      isZoneKill: false,
      timestamp: Date.now(),
    };
    this.killFeed.unshift(entry);
    if (this.killFeed.length > 6) this.killFeed.pop();
    if (this.onKillFeedAdd) this.onKillFeedAdd(entry);

    // Check Win condition
    if (this.mode === 'battle_royale' && this.aliveCount <= 1 && !this.isGameOver) {
      this.isGameOver = true;
      this.isVictory = true;
    } else if (this.mode === 'team_deathmatch' && (this.tdmScore.blue >= 40 || this.tdmScore.red >= 40)) {
      this.isGameOver = true;
      this.isVictory = this.tdmScore.blue >= 40;
    } else if (this.mode === 'zombie_survival') {
      const remainingZombies = this.bots.filter((b) => b.isAlive && b.isZombie).length;
      if (remainingZombies === 0) {
        // Next wave!
        setTimeout(() => this.spawnZombieWave(this.waveNumber + 1), 2000);
      }
    }
  }

  private createMuzzleFlash() {
    const flash = new THREE.PointLight(0xffaa00, 3.5, 8);
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(this.playerRotation.pitch, this.playerRotation.yaw, 0, 'YXZ')
    );
    flash.position.copy(this.camera.position).add(forward.clone().multiplyScalar(0.7));
    this.scene.add(flash);
    setTimeout(() => this.scene.remove(flash), 40);
  }

  public registerAudioEvent(x: number, z: number, type: 'shot' | 'step') {
    this.soundPings.push({ x, z, type, timestamp: Date.now() });
    if (this.soundPings.length > 20) this.soundPings.shift();

    // Alert nearby bots via auditory raycasting
    const hearingRadius = type === 'shot' ? 180 : 35;
    for (const bot of this.bots) {
      if (!bot.isAlive) continue;
      const d = Math.hypot(bot.position.x - x, bot.position.z - z);
      if (d <= hearingRadius) {
        if (bot.state === 'IDLE_PATROL' || bot.state === 'LOOT_SEARCH') {
          bot.state = 'HEAR_ALERT';
          bot.targetPos.set(x, 0, z);
          bot.stateTimer = 4.0;
        }
      }
    }
  }

  /**
   * Main game tick update loop
   */
  public update(delta: number) {
    if (this.isGameOver) return;

    this.updatePlayerMovement(delta);
    this.updateCameraMechanics(delta);
    this.updateZoneAndDamage(delta);
    this.updateBotsAI(delta);
    this.updateAirdropCrates(delta);
    this.cleanSoundPings();

    // Auto-fire continuous spray if holding mouse down with AR or SMG
    if (this.isMouseDown && (this.activeWeapon.category === 'AR' || this.activeWeapon.category === 'SMG')) {
      this.fireActiveWeapon();
    }

    this.renderer.render(this.scene, this.camera);
  }

  private updatePlayerMovement(delta: number) {
    const moveVector = new THREE.Vector3();
    if (this.keys['KeyW']) moveVector.z -= 1;
    if (this.keys['KeyS']) moveVector.z += 1;
    if (this.keys['KeyA']) moveVector.x -= 1;
    if (this.keys['KeyD']) moveVector.x += 1;

    const isMoving = moveVector.lengthSq() > 0;
    if (isMoving) {
      moveVector.normalize();
      this.isSprinting = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'];

      // Speed configuration (m/s)
      let speed = this.isSprinting ? 6.8 : 4.4;
      if (this.isCrouching) speed *= 0.6;
      if (this.isAimingADS) speed *= 0.55;

      // Boost speed multiplier
      if (this.playerBoost > 50) speed *= 1.15;

      // Transform by player yaw
      const forward = new THREE.Vector3(-Math.sin(this.playerRotation.yaw), 0, -Math.cos(this.playerRotation.yaw));
      const right = new THREE.Vector3(Math.cos(this.playerRotation.yaw), 0, -Math.sin(this.playerRotation.yaw));

      const displacement = new THREE.Vector3()
        .addScaledVector(forward, -moveVector.z * speed * delta)
        .addScaledVector(right, moveVector.x * speed * delta);

      // Simple collision testing against obstacles
      const nextPos = this.playerPosition.clone().add(displacement);
      const playerRadius = 0.5;
      let collides = false;

      for (const obs of this.worldBuilder.obstacles) {
        if (obs.type === 'tree') continue;
        const expandedBox = obs.box.clone().expandByScalar(playerRadius);
        if (expandedBox.containsPoint(new THREE.Vector3(nextPos.x, 1.0, nextPos.z))) {
          collides = true;
          break;
        }
      }

      if (!collides) {
        this.playerPosition.copy(nextPos);
      }

      // Footstep audio trigger
      this.footstepTimer += delta;
      const stepInterval = this.isSprinting ? 0.32 : 0.48;
      if (this.footstepTimer >= stepInterval) {
        this.footstepTimer = 0;
        soundEngine.playFootstep(0, this.isSprinting ? 0.35 : 0.2);
        this.registerAudioEvent(this.playerPosition.x, this.playerPosition.z, 'step');
      }
    }

    // Passive boost health regen & decay
    if (this.playerBoost > 0) {
      this.playerBoost = Math.max(0, this.playerBoost - delta * 0.8);
      if (this.playerHealth < 100) {
        this.playerHealth = Math.min(100, this.playerHealth + delta * 1.5);
      }
    }

    // Ground loot pickup check (auto proximity pickup)
    for (let i = this.worldBuilder.groundLoots.length - 1; i >= 0; i--) {
      const loot = this.worldBuilder.groundLoots[i];
      if (loot.position.distanceTo(this.playerPosition) < 2.5) {
        this.collectLoot(loot);
      }
    }

    // Update player mesh position and yaw
    if (this.playerMesh) {
      this.playerMesh.position.copy(this.playerPosition);
      this.playerMesh.rotation.y = this.playerRotation.yaw;
    }
  }

  public collectLoot(loot: any) {
    if (loot.category === 'ammo') {
      this.reserveAmmo += loot.count;
      soundEngine.playPickup();
      this.worldBuilder.removeGroundLoot(loot.id);
    } else if (loot.category === 'armor') {
      this.inventory.vestTier = 3;
      this.inventory.vestDurability = 100;
      soundEngine.playPickup();
      this.worldBuilder.removeGroundLoot(loot.id);
    } else if (loot.category === 'med') {
      this.useMedkit();
      this.worldBuilder.removeGroundLoot(loot.id);
    } else if (loot.category === 'attachment') {
      this.inventory.equippedScope = '4x Scope';
      soundEngine.playPickup();
      this.worldBuilder.removeGroundLoot(loot.id);
    }
  }

  /**
   * Dual-Perspective Camera Mechanics:
   * Smooth quaternion & vector lerp between TPP spring-arm and FPP true eye-view,
   * with anti-clip raycasting against urban geometry.
   */
  private updateCameraMechanics(delta: number) {
    const eyeHeight = this.isCrouching ? 1.15 : 1.68;
    const playerEyePos = new THREE.Vector3(this.playerPosition.x, this.playerPosition.y + eyeHeight, this.playerPosition.z);

    // Dynamic FOV based on ADS state
    const targetFOV = this.isAimingADS ? (this.inventory.equippedScope.includes('4x') ? 35 : 50) : (this.perspective === 'TPP' ? 75 : 85);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, delta * 14);
    this.camera.updateProjectionMatrix();

    if (this.perspective === 'FPP') {
      // First Person Perspective: Camera locked right in front of operative face
      this.camera.position.copy(playerEyePos);
      const euler = new THREE.Euler(this.playerRotation.pitch, this.playerRotation.yaw, 0, 'YXZ');
      this.camera.quaternion.setFromEuler(euler);
    } else {
      // Third Person Perspective (TPP): Over-the-shoulder Spring Arm
      const shoulderOffset = this.isAimingADS ? 0.45 : 0.65;
      const armLength = this.isAimingADS ? 1.8 : 3.8;

      const yaw = this.playerRotation.yaw;
      const pitch = this.playerRotation.pitch;

      // Calculate camera ideal position relative to player
      const rightDir = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(shoulderOffset);
      const lookDir = new THREE.Vector3(
        -Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      ).normalize();

      const targetCamPos = playerEyePos.clone().add(rightDir).sub(lookDir.clone().multiplyScalar(armLength));

      // Anti-clipping Raycast / Spherecast against urban buildings & Metro pillars
      const rayDir = targetCamPos.clone().sub(playerEyePos).normalize();
      const maxDist = targetCamPos.distanceTo(playerEyePos);
      const ray = new THREE.Ray(playerEyePos, rayDir);

      let closestHitDist = maxDist;
      for (const obs of this.worldBuilder.obstacles) {
        if (obs.type === 'tree') continue;
        const hit = ray.intersectBox(obs.box, new THREE.Vector3());
        if (hit) {
          const d = hit.distanceTo(playerEyePos);
          if (d < closestHitDist) {
            closestHitDist = Math.max(0.6, d - 0.25); // Spring arm compresses!
          }
        }
      }

      const finalPos = playerEyePos.clone().add(rayDir.multiplyScalar(closestHitDist));
      this.camera.position.lerp(finalPos, delta * 18);

      const lookTarget = playerEyePos.clone().add(lookDir.multiplyScalar(50));
      this.camera.lookAt(lookTarget);
    }
  }

  /**
   * Battle Royale Shrinking Zone Damage & Siren Ticking
   */
  private updateZoneAndDamage(delta: number) {
    if (this.mode !== 'battle_royale') return;

    const { currentDps } = this.zoneSystem.update(delta);
    const { blueCenter, blueRadius, safeCenter, safeRadius } = this.zoneSystem.state;

    // Update 3D visual rings
    this.worldBuilder.updateZoneVisuals(blueCenter, blueRadius, safeCenter, safeRadius);

    // Check player damage
    const { isOutside, distanceOutside } = this.zoneSystem.isOutsideBlue(this.playerPosition.x, this.playerPosition.z);
    if (isOutside) {
      const damageTick = currentDps * delta;
      this.playerHealth = Math.max(0, this.playerHealth - damageTick);

      if (this.playerHealth <= 0 && !this.isGameOver) {
        this.isGameOver = true;
        this.isVictory = false;
        const entry: KillFeedEntry = {
          id: Math.random().toString(),
          killer: 'Blue Zone',
          victim: 'Player',
          weapon: 'Radiation Forcefield',
          isHeadshot: false,
          isZoneKill: true,
          timestamp: Date.now(),
        };
        this.killFeed.unshift(entry);
        if (this.onKillFeedAdd) this.onKillFeedAdd(entry);
      }
    }

    // Check bots zone damage
    for (const bot of this.bots) {
      if (!bot.isAlive) continue;
      const botCheck = this.zoneSystem.isOutsideBlue(bot.position.x, bot.position.z);
      if (botCheck.isOutside) {
        bot.health -= currentDps * delta;
        // Prompt bot to flee towards safe zone
        bot.state = 'ZONE_FLEE';
        const safeDir = this.zoneSystem.getDirectionToSafeZone(bot.position.x, bot.position.z);
        bot.targetPos.set(
          this.zoneSystem.state.safeCenter.x + (Math.random() - 0.5) * 20,
          0,
          this.zoneSystem.state.safeCenter.z + (Math.random() - 0.5) * 20
        );

        if (bot.health <= 0) {
          this.handleBotKilled(bot, 'Blue Zone', 'Electromagnetic Surge', false);
        }
      }
    }
  }

  /**
   * Advanced AI Bot Behavior Tree & State Machine
   */
  private updateBotsAI(delta: number) {
    for (const bot of this.bots) {
      if (!bot.isAlive) continue;
      bot.stateTimer -= delta;
      bot.shootCooldown -= delta;

      const distToPlayer = bot.position.distanceTo(this.playerPosition);

      // Zombies AI: Relentless melee sprint swarm
      if (bot.isZombie) {
        const dir = new THREE.Vector3().subVectors(this.playerPosition, bot.position).normalize();
        bot.position.addScaledVector(dir, delta * (3.8 + this.waveNumber * 0.3));
        bot.mesh.position.copy(bot.position);
        bot.mesh.lookAt(this.playerPosition.x, 0, this.playerPosition.z);

        if (distToPlayer < 1.6 && bot.shootCooldown <= 0) {
          bot.shootCooldown = 1.0;
          soundEngine.playGunshot('PISTOL'); // Slash audio
          const reduction = this.inventory.vestTier * 0.15;
          this.playerHealth = Math.max(0, this.playerHealth - Math.round(22 * (1 - reduction)));
          if (this.playerHealth <= 0) {
            this.isGameOver = true;
            this.isVictory = false;
          }
        }
        continue;
      }

      // Tactical Bot State Machine
      switch (bot.state) {
        case 'IDLE_PATROL': {
          // Patrol between Metro pillars and BDA complex
          const distToTarget = bot.position.distanceTo(bot.targetPos);
          if (distToTarget < 3 || bot.stateTimer <= 0) {
            bot.targetPos.set(
              (Math.random() - 0.5) * 220,
              0,
              (Math.random() - 0.5) * 220
            );
            bot.stateTimer = 6.0;
          }

          // Move towards patrol waypoint
          const dir = new THREE.Vector3().subVectors(bot.targetPos, bot.position).normalize();
          bot.position.addScaledVector(dir, delta * 3.2);
          bot.mesh.position.copy(bot.position);
          bot.mesh.lookAt(bot.targetPos.x, 0, bot.targetPos.z);

          // Check for line of sight to player within vision cone (70m)
          if (distToPlayer < 75 && this.worldBuilder.hasLineOfSight(bot.position, this.playerPosition)) {
            bot.state = 'COMBAT_ENGAGE';
            bot.targetEntityId = 'player';
            bot.stateTimer = 8.0;
          }
          break;
        }

        case 'HEAR_ALERT': {
          // Turn towards sound source and cautiously approach
          const dir = new THREE.Vector3().subVectors(bot.targetPos, bot.position).normalize();
          bot.position.addScaledVector(dir, delta * 2.5);
          bot.mesh.position.copy(bot.position);
          bot.mesh.lookAt(bot.targetPos.x, 0, bot.targetPos.z);

          if (distToPlayer < 65 && this.worldBuilder.hasLineOfSight(bot.position, this.playerPosition)) {
            bot.state = 'COMBAT_ENGAGE';
            bot.targetEntityId = 'player';
          } else if (bot.stateTimer <= 0) {
            bot.state = 'IDLE_PATROL';
          }
          break;
        }

        case 'ZONE_FLEE': {
          // Sprint straight towards Safe Zone center
          const dir = new THREE.Vector3().subVectors(bot.targetPos, bot.position).normalize();
          bot.position.addScaledVector(dir, delta * 6.2); // Full sprint
          bot.mesh.position.copy(bot.position);
          bot.mesh.lookAt(bot.targetPos.x, 0, bot.targetPos.z);
          break;
        }

        case 'COMBAT_ENGAGE': {
          // Tactical combat: Face player, strafe left/right, burst fire
          bot.mesh.lookAt(this.playerPosition.x, 0, this.playerPosition.z);

          // Strafe movement
          const right = new THREE.Vector3(
            Math.cos(bot.mesh.rotation.y),
            0,
            -Math.sin(bot.mesh.rotation.y)
          );
          bot.position.addScaledVector(right, delta * 2.2 * bot.strafeDir);
          bot.mesh.position.copy(bot.position);

          if (Math.random() < 0.03) {
            bot.strafeDir *= -1; // Switch strafe direction
          }

          // Line of sight check
          const hasSight = this.worldBuilder.hasLineOfSight(bot.position, this.playerPosition);

          if (hasSight && bot.shootCooldown <= 0 && distToPlayer <= 140) {
            bot.shootCooldown = 0.5 + Math.random() * 0.4; // Burst fire delay
            soundEngine.playGunshot(bot.weapon.category);
            this.registerAudioEvent(bot.position.x, bot.position.z, 'shot');

            // Ballistic accuracy calculation based on distance
            const accuracyProb = Math.max(0.18, 0.65 - distToPlayer * 0.004);
            if (Math.random() < accuracyProb) {
              // Bot bullet hits player!
              const vestAbsorb = this.inventory.vestTier * 0.12;
              const damage = Math.round(bot.weapon.damage * 0.6 * (1 - vestAbsorb));
              this.playerHealth = Math.max(0, this.playerHealth - damage);
              soundEngine.playHitmarker();

              if (this.playerHealth <= 0 && !this.isGameOver) {
                this.isGameOver = true;
                this.isVictory = false;
                const entry: KillFeedEntry = {
                  id: Math.random().toString(),
                  killer: bot.name,
                  victim: 'Player',
                  weapon: bot.weapon.name,
                  isHeadshot: Math.random() > 0.8,
                  isZoneKill: false,
                  timestamp: Date.now(),
                };
                this.killFeed.unshift(entry);
                if (this.onKillFeedAdd) this.onKillFeedAdd(entry);
              }
            }
          }

          // If low health, switch to retreat & heal
          if (bot.health < 35 && bot.stateTimer <= 3) {
            bot.state = 'HEAL_RETREAT';
            bot.stateTimer = 4.0;
          }
          break;
        }

        case 'HEAL_RETREAT': {
          // Fall back behind nearest Metro pillar
          const retreatDir = new THREE.Vector3().subVectors(bot.position, this.playerPosition).normalize();
          bot.position.addScaledVector(retreatDir, delta * 3.8);
          bot.mesh.position.copy(bot.position);

          if (bot.stateTimer <= 0) {
            bot.health = Math.min(bot.maxHealth, bot.health + 45); // Used medkit
            bot.state = 'COMBAT_ENGAGE';
          }
          break;
        }
      }
    }
  }

  private updateAirdropCrates(delta: number) {
    if (this.mode !== 'battle_royale') return;
    if (!this.airdropSpawned && this.zoneSystem.state.currentPhase >= 2) {
      this.airdropSpawned = true;
      // Spawn care package crate inside current safe zone
      const sx = this.zoneSystem.state.safeCenter.x + (Math.random() - 0.5) * 30;
      const sz = this.zoneSystem.state.safeCenter.z + (Math.random() - 0.5) * 30;
      this.worldBuilder.spawnAirdrop(sx, sz);

      const entry: KillFeedEntry = {
        id: Math.random().toString(),
        killer: 'Bengaluru ATC Air Support',
        victim: 'Banashankari BDA Courtyard',
        weapon: 'Care Package Airdrop Inbound!',
        isHeadshot: false,
        isZoneKill: false,
        timestamp: Date.now(),
      };
      this.killFeed.unshift(entry);
      if (this.onKillFeedAdd) this.onKillFeedAdd(entry);
    }
  }

  private cleanSoundPings() {
    const now = Date.now();
    this.soundPings = this.soundPings.filter((p) => now - p.timestamp < 3500);
  }

  public restartGame(mode?: GameMode) {
    if (mode) this.mode = mode;
    this.isGameOver = false;
    this.isVictory = false;
    this.playerHealth = 100;
    this.playerBoost = 50;
    this.playerKills = 0;
    this.playerDamageDealt = 0;
    this.currentAmmoInMag = 30;
    this.reserveAmmo = 120;
    this.playerPosition.set(0, 0, 15);
    this.tdmScore = { blue: 0, red: 0 };
    this.waveNumber = 1;

    // Reset zone system
    this.zoneSystem = new ZoneSystem(420);
    this.airdropSpawned = false;

    // Clean up existing bots meshes
    for (const bot of this.bots) {
      this.scene.remove(bot.mesh);
    }
    this.bots = [];

    this.spawnEntitiesForMode();
  }

  public dispose() {
    this.isDisposed = true;
    this.renderer.dispose();
  }
}
