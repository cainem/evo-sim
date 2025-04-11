import { Visualizer } from './Visualizer';
import { WorldMap } from './WorldMap';
import { Config } from './Config';
import { SeededRandom } from './utils/SeededRandom';
import { RegionManager } from './RegionManager';
import { Simulation } from './Simulation';

// Debug flag to enable verbose logging
const DEBUG = true;

// Get the canvas element
const canvas = document.getElementById('simulationCanvas') as HTMLCanvasElement;

if (canvas) {
    // Get config instance
    const config = Config.getInstance();
    
    // Create a seeded random number generator
    const random = new SeededRandom(config.randomSeed);
    
    // Create the world map
    const worldMap = new WorldMap(config, random);

    // Create region manager and calculate regions
    const regionManager = new RegionManager(config, worldMap);
    regionManager.calculateRegions();
    const regions = regionManager.getRegions();
    
    if (DEBUG) {
        console.log('Regions created:', regions.length);
        regions.forEach((region, index) => {
            console.log(`Region ${index}:`, region.getBounds(), region.getStatistics());
        });
    }
    
    // Create simulation with regions
    const simulation = new Simulation(config, worldMap, random, regions);
    simulation.initialize();
    
    if (DEBUG) {
        const organisms = simulation.getOrganisms();
        console.log('Organisms created:', organisms.length);
        organisms.forEach((organism, index) => {
            if (index < 5) { // Just log the first 5 to avoid console spam
                console.log(`Organism ${index}:`, organism.getPosition());
            }
        });
    }
    
    try {
        // Create the visualizer instance
        const visualizer = new Visualizer(canvas);
        
        // Set the world map to visualize
        visualizer.setWorldMap(worldMap);
        
        // Check that CSS2DRenderer is properly initialized
        if (DEBUG) {
            console.log('CSS2DRenderer initialized:', visualizer);
        }
        
        // Visualize regions, organisms and flags
        try {
            // Draw regions
            console.log('Drawing regions...');
            visualizer.drawRegions(regions);
            
            // Draw organisms
            console.log('Drawing organisms...');
            const organisms = simulation.getOrganisms();
            visualizer.drawOrganisms(organisms);
            
            // Calculate and draw highest point flags
            console.log('Calculating highest point...');
            const allRegionStats = regions.map(r => r.getStatistics());
            const worldHighestPoint = allRegionStats.reduce((highest, stat) => {
                if (stat.highestPoint && stat.highestPoint.height > highest.height) {
                    return stat.highestPoint;
                }
                return highest;
            }, { x: 0, y: 0, height: 0 });
            
            console.log('World highest point:', worldHighestPoint);
            visualizer.drawFlags(regions, worldHighestPoint);
            
            console.log('All visualization methods called successfully');
        } catch (e) {
            console.error('Error during visualization:', e);
        }
        
        // Start the render loop
        visualizer.startRenderLoop();

        // Add cleanup logic when the page unloads
        window.addEventListener('beforeunload', () => {
            visualizer.dispose(); 
        });

        console.log("Visualizer initialized with terrain, regions, organisms, and flags.");

    } catch (error) {
        console.error("Error during Visualizer initialization or setup:", error);
    }
} else {
    console.error('Canvas element #simulationCanvas not found!');
}
