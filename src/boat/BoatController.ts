import * as THREE from 'three';
import { Boat } from './Boat';
import { Input } from '../game/Input';
import { River } from '../world/River';

export class BoatController {
  private boat: Boat;
  private input: Input;
  private river: River;

  // Physics properties
  private speed: number = 0;
  private maxSpeed: number = 15;
  private acceleration: number = 8;
  private deceleration: number = 4;
  private reverseSpeed: number = 5;
  private turnSpeed: number = 2.5;
  private drag: number = 0.95;

  // River properties
  private riverProgress: number = 0.05;
  private currentInfluence: number = 0.3;

  // Water movement
  private waterTime: number = 0;

  // Reusable objects to avoid per-frame allocation
  private readonly upAxis = new THREE.Vector3(0, 1, 0);
  private tempVector = new THREE.Vector3();
  private tempVector2 = new THREE.Vector3();

  constructor(boat: Boat, input: Input, river: River) {
    this.boat = boat;
    this.input = input;
    this.river = river;
  }

  public update(deltaTime: number): void {
    const clampedDelta = Math.min(deltaTime, 0.1);

    // Handle input
    let targetSpeed = 0;
    let turnAmount = 0;

    // Forward/backward
    if (this.input.isKeyDown('KeyW')) {
      targetSpeed = this.maxSpeed;
    } else if (this.input.isKeyDown('KeyS')) {
      targetSpeed = -this.reverseSpeed;
    }

    // Brake
    if (this.input.isKeyDown('Space')) {
      targetSpeed = 0;
      this.speed *= 0.9;
    }

    // Steering (only when moving)
    if (Math.abs(this.speed) > 0.5) {
      if (this.input.isKeyDown('KeyA')) {
        turnAmount = 1; // Turn left (positive rotation)
      }
      if (this.input.isKeyDown('KeyD')) {
        turnAmount = -1; // Turn right (negative rotation)
      }
    }

    // Apply acceleration/deceleration
    if (targetSpeed > this.speed) {
      this.speed += this.acceleration * clampedDelta;
      this.speed = Math.min(this.speed, targetSpeed);
    } else if (targetSpeed < this.speed) {
      this.speed -= this.deceleration * clampedDelta;
      this.speed = Math.max(this.speed, targetSpeed);
    } else {
      // Natural deceleration when no input
      this.speed *= this.drag;
      if (Math.abs(this.speed) < 0.01) {
        this.speed = 0;
      }
    }

    // Apply turning (reuse tempVector for direction)
    const direction = this.boat.getDirection();
    const turnAngle = turnAmount * this.turnSpeed * clampedDelta * (this.speed / this.maxSpeed);
    direction.applyAxisAngle(this.upAxis, turnAngle);
    direction.normalize();

    // Calculate new position (reuse tempVector for movement)
    this.tempVector.copy(direction).multiplyScalar(this.speed * clampedDelta);
    let newPosition = this.boat.getPosition().add(this.tempVector);

    // Apply river current (reuse tempVector2)
    const riverTangent = this.river.getTangentAt(this.riverProgress);
    this.tempVector2.copy(riverTangent).multiplyScalar(this.currentInfluence * clampedDelta);
    newPosition.add(this.tempVector2);

    // RIVER BOUNDARY CHECK - Keep boat within river
    const boatMargin = 2; // Leave 2 units from edge
    if (!this.river.isWithinRiver(newPosition, boatMargin)) {
      // Push boat back towards river center
      const closest = this.river.getClosestPointOnRiver(newPosition);
      const toCenter = closest.perpendicular.clone();

      // Determine which side we're on
      const currentPos = this.boat.getPosition();
      const offset = new THREE.Vector3().subVectors(currentPos, closest.point);
      const side = offset.dot(closest.perpendicular);

      // Push towards center
      if (side > 0) {
        newPosition.add(toCenter.multiplyScalar(-0.5));
      } else {
        newPosition.add(toCenter.multiplyScalar(0.5));
      }

      // Slow down when hitting boundary
      this.speed *= 0.7;
    }

    // Keep boat at water level
    newPosition.y = 0.5;

    // Update river progress (clamp to 0-1 to prevent going beyond river)
    this.riverProgress += (this.speed / this.river.getLength()) * clampedDelta * 0.3;
    this.riverProgress = Math.max(0, Math.min(1, this.riverProgress));

    // Calculate pitch and roll from water movement
    this.waterTime += clampedDelta;
    const pitch = Math.sin(this.waterTime * 1.5) * 0.05;
    const roll = Math.sin(this.waterTime * 2.0 + 1.0) * 0.03;

    // Update boat
    this.boat.update(newPosition, direction, pitch, roll);
  }

  public getSpeed(): number {
    return this.speed;
  }

  public getRiverProgress(): number {
    return this.riverProgress;
  }

  public getPosition(): THREE.Vector3 {
    return this.boat.getPosition();
  }

  public getDirection(): THREE.Vector3 {
    return this.boat.getDirection();
  }

  public hasReachedEnd(): boolean {
    return this.riverProgress >= 0.98; // Near the end
  }
}
