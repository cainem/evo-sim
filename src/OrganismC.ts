import { BaseOrganism, Position } from './BaseOrganism';
import { Config } from './Config';
import { SeededRandom } from './utils/SeededRandom';
import { WorldMap } from './WorldMap';

// --- Gene Definition ---
// Moved back from types/Gene.ts to avoid module issues
export interface Gene {
    deliberateMutation: boolean; // Whether the gene actively seeks mutation
    sizeOfRelativeMutation: number; 
    absolutePosition: number; 
    dominanceFactor: number; 
}

// Type alias for GeneSet
export type GeneSet = {
    geneX: Gene;
    geneY: Gene;
}

export class OrganismC extends BaseOrganism {
    geneSet1: GeneSet;
    geneSet2: GeneSet;

    constructor(params: { x: number; y: number; roundsLived?: number }, config: Config, random?: SeededRandom, initialGeneSet1?: GeneSet, initialGeneSet2?: GeneSet) {
        super(params, config, random);
        const effectiveRandom = random ?? new SeededRandom(config.randomSeed); 

        // Use provided gene sets or create defaults anchored at parent position
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

    public reproduce(
        allOrganismsInRegion: BaseOrganism[],
        currentIndex: number,
        config: Config,
        random: SeededRandom
    ): BaseOrganism[] {
        const self = allOrganismsInRegion[currentIndex] as OrganismC;
        const offspringList: BaseOrganism[] = [];
        const regionSize = Math.floor(config.worldSize / Math.sqrt(config.regionCount));
        const parentPosition = self.getPosition();

        // Determine reproduction mode based on position in the sorted list
        // Assuming allOrganismsInRegion is already sorted by height descending
        // (The first organism is at index 0)
        const isEvenPosition = (currentIndex + 1) % 2 === 0;

        if (isEvenPosition && currentIndex > 0) {
            // --- Sexual Reproduction --- 
            const partner = allOrganismsInRegion[currentIndex - 1] as OrganismC;

            // PDD: Gene Mixing Logic
            const offspringAGeneSet1: GeneSet = {
                geneX: { ...self.geneSet1.geneX }, // GeneX(a1)
                geneY: { ...partner.geneSet2.geneY } // GeneY(b2)
            };
            const offspringAGeneSet2: GeneSet = {
                geneX: { ...self.geneSet2.geneX }, // GeneX(a2)
                geneY: { ...partner.geneSet1.geneY } // GeneY(b1)
            };
            const offspringBGeneSet1: GeneSet = {
                geneX: { ...partner.geneSet1.geneX }, // GeneX(b1)
                geneY: { ...self.geneSet2.geneY } // GeneY(a2)
            };
            const offspringBGeneSet2: GeneSet = {
                geneX: { ...partner.geneSet2.geneX }, // GeneX(b2)
                geneY: { ...self.geneSet1.geneY } // GeneY(a1)
            };

            // Mutate offspring genes
            offspringAGeneSet1.geneX = this.mutateGeneInternal(offspringAGeneSet1.geneX, config, random, regionSize);
            offspringAGeneSet1.geneY = this.mutateGeneInternal(offspringAGeneSet1.geneY, config, random, regionSize);
            offspringAGeneSet2.geneX = this.mutateGeneInternal(offspringAGeneSet2.geneX, config, random, regionSize);
            offspringAGeneSet2.geneY = this.mutateGeneInternal(offspringAGeneSet2.geneY, config, random, regionSize);

            offspringBGeneSet1.geneX = this.mutateGeneInternal(offspringBGeneSet1.geneX, config, random, regionSize);
            offspringBGeneSet1.geneY = this.mutateGeneInternal(offspringBGeneSet1.geneY, config, random, regionSize);
            offspringBGeneSet2.geneX = this.mutateGeneInternal(offspringBGeneSet2.geneX, config, random, regionSize);
            offspringBGeneSet2.geneY = this.mutateGeneInternal(offspringBGeneSet2.geneY, config, random, regionSize);

            // Determine placement and create offspring
            const offspringAPosition = this.determinePlacement(offspringAGeneSet1, offspringAGeneSet2, config);
            const offspringBPosition = this.determinePlacement(offspringBGeneSet1, offspringBGeneSet2, config);

            offspringList.push(new OrganismC({ ...offspringAPosition, roundsLived: 0 }, config, random, offspringAGeneSet1, offspringAGeneSet2));
            offspringList.push(new OrganismC({ ...offspringBPosition, roundsLived: 0 }, config, random, offspringBGeneSet1, offspringBGeneSet2));

        } else if (!isEvenPosition && currentIndex === allOrganismsInRegion.length - 1) {
            // --- Asexual Reproduction (Last organism if odd number) ---
            const offspringGeneSet1 = { ...self.geneSet1 }; // Exact copy
            const offspringGeneSet2 = { ...self.geneSet2 }; // Exact copy

            // Mutate offspring genes
            offspringGeneSet1.geneX = this.mutateGeneInternal(offspringGeneSet1.geneX, config, random, regionSize);
            offspringGeneSet1.geneY = this.mutateGeneInternal(offspringGeneSet1.geneY, config, random, regionSize);
            offspringGeneSet2.geneX = this.mutateGeneInternal(offspringGeneSet2.geneX, config, random, regionSize);
            offspringGeneSet2.geneY = this.mutateGeneInternal(offspringGeneSet2.geneY, config, random, regionSize);

            const offspringPosition = this.determinePlacement(offspringGeneSet1, offspringGeneSet2, config);

            offspringList.push(new OrganismC({ ...offspringPosition, roundsLived: 0 }, config, random, offspringGeneSet1, offspringGeneSet2));
        } else {
            // Else: If even position but index 0 (no partner before it), or not the last one in an odd list -> no reproduction
        }

        return offspringList;
    }

    // PDD: Mutation Process (applied independently to each gene)
    private mutateGeneInternal(gene: Gene, config: Config, random: SeededRandom, regionSize: number): Gene {
        const mutatedGene = { ...gene }; // Work on a copy

        // 1. Recalculate DeliberateMutation Flag
        const flipDeliberate = random.nextBoolean(config.deliberateMutationProbability);
        if (flipDeliberate) {
            mutatedGene.deliberateMutation = !mutatedGene.deliberateMutation;
        }

        // 2. Apply Gene Changes (if DeliberateMutation is now true)
        if (mutatedGene.deliberateMutation) {
            // SizeOfRelativeMutation Update
            const sizeDelta = random.nextInt(-1, 1); // PDD: random integer [-1, 0, 1]
            let newRelativeSize = mutatedGene.sizeOfRelativeMutation + sizeDelta;
            // Clamp magnitude to regionSize / 2
            const maxRelativeMagnitude = Math.floor(regionSize / 2);
            newRelativeSize = Math.max(-maxRelativeMagnitude, Math.min(maxRelativeMagnitude, newRelativeSize));
            mutatedGene.sizeOfRelativeMutation = newRelativeSize;
            if (!config.isTestEnvironment) {
                console.log(`[C][mutateGeneInternal] absBefore=${gene.absolutePosition}, sizeDelta=${sizeDelta}, newRelativeSize=${newRelativeSize}`);
            }

            // AbsolutePosition Update
            mutatedGene.absolutePosition = (mutatedGene.absolutePosition + mutatedGene.sizeOfRelativeMutation + config.worldSize) % config.worldSize;
            if (!config.isTestEnvironment) {
                console.log(`[C][mutateGeneInternal] absAfter=${mutatedGene.absolutePosition}`);
            }

            // DominanceFactor Recalculation
            if (mutatedGene.sizeOfRelativeMutation !== 0) {
                const shouldRecalculateDominance = random.nextBoolean(config.deliberateMutationProbability);
                if (shouldRecalculateDominance) {
                    mutatedGene.dominanceFactor = random.nextInt(0, 10000); // PDD: new random integer [0, 10000]
                }
            }
        } else {
            // No Change (if DeliberateMutation is now false) - handled by the else block above.
        }

        return mutatedGene;
    }

    private determinePlacement(geneSet1: GeneSet, geneSet2: GeneSet, config: Config): Position {
        const dominantGeneX = geneSet1.geneX.dominanceFactor >= geneSet2.geneX.dominanceFactor ? geneSet1.geneX : geneSet2.geneX;
        const dominantGeneY = geneSet1.geneY.dominanceFactor >= geneSet2.geneY.dominanceFactor ? geneSet1.geneY : geneSet2.geneY;

        const x = (dominantGeneX.absolutePosition % config.worldSize + config.worldSize) % config.worldSize;
        const y = (dominantGeneY.absolutePosition % config.worldSize + config.worldSize) % config.worldSize;

        return { x, y };
    }
}
