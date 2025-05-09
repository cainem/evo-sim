import { SeededRandom } from './utils/SeededRandom';
import { Config } from './Config';
import { WorldMap } from './WorldMap';

/**
 * Type representing a position in the world.
 */
export type Position = { x: number; y: number };

/**
 * Base class encapsulating common organism behaviors: aging, dying, and positioning.
 */
export abstract class BaseOrganism {
  protected x: number;
  protected y: number;
  protected roundsLived: number;
  private markedForDeath: boolean = false;

  constructor(
    params: { x: number; y: number; roundsLived?: number },
    protected readonly config: Config,
    random?: SeededRandom
  ) {
    this.x = Math.floor(params.x);
    this.y = Math.floor(params.y);
    if (params.roundsLived !== undefined) {
      this.roundsLived = params.roundsLived;
    } else {
      if (!random) {
        throw new Error('SeededRandom instance required for initial organisms');
      }
      this.roundsLived = random.nextInt(0, config.maxLifeSpan - 1);
    }
  }

  /** Increments age and marks for death at max lifespan */
  public age(): void {
    this.roundsLived++;
    if (this.roundsLived >= this.config.maxLifeSpan) {
      this.markedForDeath = true;
    }
  }

  /** Whether the organism should die this round */
  public shouldDie(): boolean {
    return this.roundsLived >= this.config.maxLifeSpan;
  }

  /** Whether the organism is marked for death */
  public isDead(): boolean {
    return this.markedForDeath;
  }

  /** Mark the organism for death manually */
  public markForDeath(): void {
    this.markedForDeath = true;
  }

  /** Current position in the world */
  public getPosition(): Position {
    return { x: this.x, y: this.y };
  }

  /** Number of rounds lived so far */
  public getRoundsLived(): number {
    return this.roundsLived;
  }

  /**
   * Gets mutation parameters (deliberate mutation and offspring distances).
   * Default implementation returns zeros; override in subclasses as needed.
   */
  public getMutationParameters(): {
    deliberateMutationX: number;
    deliberateMutationY: number;
    offspringsXDistance: number;
    offspringsYDistance: number;
  } {
    return {
      deliberateMutationX: 0,
      deliberateMutationY: 0,
      offspringsXDistance: 0,
      offspringsYDistance: 0
    };
  }

  /**
   * Creates an offspring; must be implemented by subclasses.
   */
  public abstract reproduce(
    parents: BaseOrganism[],
    index: number,
    config: Config,
    random: SeededRandom,
    worldMap?: WorldMap
  ): BaseOrganism[];
}
