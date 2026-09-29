import * as THREE from 'three';
import { Loop } from './Loop';
import { Input } from './Input';
import { River } from '../world/River';
import { Terrain } from '../world/Terrain';
import { CameraController } from '../rendering/CameraController';
import { Boat } from '../boat/Boat';
import { BoatController } from '../boat/BoatController';
import { HUD } from '../ui/HUD';
import { LanternManager } from '../world/LanternManager';
import { ObstacleManager } from '../world/ObstacleManager';
import { Environment } from '../world/Environment';
import { WaterEffects } from '../rendering/WaterEffects';
import { PerformanceMonitor } from './PerformanceMonitor';
import { Landscape } from '../world/Landscape';

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private loop: Loop;
  public input: Input;
  private river: River;
  private terrain: Terrain;
  private cameraController: CameraController;
  private boat: Boat;
  private boatController: BoatController;
  private hud: HUD;
  private lanternManager: LanternManager;
  private obstacleManager: ObstacleManager;
  private waterEffects: WaterEffects | null = null;
  private performanceMonitor: PerformanceMonitor;

  // Game state
  private gameState: 'playing' | 'gameOver' | 'won' = 'playing';
  private totalLanternsCollected: number = 0;
  private distanceTraveled: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = false; // Will enable selectively later
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Initialize scene with warmer, more atmospheric colors
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0xB8D4E8); // Softer, warmer sky
    this.scene.background = skyColor;
    this.scene.fog = new THREE.Fog(0xC5D9E8, 80, 300); // Longer fog distance for openness

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);

    // Initialize input
    this.input = new Input();

    // Initialize camera controller
    this.cameraController = new CameraController(this.camera);

    // Add atmospheric lighting
    const ambientLight = new THREE.AmbientLight(0xFFE9D5, 0.6); // Warm ambient
    this.scene.add(ambientLight);

    // Main sun light - warm afternoon sun
    const sunLight = new THREE.DirectionalLight(0xFFF4E6, 1.2);
    sunLight.position.set(30, 60, 40);
    this.scene.add(sunLight);

    // Fill light from opposite side for softer shadows
    const fillLight = new THREE.DirectionalLight(0xB8D4E8, 0.3);
    fillLight.position.set(-20, 40, -30);
    this.scene.add(fillLight);

    // Subtle hemisphere light for natural sky/ground interaction
    const hemiLight = new THREE.HemisphereLight(0xB8D4E8, 0x8B9D83, 0.4);
    this.scene.add(hemiLight);

    // Generate world
    this.river = new River(12345);
    const riverMesh = this.river.createRiverMesh(this.scene);

    this.terrain = new Terrain(12345);
    this.terrain.createTerrain(this.scene, this.river);

    // Add water effects
    this.waterEffects = new WaterEffects(this.scene, riverMesh);

    // Create boat
    const startPos = this.river.getPositionAt(0.05);
    const startDir = this.river.getTangentAt(0.05);
    this.boat = new Boat(this.scene, startPos, startDir);
    this.boatController = new BoatController(this.boat, this.input, this.river);

    // Create gameplay systems
    this.lanternManager = new LanternManager(this.scene, this.river, 12345);
    this.obstacleManager = new ObstacleManager(this.scene, this.river, 54321);

    // Create environment decorations
    new Environment(this.scene, this.river, 99999);

    // Create extended landscape
    new Landscape(this.scene, this.river, 88888);

    // Create HUD
    this.hud = new HUD();

    // Initialize performance monitor
    this.performanceMonitor = new PerformanceMonitor(this.renderer);

    // Initialize game loop
    this.loop = new Loop((deltaTime: number) => this.update(deltaTime));

    // Handle window resize
    window.addEventListener('resize', () => this.onResize());
  }

  private update(deltaTime: number): void {
    if (this.gameState === 'gameOver' || this.gameState === 'won') {
      // Still render but don't update game logic
      this.renderer.render(this.scene, this.camera);
      this.performanceMonitor.update();
      return;
    }

    // Handle camera mode toggle
    if (this.input.isKeyPressed('KeyC')) {
      this.cameraController.cycleMode();
    }

    // Update boat controller
    this.boatController.update(deltaTime);

    const boatPosition = this.boatController.getPosition();

    // Update lanterns and check collection
    const collected = this.lanternManager.update(deltaTime, boatPosition);
    this.totalLanternsCollected += collected;

    // Update obstacles
    this.obstacleManager.update(deltaTime);

    // Update water effects
    if (this.waterEffects) {
      this.waterEffects.update(deltaTime);
    }

    // Check collisions
    if (this.obstacleManager.checkCollisions(boatPosition, 1.5)) {
      this.handleGameOver();
      return;
    }

    // Check win condition - all lanterns collected
    if (this.totalLanternsCollected >= this.lanternManager.getTotalLanterns()) {
      this.handleGameWon();
      return;
    }

    // Check end of river reached without collecting all lanterns
    if (this.boatController.hasReachedEnd()) {
      this.handleGameOver();
      return;
    }

    // Update distance traveled (based on river progress)
    this.distanceTraveled = this.boatController.getRiverProgress() * this.river.getLength();

    // Update HUD
    this.hud.updateSpeed(this.boatController.getSpeed());
    this.updateHUDInfo();

    // Update camera
    this.cameraController.update(
      this.boatController.getPosition(),
      this.boatController.getDirection(),
      deltaTime
    );

    // Render
    this.renderer.render(this.scene, this.camera);

    // Update performance monitor
    this.performanceMonitor.update();
  }

  private updateHUDInfo(): void {
    const distance = Math.floor(this.distanceTraveled);
    const collected = this.totalLanternsCollected;
    const total = this.lanternManager.getTotalLanterns();
    this.hud.updateObjective(`Distance: ${distance}m | Lanterns: ${collected}/${total}`);
  }

  private handleGameOver(): void {
    if (this.gameState !== 'playing') return;

    this.gameState = 'gameOver';
    this.showGameOverScreen();
  }

  private handleGameWon(): void {
    if (this.gameState !== 'playing') return;

    this.gameState = 'won';
    this.showWinScreen();
  }

  private showWinScreen(): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 20, 40, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 2000;
      animation: fadeIn 0.5s ease-in;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes glow {
        0%, 100% { text-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4); }
        50% { text-shadow: 0 0 30px rgba(255, 215, 0, 1), 0 0 60px rgba(255, 215, 0, 0.6); }
      }
      .win-title {
        animation: glow 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);

    overlay.innerHTML = `
      <h1 class="win-title" style="font-size: 64px; margin-bottom: 30px; font-weight: 300; color: #FFD700;">
        🎉 Victory! 🎉
      </h1>
      <p style="font-size: 28px; margin: 10px 0; color: #FFD700;">All Lanterns Collected!</p>
      <p style="font-size: 24px; margin: 10px 0;">Distance Traveled: ${Math.floor(this.distanceTraveled)}m</p>
      <p style="font-size: 24px; margin: 10px 0;">Lanterns: ${this.totalLanternsCollected}/${this.lanternManager.getTotalLanterns()} ✨</p>
      <p style="font-size: 18px; margin: 30px 0 10px 0; opacity: 0.8;">You have reached the shrine with peace and harmony.</p>
      <button id="restartBtn" style="
        margin-top: 30px;
        padding: 15px 40px;
        font-size: 20px;
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: #333;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
      ">Start New Journey</button>
    `;

    document.body.appendChild(overlay);

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('mouseenter', () => {
        restartBtn.style.transform = 'scale(1.1)';
        restartBtn.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.6)';
      });
      restartBtn.addEventListener('mouseleave', () => {
        restartBtn.style.transform = 'scale(1)';
        restartBtn.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.4)';
      });
      restartBtn.addEventListener('click', () => {
        location.reload();
      });
    }
  }

  private showGameOverScreen(): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 2000;
    `;

    overlay.innerHTML = `
      <h1 style="font-size: 48px; margin-bottom: 20px; font-weight: 300;">Journey Complete</h1>
      <p style="font-size: 24px; margin: 10px 0;">Distance Traveled: ${Math.floor(this.distanceTraveled)}m</p>
      <p style="font-size: 24px; margin: 10px 0;">Lanterns Collected: ${this.totalLanternsCollected}/${this.lanternManager.getTotalLanterns()}</p>
      <button id="restartBtn" style="
        margin-top: 30px;
        padding: 15px 40px;
        font-size: 20px;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 2px solid white;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s;
      ">Start New Journey</button>
    `;

    document.body.appendChild(overlay);

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('mouseenter', () => {
        restartBtn.style.background = 'rgba(255, 255, 255, 0.4)';
        restartBtn.style.transform = 'scale(1.05)';
      });
      restartBtn.addEventListener('mouseleave', () => {
        restartBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        restartBtn.style.transform = 'scale(1)';
      });
      restartBtn.addEventListener('click', () => {
        location.reload();
      });
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public start(): void {
    this.loop.start();
  }

  public stop(): void {
    this.loop.stop();
  }
}
