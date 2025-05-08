import { BaseOrganism, Position } from './BaseOrganism';
import { Config } from './Config';
import { SeededRandom } from './utils/SeededRandom';
import { Gene, GeneSet } from './OrganismC';

/**
 * Type D organism: Probabilistic Genetic reproduction rules (section 5.4 PDD).
 */
export class OrganismD extends BaseOrganism {
  geneSet1: GeneSet;
  geneSet2: GeneSet;

  constructor(
    params: { x: number; y: number; roundsLived?: number },
    config: Config,
    random?: SeededRandom,
    initialGeneSet1?: GeneSet,
    initialGeneSet2?: GeneSet
  ) {
    super(params, config, random);
    const effectiveRandom = random ?? new SeededRandom(config.randomSeed);
    if (initialGeneSet1 && initialGeneSet2) {
      this.geneSet1 = initialGeneSet1;
      this.geneSet2 = initialGeneSet2;
    } else {
      const center = Math.floor(config.worldSize / 2);
      this.geneSet1 = {
        geneX: {
          deliberateMutation: false,
          sizeOfRelativeMutation: 0,
          absolutePosition: center,
          dominanceFactor: effectiveRandom.nextInt(0, 10000),
        },
        geneY: {
          deliberateMutation: false,
          sizeOfRelativeMutation: 0,
          absolutePosition: center,
          dominanceFactor: effectiveRandom.nextInt(0, 10000),
        },
      };
      this.geneSet2 = {
        geneX: {
          deliberateMutation: false,
          sizeOfRelativeMutation: 0,
          absolutePosition: center,
          dominanceFactor: effectiveRandom.nextInt(0, 10000),
        },
        geneY: {
          deliberateMutation: false,
          sizeOfRelativeMutation: 0,
          absolutePosition: center,
          dominanceFactor: effectiveRandom.nextInt(0, 10000),
        },
      };
    }
  }

  /**
   * Determines which gene wins based on dominance factors and random PRNG.
   * Returns 0 for first gene, 1 for second.
   */
  public static DominanceOutcomeDeterminator(
    random: SeededRandom,
    df1: number,
    df2: number
  ): 0 | 1 {
    const M = (df1 + df2) / 2;
    const R = random.nextInt(0, 10000);
    if (df1 === df2) {
      return R < M ? 0 : 1;
    }
    const lowerIndex = df1 < df2 ? 0 : 1;
    const higherIndex = df1 < df2 ? 1 : 0;
    return R < M ? lowerIndex : higherIndex;
  }

  public reproduce(
    allOrganismsInRegion: BaseOrganism[],
    currentIndex: number,
    config: Config,
    random: SeededRandom
  ): BaseOrganism[] {
    const self = allOrganismsInRegion[currentIndex] as OrganismD;
    const offspringList: BaseOrganism[] = [];
    const regionSize = Math.floor(config.worldSize / Math.sqrt(config.regionCount));

    // Pairing logic (per PDD 5.3)
    const isEvenPosition = (currentIndex + 1) % 2 === 0;

    if (allOrganismsInRegion.length % 2 === 0 && isEvenPosition && currentIndex > 0) {
      // Sexual reproduction
      const partner = allOrganismsInRegion[currentIndex - 1] as OrganismD;
      // Gene mixing identical to OrganismC
      const offspringAGeneSet1: GeneSet = {
        geneX: { ...self.geneSet1.geneX },
        geneY: { ...partner.geneSet2.geneY },
      };
      const offspringAGeneSet2: GeneSet = {
        geneX: { ...self.geneSet2.geneX },
        geneY: { ...partner.geneSet1.geneY },
      };
      const offspringBGeneSet1: GeneSet = {
        geneX: { ...partner.geneSet1.geneX },
        geneY: { ...self.geneSet2.geneY },
      };
      const offspringBGeneSet2: GeneSet = {
        geneX: { ...partner.geneSet2.geneX },
        geneY: { ...self.geneSet1.geneY },
      };
      // Mutate genes
      const mutate = OrganismD.mutateGeneInternal;
      offspringAGeneSet1.geneX = mutate(offspringAGeneSet1.geneX, config, random, regionSize);
      offspringAGeneSet1.geneY = mutate(offspringAGeneSet1.geneY, config, random, regionSize);
      offspringAGeneSet2.geneX = mutate(offspringAGeneSet2.geneX, config, random, regionSize);
      offspringAGeneSet2.geneY = mutate(offspringAGeneSet2.geneY, config, random, regionSize);
      offspringBGeneSet1.geneX = mutate(offspringBGeneSet1.geneX, config, random, regionSize);
      offspringBGeneSet1.geneY = mutate(offspringBGeneSet1.geneY, config, random, regionSize);
      offspringBGeneSet2.geneX = mutate(offspringBGeneSet2.geneX, config, random, regionSize);
      offspringBGeneSet2.geneY = mutate(offspringBGeneSet2.geneY, config, random, regionSize);
      // Determine placement using probabilistic dominator
      const place = (gs1: GeneSet, gs2: GeneSet) => {
        const xi = OrganismD.DominanceOutcomeDeterminator(random, gs1.geneX.dominanceFactor, gs2.geneX.dominanceFactor);
        const yi = OrganismD.DominanceOutcomeDeterminator(random, gs1.geneY.dominanceFactor, gs2.geneY.dominanceFactor);
        const x = (xi === 0 ? gs1.geneX.absolutePosition : gs2.geneX.absolutePosition + config.worldSize) % config.worldSize;
        const y = (yi === 0 ? gs1.geneY.absolutePosition : gs2.geneY.absolutePosition + config.worldSize) % config.worldSize;
        return { x, y } as Position;
      };
      const posA = place(offspringAGeneSet1, offspringAGeneSet2);
      const posB = place(offspringBGeneSet1, offspringBGeneSet2);
      offspringList.push(new OrganismD({ ...posA, roundsLived: 0 }, config, random, offspringAGeneSet1, offspringAGeneSet2));
      offspringList.push(new OrganismD({ ...posB, roundsLived: 0 }, config, random, offspringBGeneSet1, offspringBGeneSet2));
    } else if (!isEvenPosition && currentIndex === allOrganismsInRegion.length - 1) {
      // Asexual reproduction
      const offspringGeneSet1 = { ...self.geneSet1 };
      const offspringGeneSet2 = { ...self.geneSet2 };
      const mutate = OrganismD.mutateGeneInternal;
      offspringGeneSet1.geneX = mutate(offspringGeneSet1.geneX, config, random, regionSize);
      offspringGeneSet1.geneY = mutate(offspringGeneSet1.geneY, config, random, regionSize);
      offspringGeneSet2.geneX = mutate(offspringGeneSet2.geneX, config, random, regionSize);
      offspringGeneSet2.geneY = mutate(offspringGeneSet2.geneY, config, random, regionSize);
      const place = (gs1: GeneSet, gs2: GeneSet) => {
        const xi = OrganismD.DominanceOutcomeDeterminator(random, gs1.geneX.dominanceFactor, gs2.geneX.dominanceFactor);
        const yi = OrganismD.DominanceOutcomeDeterminator(random, gs1.geneY.dominanceFactor, gs2.geneY.dominanceFactor);
        const x = (xi === 0 ? gs1.geneX.absolutePosition : gs2.geneX.absolutePosition + config.worldSize) % config.worldSize;
        const y = (yi === 0 ? gs1.geneY.absolutePosition : gs2.geneY.absolutePosition + config.worldSize) % config.worldSize;
        return { x, y } as Position;
      };
      const pos = place(offspringGeneSet1, offspringGeneSet2);
      offspringList.push(new OrganismD({ ...pos, roundsLived: 0 }, config, random, offspringGeneSet1, offspringGeneSet2));
    }
    return offspringList;
  }

  /**
   * Shared mutation logic (copied from OrganismC) applied per gene
   */
  private static mutateGeneInternal(
    gene: Gene,
    config: Config,
    random: SeededRandom,
    regionSize: number
  ): Gene {
    const mutatedGene = { ...gene };
    const flipDeliberate = random.nextBoolean(config.deliberateMutationProbability);
    if (flipDeliberate) {
      mutatedGene.deliberateMutation = !mutatedGene.deliberateMutation;
    }
    if (mutatedGene.deliberateMutation) {
      const sizeDelta = random.nextInt(-1, 1);
      let newRelativeSize = mutatedGene.sizeOfRelativeMutation + sizeDelta;
      const maxRel = Math.floor(regionSize / 2);
      newRelativeSize = Math.max(-maxRel, Math.min(maxRel, newRelativeSize));
      mutatedGene.sizeOfRelativeMutation = newRelativeSize;
      mutatedGene.absolutePosition = (mutatedGene.absolutePosition + mutatedGene.sizeOfRelativeMutation + config.worldSize) % config.worldSize;
      if (mutatedGene.sizeOfRelativeMutation !== 0) {
        const shouldRecalc = random.nextBoolean(config.deliberateMutationProbability);
        if (shouldRecalc) {
          mutatedGene.dominanceFactor = random.nextInt(0, 10000);
        }
      }
    }
    return mutatedGene;
  }
}
