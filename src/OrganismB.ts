import { Config } from './Config';
import { BaseOrganism } from './BaseOrganism';
import { SeededRandom } from './utils/SeededRandom';
import { WorldMap } from './WorldMap';

/**
 * Type B organism reproducing with random offset in [-5,5]
 */
export class OrganismB extends BaseOrganism {
  /**
   * Gets mutation parameters; for type B, use zeros.
   */
  public getMutationParameters(): {
    deliberateMutationX: number;
    deliberateMutationY: number;
    offspringsXDistance: number;
    offspringsYDistance: number;
  } {
    return { deliberateMutationX: 0, deliberateMutationY: 0, offspringsXDistance: 0, offspringsYDistance: 0 };
  }

  constructor(
    params: { x: number; y: number; roundsLived?: number },
    config: Config,
    random?: SeededRandom
  ) {
    super(params, config, random);
  }

  /**
   * Reproduce with random dx, dy ∈ [-5,5] and wrap around world borders
   */
  public reproduce(
    parents: BaseOrganism[],
    index: number,
    config: Config,
    random: SeededRandom,
    worldMap?: WorldMap
  ): OrganismB[] {
    const worldSize = config.worldSize;
    const dx = random.nextInt(-5, 5);
    const dy = random.nextInt(-5, 5);
    const newX = (this.getPosition().x + dx + worldSize) % worldSize;
    const newY = (this.getPosition().y + dy + worldSize) % worldSize;
    const offspring = new OrganismB({ x: newX, y: newY, roundsLived: 0 }, config);
    return [offspring];
  }
}
