import { Config } from './Config';
import { SeededRandom } from './utils/SeededRandom';
import { OrganismParameters } from './types/OrganismParameters';

export class Organism {
  private x: number;
  private y: number;
  private roundsLived: number;
  private readonly deliberateMutationX: number;
  private readonly deliberateMutationY: number;
  private readonly offspringsXDistance: number;
  private readonly offspringsYDistance: number;

  /**
   * Creates a new organism
   * @param params The organism's parameters
   * @param config The simulation configuration
   * @param random The seeded random number generator (only used for initial organisms)
   */
  constructor(
    params: OrganismParameters,
    private readonly config: Config,
    random?: SeededRandom
  ) {
    this.x = params.x;
    this.y = params.y;
    this.deliberateMutationX = params.deliberateMutationX;
    this.deliberateMutationY = params.deliberateMutationY;
    this.offspringsXDistance = params.offspringsXDistance;
    this.offspringsYDistance = params.offspringsYDistance;

    // For initial organisms, randomly set roundsLived if not provided
    if (params.roundsLived !== undefined) {
      this.roundsLived = params.roundsLived;
    } else {
      if (!random) {
        throw new Error('SeededRandom instance required for initial organisms');
      }
      this.roundsLived = random.nextInt(0, Math.floor(config.maxLifeSpan / 2));
    }
  }

  /**
   * Increments the organism's age by one round
   */
  public age(): void {
    this.roundsLived++;
  }

  /**
   * Checks if the organism has reached its maximum lifespan
   */
  public isDead(): boolean {
    return this.roundsLived >= this.config.maxLifeSpan;
  }

  /**
   * Gets the organism's current position
   */
  public getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Gets the organism's current age in rounds
   */
  public getRoundsLived(): number {
    return this.roundsLived;
  }

  /**
   * Gets the organism's mutation parameters
   */
  public getMutationParameters(): {
    deliberateMutationX: number;
    deliberateMutationY: number;
    offspringsXDistance: number;
    offspringsYDistance: number;
  } {
    return {
      deliberateMutationX: this.deliberateMutationX,
      deliberateMutationY: this.deliberateMutationY,
      offspringsXDistance: this.offspringsXDistance,
      offspringsYDistance: this.offspringsYDistance
    };
  }

  /**
   * Creates a copy of the organism's parameters
   * Useful for creating offspring or cloning
   */
  public getParameters(): OrganismParameters {
    return {
      x: this.x,
      y: this.y,
      roundsLived: this.roundsLived,
      deliberateMutationX: this.deliberateMutationX,
      deliberateMutationY: this.deliberateMutationY,
      offspringsXDistance: this.offspringsXDistance,
      offspringsYDistance: this.offspringsYDistance
    };
  }
}
