import { Config } from './Config';
import { SeededRandom } from './utils/SeededRandom';
import { WorldMap } from './WorldMap';
import { OrganismParameters } from './types/OrganismParameters';
import { BaseOrganism } from './BaseOrganism';

export class OrganismA extends BaseOrganism {
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
    config: Config,
    random?: SeededRandom
  ) {
    super({ x: params.x, y: params.y, roundsLived: params.roundsLived }, config, random);
    this.deliberateMutationX = params.deliberateMutationX;
    this.deliberateMutationY = params.deliberateMutationY;
    this.offspringsXDistance = params.offspringsXDistance;
    this.offspringsYDistance = params.offspringsYDistance;
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
      x: this.getPosition().x,
      y: this.getPosition().y,
      roundsLived: this.getRoundsLived(),
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
    parents: BaseOrganism[],
    index: number,
    config: Config,
    random: SeededRandom,
    worldMap?: WorldMap
  ): OrganismA {
    /* istanbul ignore next */
    const isTestEnvironment = config.isTestEnvironment;
    
    /* istanbul ignore next */
    if (!isTestEnvironment) {
      console.log('=== REPRODUCTION ===');
      
      // Add bounds checking before calling getHeight
      const worldSize = config.worldSize;
      const isValidPos = this.getPosition().x >= 0 && this.getPosition().x < worldSize && this.getPosition().y >= 0 && this.getPosition().y < worldSize;
      const height = isValidPos ? worldMap!.getHeight(this.getPosition().x, this.getPosition().y) : 'OUT_OF_BOUNDS';
      
      console.log('Parent position:', this.getPosition().x, this.getPosition().y, 'Height:', height);
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
      this.getPosition().x + offsetX,
      config.worldSize
    );
    const newY = this.calculateWrappedCoordinate(
      this.getPosition().y + offsetY,
      config.worldSize
    );

    // Calculate single-step distances for logging/verification
    const singleStepXDistance = newX - this.getPosition().x;
    const singleStepYDistance = newY - this.getPosition().y;

    // Calculate cumulative offspring distance based on PDD and clamp to [-5, 5]
    const cumulativeOffspringXDistance = OrganismA.clampToRange(
      this.offspringsXDistance + newDeliberateMutationX,
      -5,
      5
    );
    const cumulativeOffspringYDistance = OrganismA.clampToRange(
      this.offspringsYDistance + newDeliberateMutationY,
      -5,
      5
    );

    /* istanbul ignore next */
    if (!isTestEnvironment) {
      // Add bounds check for the height lookup
      const isValidPos = newX >= 0 && newX < config.worldSize && newY >= 0 && newY < config.worldSize;
      const height = isValidPos ? worldMap!.getHeight(newX, newY) : 'OUT_OF_BOUNDS';
      
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
    return new OrganismA({
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
   * Clamps a value to the specified min and max (inclusive)
   */
  private static clampToRange(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
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
