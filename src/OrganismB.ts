import { Config } from './Config';
import { BaseOrganism } from './BaseOrganism';
import { SeededRandom } from './utils/SeededRandom';

/**
 * Type B organism reproducing with random offset in [-5,5]
 */
export class OrganismB extends BaseOrganism {
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
  public reproduce(config: Config, random: SeededRandom): OrganismB {
    const worldSize = config.worldSize;
    const dx = random.nextInt(-5, 5);
    const dy = random.nextInt(-5, 5);
    const newX = (this.getPosition().x + dx + worldSize) % worldSize;
    const newY = (this.getPosition().y + dy + worldSize) % worldSize;
    return new OrganismB({ x: newX, y: newY, roundsLived: 0 }, config);
  }
}
