import { Config } from './Config';
import { WorldMap } from './WorldMap';
import { SeededRandom } from './utils/SeededRandom';
import { OrganismA } from './OrganismA';
import { OrganismB } from './OrganismB';
import { OrganismC } from './OrganismC'; // Import OrganismC
import { OrganismParameters } from './types/OrganismParameters';
import { Region } from './Region';
import { BaseOrganism } from './BaseOrganism';

export class Simulation {
  private organisms: BaseOrganism[] = [];
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
      if (this.config.organismType === 'A') {
        const params: OrganismParameters = {
          x: centerX,
          y: centerY,
          deliberateMutationX: this.getRandomMutationValue(),
          deliberateMutationY: this.getRandomMutationValue(),
          offspringsXDistance: 0,
          offspringsYDistance: 0
        };
        this.organisms.push(new OrganismA(params, this.config, this.random));
      } else if (this.config.organismType === 'B') { // Handle OrganismB
        this.organisms.push(new OrganismB({ x: centerX, y: centerY }, this.config, this.random));
      } else { // Handle OrganismC (must be 'C' if not 'A' or 'B')
        this.organisms.push(new OrganismC({ x: centerX, y: centerY }, this.config, this.random));
      }
    }
  }

  /**
   * Initializes simulation with provided organisms for testing.
   */
  public initializeWithOrganisms(organisms: BaseOrganism[]): void {
    this.organisms = [...organisms];
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
  public getOrganisms(): BaseOrganism[] {
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
   * Handles reproduction for all regions
   * @returns Array of new offspring
   */
  private handleReproduction(): BaseOrganism[] {
    const newOffspring: BaseOrganism[] = [];
    const regionMap = this.groupOrganismsByRegion();

    // Process each region
    for (const [regionIndex, organisms] of regionMap.entries()) {
      const region = this.regions[regionIndex];
      const stats = region.getStatistics();
      const carryingCapacity = stats.carryingCapacity;
      // Count total organisms in region (including those marked for death)
      const totalCount = organisms.length;
      // Compute living organisms (exclude those marked for death)
      const livingOrganisms = organisms.filter(org => !org.isDead());
      const livingCount = livingOrganisms.length;
      
      // Only process reproduction if there are organisms present and living count is below capacity
      if (livingCount < carryingCapacity && totalCount > 0) {
        // Calculate target reproductions based on living organisms
        const targetReproductions = carryingCapacity - livingCount;
        
        // Filter eligible parents (RL >= 1)
        const eligibleParents = organisms.filter(org => org.getRoundsLived() >= 1);

        if (eligibleParents.length > 0) {
          // Sort by height at their position, using random for ties
          if (!this.config.isTestEnvironment) {
            console.log(`\n=== REGION ${regionIndex} REPRODUCTION (Capacity: ${carryingCapacity}, Current: ${livingCount}) ===`);
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

          // Pass only selected parents into reproduce()
          const selectedParents = eligibleParents.slice(0, numParents);

          if (!this.config.isTestEnvironment) {
            console.log(`Selected ${numParents} parents for reproduction`);
          }
          for (let i = 0; i < selectedParents.length; i++) {
            let offspringList: BaseOrganism[] = []; // Initialize offspringList
            const parent = selectedParents[i];

            if (parent instanceof OrganismA) {
              offspringList = (parent as OrganismA).reproduce(
                selectedParents,
                i,
                this.config,
                this.random,
                this.worldMap
              );
            } else if (parent instanceof OrganismB) { // Handle OrganismB
              offspringList = (parent as OrganismB).reproduce(
                selectedParents,
                i,
                this.config,
                this.random,
                this.worldMap
              );
            } else { // Handle OrganismC (must be 'C' if not 'A' or 'B')
              offspringList = (parent as OrganismC).reproduce(
                selectedParents,
                i,
                this.config,
                this.random
              );
            }

            // Iterate through the returned offspring list
            for (const individualOffspring of offspringList) {
              // Ensure each offspring has valid coordinates before adding
              const pos = individualOffspring.getPosition();
              if (pos.x >= 0 && pos.x < this.config.worldSize && 
                  pos.y >= 0 && pos.y < this.config.worldSize) {
                newOffspring.push(individualOffspring);
              } else {
                // Skip invalid offspring in tests to prevent errors
                /* istanbul ignore next */
                if (process.env.NODE_ENV !== 'test') {
                  console.error(`Invalid offspring position: (${pos.x}, ${pos.y}), worldSize: ${this.config.worldSize}`);
                }
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
  private groupOrganismsByRegion(): Map<number, BaseOrganism[]> {
    const regionMap = new Map<number, BaseOrganism[]>();

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

  /**
   * Finds the first organism in the specified region.
   * @param region The region to check.
   * @returns The first organism in the region or null if none.
   */
  public findFirstOrganismInRegion(region: Region): BaseOrganism | null {
    return this.organisms.find(org => {
      const pos = org.getPosition();
      return region.containsPoint(pos.x, pos.y);
    }) || null;
  }
}
