import { Config } from './Config';
import { WorldMap } from './WorldMap';
import { SeededRandom } from './utils/SeededRandom';
import { OrganismA } from './OrganismA';
import { OrganismParameters } from './types/OrganismParameters';
import { Region } from './Region';

export class Simulation {
  private organisms: OrganismA[] = [];
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
        // According to the PDD, deliberateMutation values should only be -1, 0, or 1
        deliberateMutationX: this.getRandomMutationValue(),
        deliberateMutationY: this.getRandomMutationValue(),
        offspringsXDistance: 0, // Initialize to 0 per PDD
        offspringsYDistance: 0  // Initialize to 0 per PDD
      };

      this.organisms.push(new OrganismA(params, this.config, this.random));
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
  public getOrganisms(): OrganismA[] {
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
  public initializeWithOrganisms(organisms: OrganismA[]): void {
    this.organisms = [...organisms];
  }

  /**
   * Handles reproduction for all regions
   * @returns Array of new offspring
   */
  private handleReproduction(): OrganismA[] {
    const newOffspring: OrganismA[] = [];
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
          if (!this.config.isTestEnvironment) {
            console.log(`\n=== REGION ${regionIndex} REPRODUCTION (Capacity: ${carryingCapacity}, Current: ${livingOrganismCount}) ===`);
            console.log(`Eligible parents: ${eligibleParents.length}`);
          }
          
          // Add height information to parents for logging
          const parentsWithHeight = eligibleParents.map(p => {
            const pos = p.getPosition();
            return {
              organism: p,
              position: pos,
              height: this.worldMap.getHeight(pos.x, pos.y)
            };
          });
          
          // Log parents before sorting - only outside tests
          if (!this.config.isTestEnvironment) {
            parentsWithHeight.forEach((p, i) => {
              console.log(`Parent ${i}: pos(${p.position.x},${p.position.y}), height: ${p.height}`);
            });
          }
          
          // Sort by height at their position, using random for ties
          eligibleParents.sort((a, b) => {
            try {
              const posA = a.getPosition();
              const posB = b.getPosition();
              
              // Check bounds to prevent errors
              const worldSize = this.config.worldSize;
              const isValidPosA = posA.x >= 0 && posA.x < worldSize && posA.y >= 0 && posA.y < worldSize;
              const isValidPosB = posB.x >= 0 && posB.x < worldSize && posB.y >= 0 && posB.y < worldSize;
              
              if (!this.config.isTestEnvironment) {
                console.log(`Sorting check: A(${posA.x}, ${posA.y}) valid:${isValidPosA}, B(${posB.x}, ${posB.y}) valid:${isValidPosB}, WorldSize:${worldSize}`);
              }
              
              // Use -1 as height for invalid coordinates - ensures invalid positions sort to the bottom
              const heightA = isValidPosA ? this.worldMap.getHeight(posA.x, posA.y) : -1;
              const heightB = isValidPosB ? this.worldMap.getHeight(posB.x, posB.y) : -1;
              
              if (heightA !== heightB) return heightB - heightA;
              return this.random.nextFloat(0, 1) - 0.5; // Random tiebreaker
            } catch (error) {
              console.error('Error in sort callback:', error);
              return 0; // If error, don't change order
            }
          });
          
          // Log parents after sorting - only outside tests
          if (!this.config.isTestEnvironment) {
            console.log('=== AFTER SORTING BY HEIGHT ===');
          }

          // Select top parents based on target reproductions and eligible parents count
          const numParents = Math.min(
            targetReproductions,
            eligibleParents.length
          );

          // Create offspring
          if (!this.config.isTestEnvironment) {
            console.log(`Selected ${numParents} parents for reproduction`);
          }
          for (let i = 0; i < numParents; i++) {
            const parent = eligibleParents[i];
            const parentPos = parent.getPosition();
            const parentHeight = this.worldMap.getHeight(parentPos.x, parentPos.y);
            if (!this.config.isTestEnvironment) {
              console.log(`Parent ${i} at (${parentPos.x},${parentPos.y}), height: ${parentHeight}`);
            }
            
            const offspring = parent.reproduce(
              this.config,
              this.random,
              this.worldMap
            );
            
            // Ensure offspring has valid coordinates before adding
            const pos = offspring.getPosition();
            if (pos.x >= 0 && pos.x < this.config.worldSize && 
                pos.y >= 0 && pos.y < this.config.worldSize) {
              newOffspring.push(offspring);
            } else {
              // Skip invalid offspring in tests to prevent errors
              if (process.env.NODE_ENV !== 'test') {
                console.error(`Invalid offspring position: (${pos.x}, ${pos.y}), worldSize: ${this.config.worldSize}`);
              }
            }
          }
          if (!this.config.isTestEnvironment) {
            console.log('=== END REGION REPRODUCTION ===\n');
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
  private groupOrganismsByRegion(): Map<number, OrganismA[]> {
    const regionMap = new Map<number, OrganismA[]>();

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
  
  /**
   * Helper method to get a random mutation value (-1, 0, or 1)
   * This ensures compliance with the PDD which specifies these discrete values
   */
  private getRandomMutationValue(): -1 | 0 | 1 {
    const value = this.random.nextInt(0, 2); // 0, 1, or 2
    return (value - 1) as -1 | 0 | 1; // Convert to -1, 0, or 1
  }
}
