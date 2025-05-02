import { OrganismC, Gene, GeneSet } from '../OrganismC';
import { Config } from '../Config';
import { SeededRandom } from '../utils/SeededRandom';
import { BaseOrganism, Position as PositionType } from '../BaseOrganism'; // Corrected path

// Mock Config
jest.mock('../Config');

// Mock implementation for Config.getInstance
const mockGetInstance = jest.fn();
Config.getInstance = mockGetInstance;

// Helper function to create test genes
function createTestGene(overrides: Partial<Gene> = {}): Gene {
    return {
        absolutePosition: 100, // Default from original file
        sizeOfRelativeMutation: 0,
        deliberateMutation: false,
        dominanceFactor: 1000, // Default from original file
        ...overrides,
    };
}

// Shared spies and random instance for all tests in the file
let randomInstance: SeededRandom;
let nextBooleanSpy: jest.SpyInstance;
let nextIntSpy: jest.SpyInstance;

beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
});

// --- Describe block for Asexual Reproduction (includes placement tests) ---
describe('OrganismC Asexual Reproduction and Placement', () => {
    let parent: OrganismC;
    const parentGeneSet1: GeneSet = { geneX: createTestGene({ absolutePosition: 10, dominanceFactor: 100 }), geneY: createTestGene({ absolutePosition: 20, dominanceFactor: 200 }) };
    const parentGeneSet2: GeneSet = { geneX: createTestGene({ absolutePosition: 30, dominanceFactor: 50 }), geneY: createTestGene({ absolutePosition: 40, dominanceFactor: 250 }) };
    let parentsArray: BaseOrganism[] = [];
    const parentIndex = 0;
    let currentMockConfig: Config; // Variable to hold the mock config for the suite

    let nextBooleanSpy: jest.SpyInstance;
    let nextIntSpy: jest.SpyInstance;

    beforeEach(() => {
        // Use the direct mock manipulation for this suite's config
        (Config.getInstance as jest.Mock).mockClear();
        currentMockConfig = {
            worldSize: 100,
            worldMaxHeight: 100, // Added missing property
            maxLifeSpan: 10,
            reproductionRate: 0.5,
            sexualReproductionRate: 0.1,
            maxOrganisms: 50,
            startingOrganisms: 10, // Added missing property
            mutationRate: 0.1, // Example value
            geneLength: 100, // Example value, crucial for position calc
            dominanceFactorMutationRate: 0.05,
            dominanceFactorMutationSize: 10,
            deliberateMutationRate: 0.2,
            maxRelativeMutationSize: 10,
            deliberateMutationProbability: 0.5,
            randomSeed: 456,
            asexualReproductionEnabled: true, // Ensure asexual is enabled for these tests
            regionCount: 4,
            isTestEnvironment: true, // Added missing property
            organismType: 'A', // Changed to 'A' to satisfy Config type
        } as Config;
        (Config.getInstance as jest.Mock).mockReturnValue(currentMockConfig);

        const parentPosition: PositionType = { x: 50, y: 50 };
        const parentRandom = new SeededRandom(123); 
        parent = new OrganismC(parentPosition, currentMockConfig, parentRandom, parentGeneSet1, parentGeneSet2);
        parentsArray = [parent];

        randomInstance = new SeededRandom(456); // Use a different seed for reproducibility if needed
        nextIntSpy = jest.spyOn(randomInstance, 'nextInt');
        nextBooleanSpy = jest.spyOn(randomInstance, 'nextBoolean');
        // Ensure spies are reset if necessary (though jest.clearAllMocks should handle it)
        nextIntSpy.mockClear();
        nextBooleanSpy.mockClear();
    });

    it('should produce one offspring with RoundsLived 0', () => {
        nextBooleanSpy.mockReturnValueOnce(true); // Pass reproduction rate check
        nextBooleanSpy.mockReturnValueOnce(false); // Force asexual path
        // Mock remaining mutation checks to false
        nextBooleanSpy.mockReturnValue(false); // Flip checks
        nextIntSpy.mockReturnValue(0);      // Size delta, dom delta, etc.

        const offspring = parent.reproduce(parentsArray, parentIndex, currentMockConfig, randomInstance)[0] as OrganismC;
        expect(offspring).toBeInstanceOf(OrganismC);
        expect(offspring.getRoundsLived()).toBe(0);
    });

    it('should apply mutation process correctly', () => {
         const geneX1_Parent = createTestGene({ absolutePosition: 10, sizeOfRelativeMutation: 5, dominanceFactor: 100, deliberateMutation: false });
         const geneY2_Parent = createTestGene({ absolutePosition: 40, sizeOfRelativeMutation: 1, dominanceFactor: 400, deliberateMutation: true });
         const parentPosition: PositionType = {x: 50, y: 50 };
         parent = new OrganismC(parentPosition, currentMockConfig, new SeededRandom(123), { geneX: geneX1_Parent, geneY: createTestGene() }, { geneX: createTestGene(), geneY: geneY2_Parent });
         parentsArray[0] = parent;

         // Mocks for reproduce call:
         nextBooleanSpy.mockReturnValueOnce(true);  // Pass repro rate check
         nextBooleanSpy.mockReturnValueOnce(false); // Force asexual path

         // Mocks for mutateGeneInternal called within mutateGeneSet:
         // Gene 1 (Set1.X)
         nextBooleanSpy.mockReturnValueOnce(true);  // Flip check -> true
         nextIntSpy.mockReturnValueOnce(-1);        // Size delta -> -1
         nextBooleanSpy.mockReturnValueOnce(false); // Dom check -> false (size changed, but rate check fails)
         // Gene 2 (Set1.Y)
         nextBooleanSpy.mockReturnValueOnce(false); // Flip check -> false
         nextIntSpy.mockReturnValueOnce(0);         // Size delta -> 0
         // Dominance check skipped as size didn't change
         // Gene 3 (Set2.X)
         nextBooleanSpy.mockReturnValueOnce(false); // Flip check -> false
         nextIntSpy.mockReturnValueOnce(0);         // Size delta -> 0
         // Dominance check skipped
         // Gene 4 (Set2.Y)
         nextBooleanSpy.mockReturnValueOnce(false); // Flip check -> false
         nextIntSpy.mockReturnValueOnce(0);         // Size delta -> 0
         // Dominance check skipped

         const offspring = parent.reproduce(parentsArray, parentIndex, currentMockConfig, randomInstance)[0] as OrganismC;

        // Check GeneSet1.geneX mutation
        expect(offspring.geneSet1.geneX.deliberateMutation).toBe(true);       // Flipped
        expect(offspring.geneSet1.geneX.sizeOfRelativeMutation).toBe(4);     // Updated based on delta: 5 + (-1) = 4
        expect(offspring.geneSet1.geneX.absolutePosition).toBe(14);         // Updated based on new size: (10 + 4 + 100) % 100 = 14
        expect(offspring.geneSet1.geneX.dominanceFactor).toBe(100);          // Unchanged (rate check failed)

        // Check GeneSet2.geneY mutation
        expect(offspring.geneSet2.geneY.deliberateMutation).toBe(true);     // Inherited true, stayed true
        expect(offspring.geneSet2.geneY.sizeOfRelativeMutation).toBe(1);      // Updated based on delta: 1 + 0 = 1
        expect(offspring.geneSet2.geneY.absolutePosition).toBe(41);         // Updated based on new size: (40 + 1 + 100) % 100 = 41
        expect(offspring.geneSet2.geneY.dominanceFactor).toBe(400);          // Unchanged (size delta was 0)
    });

     it('should determine placement based on dominance (Set1 dom X, Set2 dom Y)', () => {
         const geneSet1 = { geneX: createTestGene({ absolutePosition: 10, dominanceFactor: 100 }), geneY: createTestGene({ absolutePosition: 20, dominanceFactor: 150 }) };
         const geneSet2 = { geneX: createTestGene({ absolutePosition: 30, dominanceFactor: 50 }), geneY: createTestGene({ absolutePosition: 40, dominanceFactor: 200 }) };
         const parentPosition: PositionType = { x: 0, y: 0 };
         const localParent = new OrganismC(parentPosition, currentMockConfig, new SeededRandom(123), geneSet1, geneSet2);
         const localParentsArray: BaseOrganism[] = [localParent];
         const localParentIndex = 0;

         // Mocks for reproduce call:
         nextBooleanSpy.mockReturnValueOnce(true);  // Pass repro rate check
         nextBooleanSpy.mockReturnValueOnce(false); // Force asexual path

         // Mock mutations for all 4 genes such that sizeDelta = 0 (dominance unchanged)
         // These are for the internal mutateGeneInternal call
         // Gene 1 (Set1.X)
         nextBooleanSpy.mockReturnValueOnce(false); // X1 Flip check
         nextIntSpy.mockReturnValueOnce(0); // X1 Size delta -> 0
         // Dominance check skipped
         // Gene 2 (Set1.Y)
         nextBooleanSpy.mockReturnValueOnce(false); // Y1 Flip check
         nextIntSpy.mockReturnValueOnce(0); // Y1 Size delta -> 0
         // Dominance check skipped
         // Gene 3 (Set2.X)
         nextBooleanSpy.mockReturnValueOnce(false); // X2 Flip check
         nextIntSpy.mockReturnValueOnce(0); // X2 Size delta -> 0
         // Dominance check skipped
         // Gene 4 (Set2.Y)
         nextBooleanSpy.mockReturnValueOnce(false); // Y2 Flip check
         nextIntSpy.mockReturnValueOnce(0); // Y2 Size delta -> 0
         // Dominance check skipped

         const offspring = localParent.reproduce(localParentsArray, localParentIndex, currentMockConfig, randomInstance)[0] as OrganismC;
         // Dominant X is GeneSet1.X (absPos 10)
         // Dominant Y is GeneSet2.Y (absPos 40)
         const expectedPosition = { x: 10, y: 40 };
         const actualPosition = offspring.getPosition();
         expect(actualPosition.x).toBe(expectedPosition.x);
         expect(actualPosition.y).toBe(expectedPosition.y);
     });

      it('should use Set1 gene in case of dominance tie', () => {
         const geneSet1_tie = { geneX: createTestGene({ absolutePosition: 10, dominanceFactor: 100 }), geneY: createTestGene({ absolutePosition: 20, dominanceFactor: 200 }) }; // Dom X=100, Dom Y=200
         const geneSet2_tie = { geneX: createTestGene({ absolutePosition: 30, dominanceFactor: 100 }), geneY: createTestGene({ absolutePosition: 40, dominanceFactor: 200 }) }; // Dom X=100, Dom Y=200 (TIES)
         const parentPosition: PositionType = { x: 0, y: 0 };
         const localParent_tie = new OrganismC(parentPosition, currentMockConfig, new SeededRandom(123), geneSet1_tie, geneSet2_tie);
         const localParentsArray_tie: BaseOrganism[] = [localParent_tie];
         const localParentIndex_tie = 0;

         // Mocks for reproduce call:
         nextBooleanSpy.mockReturnValueOnce(true);  // Pass repro rate check
         nextBooleanSpy.mockReturnValueOnce(false); // Force asexual path

         // Mock mutations for all 4 genes such that sizeDelta = 0 (dominance unchanged)
         // These are for the internal mutateGeneInternal call
         // Gene 1 (Set1.X)
         nextBooleanSpy.mockReturnValueOnce(false); // X1 Flip check
         nextIntSpy.mockReturnValueOnce(0); // X1 Size delta -> 0
         // Dominance check skipped
         // Gene 2 (Set1.Y)
         nextBooleanSpy.mockReturnValueOnce(false); // Y1 Flip check
         nextIntSpy.mockReturnValueOnce(0); // Y1 Size delta -> 0
         // Dominance check skipped
         // Gene 3 (Set2.X)
         nextBooleanSpy.mockReturnValueOnce(false); // X2 Flip check
         nextIntSpy.mockReturnValueOnce(0); // X2 Size delta -> 0
         // Dominance check skipped
         // Gene 4 (Set2.Y)
         nextBooleanSpy.mockReturnValueOnce(false); // Y2 Flip check
         nextIntSpy.mockReturnValueOnce(0); // Y2 Size delta -> 0
         // Dominance check skipped

         const offspring = localParent_tie.reproduce(localParentsArray_tie, localParentIndex_tie, currentMockConfig, randomInstance)[0] as OrganismC;
         // Tie in X, use Set1 -> absPos 10
         // Tie in Y, use Set1 -> absPos 20
         const expectedPosition = { x: 10, y: 20 }; // Should use Set1's X and Y
         const actualPosition = offspring.getPosition();
         expect(actualPosition.x).toBe(expectedPosition.x);
         expect(actualPosition.y).toBe(expectedPosition.y);
     });

     it('should not perform asexual reproduction if position is even', () => {
         // Setup: 3 parents, target is index 1 (position 2 - even)
         const parentA = new OrganismC({ x: 1, y: 1 }, currentMockConfig, new SeededRandom(1), parentGeneSet1, parentGeneSet2);
         const parentB = new OrganismC({ x: 2, y: 2 }, currentMockConfig, new SeededRandom(2), parentGeneSet1, parentGeneSet2);
         const parentC = new OrganismC({ x: 3, y: 3 }, currentMockConfig, new SeededRandom(3), parentGeneSet1, parentGeneSet2);
         const threeParentsArray = [parentA, parentB, parentC];
         const currentIndex = 1; // parentB

         const offspringList = parentB.reproduce(threeParentsArray, currentIndex, currentMockConfig, randomInstance);

         // Expect 2 offspring because position 2 (even) triggers sexual reproduction with position 1.
         expect(offspringList.length).toBe(2);
     });
 }); // End describe 'Asexual Reproduction and Placement'
