import { Simulation } from './Simulation';
import { Region } from './Region';

/**
 * Runs a single round of the simulation and checks stop condition when an organism
 * enters the high-point region.
 * @param simulation The simulation instance
 * @param visualizer The visualizer instance (unused in stop logic)
 */
export function runSimulationRound(simulation: Simulation, visualizer: any): void {
  // Stop if already ended
  if ((window as any).__roundStopped) return;
  // Run a simulation round
  simulation.runRound();

  // Check simulation stop condition
  const regions = (window as any).__regions as Region[];
  const highPointRegion = (window as any).__highPointRegion as Region | null;
  if (highPointRegion) {
    const organisms = simulation.getOrganisms();
    const found = organisms.find(org =>
      highPointRegion.containsPoint(org.getPosition().x, org.getPosition().y)
    );
    if (found) {
      (window as any).__roundStopped = true;
      const round = simulation.getRoundNumber();
      const pos = found.getPosition();
      const regionIdx = regions.findIndex(r => r === highPointRegion);

      // Simple overlay showing stop info
      let overlay = document.getElementById('simEndOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'simEndOverlay';
        document.body.appendChild(overlay);
      }
      overlay.innerHTML = `<b>Simulation Ended</b><br>
        Organism at (${pos.x}, ${pos.y}) entered region #${regionIdx}<br>
        Round: ${round}`;
    }
  }
}
