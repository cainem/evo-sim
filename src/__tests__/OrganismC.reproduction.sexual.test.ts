import { OrganismC, Gene, GeneSet } from '../OrganismC';
import { Config } from '../Config';
import { SeededRandom } from '../utils/SeededRandom';
import { BaseOrganism, Position as PositionType } from '../BaseOrganism'; // Corrected path

// Mock Config and SeededRandom
jest.mock('../Config');
jest.mock('../utils/SeededRandom'); // Keep this mock

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

// --- Describe block for Sexual Reproduction ---
describe('OrganismC Sexual Reproduction', () => {
    // Local instance and spies for this suite
    let parentA: OrganismC;
    let parentB: OrganismC;
    let parentsArray: BaseOrganism[] = [];
    const parentAIndex = 0;
    const parentBIndex = 1;
    const parentAGeneSet1: GeneSet = { geneX: createTestGene({ absolutePosition: 10, dominanceFactor: 100, sizeOfRelativeMutation: 1 }), geneY: createTestGene({ absolutePosition: 20, dominanceFactor: 200, sizeOfRelativeMutation: 2 }) };
    const parentAGeneSet2: GeneSet = { geneX: createTestGene({ absolutePosition: 30, dominanceFactor: 300, sizeOfRelativeMutation: 3 }), geneY: createTestGene({ absolutePosition: 40, dominanceFactor: 400, sizeOfRelativeMutation: 4 }) };
    const parentBGeneSet1: GeneSet = { geneX: createTestGene({ absolutePosition: 50, dominanceFactor: 500, sizeOfRelativeMutation: 5 }), geneY: createTestGene({ absolutePosition: 60, dominanceFactor: 600, sizeOfRelativeMutation: 6 }) };
    const parentBGeneSet2: GeneSet = { geneX: createTestGene({ absolutePosition: 70, dominanceFactor: 700, sizeOfRelativeMutation: 7 }), geneY: createTestGene({ absolutePosition: 80, dominanceFactor: 800, sizeOfRelativeMutation: 8 }) };

    beforeEach(() => {
        // Reset mocks and create local instance/spies
        jest.clearAllMocks(); // Clears Config mock AND SeededRandom automatic mocks
        mockGetInstance.mockClear(); // Clear Config mock calls specifically

        // Mock config for this suite
        (Config.getInstance as jest.Mock).mockClear();
        (Config.getInstance as jest.Mock).mockReturnValue({
            worldSize: 100, maxAge: 10, reproductionRate: 0.5, sexualReproductionRate: 0.1,
            maxOrganisms: 50, mutationRate: 0.1, geneLength: 100, dominanceFactorMutationRate: 0.05,
            dominanceFactorMutationSize: 10, deliberateMutationRate: 0.2, maxRelativeMutationSize: 10,
            deliberateMutationProbability: 0.5, randomSeed: 789, regionCount: 4 // Added regionCount
        } as unknown as Config);
        const currentMockConfig = Config.getInstance(); // Get config for parent creation

        const parentAPosition: PositionType = { x: 1, y: 1 };
        const parentBPosition: PositionType = { x: 2, y: 2 };
        parentA = new OrganismC(parentAPosition, currentMockConfig, new SeededRandom(123), parentAGeneSet1, parentAGeneSet2);
        parentB = new OrganismC(parentBPosition, currentMockConfig, new SeededRandom(456), parentBGeneSet1, parentBGeneSet2);
        parentsArray = [parentA, parentB];
    });

    it('should produce two offspring, both with RoundsLived 0, during sexual reproduction', () => {
        const currentMockConfig = Config.getInstance();

        // Adjust parent order for test: Partner is at index `currentIndex - 1`
        const orderedParents = [parentB, parentA]; // parentA is now at index 1
        const parentAIndexInArray = 1;

        // Create instance and mock its methods directly
        // We only need enough mocks to prevent errors during mutation calls
        const randomInstance = new SeededRandom(1); 
        randomInstance.nextBoolean = jest.fn().mockReturnValue(false); // Default to false for flips/dom checks
        randomInstance.nextInt = jest.fn().mockReturnValue(0);      // Default to 0 for size delta/new dom

        // Call reproduce once with parentA (at index 1)
        const offspringList = parentA.reproduce(orderedParents, parentAIndexInArray, currentMockConfig, randomInstance);

        // Assert two offspring were created
        expect(offspringList).toHaveLength(2);
        expect(offspringList[0]).toBeInstanceOf(OrganismC);
        expect(offspringList[1]).toBeInstanceOf(OrganismC);

        // Assert both have RoundsLived 0
        expect((offspringList[0] as OrganismC).getRoundsLived()).toBe(0);
        expect((offspringList[1] as OrganismC).getRoundsLived()).toBe(0);
    });

    it('should perform sexual reproduction according to PDD specifications (mixing and mutation)', () => {
        const currentMockConfig = Config.getInstance();
        // Adjust parent order for test: Partner is at index `currentIndex - 1`
        const orderedParents = [parentB, parentA]; // parentA is now at index 1
        const parentAIndexInArray = 1;

        // Create instance and mock its methods directly
        const randomInstance = new SeededRandom(1);
        randomInstance.nextBoolean = jest.fn();
        randomInstance.nextInt = jest.fn();

        // --- PDD-Based Mock Sequence for 8 mutateGeneInternal calls --- 
        // Expected Genes (Post-Mixing, Pre-Mutation):
        // Offspring A: { Set1: { X: pA1X, Y: pB2Y }, Set2: { X: pA2X, Y: pB1Y } }
        // Offspring B: { Set1: { X: pB1X, Y: pA2Y }, Set2: { X: pB2X, Y: pA1Y } }

        // Mock Calls for Offspring A, GeneSet1, GeneX (from pA1X: delib=F)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(true);  // 1. Flip deliberate -> T
        (randomInstance.nextInt as jest.Mock).mockReturnValueOnce(1);      // 2. Size delta -> +1 (New Size = 2)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(false); // 3. Dom check (Size 2!=0)? -> F (no recalc)
        // Mock Calls for Offspring A, GeneSet1, GeneY (from pB2Y: delib=F)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(false); // 4. Flip deliberate -> F (no further calls for this gene)
        // Mock Calls for Offspring A, GeneSet2, GeneX (from pA2X: delib=F)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(true);  // 5. Flip deliberate -> T
        (randomInstance.nextInt as jest.Mock).mockReturnValueOnce(0);      // 6. Size delta -> 0 (New Size = 3)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(false); // 7. Dom check (Size 3!=0)? -> F (no recalc)
        // Mock Calls for Offspring A, GeneSet2, GeneY (from pB1Y: delib=F)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(true);  // 8. Flip deliberate -> T
        (randomInstance.nextInt as jest.Mock).mockReturnValueOnce(-1);     // 9. Size delta -> -1 (New Size = 5)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(true);  // 10. Dom check (Size 5!=0)? -> T (recalc)
        (randomInstance.nextInt as jest.Mock).mockReturnValueOnce(5000);    // 11. New Dom factor
        // Mock Calls for Offspring B, GeneSet1, GeneX (from pB1X: delib=F)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(false); // 12. Flip deliberate -> F
        // Mock Calls for Offspring B, GeneSet1, GeneY (from pA2Y: delib=F)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(false); // 13. Flip deliberate -> F
        // Mock Calls for Offspring B, GeneSet2, GeneX (from pB2X: delib=F)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(true);  // 14. Flip deliberate -> T
        (randomInstance.nextInt as jest.Mock).mockReturnValueOnce(1);      // 15. Size delta -> +1 (New Size = 8)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(false); // 16. Dom check (Size 8!=0)? -> F (no recalc)
        // Mock Calls for Offspring B, GeneSet2, GeneY (from pA1Y: delib=F)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(true);  // 17. Flip deliberate -> T
        (randomInstance.nextInt as jest.Mock).mockReturnValueOnce(0);      // 18. Size delta -> 0 (New Size = 2)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(false); // 19. Dom check (Size 2!=0)? -> F (no recalc)

        // Call reproduce once with parentA (at index 1)
        const offspring = parentA.reproduce(orderedParents, parentAIndexInArray, currentMockConfig, randomInstance);
        const offspringA = offspring[0] as OrganismC;

        // --- Assertions --- 
        // Total expected calls based on the PDD logic and mock sequence above
        // nextBoolean: Flip(8) + DomCheck(5) = 13
        // nextInt: SizeDelta(5) + NewDom(1) = 6
        expect(randomInstance.nextBoolean as jest.Mock).toHaveBeenCalledTimes(13);
        expect(randomInstance.nextInt as jest.Mock).toHaveBeenCalledTimes(6);

        // Verify state of a specifically mutated gene (Offspring A, GeneSet2, GeneY - 4th gene mutated)
        // Initial state (from parentB.geneSet1.geneY): { abs: 60, size: 6, delib: F, dom: 600 }
        const mutatedGene = offspringA.geneSet2.geneY;
        expect(mutatedGene.deliberateMutation).toBe(true);    // Flipped (call 7: T)
        expect(mutatedGene.sizeOfRelativeMutation).toBe(5); // 6 + (-1) = 5 (call 8: -1)
        expect(mutatedGene.dominanceFactor).toBe(5000);      // Recalculated (call 9: T, call 10: 5000)
        // Absolute position depends on clamping and world size
        const regionSize = Math.floor(currentMockConfig.worldSize / Math.sqrt(currentMockConfig.regionCount)); // 100 / 2 = 50
        const expectedAbsPos = (60 + 5 + currentMockConfig.worldSize) % currentMockConfig.worldSize; // (60 + 5 + 100) % 100 = 65
        expect(mutatedGene.absolutePosition).toBe(expectedAbsPos); 
    });

    it('should apply mutations independently and determine placement', () => {
        const currentMockConfig = Config.getInstance();
        // Adjust parent order for test: Partner is at index `currentIndex - 1`
        const orderedParents = [parentB, parentA]; // parentA is now at index 1
        const parentAIndexInArray = 1;

        // Create instance and mock its methods directly
        const randomInstance = new SeededRandom(1); 
        randomInstance.nextBoolean = jest.fn();
        randomInstance.nextInt = jest.fn();

        // --- PDD-Based Mock Sequence for 8 mutateGeneInternal calls (Scenario 2) ---
        // Goal: Test placement calculation based on mutated dominant genes
        // We need the final state of A.S1.X, A.S1.Y, A.S2.X, A.S2.Y

        // 1. A.S1.X (pA1X: delib=F, abs=10, size=1, dom=100)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(false); // Flip deliberate? -> F (no change)
        
        // 2. A.S1.Y (pB2Y: delib=F, abs=80, size=8, dom=800)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(true);  // Flip deliberate? -> T
        (randomInstance.nextInt as jest.Mock).mockReturnValueOnce(0);      // Size delta? -> 0
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(false); // Dom check (Size 8!=0)? -> F
        
        // 3. A.S2.X (pA2X: delib=F, abs=30, size=3, dom=300)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(true);  // Flip deliberate? -> T
        (randomInstance.nextInt as jest.Mock).mockReturnValueOnce(-1);     // Size delta? -> -1
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(true);  // Dom check (Size 2!=0)? -> T (recalc)
        (randomInstance.nextInt as jest.Mock).mockReturnValueOnce(150);    // New Dom factor -> 150

        // 4. A.S2.Y (pB1Y: delib=F, abs=60, size=6, dom=600)
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(false); // Flip deliberate? -> F (no change)

        // --- Mocks for Offspring B's genes (don't affect A's placement) ---
        // 5. B.S1.X (pB1X): Flip=T, Size=1, DomCheck=F
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(true); (randomInstance.nextInt as jest.Mock).mockReturnValueOnce(1); (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(false);
        // 6. B.S1.Y (pA2Y): Flip=F
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(false);
        // 7. B.S2.X (pB2X): Flip=T, Size=0, DomCheck=F
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(true); (randomInstance.nextInt as jest.Mock).mockReturnValueOnce(0); (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(false);
        // 8. B.S2.Y (pA1Y): Flip=F
        (randomInstance.nextBoolean as jest.Mock).mockReturnValueOnce(false);

        // Call reproduce once with parentA (at index 1)
        const offspring = parentA.reproduce(orderedParents, parentAIndexInArray, currentMockConfig, randomInstance);
        const offspringA = offspring[0] as OrganismC;

        // --- Assertions --- 
        // Verify total calls first
        // nextBoolean: Flip(8) + DomCheck(4) = 12
        // nextInt: SizeDelta(5) + NewDom(1) = 5
        expect(randomInstance.nextBoolean as jest.Mock).toHaveBeenCalledTimes(12);
        expect(randomInstance.nextInt as jest.Mock).toHaveBeenCalledTimes(5);

        // Verify final state of genes involved in Offspring A's placement:
        // A.S1.X (pA1X: abs=10, size=1, delib=F, dom=100) -> Flip=F -> Unchanged
        expect(offspringA.geneSet1.geneX).toEqual(parentAGeneSet1.geneX); 

        // A.S1.Y (pB2Y: abs=80, size=8, delib=F, dom=800) -> Flip=T, SizeDelta=0, DomCheck skipped
        expect(offspringA.geneSet1.geneY.deliberateMutation).toBe(true); // Flipped
        expect(offspringA.geneSet1.geneY.sizeOfRelativeMutation).toBe(8); // 8 + 0 = 8
        expect(offspringA.geneSet1.geneY.dominanceFactor).toBe(800);     // Unchanged
        expect(offspringA.geneSet1.geneY.absolutePosition).toBe((80 + 8 + currentMockConfig.worldSize) % currentMockConfig.worldSize); // 88
        
        // A.S2.X (pA2X: abs=30, size=3, delib=F, dom=300) -> Flip=T, SizeDelta=-1, DomCheck=T, NewDom=150
        expect(offspringA.geneSet2.geneX.deliberateMutation).toBe(true); // Flipped
        expect(offspringA.geneSet2.geneX.sizeOfRelativeMutation).toBe(2); // 3 + (-1) = 2
        expect(offspringA.geneSet2.geneX.dominanceFactor).toBe(150);     // Recalculated
        expect(offspringA.geneSet2.geneX.absolutePosition).toBe((30 + 2 + currentMockConfig.worldSize) % currentMockConfig.worldSize); // 32

        // A.S2.Y (pB1Y: abs=60, size=6, delib=F, dom=600) -> Flip=F -> Unchanged
        expect(offspringA.geneSet2.geneY).toEqual(parentBGeneSet1.geneY);
        
        // Determine placement based on mutated dominant genes:
        // Offspring GeneSet1: { X: { abs: 10, dom: 100 }, Y: { abs: 88, dom: 800 } }
        // Offspring GeneSet2: { X: { abs: 32, dom: 150 }, Y: { abs: 60, dom: 600 } }
        // Dominant X: GeneSet2.X (dom 150 > 100) -> abs 32
        // Dominant Y: GeneSet1.Y (dom 800 > 600) -> abs 88
        const expectedPosition = { x: 32, y: 88 };
        const actualPosition = offspringA.getPosition();
        expect(actualPosition.x).toBe(expectedPosition.x);
        expect(actualPosition.y).toBe(expectedPosition.y);
     });

     it('should return empty array if organism is at index 0 (no partner before it)', () => {
        const currentMockConfig = Config.getInstance();
        const currentIndex = 0;
        const randomInstance = new SeededRandom(1); 
        randomInstance.nextBoolean = jest.fn().mockReturnValue(false); // Minimal mocks
        randomInstance.nextInt = jest.fn().mockReturnValue(0); 

        const offspringList = parentA.reproduce(parentsArray, currentIndex, currentMockConfig, randomInstance);
        expect(offspringList).toEqual([]);
    });
 }); // End describe 'Sexual Reproduction'
