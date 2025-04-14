import { Config } from './Config';
import { WorldMap } from './WorldMap';
import { SeededRandom } from './utils/SeededRandom';
import { Organism } from './Organism';
import { OrganismParameters } from './types/OrganismParameters';
import { Region } from './Region';

export class Simulation {
  private organisms: Organism[] = [];
  private roundNumber: number = 0;
  private regions: Region[] = [];

  constructor(
    private readonly config: Config,
    private readonly worldMap: WorldMap,
    private readonly random: SeededRandom,
    regions: Region[]
  ) {
    this.regions = [...regions];
  }

  /**
   * Initializes the simulation with starting organisms at the center
   */
  public initialize(): void {
    const centerX = Math.floor(this.config.worldSize / 2);
    const centerY = Math.floor(this.config.worldSize / 2);

    // Create starting organisms at the center
    for (let i = 0; i < this.config.startingOrganisms; i++) {
      const params: OrganismParameters = {
        x: centerX,
        y: centerY,
        deliberateMutationX: this.random.nextFloat(-1, 1),
        deliberateMutationY: this.random.nextFloat(-1, 1),
        offspringsXDistance: this.random.nextFloat(-10, 10),
        offspringsYDistance: this.random.nextFloat(-10, 10)
      };

      this.organisms.push(new Organism(params, this.config, this.random));
    }
  }

  /**
   * Runs a single round of the simulation
   * @returns Statistics about the round execution
   */
  public runRound(): {
    deaths: number;
    births: number;
  } {
    // Phase 1: Mark organisms for death but don't remove them yet
    // Age all organisms (this will mark them for death if they reach max lifespan)
    this.organisms.forEach(organism => organism.age());
    
    // Count how many organisms are marked for death
    const markedForDeath = this.organisms.filter(organism => organism.isDead()).length;

    // Phase 2: Allow reproduction (including organisms marked for death)
    const newOffspring = this.handleReproduction();
    this.organisms.push(...newOffspring);

    // Phase 3: Now remove dead organisms after reproduction has happened
    const countBeforeFiltering = this.organisms.length;
    this.organisms = this.organisms.filter(organism => !organism.isDead());
    const countAfterFiltering = this.organisms.length;
    const deathsThisRound = countBeforeFiltering - countAfterFiltering;

    // Increment round number
    this.roundNumber++;

    return {
      deaths: deathsThisRound,
      births: newOffspring.length
    };
  }

  /**
   * Gets the current round number
   */
  public getRoundNumber(): number {
    return this.roundNumber;
  }

  /**
   * Gets the current number of living organisms
   */
  public getOrganismCount(): number {
    return this.organisms.length;
  }

  /**
   * Gets a copy of the current organisms array
   * Useful for testing and observation
   */
  public getOrganisms(): Organism[] {
    return [...this.organisms];
  }

  /**
   * Resets the simulation to its initial state
   */
  public reset(): void {
    this.organisms = [];
    this.roundNumber = 0;
  }

  /**
   * Initializes the simulation with specific organisms (for testing)
   */
  public initializeWithOrganisms(organisms: Organism[]): void {
    this.organisms = [...organisms];
  }

  /**
   * Handles reproduction for all regions
   * @returns Array of new offspring
   */
  private handleReproduction(): Organism[] {
    const newOffspring: Organism[] = [];
    const regionMap = this.groupOrganismsByRegion();

    // Process each region
    for (const [regionIndex, organisms] of regionMap.entries()) {
      const region = this.regions[regionIndex];
      const stats = region.getStatistics();
      const currentOrganismCount = organisms.length;
      const carryingCapacity = stats.carryingCapacity;
      
      // Count living organisms (not marked for death) for population comparison
      const livingOrganismCount = organisms.filter(org => !org.isDead()).length;
      
      // Only process regions where living count is less than carrying capacity
      if (livingOrganismCount < carryingCapacity && currentOrganismCount > 0) {
        // Calculate target reproductions based on living organisms (as per updated PDD)
        const targetReproductions = carryingCapacity - livingOrganismCount;
        
        // Filter eligible parents (RL >= 1)
        const eligibleParents = organisms.filter(org => org.getRoundsLived() >= 1);

        if (eligibleParents.length > 0) {
          // Sort by height at their position, using random for ties
          eligibleParents.sort((a, b) => {
            const heightA = this.worldMap.getHeight(a.getPosition().x, a.getPosition().y);
            const heightB = this.worldMap.getHeight(b.getPosition().x, b.getPosition().y);
            if (heightA !== heightB) return heightB - heightA;
            return this.random.nextFloat(0, 1) - 0.5; // Random tiebreaker
          });

          // Select top parents based on target reproductions and eligible parents count
          const numParents = Math.min(
            targetReproductions,
            eligibleParents.length
          );

          // Create offspring
          for (let i = 0; i < numParents; i++) {
            const parent = eligibleParents[i];
            const offspring = parent.reproduce(
              this.config,
              this.random,
              this.worldMap
            );
            newOffspring.push(offspring);
          }
        }
      }
    }

    return newOffspring;
  }

  /**
   * Groups organisms by their region index
   * Organisms marked for death are excluded from the population count
   */
  private groupOrganismsByRegion(): Map<number, Organism[]> {
    const regionMap = new Map<number, Organism[]>();

    // Initialize empty arrays for each region
    for (let i = 0; i < this.regions.length; i++) {
      regionMap.set(i, []);
    }

    // Group organisms by region - but exclude ones marked for death from population count
    // Note: They are still included in the arrays, just filtered for counting purposes
    for (const organism of this.organisms) {
      const pos = organism.getPosition();
      for (let i = 0; i < this.regions.length; i++) {
        if (this.regions[i].containsPoint(pos.x, pos.y)) {
          regionMap.get(i)!.push(organism);
          break;
        }
      }
    }

    return regionMap;
  }
}
