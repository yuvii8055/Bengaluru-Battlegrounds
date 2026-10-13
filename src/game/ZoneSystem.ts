import { ZonePhase, ZoneState } from '../types/game';
import { soundEngine } from '../utils/audio';

export const BATTLE_ROYALE_PHASES: ZonePhase[] = [
  {
    phaseNumber: 1,
    waitDuration: 40,
    shrinkDuration: 30,
    safeRadius: 280,
    dps: 1.5,
  },
  {
    phaseNumber: 2,
    waitDuration: 30,
    shrinkDuration: 25,
    safeRadius: 160,
    dps: 3.5,
  },
  {
    phaseNumber: 3,
    waitDuration: 25,
    shrinkDuration: 20,
    safeRadius: 85,
    dps: 7.0,
  },
  {
    phaseNumber: 4,
    waitDuration: 18,
    shrinkDuration: 15,
    safeRadius: 36,
    dps: 14.0,
  },
  {
    phaseNumber: 5,
    waitDuration: 12,
    shrinkDuration: 12,
    safeRadius: 0,
    dps: 28.0,
  },
];

export class ZoneSystem {
  public state: ZoneState;
  private currentPhaseIndex: number = 0;
  private timer: number = 0; // seconds into current phase state
  private startBlueCenter: { x: number; z: number } = { x: 0, z: 0 };
  private startBlueRadius: number = 420;
  private onPhaseChangeCallback?: (phase: number, isShrinking: boolean) => void;

  constructor(initialRadius: number = 420) {
    // Phase 1 begins centered around Banashankari BDA Complex (0, 0)
    const nextSafe = this.calculateNextSafeCircle({ x: 0, z: 0 }, initialRadius, BATTLE_ROYALE_PHASES[0].safeRadius);

    this.state = {
      currentPhase: 1,
      totalPhases: BATTLE_ROYALE_PHASES.length,
      phaseTimer: BATTLE_ROYALE_PHASES[0].waitDuration,
      isShrinking: false,
      blueCenter: { x: 0, z: 0 },
      blueRadius: initialRadius,
      safeCenter: nextSafe.center,
      safeRadius: nextSafe.radius,
      nextSafeCenter: nextSafe.center,
      nextSafeRadius: nextSafe.radius,
    };

    this.startBlueCenter = { ...this.state.blueCenter };
    this.startBlueRadius = initialRadius;
    this.timer = 0;
  }

  public setOnPhaseChange(cb: (phase: number, isShrinking: boolean) => void) {
    this.onPhaseChangeCallback = cb;
  }

  /**
   * Generates a sub-circle that is mathematically guaranteed to fit entirely
   * inside the current boundary circle.
   */
  private calculateNextSafeCircle(
    currentCenter: { x: number; z: number },
    currentRadius: number,
    targetRadius: number
  ): { center: { x: number; z: number }; radius: number } {
    if (targetRadius <= 0) {
      return {
        center: { ...currentCenter },
        radius: 0,
      };
    }

    const maxOffset = Math.max(0, currentRadius - targetRadius);
    // Bias towards Banashankari central plaza / BDA complex
    const r = Math.sqrt(Math.random()) * maxOffset * 0.75;
    const angle = Math.random() * Math.PI * 2;

    return {
      center: {
        x: currentCenter.x + r * Math.cos(angle),
        z: currentCenter.z + r * Math.sin(angle),
      },
      radius: targetRadius,
    };
  }

  public update(deltaSeconds: number): {
    currentDps: number;
    phaseEnded: boolean;
  } {
    if (this.currentPhaseIndex >= BATTLE_ROYALE_PHASES.length) {
      return { currentDps: 30.0, phaseEnded: true };
    }

    const phaseConfig = BATTLE_ROYALE_PHASES[this.currentPhaseIndex];
    this.timer += deltaSeconds;

    if (!this.state.isShrinking) {
      // Waiting phase before circle starts moving
      const remainingWait = Math.max(0, phaseConfig.waitDuration - this.timer);
      this.state.phaseTimer = remainingWait;

      if (remainingWait <= 5 && remainingWait > 4.8) {
        soundEngine.playZoneWarning();
      }

      if (this.timer >= phaseConfig.waitDuration) {
        // Transition to shrinking
        this.state.isShrinking = true;
        this.timer = 0;
        this.startBlueCenter = { ...this.state.blueCenter };
        this.startBlueRadius = this.state.blueRadius;
        soundEngine.playZoneWarning();
        if (this.onPhaseChangeCallback) {
          this.onPhaseChangeCallback(this.state.currentPhase, true);
        }
      }
    } else {
      // Shrinking phase
      const progress = Math.min(1, this.timer / phaseConfig.shrinkDuration);
      this.state.phaseTimer = Math.max(0, phaseConfig.shrinkDuration - this.timer);

      // Smooth Hermite interpolation (SmoothStep)
      const t = progress * progress * (3 - 2 * progress);

      this.state.blueCenter.x = this.startBlueCenter.x + (this.state.safeCenter.x - this.startBlueCenter.x) * t;
      this.state.blueCenter.z = this.startBlueCenter.z + (this.state.safeCenter.z - this.startBlueCenter.z) * t;
      this.state.blueRadius = this.startBlueRadius + (this.state.safeRadius - this.startBlueRadius) * t;

      if (progress >= 1) {
        // Phase shrink complete!
        this.currentPhaseIndex++;
        this.timer = 0;
        this.state.isShrinking = false;

        if (this.currentPhaseIndex < BATTLE_ROYALE_PHASES.length) {
          const nextPhase = BATTLE_ROYALE_PHASES[this.currentPhaseIndex];
          this.state.currentPhase = nextPhase.phaseNumber;
          this.state.phaseTimer = nextPhase.waitDuration;

          // Compute new safe circle inside current safe circle
          const nextTarget = this.calculateNextSafeCircle(
            this.state.safeCenter,
            this.state.safeRadius,
            nextPhase.safeRadius
          );
          this.state.safeCenter = nextTarget.center;
          this.state.safeRadius = nextTarget.radius;
          this.state.nextSafeCenter = nextTarget.center;
          this.state.nextSafeRadius = nextTarget.radius;

          if (this.onPhaseChangeCallback) {
            this.onPhaseChangeCallback(this.state.currentPhase, false);
          }
        }
      }
    }

    return {
      currentDps: phaseConfig.dps,
      phaseEnded: this.currentPhaseIndex >= BATTLE_ROYALE_PHASES.length,
    };
  }

  /**
   * Returns whether a point (x, z) is currently caught outside the Blue Zone,
   * along with the distance to the edge.
   */
  public isOutsideBlue(x: number, z: number): { isOutside: boolean; distanceOutside: number } {
    const dx = x - this.state.blueCenter.x;
    const dz = z - this.state.blueCenter.z;
    const dist = Math.hypot(dx, dz);
    const isOutside = dist > this.state.blueRadius;
    return {
      isOutside,
      distanceOutside: isOutside ? dist - this.state.blueRadius : 0,
    };
  }

  /**
   * Vector direction towards the center of the safe zone
   */
  public getDirectionToSafeZone(x: number, z: number): { dirX: number; dirZ: number; distance: number } {
    const dx = this.state.safeCenter.x - x;
    const dz = this.state.safeCenter.z - z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.001) return { dirX: 0, dirZ: 0, distance: 0 };
    return {
      dirX: dx / distance,
      dirZ: dz / distance,
      distance,
    };
  }
}
