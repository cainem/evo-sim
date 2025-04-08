import { Config } from './Config';
import { SeededRandom } from './utils/SeededRandom';
import { WorldMap } from './WorldMap';
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

  /**
   * Creates a new offspring from this organism
   */
  public reproduce(
    config: Config,
    random: SeededRandom,
    worldMap: WorldMap
  ): Organism {
    // Calculate new mutation values with probability of change
    const newDeliberateMutationX = this.calculateNewMutation(
      this.deliberateMutationX,
      config.deliberateMutationProbability,
      random
    );
    const newDeliberateMutationY = this.calculateNewMutation(
      this.deliberateMutationY,
      config.deliberateMutationProbability,
      random
    );

    // Calculate offspring position using parent's distance parameters
    const newX = this.calculateWrappedCoordinate(
      this.x + this.offspringsXDistance,
      config.worldSize
    );
    const newY = this.calculateWrappedCoordinate(
      this.y + this.offspringsYDistance,
      config.worldSize
    );

    // Calculate new offspring distances based on parent's mutation values
    const newOffspringsXDistance = this.calculateNewDistance(
      this.offspringsXDistance,
      newDeliberateMutationX
    );
    const newOffspringsYDistance = this.calculateNewDistance(
      this.offspringsYDistance,
      newDeliberateMutationY
    );

    // Create and return the new offspring
    return new Organism({
      x: newX,
      y: newY,
      roundsLived: 0,
      deliberateMutationX: newDeliberateMutationX,
      deliberateMutationY: newDeliberateMutationY,
      offspringsXDistance: newOffspringsXDistance,
      offspringsYDistance: newOffspringsYDistance
    }, config);
  }

  /**
   * Moves the organism in a random direction
   */
  public move(random: SeededRandom, moveDistance: number): void {
    const angle = random.nextFloat(0, 1) * 2 * Math.PI; // Use nextFloat(0, 1) for random angle
    const dx = Math.cos(angle) * moveDistance;
    const dy = Math.sin(angle) * moveDistance;
    this.x = Math.floor(this.x + dx);
    this.y = Math.floor(this.y + dy);
  }

  /**
   * Calculates a new mutation value based on current value and probability
   */
  private calculateNewMutation(
    currentValue: number,
    probability: number,
    random: SeededRandom
  ): number {
    if (random.nextBoolean(probability)) {
      // Apply mutation: if current is 0, randomly choose -1 or 1
      // if current is -1 or 1, switch to 0
      if (currentValue === 0) {
        return random.nextBoolean() ? 1 : -1;
      } else {
        return 0;
      }
    }
    return currentValue;
  }

  /**
   * Calculates new offspring distance based on mutation value
   */
  private calculateNewDistance(currentDistance: number, mutation: number): number {
    return currentDistance + mutation;
  }

  /**
   * Calculates wrapped coordinate for world boundaries
   */
  private calculateWrappedCoordinate(coord: number, worldSize: number): number {
    return ((coord % worldSize) + worldSize) % worldSize;
  }
}
