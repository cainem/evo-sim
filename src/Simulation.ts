import { Config } from './Config';
import { WorldMap } from './WorldMap';
import { SeededRandom } from './utils/SeededRandom';
import { Organism } from './Organism';
import { OrganismParameters } from './types/OrganismParameters';

export class Simulation {
  private organisms: Organism[] = [];
  private roundNumber: number = 0;

  constructor(
    private readonly config: Config,
    private readonly worldMap: WorldMap,
    private readonly random: SeededRandom
  ) {}

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
   * @returns Number of organisms that died this round
   */
  public runRound(): number {
    // Store initial count to calculate deaths
    const initialCount = this.organisms.length;

    // Age all organisms
    this.organisms.forEach(organism => organism.age());

    // Remove dead organisms
    this.organisms = this.organisms.filter(organism => !organism.isDead());

    // Increment round number
    this.roundNumber++;

    // Return number of deaths
    return initialCount - this.organisms.length;
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
}
