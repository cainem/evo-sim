import { Config } from '../Config';
import { Organism } from '../Organism';
import { OrganismParameters } from '../types/OrganismParameters';

describe('Organism parameter methods', () => {
  let config: Config;

  beforeEach(() => {
    config = Config.createCustomConfig({ maxLifeSpan: 20 });
  });

  it('getMutationParameters returns correct mutation values', () => {
    const params: OrganismParameters = {
      x: 10,
      y: 5,
      roundsLived: 0,
      deliberateMutationX: 0.5,
      deliberateMutationY: -0.25,
      offspringsXDistance: 3,
      offspringsYDistance: -2
    };
    const organism = new Organism(params, config);
    expect(organism.getMutationParameters()).toEqual({
      deliberateMutationX: params.deliberateMutationX,
      deliberateMutationY: params.deliberateMutationY,
      offspringsXDistance: params.offspringsXDistance,
      offspringsYDistance: params.offspringsYDistance
    });
  });

  it('getParameters returns full parameter set with floored coordinates', () => {
    const params: OrganismParameters = {
      x: 7.9,
      y: -4.1,
      roundsLived: 1,
      deliberateMutationX: 1,
      deliberateMutationY: 0,
      offspringsXDistance: 2,
      offspringsYDistance: 5
    };
    const organism = new Organism(params, config);
    expect(organism.getParameters()).toEqual({
      x: Math.floor(params.x),
      y: Math.floor(params.y),
      roundsLived: params.roundsLived!,
      deliberateMutationX: params.deliberateMutationX,
      deliberateMutationY: params.deliberateMutationY,
      offspringsXDistance: params.offspringsXDistance,
      offspringsYDistance: params.offspringsYDistance
    });
  });
});
