import * as THREE from 'three';
import { Config } from './Config';
import { WorldMap } from './WorldMap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Region } from './Region';
import { Organism } from './Organism';

export class Visualizer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private planeMesh: THREE.Mesh | null = null;
  private contourLines: THREE.LineSegments | null = null;
  private config: Config;
  private worldMap: WorldMap | null = null;
  private canvas: HTMLCanvasElement;
  private frameId: number | null = null;
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraControls: OrbitControls;

  // Visualization elements
  private regionBoundaries: THREE.LineSegments | null = null;
  private regionLabels: CSS2DObject[] = [];
  private organismInstances: THREE.InstancedMesh | null = null;
  private flagsGroup: THREE.Group | null = null;
  private worldHighestFlag: THREE.Group | null = null;
  
  // UI Overlay elements
  private uiOverlayContainer: HTMLDivElement | null = null;
  private roundCounterElement: HTMLDivElement | null = null;
  private organismCounterElement: HTMLDivElement | null = null;

  // Contour line properties
  private readonly contourLineLevels = 10;
  private readonly contourLineColor = new THREE.Color(0xffffff); // White
  private readonly contourOffset = 2.0; // Increased offset for better visibility
  
  // Region and organism visualization properties
  private readonly regionLineColor = new THREE.Color(0x00ffff); // Bright cyan for region boundaries
  private readonly organismColor = new THREE.Color(0xffff00); // Bright yellow for organisms
  private readonly regionalFlagColor = new THREE.Color(0x00aaff); // Bright blue for region flags
  private readonly worldFlagColor = new THREE.Color(0xff0000); // Bright red for world flag
  private readonly organismSize = 3.0; // Increased size of organism squares

  constructor(canvas: HTMLCanvasElement) {
    this.config = Config.getInstance();
    this.canvas = canvas; // Assign constructor parameter to class property
    const worldSize = this.config.worldSize;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // 2. Camera
    const aspect = canvas.clientWidth / canvas.clientHeight;
    // Use OrthographicCamera for top-down view
    const viewSize = this.config.worldSize; // Size of the area camera should capture
    const halfViewSize = viewSize / 2;
    this.camera = new THREE.OrthographicCamera(
      -halfViewSize * aspect, // left
      halfViewSize * aspect,  // right
      halfViewSize,           // top
      -halfViewSize,          // bottom
      0.1,                    // near
      viewSize * 2            // far (enough to see plane from viewSize height)
    );
    // Position camera directly above the center
    this.camera.position.set(0, viewSize, 0); 
    this.camera.lookAt(0, 0, 0); // Look at the center of the plane (0,0,0)

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // 3.1 CSS2D Renderer for labels
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.width = '100%';
    this.labelRenderer.domElement.style.height = '100%';
    this.labelRenderer.domElement.style.pointerEvents = 'none'; // Allow click-through to canvas
    this.labelRenderer.domElement.style.zIndex = '1'; // Ensure it's above the canvas
    document.body.appendChild(this.labelRenderer.domElement);

    // 3.2 UI Overlay for simulation stats
    this.createUIOverlay();

    // 4. World Plane (will be updated when setWorldMap is called)
    const segments = 200; // Increase segments for more detail
    const planeGeometry = new THREE.PlaneGeometry(worldSize, worldSize, segments, segments);
    // Simplify material to MeshBasicMaterial + vertexColors to rule out lighting
    const planeMaterial = new THREE.MeshBasicMaterial({ 
      side: THREE.DoubleSide,
      vertexColors: true, // Use vertex colors for terrain heightmap
      transparent: true, // Restore transparency
      opacity: 0.4       // Restore original opacity
    });
    this.planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    this.planeMesh.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
    this.planeMesh.position.set(0, 0, 0); // Position at origin (center of the plane aligns with world origin)
    if (this.planeMesh) {
      this.scene.add(this.planeMesh);
    }

    // 6. Orbit Controls (Initialize after camera and renderer)
    this.cameraControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.cameraControls.enableDamping = true; // Optional: for smoother interaction
    this.cameraControls.dampingFactor = 0.1;
    this.cameraControls.screenSpacePanning = false; // Keep panning relative to world plane
    this.cameraControls.maxPolarAngle = Math.PI / 2; // Prevent camera going below ground

    // 5. Basic Lighting (Keep lights, though MeshBasicMaterial won't use them)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Slightly less intense ambient
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Slightly less intense directional
    directionalLight.position.set(worldSize * 0.5, worldSize * 1.0, worldSize * 0.5); 
    this.scene.add(directionalLight);
    // Remove the helper unless debugging lights specifically
    // const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 20);
    // this.scene.add(lightHelper);

    // Handle window resizing
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    
  }

  /**
   * Sets the WorldMap to visualize and updates the terrain visualization
   * @param worldMap The WorldMap instance containing height data
   */
  public setWorldMap(worldMap: WorldMap): void {
    console.log('[Visualizer] setWorldMap called', { worldMap });
    console.log('Setting WorldMap in Visualizer');
    this.worldMap = worldMap;
    
    // Re-enable actual terrain visualization
    // this.createDebugPattern(); // Keep commented out
    this.updateTerrainVisualization(); // Updates terrain + contours
  }
  
  /**
   * Creates a simple debug pattern on the plane to verify visualization is working
   */
  private createDebugPattern(): void {
    console.log('Creating debug pattern');
    
    // Early exit if planeMesh is not initialized
    if (!this.planeMesh) {
      console.error('Cannot create debug pattern: planeMesh is not initialized.');
      return;
    }
    
    // Get the geometry and prepare colors array
    const geometry = this.planeMesh.geometry as THREE.PlaneGeometry;
    const positionAttribute = geometry.getAttribute('position');
    const colors = new Float32Array(positionAttribute.count * 3);
    
    // Create a simple checkerboard pattern
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = Math.floor(positionAttribute.getX(i));
      const z = Math.floor(positionAttribute.getZ(i));
      
      // Checkerboard pattern
      const isEven = (Math.floor(x / 10) + Math.floor(z / 10)) % 2 === 0;
      
      // Set color based on checkerboard
      if (isEven) {
        colors[i * 3] = 1.0;     // Red
        colors[i * 3 + 1] = 0.0;  // Green
        colors[i * 3 + 2] = 0.0;  // Blue
      } else {
        colors[i * 3] = 0.0;     // Red
        colors[i * 3 + 1] = 0.0;  // Green
        colors[i * 3 + 2] = 1.0;  // Blue
      }
      
      // Create some elevation for visual interest
      const elevation = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 5;
      positionAttribute.setZ(i, elevation);
    }
    
    // Add colors to the geometry
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Update the geometry
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    console.log('Debug pattern created');
  }

  /**
   * Updates the terrain visualization based on the height map data
   */
  private updateTerrainVisualization(): void {
    console.log('[Visualizer] updateTerrainVisualization called');
    // Early exit if planeMesh is not initialized
    if (!this.planeMesh) {
      console.error('Cannot update terrain: planeMesh is not initialized.');
      return;
    }
    const mesh = this.planeMesh;
    if (!this.worldMap) {
      console.warn('Cannot update terrain visualization: WorldMap not set');
      return;
    }
    const map = this.worldMap;
    const worldSize = this.config.worldSize;
    const maxHeight = this.config.worldMaxHeight;
    const geometry = mesh.geometry as THREE.PlaneGeometry;
    const positionAttribute = geometry.getAttribute('position');
    console.log('[Visualizer] Geometry/attributes accessed', { worldSize, maxHeight, vertexCount: positionAttribute.count });
    const colors = new Float32Array(positionAttribute.count * 3);
    console.log('[Visualizer] Buffer allocated', { bufferLength: colors.length });
    // Enter per-vertex loop, but only log index and coords for first vertex
    for (let i = 0; i < positionAttribute.count; i++) {
      const vertexX = positionAttribute.getX(i);
      const vertexY = positionAttribute.getY(i);
      // Convert to map indices (same as before)
      const mapX = Math.floor(((vertexX / worldSize) + 0.5) * worldSize);
      const mapZ = Math.floor(((-vertexY / worldSize) + 0.5) * worldSize);
      const x = Math.max(0, Math.min(worldSize - 1, mapX));
      const z = Math.max(0, Math.min(worldSize - 1, mapZ));
      const height = map.getHeight(x, z);
      positionAttribute.setZ(i, height);
      // Restore original color calculation logic
      const color = new THREE.Color();
      // Example: simple grayscale based on height (replace with original logic if different)
      const normalizedHeight = height / maxHeight;
      color.setRGB(normalizedHeight, normalizedHeight, normalizedHeight);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      if (i === 0) {
        console.log(`[Visualizer] Vertex 0: index=${i}, x=${vertexX}, y=${vertexY}, map=(${x},${z}), height=${height} (setZ), color=(${color.r},${color.g},${color.b})`);
      }
      if (i === positionAttribute.count - 1) {
        console.log(`[Visualizer] Last vertex: index=${i}, x=${vertexX}, y=${vertexY}, map=(${x},${z}), height=${height} (setZ), color=(${color.r},${color.g},${color.b})`);
      }
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
console.log('[Visualizer] geometry.setAttribute for color completed');
geometry.attributes.color.needsUpdate = true;
geometry.attributes.position.needsUpdate = true;
console.log('[Visualizer] needsUpdate set for color and position');
geometry.computeVertexNormals();
console.log('[Visualizer] computeVertexNormals completed');
// STOP HERE: Do not use THREE.Color or do any color math yet.
  }

  // --- Contour Line Generation ---

  private _updateContourLines(map: WorldMap | null, worldSize: number, maxHeight: number): void {
    if (!map) return;
    if (this.contourLines) {
      if (this.scene && typeof this.scene.remove === 'function') {
        this.scene.remove(this.contourLines);
      }
      if (this.contourLines.geometry && typeof this.contourLines.geometry.dispose === 'function') {
        this.contourLines.geometry.dispose();
      }
      if (this.contourLines.material && typeof (this.contourLines.material as any).dispose === 'function') {
        (this.contourLines.material as THREE.Material).dispose();
      }
      this.contourLines = null;
    }

    const lineVertices: number[] = [];
    const heightStep = maxHeight / (this.contourLineLevels + 1);
    const width = worldSize; // Use worldSize for dimensions
    const depth = worldSize;
    const halfSize = worldSize / 2;

    // We need the WorldMap instance to call getHeight
    if (!map) {
        console.error("Cannot update contour lines: WorldMap instance is missing.");
        return;
    }

    // Helper to interpolate position on an edge based on the contour level
    const interpolate = (p1: THREE.Vector3, p2: THREE.Vector3, level: number): THREE.Vector3 => {
        // Ensure p1.y and p2.y are different (using Y for height)
        if (Math.abs(p1.y - p2.y) < 1e-6) {
            return p1.clone().lerp(p2, 0.5); 
        }
        const t = (level - p1.y) / (p2.y - p1.y); // Interpolate based on Y
        // Interpolate world X and Z coordinates
        const worldX = p1.x + t * (p2.x - p1.x);
        const worldZ = p1.z + t * (p2.z - p1.z);
        // Y position is the contour level, slightly offset upwards
        return new THREE.Vector3(worldX, level + this.contourOffset, worldZ); // Height in Y
    };

    for (let i = 1; i <= this.contourLineLevels; i++) {
        const level = i * heightStep;

        for (let x = 0; x < width - 1; x++) {
            for (let z = 0; z < depth - 1; z++) {
                // Get world coordinates and heights for the 4 corners of the cell using map.getHeight()
                const h00 = map.getHeight(x, z);
                const h10 = map.getHeight(x + 1, z);
                const h01 = map.getHeight(x, z + 1);
                const h11 = map.getHeight(x + 1, z + 1);

                // Use Y for height when creating points (World Coordinates)
                const p00 = new THREE.Vector3(x - halfSize, h00, z - halfSize); // Y is height
                const p10 = new THREE.Vector3(x + 1 - halfSize, h10, z - halfSize); // Y is height
                const p01 = new THREE.Vector3(x - halfSize, h01, z + 1 - halfSize); // Y is height
                const p11 = new THREE.Vector3(x + 1 - halfSize, h11, z + 1 - halfSize); // Y is height

                // Determine Marching Squares case based on corners >= level (checking Y)
                let caseIndex = 0;
                if (p00.y >= level) caseIndex |= 1;
                if (p10.y >= level) caseIndex |= 2;
                if (p11.y >= level) caseIndex |= 4;
                if (p01.y >= level) caseIndex |= 8;

                // Skip cases where no lines are needed (all corners same side of level)
                if (caseIndex === 0 || caseIndex === 15) continue;

                // Calculate intersection points on edges (only if needed for the case)
                let ptTop:    THREE.Vector3 | null = null; // Edge p01 - p11
                let ptBottom: THREE.Vector3 | null = null; // Edge p00 - p10
                let ptLeft:   THREE.Vector3 | null = null; // Edge p00 - p01
                let ptRight:  THREE.Vector3 | null = null; // Edge p10 - p11

                // Check which edges the contour level crosses (comparing Y)
                if ((caseIndex & 8) !== (caseIndex & 4)) ptTop = interpolate(p01, p11, level);
                if ((caseIndex & 1) !== (caseIndex & 2)) ptBottom = interpolate(p00, p10, level);
                if ((caseIndex & 1) !== (caseIndex & 8)) ptLeft = interpolate(p00, p01, level);
                if ((caseIndex & 2) !== (caseIndex & 4)) ptRight = interpolate(p10, p11, level);

                // Add line segments based on the case index
                const addSegment = (pt1: THREE.Vector3 | null, pt2: THREE.Vector3 | null) => {
                    if (pt1 && pt2) {
                        lineVertices.push(pt1.x, pt1.y, pt1.z, pt2.x, pt2.y, pt2.z);
                    }
                };

                switch (caseIndex) {
                    case 1: case 14: addSegment(ptLeft, ptBottom); break;
                    case 2: case 13: addSegment(ptBottom, ptRight); break;
                    case 3: case 12: addSegment(ptLeft, ptRight); break;
                    case 4: case 11: addSegment(ptTop, ptRight); break;
                    case 5:          addSegment(ptLeft, ptTop); addSegment(ptBottom, ptRight); break; // Ambiguous: Left-Top, Bottom-Right
                    case 6: case 9:  addSegment(ptBottom, ptTop); break;
                    case 7: case 8:  addSegment(ptLeft, ptTop); break;
                    case 10:         addSegment(ptLeft, ptBottom); addSegment(ptTop, ptRight); break; // Ambiguous: Left-Bottom, Top-Right
                }
            }
        }
    }

    // Create and add the LineSegments mesh if vertices were generated
    if (lineVertices.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
        const material = new THREE.LineBasicMaterial({ color: this.contourLineColor });
        this.contourLines = new THREE.LineSegments(geometry, material);
        this.scene.add(this.contourLines); // Uncommented to show contours
    }
} 
 
  private onWindowResize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    
    // Resize the label renderer too
    this.labelRenderer.setSize(width, height);
  }

  // 6. Render Loop
  private render(): void {
    try {
      // Update camera controls first to process user input
      if (this.cameraControls) {
        this.cameraControls.update();
      }
      
      // Make sure instancedMatrix is updated if organisms exist
      if (this.organismInstances && this.organismInstances.instanceMatrix) {
        this.organismInstances.instanceMatrix.needsUpdate = true;
      }
      
      // Render scene
      this.renderer.render(this.scene, this.camera);
      
      // Render CSS2D labels
      if (this.labelRenderer) {
        this.labelRenderer.render(this.scene, this.camera);
      }
    } catch (error) {
      console.error("Error during render:", error);
      this.stopRenderLoop(); // Stop the loop if rendering fails
      return; // Exit the function on error
    }
    // Use an arrow function to preserve 'this' context for requestAnimationFrame
    this.frameId = requestAnimationFrame(() => this.render());
  }

  public startRenderLoop(): void {
    if (!this.frameId) {
        console.log("Starting render loop");
        this.render();
    }
  }

  public stopRenderLoop(): void {
    if (this.frameId !== null) {
        console.log("Stopping render loop");
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
    }
  }
  
  /**
   * Creates UI overlay elements for displaying simulation statistics
   */
  private createUIOverlay(): void {
    // Create container for UI elements
    this.uiOverlayContainer = document.createElement('div');
    this.uiOverlayContainer.style.position = 'absolute';
    this.uiOverlayContainer.style.top = '10px';
    this.uiOverlayContainer.style.left = '10px';
    this.uiOverlayContainer.style.padding = '10px';
    this.uiOverlayContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    this.uiOverlayContainer.style.borderRadius = '5px';
    this.uiOverlayContainer.style.color = 'white';
    this.uiOverlayContainer.style.fontFamily = 'Arial, sans-serif';
    this.uiOverlayContainer.style.fontSize = '14px';
    this.uiOverlayContainer.style.zIndex = '1000';
    this.uiOverlayContainer.style.userSelect = 'none';
    this.uiOverlayContainer.style.pointerEvents = 'none'; // Allow click-through
    
    // Create round counter element
    this.roundCounterElement = document.createElement('div');
    this.roundCounterElement.style.marginBottom = '5px';
    this.roundCounterElement.textContent = 'Round: 0';
    this.uiOverlayContainer.appendChild(this.roundCounterElement);
    
    // Create organism counter element
    this.organismCounterElement = document.createElement('div');
    this.organismCounterElement.textContent = 'Organisms: 0';
    this.uiOverlayContainer.appendChild(this.organismCounterElement);
    
    // Add to document
    document.body.appendChild(this.uiOverlayContainer);
  }
  
  /**
   * Updates the UI overlay with current simulation statistics
   * @param roundNumber Current round number
   * @param organismCount Current number of organisms
   */
  public updateUIOverlay(roundNumber: number, organismCount: number): void {
    if (this.roundCounterElement) {
      this.roundCounterElement.textContent = `Round: ${roundNumber}`;
    }
    
    if (this.organismCounterElement) {
      this.organismCounterElement.textContent = `Organisms: ${organismCount}`;
    }
  }

  // --- Region & Organism Visualization ---

  /**
   * Draws region boundaries on the map
   * @param regions Array of regions to visualize
   */
  public drawRegions(regions: Region[]): void {
    console.log('[Visualizer] drawRegions called', { regionCount: regions.length });
    console.log(`Drawing ${regions.length} region boundaries`);
    
    // Remove existing region boundaries if they exist
    if (this.regionBoundaries) {
      this.scene.remove(this.regionBoundaries);
      this.regionBoundaries.geometry.dispose();
      (this.regionBoundaries.material as THREE.Material).dispose();
      this.regionBoundaries = null;
    }
    
    // Clear existing region labels
    this.clearRegionLabels();
    
    if (regions.length === 0) {
      console.warn('No regions provided for visualization');
      return;
    }
    
    const worldSize = this.config.worldSize;
    const halfSize = worldSize / 2;
    const lineVertices: number[] = [];
    
    // Draw region boundaries
    regions.forEach(region => {
      const bounds = region.getBounds();
      const stats = region.getStatistics();
      const capacity = stats.carryingCapacity;
      
      // Convert region coordinates to world coordinates
      const startX = bounds.startX - halfSize;
      const endX = bounds.endX - halfSize;
      const startY = bounds.startY - halfSize;
      const endY = bounds.endY - halfSize;
      
      // Add more elevation to ensure boundaries are clearly visible above terrain
      const elevation = 5.0;
      
      // Add line segments for the region boundary (rectangle)
      // Bottom edge
      lineVertices.push(startX, elevation, startY, endX, elevation, startY);
      // Right edge
      lineVertices.push(endX, elevation, startY, endX, elevation, endY);
      // Top edge
      lineVertices.push(endX, elevation, endY, startX, elevation, endY);
      // Left edge
      lineVertices.push(startX, elevation, endY, startX, elevation, startY);
      
      // Create and add a label for the region's carrying capacity
      this.addRegionLabel(region);
    });
    
    // Create the line segments mesh for region boundaries
    if (lineVertices.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
      const material = new THREE.LineBasicMaterial({ 
        color: this.regionLineColor,
        linewidth: 3 // Thicker lines for better visibility (note: may not work on all GPUs)
      });
      this.regionBoundaries = new THREE.LineSegments(geometry, material);
      this.scene.add(this.regionBoundaries);
    }
  }
  
  /**
   * Adds a text label showing carrying capacity at the center of a region
   * @param region The region to add a label for
   */
  private addRegionLabel(region: Region): void {
    const bounds = region.getBounds();
    const stats = region.getStatistics();
    const worldSize = this.config.worldSize;
    const halfSize = worldSize / 2;
    
    // Calculate center position of the region
    const centerX = ((bounds.startX + bounds.endX) / 2) - halfSize;
    const centerZ = ((bounds.startY + bounds.endY) / 2) - halfSize;
    
    // Create label element
    const div = document.createElement('div');
    div.className = 'region-label';
    div.textContent = `${stats.carryingCapacity}`; // Just the number
    div.style.color = 'rgba(200,200,200,0.8)'; // Semi-transparent grey
    div.style.backgroundColor = 'transparent'; // No background
    div.style.fontSize = '14px';
    div.style.fontWeight = 'normal';
    
    // Create CSS2D object and position it
    const label = new CSS2DObject(div);
    label.position.set(centerX, 10, centerZ); // Y is 10 for better visibility above terrain
    this.scene.add(label);
    this.regionLabels.push(label);
  }
  
  /**
   * Removes all region labels from the scene
   */
  private clearRegionLabels(): void {
    this.regionLabels.forEach(label => {
      this.scene.remove(label);
    });
    this.regionLabels = [];
  }
  
  /**
   * Draws organisms as small squares at their positions
   * Uses InstancedMesh for efficient rendering of many organisms
   * @param organisms Array of organisms to visualize
   */
  public drawOrganisms(organisms: Organism[]): void {
    console.log('[Visualizer] drawOrganisms called', { organismCount: organisms.length });
    console.log(`Drawing ${organisms.length} organisms`);
    
    // Remove existing organism instances if they exist
    if (this.organismInstances) {
      this.scene.remove(this.organismInstances);
      if (this.organismInstances.geometry) {
        this.organismInstances.geometry.dispose();
      }
      if (this.organismInstances.material instanceof THREE.Material) {
        this.organismInstances.material.dispose();
      } else if (Array.isArray(this.organismInstances.material)) {
        this.organismInstances.material.forEach(material => {
          if (material instanceof THREE.Material) {
            material.dispose();
          }
        });
      }
      this.organismInstances = null;
    }
    
    if (organisms.length === 0) {
      console.warn('No organisms provided for visualization');
      return;
    }
    
    const worldSize = this.config.worldSize;
    const halfSize = worldSize / 2;
    
    // Create geometry for a single organism (small box)
    const geometry = new THREE.BoxGeometry(this.organismSize, this.organismSize, this.organismSize);
    const material = new THREE.MeshBasicMaterial({ color: this.organismColor });
    
    // Create instanced mesh for efficient rendering of many organisms
    this.organismInstances = new THREE.InstancedMesh(geometry, material, organisms.length);
    this.organismInstances.count = organisms.length;
    
    // Temporary transform for positioning instances
    const matrix = new THREE.Matrix4();
    const dummy = new THREE.Object3D();
    
    // Set position for each organism
    if (this.organismInstances) {
      organisms.forEach((organism, index) => {
        const position = organism.getPosition();
        
        // Convert organism coordinates to world coordinates
        const worldX = position.x - halfSize;
        const worldZ = position.y - halfSize; // y-coordinate maps to z in 3D space
        
        // Get height at organism position (plus small offset)
        let height = 0;
        if (this.worldMap) {
          height = this.worldMap.getHeight(position.x, position.y);
        }
        const worldY = height + 2; // Add small offset so organisms are visible above terrain
        
        // Position the dummy object
        dummy.position.set(worldX, worldY, worldZ);
        dummy.updateMatrix();
        
        // Apply the dummy's matrix to the instanced mesh
        if (this.organismInstances) {
          this.organismInstances.setMatrixAt(index, dummy.matrix);
        }
      });
    }
    
    // Update the instance buffer
    if (this.organismInstances && this.organismInstances.instanceMatrix) {
      this.organismInstances.instanceMatrix.needsUpdate = true;
      
      // Add the instanced mesh to the scene
      this.scene.add(this.organismInstances);
    }
  }
  
  /**
   * Draws flags at highest points in regions and the world
   * @param regions Array of regions to visualize highest points for
   * @param worldHighestSampledPoint The highest point in the entire world
   */
  public drawFlags(regions: Region[], worldHighestSampledPoint: { x: number, y: number, height: number }): void {
    console.log('Drawing flags for highest points');
    
    // Remove existing flags group if it exists
    if (this.flagsGroup) {
      this.scene.remove(this.flagsGroup);
      this.flagsGroup.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });
      this.flagsGroup = null;
    }
    
    // Remove existing world highest flag if it exists
    if (this.worldHighestFlag) {
      this.scene.remove(this.worldHighestFlag);
      if (this.worldHighestFlag instanceof THREE.Group) {
        this.worldHighestFlag.traverse((object: THREE.Object3D) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (object.material instanceof THREE.Material) {
              object.material.dispose();
            }
          }
        });
      }
      this.worldHighestFlag = null;
    }
    
    const worldSize = this.config.worldSize;
    const halfSize = worldSize / 2;
    
    // Create a new group for regional flags
    this.flagsGroup = new THREE.Group();
    
    // Create flag geometry and materials
    const flagPoleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 15, 8); // Taller pole
    const flagGeometry = new THREE.BoxGeometry(5, 3, 0.1); // Wider flag
    const poleColor = 0x888888; // Gray
    const poleMaterial = new THREE.MeshBasicMaterial({ color: poleColor });
    const regionalFlagMaterial = new THREE.MeshBasicMaterial({ color: this.regionalFlagColor });
    const worldFlagMaterial = new THREE.MeshBasicMaterial({ color: this.worldFlagColor });
    
    // Draw regional flags
    regions.forEach(region => {
      const stats = region.getStatistics();
      const highestPoint = stats.highestPoint || { x: 0, y: 0, height: 0 };
      
      // Convert to world coordinates
      const worldX = highestPoint.x - halfSize;
      const worldZ = highestPoint.y - halfSize;
      const worldY = highestPoint.height;
      
      // Create flag pole
      const pole = new THREE.Mesh(flagPoleGeometry, poleMaterial);
      if (pole.position) {
        pole.position.set(worldX, worldY + 5, worldZ); // half height of pole up
      }
      
      // Create flag
      const flag = new THREE.Mesh(flagGeometry, regionalFlagMaterial);
      if (flag.position) {
        flag.position.set(worldX + 2, worldY + 8, worldZ); // at top of pole, offset to the right
      }
      
      // Add to group
      if (this.flagsGroup) {
        this.flagsGroup.add(pole);
        this.flagsGroup.add(flag);
      }
      
      // Create label for regional highest point
      const div = document.createElement('div');
      div.className = 'flag-label';
      div.textContent = `${highestPoint.height.toFixed(0)}`; // Just the height number
      div.style.color = 'white';
      div.style.backgroundColor = 'rgba(0,100,255,0.6)';
      div.style.padding = '1px 3px';
      div.style.borderRadius = '2px';
      div.style.fontSize = '8px';
      
      const label = new CSS2DObject(div);
      if (label.position) {
        label.position.set(worldX, worldY + 11, worldZ); // Above the flag
      }
      
      if (this.flagsGroup) {
        this.flagsGroup.add(label);
      }
    });
    
    // Add the regional flags group to the scene
    if (this.flagsGroup) {
      this.scene.add(this.flagsGroup);
    }
    
    // Draw world highest point flag if provided
    if (worldHighestSampledPoint) {
      // Convert to world coordinates
      const worldX = worldHighestSampledPoint.x - halfSize;
      const worldZ = worldHighestSampledPoint.y - halfSize;
      const worldY = worldHighestSampledPoint.height;
      
      // Create the flag group
      const worldFlagGroup = new THREE.Group();
      
      // Create flag pole (taller)
      const pole = new THREE.Mesh(flagPoleGeometry, poleMaterial);
      if (pole.position) {
        pole.position.set(worldX, worldY + 5, worldZ);
      }
      if (pole.scale) {
        pole.scale.setY(1.5); // Make pole taller
      }
      
      // Create flag (larger)
      const flag = new THREE.Mesh(flagGeometry, worldFlagMaterial);
      if (flag.position) {
        flag.position.set(worldX + 2, worldY + 12, worldZ);
      }
      if (flag.scale) {
        flag.scale.set(1.5, 1.5, 1); // Make flag larger
      }
      
      // Add to group
      worldFlagGroup.add(pole);
      worldFlagGroup.add(flag);
      
      // Create label for world highest point
      const div = document.createElement('div');
      div.className = 'world-flag-label';
      div.textContent = `${worldHighestSampledPoint.height.toFixed(0)}`; // Just the height number
      div.style.color = 'white';
      div.style.backgroundColor = 'rgba(255,0,0,0.6)';
      div.style.padding = '1px 3px';
      div.style.borderRadius = '2px';
      div.style.fontSize = '9px';
      div.style.fontWeight = 'normal';
      
      const label = new CSS2DObject(div);
      if (label.position) {
        label.position.set(worldX, worldY + 16, worldZ); // Above the flag
      }
      
      worldFlagGroup.add(label);
      
      // Store and add to the scene
      this.worldHighestFlag = worldFlagGroup;
      this.scene.add(worldFlagGroup);
    }
  }

  // --- Cleanup ---
 
  // Cleanup function
  public dispose(): void {
    console.log('[Visualizer] dispose called');
    console.log("Disposing Visualizer resources");
    // Stop the render loop
    this.stopRenderLoop();

    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize.bind(this));

    // Dispose THREE.js resources
    if (this.planeMesh) {
      this.scene.remove(this.planeMesh);
      if (this.planeMesh.geometry) {
        this.planeMesh.geometry.dispose();
      }
      if (this.planeMesh.material instanceof THREE.Material) {
        this.planeMesh.material.dispose();
      }
      this.planeMesh = null;
    }

    if (this.contourLines) {
      this.scene.remove(this.contourLines);
      if (this.contourLines.geometry) {
        this.contourLines.geometry.dispose();
      }
      if (this.contourLines.material instanceof THREE.Material) {
        this.contourLines.material.dispose();
      }
      this.contourLines = null;
    }
    
    // Dispose region visualization resources
    if (this.regionBoundaries) {
      this.scene.remove(this.regionBoundaries);
      if (this.regionBoundaries.geometry) {
        this.regionBoundaries.geometry.dispose();
      }
      if (this.regionBoundaries.material instanceof THREE.Material) {
        this.regionBoundaries.material.dispose();
      }
      this.regionBoundaries = null;
    }
    
    // Remove all region labels
    this.clearRegionLabels();
    
    // Dispose organism instances
    if (this.organismInstances) {
      this.scene.remove(this.organismInstances);
      if (this.organismInstances.geometry) {
        this.organismInstances.geometry.dispose();
      }
      if (this.organismInstances.material instanceof THREE.Material) {
        this.organismInstances.material.dispose();
      } else if (Array.isArray(this.organismInstances.material)) {
        this.organismInstances.material.forEach(material => {
          if (material instanceof THREE.Material) {
            material.dispose();
          }
        });
      }
      this.organismInstances = null;
    }
    
    // Dispose flags group
    if (this.flagsGroup) {
      this.scene.remove(this.flagsGroup);
      this.flagsGroup.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          } else if (Array.isArray(object.material)) {
            object.material.forEach(material => {
              if (material instanceof THREE.Material) {
                material.dispose();
              }
            });
          }
        }
      });
      this.flagsGroup = null;
    }
    
    // Dispose world highest flag
    if (this.worldHighestFlag) {
      this.scene.remove(this.worldHighestFlag);
      this.worldHighestFlag.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          } else if (Array.isArray(object.material)) {
            object.material.forEach(material => {
              if (material instanceof THREE.Material) {
                material.dispose();
              }
            });
          }
        }
      });
      this.worldHighestFlag = null;
    }

    // Dispose orbit controls
    if (this.cameraControls) {
      this.cameraControls.dispose();
    }
    
    // Remove the label renderer's DOM element
    if (this.labelRenderer && this.labelRenderer.domElement) {
      this.labelRenderer.domElement.remove();
    }
    
    // Clean up UI overlay
    if (this.uiOverlayContainer && this.uiOverlayContainer.parentNode) {
      this.uiOverlayContainer.parentNode.removeChild(this.uiOverlayContainer);
      this.uiOverlayContainer = null;
      this.roundCounterElement = null;
      this.organismCounterElement = null;
    }
    
    // Finally dispose the renderers
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    console.log("Visualizer disposed");
  }

}
