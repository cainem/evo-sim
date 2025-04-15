import { Config } from './Config';
import { SeededRandom } from './utils/SeededRandom';
import { WorldMap } from './WorldMap';
import { OrganismParameters } from './types/OrganismParameters';

export class Organism {
  private x: number;
  private y: number;
  private roundsLived: number;
  private markedForDeath: boolean = false;
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
    // Ensure positions are stored as integers
    this.x = Math.floor(params.x);
    this.y = Math.floor(params.y);
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
    // Mark for death if max lifespan has been reached
    if (this.roundsLived >= this.config.maxLifeSpan) {
      this.markedForDeath = true;
    }
  }

  /**
   * Checks if the organism has reached its maximum lifespan
   * This now returns whether the organism is marked for death
   */
  public isDead(): boolean {
    return this.markedForDeath;
  }

  /**
   * Checks if the organism has reached its maximum lifespan
   * This is used during the marking phase
   */
  public shouldDie(): boolean {
    return this.roundsLived >= this.config.maxLifeSpan;
  }

  /**
   * Marks the organism for death
   */
  public markForDeath(): void {
    this.markedForDeath = true;
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
    // Only log in non-test environment
    const isTestEnvironment = config.isTestEnvironment;
    
    if (!isTestEnvironment) {
      console.log('=== REPRODUCTION ===');
      
      // Add bounds checking before calling getHeight
      const worldSize = config.worldSize;
      const isValidPos = this.x >= 0 && this.x < worldSize && this.y >= 0 && this.y < worldSize;
      const height = isValidPos ? worldMap.getHeight(this.x, this.y) : 'OUT_OF_BOUNDS';
      
      console.log('Parent position:', this.x, this.y, 'Height:', height);
      console.log('Parent mutation values:', {
        deliberateMutationX: this.deliberateMutationX,
        deliberateMutationY: this.deliberateMutationY,
        offspringsXDistance: this.offspringsXDistance,
        offspringsYDistance: this.offspringsYDistance
      });
    }
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

    // Calculate offset based on deliberateMutation values as per PDD
    const offsetX = this.deliberateMutationX !== 0 ? this.offspringsXDistance : 0;
    const offsetY = this.deliberateMutationY !== 0 ? this.offspringsYDistance : 0;
    
    // Calculate offspring position using parent's position and offset
    const newX = this.calculateWrappedCoordinate(
      this.x + offsetX,
      config.worldSize
    );
    const newY = this.calculateWrappedCoordinate(
      this.y + offsetY,
      config.worldSize
    );

    // Calculate single-step distances for logging/verification
    const singleStepXDistance = newX - this.x;
    const singleStepYDistance = newY - this.y;

    // Calculate cumulative offspring distance based on PDD
    const cumulativeOffspringXDistance = this.offspringsXDistance + newDeliberateMutationX;
    const cumulativeOffspringYDistance = this.offspringsYDistance + newDeliberateMutationY;

    // Log offspring data - but only outside of test environment
    if (!isTestEnvironment) {
      // Add bounds check for the height lookup
      const isValidPos = newX >= 0 && newX < config.worldSize && newY >= 0 && newY < config.worldSize;
      const height = isValidPos ? worldMap.getHeight(newX, newY) : 'OUT_OF_BOUNDS';
      
      console.log('Offspring position:', newX, newY, 'Height:', height);
      console.log('Offspring parameters:', {
        deliberateMutationX: newDeliberateMutationX,
        deliberateMutationY: newDeliberateMutationY,
        offspringsXDistance: cumulativeOffspringXDistance, 
        offspringsYDistance: cumulativeOffspringYDistance
      });
      console.log('Parent State: MutX=' + this.deliberateMutationX + ', MutY=' + this.deliberateMutationY + ', CumDistX=' + this.offspringsXDistance + ', CumDistY=' + this.offspringsYDistance);
      console.log('Mutation Applied: finalMutX=' + newDeliberateMutationX + ', finalMutY=' + newDeliberateMutationY);
      console.log('Distances: StepX=' + singleStepXDistance + ', StepY=' + singleStepYDistance + ', CumX=' + cumulativeOffspringXDistance + ', CumY=' + cumulativeOffspringYDistance);
      console.log('Offspring Initial State: MutX=' + newDeliberateMutationX + ', MutY=' + newDeliberateMutationY + ', CumDistX=' + cumulativeOffspringXDistance + ', CumDistY=' + cumulativeOffspringYDistance);
      console.log('=== END REPRODUCTION ===');
    }

    // Create and return the new offspring
    return new Organism({
      x: newX,
      y: newY,
      roundsLived: 0,
      deliberateMutationX: newDeliberateMutationX,
      deliberateMutationY: newDeliberateMutationY,
      offspringsXDistance: cumulativeOffspringXDistance,
      offspringsYDistance: cumulativeOffspringYDistance
    }, config);
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
   * Calculates wrapped coordinate for world boundaries, ensuring integer result
   */
  private calculateWrappedCoordinate(coord: number, worldSize: number): number {
    // Calculate wrapped coordinate
    const wrappedCoord = ((coord % worldSize) + worldSize) % worldSize;
    // Ensure the result is an integer
    return Math.floor(wrappedCoord);
  }
}
