import * as THREE from 'three';
import { Obstacle } from './Obstacle';
import { River } from './River';

export class ObstacleManager {
  private obstacles: Obstacle[] = [];
  private scene: THREE.Scene;
  private river: River;
  private seed: number;

  // Shared material
  private static rockMaterial: THREE.MeshStandardMaterial | null = null;

  constructor(scene: THREE.Scene, river: River, seed: number = 12345) {
    this.scene = scene;
    this.river = river;
    this.seed = seed;

    // Initialize shared material
    if (!ObstacleManager.rockMaterial) {
      ObstacleManager.rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x696969,
        roughness: 0.9,
        metalness: 0.1
      });
    }

    this.spawnInitialObstacles();
  }

  private seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private spawnInitialObstacles(): void {
    const numObstacles = 15;

    for (let i = 0; i < numObstacles; i++) {
      const t = (i + 2) / (numObstacles + 3);
      const position = this.river.getPositionAt(t);

      const placement = this.seededRandom();
      let offset: number;

      if (placement < 0.33) {
        offset = -2 - this.seededRandom() * 2;
      } else if (placement < 0.66) {
        offset = 2 + this.seededRandom() * 2;
      } else {
        offset = (this.seededRandom() - 0.5) * 3;
      }

      const tangent = this.river.getTangentAt(t);
      const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x);
      position.add(perpendicular.multiplyScalar(offset));
      position.y = 0.5 + this.seededRandom() * 0.3;

      const size = 0.8 + this.seededRandom() * 0.6;
      const obstacle = new Obstacle(position, size, ObstacleManager.rockMaterial!);
      this.obstacles.push(obstacle);
      this.scene.add(obstacle.getMesh());
    }
  }

  public update(_deltaTime: number): void {
    // Obstacle rotation is very subtle - skip for performance
    // Animation disabled for better performance
  }

  public checkCollisions(boatPosition: THREE.Vector3, boatRadius: number = 1.5): boolean {
    for (const obstacle of this.obstacles) {
      if (obstacle.checkCollision(boatPosition, boatRadius)) {
        return true;
      }
    }
    return false;
  }

  public dispose(): void {
    for (const obstacle of this.obstacles) {
      this.scene.remove(obstacle.getMesh());
      obstacle.dispose();
    }
    this.obstacles = [];
  }
}
