import { OrganismC, Gene, GeneSet } from '../OrganismC';
import { Config } from '../Config';
import { SeededRandom } from '../utils/SeededRandom';
import { Position } from '../BaseOrganism'; 

// Mock the Config class
jest.mock('../Config');

// Define types for spies, to be assigned in beforeEach scopes
let randomInstance: SeededRandom;
let nextIntSpy: jest.SpyInstance;
let nextBooleanSpy: jest.SpyInstance;

// Helper to create a default gene, simplifying test setup
const createDefaultGene = (): Gene => ({
    deliberateMutation: false,
    sizeOfRelativeMutation: 0,
    absolutePosition: 100, 
    dominanceFactor: 1000, 
});

// Helper to create a test gene, simplifying test setup
const createTestGene = (config: Partial<Gene> = {}): Gene => ({
    deliberateMutation: false,
    sizeOfRelativeMutation: 0,
    absolutePosition: 100, 
    dominanceFactor: 1000, 
    ...config,
});


describe('OrganismC Constructor and Initial State', () => { 
    beforeEach(() => {
        // Setup mocks for constructor tests
        // Clear previous mock calls/instances and set return value for this suite
        (Config.getInstance as jest.Mock).mockClear();
        (Config.getInstance as jest.Mock).mockReturnValue({
            worldSize: 100, maxLifeSpan: 10, reproductionRate: 0.5, sexualReproductionRate: 0.1,
            maxOrganisms: 50, mutationRate: 0.1, geneLength: 100, dominanceFactorMutationRate: 0.05,
            dominanceFactorMutationSize: 10, deliberateMutationRate: 0.2, maxRelativeMutationSize: 10,
            deliberateMutationProbability: 0.5, randomSeed: 123, regionCount: 4
        } as unknown as Config);

        // Create NEW random instance and spies for each constructor test
        randomInstance = new SeededRandom(123);
        nextIntSpy = jest.spyOn(randomInstance, 'nextInt');
        nextBooleanSpy = jest.spyOn(randomInstance, 'nextBoolean');
    });

    it('should initialize with given position and default age', () => {
        const pos: Position = { x: 10, y: 20 };
        // Get the mocked config instance as set up in beforeEach
        const currentMockConfig = Config.getInstance(); 
        // Uses randomInstance from beforeEach
        const organism = new OrganismC(pos, currentMockConfig, randomInstance); 
        expect(organism.getPosition()).toEqual(pos);
        // Expect roundsLived to be initialized randomly between 0 and maxLifeSpan - 1
        const roundsLived = organism.getRoundsLived();
        expect(roundsLived).toBeGreaterThanOrEqual(0);
        expect(roundsLived).toBeLessThanOrEqual(9); // Because mock maxLifeSpan is 10
        // Verify the random number generator was called correctly by the constructor
        expect(nextIntSpy).toHaveBeenCalledWith(0, 9);
    });

    it('should initialize with specific gene sets if provided', () => {
        const pos: Position = { x: 5, y: 5 };
        const geneSet1 = { geneX: createTestGene({ absolutePosition: 1 }), geneY: createTestGene({ absolutePosition: 2 }) };
        const geneSet2 = { geneX: createTestGene({ absolutePosition: 3 }), geneY: createTestGene({ absolutePosition: 4 }) };
        const currentMockConfig = Config.getInstance(); 
        const organism = new OrganismC(pos, currentMockConfig, randomInstance, geneSet1, geneSet2);
        expect(organism.geneSet1).toEqual(geneSet1);
        expect(organism.geneSet2).toEqual(geneSet2);
    });

    it('should initialize with default gene sets if none provided', () => {
        const pos: Position = { x: 0, y: 0 };
        const currentMockConfig = Config.getInstance(); 
        const organism = new OrganismC(pos, currentMockConfig, randomInstance);

        // Check that gene sets and genes are initialized with the correct structure and types
        const checkGeneStructure = (gene: Gene) => {
            expect(gene).toBeDefined();
            expect(typeof gene.absolutePosition).toBe('number');
            expect(typeof gene.dominanceFactor).toBe('number');
            expect(typeof gene.sizeOfRelativeMutation).toBe('number');
            expect(typeof gene.deliberateMutation).toBe('boolean');
            // Check for NaN explicitly if needed, though type check covers it mostly
            expect(isNaN(gene.absolutePosition)).toBe(false);
            expect(isNaN(gene.dominanceFactor)).toBe(false);
            expect(isNaN(gene.sizeOfRelativeMutation)).toBe(false);
        };

        expect(organism.geneSet1).toBeDefined();
        checkGeneStructure(organism.geneSet1.geneX);
        checkGeneStructure(organism.geneSet1.geneY);

        expect(organism.geneSet2).toBeDefined();
        checkGeneStructure(organism.geneSet2.geneX);
        checkGeneStructure(organism.geneSet2.geneY);
    });
});
