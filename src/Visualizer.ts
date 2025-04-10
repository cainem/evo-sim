import * as THREE from 'three';
import { Config } from './Config';
import { WorldMap } from './WorldMap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Visualizer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private planeMesh: THREE.Mesh | null = null;
  private contourLines: THREE.LineSegments | null = null;
  private config: Config;
  private worldMap: WorldMap | null = null;
  private canvas: HTMLCanvasElement;
  private frameId: number | null = null;
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraControls: OrbitControls;

  // Contour line properties
  private readonly contourLineLevels = 10;
  private readonly contourLineColor = new THREE.Color(0xffffff); // White
  private readonly contourOffset = 2.0; // Increased offset for better visibility

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
    // Early exit if planeMesh is not initialized
    if (!this.planeMesh) {
      console.error('Cannot update terrain: planeMesh is not initialized.');
      return;
    }

    // Assign to a constant after null check for type safety
    const mesh = this.planeMesh; 
 
    if (!this.worldMap) {
      console.warn('Cannot update terrain visualization: WorldMap not set');
      return;
    }

    // Assign to a constant after null check for type safety
    const map = this.worldMap;

    const worldSize = this.config.worldSize;
    const maxHeight = this.config.worldMaxHeight; 
    // Get the geometry and prepare colors array
    const geometry = mesh.geometry as THREE.PlaneGeometry;
    const positionAttribute = geometry.getAttribute('position');
    const colors = new Float32Array(positionAttribute.count * 3);

    // Define color gradient stops
    const colorLow = new THREE.Color(0x0000ff); // Deep Blue
    const colorMid = new THREE.Color(0x00ff00); // Green (optional intermediate)
    const colorHigh = new THREE.Color(0xff0000); // Red
        
    // Log some debug information
    console.log(`Updating terrain visualization:`);
    console.log(`- World size: ${worldSize}`);
    console.log(`- Max height: ${maxHeight}`);
    console.log(`- Vertex count: ${positionAttribute.count}`);

    // Update vertex positions and colors based on height data
    for (let i = 0; i < positionAttribute.count; i++) {
      // Get the original vertex coordinates (before rotation)
      const vertexX = positionAttribute.getX(i);
      const vertexY = positionAttribute.getY(i); // Use Plane's Y
      
      // Convert original vertex coords (-worldSize/2 to +worldSize/2) to height map indices (0 to worldSize-1)
      const mapX = Math.floor(((vertexX / worldSize) + 0.5) * worldSize);
      // Use vertexY for mapZ, accounting for rotation (Plane Y -> World -Z)
      const mapZ = Math.floor(((-vertexY / worldSize) + 0.5) * worldSize); 
      
      // Ensure coordinates are within bounds [0, worldSize - 1]
      const x = Math.max(0, Math.min(worldSize - 1, mapX));
      const z = Math.max(0, Math.min(worldSize - 1, mapZ));
      
      // Get height at this position
      const height = map.getHeight(x, z); // Reverted swap
        
      // Set vertex color based on height using the gradient
      const color = new THREE.Color();
      const heightRatio = Math.max(0, Math.min(1, height / maxHeight)); // Clamp ratio [0, 1]
      
      // Interpolate color based on height ratio
      if (heightRatio < 0.5) {
        // Blend between Low (Blue) and Mid (Green)
        color.lerpColors(colorLow, colorMid, heightRatio * 2); // Map [0, 0.5] to [0, 1] for lerp
      } else {
        // Blend between Mid (Green) and High (Red)
        color.lerpColors(colorMid, colorHigh, (heightRatio - 0.5) * 2); // Map [0.5, 1] to [0, 1] for lerp
      }
       
      // Set the color in the colors array
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      // Update vertex position: Apply height to original Z component, which becomes World Y after rotation.
      positionAttribute.setZ(i, height); 

      // Log first vertex data for debugging
      if (i === 0) {
        console.log(`Vertex 0: mapCoords=(${x},${z}), height=${height}, color=(${color.r.toFixed(2)}, ${color.g.toFixed(2)}, ${color.b.toFixed(2)})`);
      }
    }
    
    // Add/Update colors attribute AFTER the loop
    if (this.planeMesh) {
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.attributes.color.needsUpdate = true; // Ensure color updates are applied
      geometry.attributes.position.needsUpdate = true; // Ensure position updates are applied

      // Ensure vertex normals are recomputed after height modification
      geometry.computeVertexNormals();

      console.log('Terrain visualization updated');
    } else {
      console.error("Cannot update terrain attributes: planeMesh is null");
    }

    // Update contour lines based on the new heightmap
    this._updateContourLines(map, worldSize, maxHeight);
  }

  // --- Contour Line Generation ---

  private _updateContourLines(map: WorldMap, worldSize: number, maxHeight: number): void {
    // Remove existing contour lines if they exist
    if (this.contourLines) {
        this.scene.remove(this.contourLines);
        this.contourLines.geometry.dispose();
        (this.contourLines.material as THREE.Material).dispose();
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
  }

  // 6. Render Loop
  private render(): void {
    try {
      // Update camera controls first to process user input
      if (this.cameraControls) {
        this.cameraControls.update();
      }
      this.renderer.render(this.scene, this.camera);
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

  // --- Cleanup ---
 
  // Cleanup function
  public dispose(): void {
    this.stopRenderLoop();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
    
    // Dispose geometries, materials, textures etc.
    if (this.planeMesh) {
        this.scene.remove(this.planeMesh);
        this.planeMesh.geometry.dispose();
        (this.planeMesh.material as THREE.Material).dispose();
        this.planeMesh = null;
    }
    
    // Dispose contour lines if they exist
    if (this.contourLines) {
        this.scene.remove(this.contourLines);
        // No need to dispose geometry/material if shared or managed elsewhere,
        // but if specific to contours, uncomment below:
        // this.contourLines.geometry.dispose();
        // (this.contourLines.material as THREE.Material).dispose();
        this.contourLines = null;
    }
    
    console.log("Visualizer disposed");
  }

}
