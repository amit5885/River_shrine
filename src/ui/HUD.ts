export class HUD {
  private container: HTMLDivElement;
  private speedElement: HTMLDivElement;
  private objectiveElement: HTMLDivElement;
  private controlsElement: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: white;
      z-index: 1000;
    `;
    document.body.appendChild(this.container);

    // Objective (top-left)
    this.objectiveElement = document.createElement('div');
    this.objectiveElement.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.6);
      padding: 15px 20px;
      border-radius: 8px;
      font-size: 16px;
      backdrop-filter: blur(10px);
    `;
    this.objectiveElement.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 5px;">Objective</div>
      <div style="font-size: 14px; opacity: 0.9;">Navigate to the shrine</div>
    `;
    this.container.appendChild(this.objectiveElement);

    // Speed (bottom-right)
    this.speedElement = document.createElement('div');
    this.speedElement.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.6);
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 14px;
      backdrop-filter: blur(10px);
      min-width: 100px;
    `;
    this.container.appendChild(this.speedElement);

    // Controls (bottom-center)
    this.controlsElement = document.createElement('div');
    this.controlsElement.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.6);
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      backdrop-filter: blur(10px);
      text-align: center;
    `;
    this.controlsElement.innerHTML = `
      <div style="opacity: 0.8;">
        <span style="margin: 0 8px;">W/S: Accelerate/Brake</span>
        <span style="margin: 0 8px;">A/D: Steer</span>
        <span style="margin: 0 8px;">Space: Brake</span>
        <span style="margin: 0 8px;">C: Camera</span>
      </div>
    `;
    this.container.appendChild(this.controlsElement);
  }

  public updateSpeed(speed: number): void {
    const speedKmh = Math.abs(speed * 3.6).toFixed(1);
    this.speedElement.innerHTML = `
      <div style="opacity: 0.7; font-size: 11px; margin-bottom: 2px;">SPEED</div>
      <div style="font-size: 20px; font-weight: 600;">${speedKmh}</div>
      <div style="opacity: 0.7; font-size: 11px;">km/h</div>
    `;
  }

  public updateObjective(text: string): void {
    this.objectiveElement.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 5px;">Objective</div>
      <div style="font-size: 14px; opacity: 0.9;">${text}</div>
    `;
  }

  public hide(): void {
    this.container.style.display = 'none';
  }

  public show(): void {
    this.container.style.display = 'block';
  }
}
