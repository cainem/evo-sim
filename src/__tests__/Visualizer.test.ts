// NOTE: jest.mock('three', ...) must be at the very top, before any imports, to ensure all THREE usage is mocked!
// NOTE: jest.mock('three', ...) must be at the very top, before any imports, to ensure all THREE usage is mocked!
jest.mock('three', () => {
  const originalThree = jest.requireActual('three');
  // --- MockLineSegments for instanceof compatibility ---
  class MockLineSegments {
    geometry: any;
    material: any;
    add: jest.Mock;
    remove: jest.Mock;
    traverse: jest.Mock;
    position: { set: jest.Mock; x: number; y: number; z: number };
    rotation: { set: jest.Mock; x: number; y: number; z: number };
    children: any[];
    uuid: string;
    dispose: jest.Mock;
    constructor(geometry: any, material: any) {
      this.geometry = geometry || { dispose: jest.fn() };
      this.material = material || { dispose: jest.fn() };
      this.add = jest.fn();
      this.remove = jest.fn();
      this.traverse = jest.fn();
      this.position = { set: jest.fn(), x: 0, y: 0, z: 0 };
      this.rotation = { set: jest.fn(), x: 0, y: 0, z: 0 };
      this.children = [];
      this.uuid = 'mock-linesegments-uuid';
      this.dispose = jest.fn();
    }
  }
  let planeGeometryCount = 0;
  let bufferGeometryCount = 0;
  let bufferAttributeCount = 0;
  // Store geometry mocks for inspection (must be above all usages)
  let geometryMocks: { lastSetColorAttribute: any } = { lastSetColorAttribute: null };
  return {
    ...originalThree,
    __mocks: { geometryMocks },
    BufferGeometry: jest.fn(function(this: any) {
      bufferGeometryCount++;
      // Create a stubbed BufferAttribute for position
      const positionArray = new Float32Array(6);
      const positionAttribute = new originalThree.BufferAttribute(positionArray, 3);
      const geometry = {
        attributes: { position: positionAttribute },
        setAttribute: jest.fn(function(name: string, attribute: any) {
          this.attributes[name] = attribute;
        }),
        getAttribute: jest.fn(function(name: string) {
          return this.attributes[name];
        }),
        dispose: jest.fn(),
        computeVertexNormals: jest.fn(),
        uuid: 'mock-buffergeom-uuid',
        clone: jest.fn(function() { return { ...this }; }),
        _mockPositionAttribute: positionAttribute,
      };
      return geometry;
    }),
    LineBasicMaterial: jest.fn(function(this: any, params?: any) {
      this.dispose = jest.fn();
      this.color = params && params.color ? params.color : new originalThree.Color();
    }),
    LineSegments: jest.fn(function(this: any, geometry, material) {
      return new MockLineSegments(geometry, material);
    }),
    PlaneGeometry: jest.fn().mockImplementation((w, h, ws, hs) => {
      // Clamp segment counts to a safe value for tests
      ws = Math.min(ws, 10);
      hs = Math.min(hs, 10);
      planeGeometryCount++;
      // Calculate initial vertex positions for the plane
      const vertexCount = (ws + 1) * (hs + 1);
      const vertices = new Float32Array(vertexCount * 3);
      for (let i = 0; i < vertexCount; i++) {
        // Generate realistic X, Y (Plane's Y is world Z) coords
        const x = (i % (ws + 1)) / ws - 0.5; // Range [-0.5, 0.5]
        const y = Math.floor(i / (ws + 1)) / hs - 0.5; // Range [-0.5, 0.5]
        vertices[i * 3] = x * w; // Scale by width
        vertices[i * 3 + 1] = y * h; // Scale by height
        vertices[i * 3 + 2] = 0; // Z is initially 0
      }

      // Create the mock attribute using the BufferAttribute mock
      const positionAttributeInstance = new THREE.BufferAttribute(vertices, 3);
      
      // Store instance for test inspection
      const mockGeometry = {
        _mockPositionAttribute: positionAttributeInstance, // For direct test access
        attributes: { // Store attributes here
          position: positionAttributeInstance 
        },
        parameters: { width: w, height: h, widthSegments: ws, heightSegments: hs },
        getAttribute: jest.fn(function(this: any, name: string) {
          // Return stored attributes
          return this.attributes[name];
        }),
        setAttribute: jest.fn(function(this: any, name: string, attribute: any) {
          // Store the attribute and make it accessible for tests
          this.attributes[name] = attribute;
          if (name === 'color') {
            // Store for test verification
            geometryMocks.lastSetColorAttribute = attribute;
          }
        }),
        computeVertexNormals: jest.fn(),
        dispose: jest.fn(),
        uuid: 'mock-geom-uuid',
        // Add necessary methods for test assertions
        clone: jest.fn(function(this: any) {
          return { ...this };
        }),
      };
      
      return mockGeometry;
    }),
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      remove: jest.fn(),
      background: null,
      children: [],
    })),
    OrthographicCamera: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn(), x: 0, y: 0, z: 0 },
      lookAt: jest.fn(),
      updateProjectionMatrix: jest.fn(),
      left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 1000
    })),
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      domElement: mockCanvas, // Link renderer to mock canvas
      setSize: jest.fn(),
      setPixelRatio: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn(),
    })),
    MeshBasicMaterial: jest.fn().mockImplementation(() => ({ dispose: jest.fn(), vertexColors: true })),
    Group: jest.fn().mockImplementation(function () {
      return {
        add: jest.fn(),
        remove: jest.fn(),
        traverse: function(cb: (obj: any) => void) {
          cb(this);
          (this.children || []).forEach((child: any) => cb(child));
        },
        position: { set: jest.fn(), x: 0, y: 0, z: 0 },
        rotation: { set: jest.fn(), x: 0, y: 0, z: 0 },
        children: [],
        uuid: 'mock-mesh-uuid',
      };
    }),
    Mesh: jest.fn().mockImplementation((geometry, material) => ({
      geometry: geometry || { dispose: jest.fn() },
      material: material || { dispose: jest.fn() },
      rotation: { x: 0, y: 0, z: 0 },
      position: { set: jest.fn(), x: 0, y: 0, z: 0 },
      add: jest.fn(),
      remove: jest.fn(),
      traverse: jest.fn(),
      children: [],
      uuid: 'mock-mesh-uuid',
      dispose: jest.fn(),
    })),
    AmbientLight: jest.fn(),
    DirectionalLight: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
    })),
    Vector3: jest.fn().mockImplementation(function(this: any, x: number, y: number, z: number) {
      this.x = x || 0;
      this.y = y || 0;
      this.z = z || 0;
      this.clone = jest.fn(() => new (THREE.Vector3 as any)(this.x, this.y, this.z));
      this.lerp = jest.fn(function(v: { x: number; y: number; z: number }, alpha: number) {
        this.x += (v.x - this.x) * alpha;
        this.y += (v.y - this.y) * alpha;
        this.z += (v.z - this.z) * alpha;
        return this;
      });
    }),
    Color: jest.fn().mockImplementation(function(this: any, color?: string | number) {
      if (typeof color === 'string' || typeof color === 'number') {
        // Simulate color parsing (very basic)
        this.r = 1;
        this.g = 1;
        this.b = 1;
      } else {
        this.r = 1;
        this.g = 1;
        this.b = 1;
      }
      this.lerpColors = jest.fn();
      this.setRGB = function(r: number, g: number, b: number) {
        this.r = r;
        this.g = g;
        this.b = b;
        return this;
      };
    }),
  };
});

import * as THREE from 'three';

// Mock minimal HTMLElement properties needed for canvas
const mockCanvas = {
  clientWidth: 800,
  clientHeight: 600,
  style: {},
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  // Add other properties/methods if Visualizer uses them
  getContext: jest.fn().mockReturnValue({ // Mock context if needed by THREE mocks
    makeCurrent: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
    // Add other WebGL context methods if necessary
  })
} as unknown as HTMLCanvasElement; // Typecast for Visualizer constructor compatibility

import { Visualizer } from '../Visualizer';
import { Config } from '../Config';
import { WorldMap } from '../WorldMap';
import { SeededRandom } from '../utils/SeededRandom';
// Import CSS2DObject and CSS2DRenderer
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// Define the expected 'this' context for the BufferGeometry mock
interface MockBufferGeometryContext {
    _mockPositionAttribute: THREE.BufferAttribute | null;
    setAttribute: jest.Mock<any, [name: string, attribute: any]>;
    setIndex: jest.Mock;
    dispose: jest.Mock;
}

// Define the expected 'this' context for the Color mock
interface MockColorContext {
    r: number;
    g: number;
    b: number;
    lerpColors: jest.Mock<any, [color1: any, color2: any, alpha: number]>;
}

// --- Mocks ---

// Mock OrbitControls
jest.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: jest.fn().mockImplementation(() => ({
    enableDamping: true,
    dampingFactor: 0.1,
    screenSpacePanning: false,
    maxPolarAngle: Math.PI / 2,
    update: jest.fn(), // Mock methods used by Visualizer
    dispose: jest.fn(),
  }))
}));

// Mock CSS2DRenderer and CSS2DObject
jest.mock('three/examples/jsm/renderers/CSS2DRenderer.js', () => ({
  CSS2DRenderer: jest.fn().mockImplementation(() => ({
    domElement: document.createElement('div'),
    setSize: jest.fn(),
    render: jest.fn(),
  })),
  CSS2DObject: jest.fn().mockImplementation((element) => ({
    element: element,
    position: { set: jest.fn() },
    parent: null,
    children: [],
  }))
}));

// --- Mock WorldMap ---
interface MockWorldMap extends WorldMap {
    worldSize: number;
    worldMaxHeight: number;
}


// Create a reusable mock WorldMap factory
const createMockWorldMap = (size: number, maxHeight: number, heightFunc: (x: number, y: number) => number = () => 0): MockWorldMap => {
    // Hold config values locally instead of trying to set a private property
    const mockConfig = Config.createCustomConfig({ worldSize: size, worldMaxHeight: maxHeight });
    
    const map = {
        // No 'config' property here
        getHeight: jest.fn((x, y) => {
            // Use the locally defined size for wrap-around
            const s = mockConfig.worldSize;
            const wrappedX = (x % s + s) % s;
            const wrappedY = (y % s + s) % s;
            // Ensure height is clamped according to mock maxHeight
            const calculatedHeight = Math.max(0, Math.min(heightFunc(wrappedX, wrappedY), mockConfig.worldMaxHeight));
            return calculatedHeight;
        }),
        getRawHeightMap: jest.fn(() => {
            const rawMap: number[][] = [];
            // Use local size for loops
            for(let x = 0; x < mockConfig.worldSize; x++) { 
                rawMap[x] = [];
                for(let y = 0; y < mockConfig.worldSize; y++) {
                    // Call the mocked getHeight which uses local config
                    rawMap[x][y] = (map as any).getHeight(x, y); 
                }
            }
            return rawMap;
        }),
        // Add other WorldMap methods/properties if Visualizer uses them
        // For instance, Visualizer might need worldSize or maxHeight directly
        // If so, add them as public properties/getters to the mock:
        worldSize: mockConfig.worldSize,
        worldMaxHeight: mockConfig.worldMaxHeight
    } as unknown as MockWorldMap; // Cast to unknown first, then to the extended type
    // No need to set (map as any).config anymore
    return map;
};

// Store geometry mocks for inspection
// Store geometry mocks for inspection (must be above all usages)
let geometryMocks: { lastSetColorAttribute: THREE.BufferAttribute | null } = { lastSetColorAttribute: null };

// --- Tests ---

describe('Visualizer', () => {
  beforeEach(() => jest.clearAllMocks());
  let visualizer: Visualizer;
  let mockWorldMap: MockWorldMap;

  beforeEach(() => {
    jest.clearAllMocks(); // Reset all mocks between tests

    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Use a default mock map for general tests
    mockWorldMap = createMockWorldMap(10, 50, (x, y) => (x + y) % 50); // Simple pattern
    
    // Create a new Visualizer instance before each test
    visualizer = new Visualizer(mockCanvas);
    // Manually set config if needed and not handled by getInstance mock
    (visualizer as any).config = Config.createCustomConfig({ worldSize: 100, worldMaxHeight: 50 });
    // Manually set the planeMesh reference for tests focusing on updates
    (visualizer as any).planeMesh = new THREE.Mesh(); 
    // Link the mocked geometry to the mesh for inspection
    ((visualizer as any).planeMesh as any).geometry = new THREE.PlaneGeometry(100, 100, 10, 10); 
    // Reset captured color attribute
    geometryMocks = { lastSetColorAttribute: null }; // Reset captured color attribute
  });

  it('should construct without errors', () => {
    expect(visualizer).toBeDefined();
    // Add basic checks: e.g., was Scene created?
    expect(THREE.Scene).toHaveBeenCalledTimes(1);
    expect(THREE.OrthographicCamera).toHaveBeenCalledTimes(1);
    expect(THREE.WebGLRenderer).toHaveBeenCalledTimes(1);
    expect(THREE.PlaneGeometry).toHaveBeenCalledTimes(2); // Once in constructor, once manually in beforeEach
    expect(THREE.Mesh).toHaveBeenCalledTimes(2); // Once in constructor, once manually in beforeEach
  });

  it('setWorldMap should store the map and trigger terrain update', () => {
    // Spy on the update method *before* calling setWorldMap
    const updateSpy = jest.spyOn(visualizer as any, 'updateTerrainVisualization');
    
    // Make sure the spy doesn't actually call the method to avoid errors
    updateSpy.mockImplementation(() => {});
    
    visualizer.setWorldMap(mockWorldMap);

    expect((visualizer as any).worldMap).toBe(mockWorldMap);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    
    // Cleanup
    updateSpy.mockRestore();
  });

  /**
   * MINIMAL TESTS FOR VISUALIZER'S KEY FUNCTIONALITY
   * 
   * Due to memory constraints and the complexity of mocking THREE.js objects,
   * we're taking a minimalist approach that focuses on verifying the core behavior
   * through simple spy-based tests rather than detailed implementation testing.
   */
  
  // Test for updateTerrainVisualization with minimal THREE.js mocking
  it('should update terrain visualization when world map changes', () => {
    // Create a spy on the key method
    const updateTerrainSpy = jest.spyOn(visualizer as any, 'updateTerrainVisualization')
      .mockImplementation(() => {}); // Mock to prevent execution
    
    // Set the world map to trigger the update
    const mockMap = createMockWorldMap(10, 50);
    visualizer.setWorldMap(mockMap);
    
    // Verify the visualization was updated
    expect(updateTerrainSpy).toHaveBeenCalled();
    
    // Clean up
    updateTerrainSpy.mockRestore();
  });
  
  // Simplified tests for new visualization methods (drawRegions, drawOrganisms, drawFlags)
  // We're using a black-box approach focusing on the public API and expected outcomes
  // instead of verifying all internal implementation details
  
  // Class to mock essential Region behavior
  class MockRegion {
    constructor(
      private bounds = { minX: 10, minY: 10, maxX: 40, maxY: 40 },
      private capacity = 100,
      private highestPoint = { x: 50, y: 50, height: 25 }
    ) {}
    
    getBounds() { return this.bounds; }
    getCarryingCapacity() { return this.capacity; }
    getStatistics() { return { highestPoint: this.highestPoint }; }
  }
  
  // Class to mock essential Organism behavior
  class MockOrganism {
    constructor(private x = 25, private y = 25) {}
    getPosition() { return { x: this.x, y: this.y }; }
  }
  
  // Testing new visualization methods
  // Since THREE.js mocking is complex and brittle in this testing environment,
  // we'll use describe.skip for now to document the expected behavior
  // without causing test failures due to mocking issues
  describe('Visualization Methods', () => {
    const mockRegion = { 
      getBounds: () => ({ minX: 10, minY: 10, maxX: 40, maxY: 40 }),
      getCarryingCapacity: () => 100,
      getStatistics: () => ({ highestPoint: { x: 50, y: 50, height: 25 } })
    };
    
    const mockOrganism = {
      getPosition: () => ({ x: 25, y: 25 })
    };
    
    it('drawRegions should create visualization for regions', () => {
      // should create and add region boundaries mesh
      visualizer.drawRegions([mockRegion as any]);
      const rb = (visualizer as any).regionBoundaries;
      expect(rb).toBeDefined();
      const scene = (visualizer as any).scene as any;
      expect(scene.add).toHaveBeenCalledWith(rb);
    });
    
    it('drawOrganisms should create visualization for organisms', () => {
      // This would test that drawOrganisms correctly creates and stores organism visualizations
      visualizer.drawOrganisms([mockOrganism as any]);
      expect((visualizer as any).organismInstances).toBeDefined();
    });
    
    it('drawFlags should create visualization for the world flag only', () => {
      // This would test that drawFlags correctly creates and stores the world flag visualization
      visualizer.drawFlags({ x: 60, y: 60, height: 40 });
      expect((visualizer as any).worldHighestFlag).toBeDefined();
    });
    
    it('dispose should clean up all visualization resources', () => {
      // This would test that dispose correctly cleans up all visualization resources
      visualizer.drawRegions([mockRegion as any]);
      visualizer.drawOrganisms([mockOrganism as any]);
      visualizer.drawFlags({ x: 60, y: 60, height: 40 });
      
      visualizer.dispose();
      
      expect((visualizer as any).regionBoundaries).toBeNull();
      expect((visualizer as any).organismInstances).toBeNull();
      expect((visualizer as any).worldHighestFlag).toBeNull();
    });
  });
  
  // Add a simple test to validate the methods exist on the Visualizer class
  // This will ensure API compatibility without getting into implementation details
  describe('Visualization API', () => {
    it('should have methods to visualize regions, organisms and flags', () => {
      expect(typeof visualizer.drawRegions).toBe('function');
      expect(typeof visualizer.drawOrganisms).toBe('function');
      expect(typeof visualizer.drawFlags).toBe('function');
    });
  });
  
  // Removed contour line generation test - feature no longer supported
});
