import * as THREE from 'three';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  memory: {
    geometries: number;
    textures: number;
  };
}

export class PerformanceMonitor {
  private renderer: THREE.WebGLRenderer;
  private lastTime: number = performance.now();
  private frames: number = 0;
  private fpsUpdateInterval: number = 1000; // Update every second
  private lastFpsUpdate: number = performance.now();

  public currentMetrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    programs: 0,
    memory: {
      geometries: 0,
      textures: 0
    }
  };

  private overlayElement: HTMLDivElement | null = null;
  private enabled: boolean = false;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.createOverlay();

    // Listen for F3 key to toggle
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        this.toggle();
      }
    });
  }

  private createOverlay(): void {
    this.overlayElement = document.createElement('div');
    this.overlayElement.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: rgba(0, 0, 0, 0.85);
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 4px;
      pointer-events: none;
      z-index: 10000;
      display: none;
      min-width: 200px;
    `;
    document.body.appendChild(this.overlayElement);
  }

  public toggle(): void {
    this.enabled = !this.enabled;
    if (this.overlayElement) {
      this.overlayElement.style.display = this.enabled ? 'block' : 'none';
    }
  }

  public enable(): void {
    this.enabled = true;
    if (this.overlayElement) {
      this.overlayElement.style.display = 'block';
    }
  }

  public disable(): void {
    this.enabled = false;
    if (this.overlayElement) {
      this.overlayElement.style.display = 'none';
    }
  }

  public update(): void {
    if (!this.enabled) return;

    const currentTime = performance.now();
    this.frames++;

    // Update FPS every second
    if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      const deltaTime = currentTime - this.lastFpsUpdate;
      this.currentMetrics.fps = Math.round((this.frames / deltaTime) * 1000);
      this.frames = 0;
      this.lastFpsUpdate = currentTime;
    }

    // Frame time
    const frameTime = currentTime - this.lastTime;
    this.currentMetrics.frameTime = Math.round(frameTime * 100) / 100;
    this.lastTime = currentTime;

    // Renderer info
    const info = this.renderer.info;
    this.currentMetrics.drawCalls = info.render.calls;
    this.currentMetrics.triangles = info.render.triangles;
    this.currentMetrics.geometries = info.memory.geometries;
    this.currentMetrics.textures = info.memory.textures;
    this.currentMetrics.programs = info.programs?.length || 0;

    this.updateOverlay();
  }

  private updateOverlay(): void {
    if (!this.overlayElement || !this.enabled) return;

    const m = this.currentMetrics;
    const fpsColor = m.fps >= 55 ? '#0f0' : m.fps >= 30 ? '#ff0' : '#f00';
    const frameTimeColor = m.frameTime <= 16.7 ? '#0f0' : m.frameTime <= 33 ? '#ff0' : '#f00';

    this.overlayElement.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #fff;">⚡ Performance Stats</div>
      <div style="color: ${fpsColor};">FPS: ${m.fps}</div>
      <div style="color: ${frameTimeColor};">Frame: ${m.frameTime}ms</div>
      <div style="margin-top: 8px; border-top: 1px solid #333; padding-top: 8px;"></div>
      <div>Draw calls: ${m.drawCalls}</div>
      <div>Triangles: ${m.triangles.toLocaleString()}</div>
      <div style="margin-top: 8px; border-top: 1px solid #333; padding-top: 8px;"></div>
      <div>Geometries: ${m.geometries}</div>
      <div>Textures: ${m.textures}</div>
      <div>Programs: ${m.programs}</div>
      <div style="margin-top: 8px; font-size: 10px; color: #888;">Press F3 to toggle</div>
    `;
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.currentMetrics };
  }

  public logMetrics(): void {
    console.log('=== Performance Metrics ===');
    console.log(`FPS: ${this.currentMetrics.fps}`);
    console.log(`Frame Time: ${this.currentMetrics.frameTime}ms`);
    console.log(`Draw Calls: ${this.currentMetrics.drawCalls}`);
    console.log(`Triangles: ${this.currentMetrics.triangles.toLocaleString()}`);
    console.log(`Geometries: ${this.currentMetrics.geometries}`);
    console.log(`Textures: ${this.currentMetrics.textures}`);
    console.log(`Programs: ${this.currentMetrics.programs}`);
    console.log('===========================');
  }
}
