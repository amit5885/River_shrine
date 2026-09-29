import * as THREE from 'three';

export enum CameraMode {
  FOLLOW = 'follow',
  HELM = 'helm',
  CINEMATIC = 'cinematic'
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private mode: CameraMode = CameraMode.FOLLOW;
  private targetPosition = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private currentPosition = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();
  private smoothing = 0.1;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.currentPosition.copy(camera.position);
  }

  public setMode(mode: CameraMode): void {
    this.mode = mode;
  }

  public getMode(): CameraMode {
    return this.mode;
  }

  public update(boatPosition: THREE.Vector3, boatDirection: THREE.Vector3, _deltaTime: number): void {
    switch (this.mode) {
      case CameraMode.FOLLOW:
        this.updateFollowCamera(boatPosition, boatDirection);
        break;
      case CameraMode.HELM:
        this.updateHelmCamera(boatPosition, boatDirection);
        break;
      case CameraMode.CINEMATIC:
        this.updateCinematicCamera(boatPosition, boatDirection);
        break;
    }

    // Smooth camera movement
    this.currentPosition.lerp(this.targetPosition, this.smoothing);
    this.currentLookAt.lerp(this.targetLookAt, this.smoothing);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  private updateFollowCamera(boatPosition: THREE.Vector3, boatDirection: THREE.Vector3): void {
    // Follow from behind and above - higher and further back for better view
    const offset = new THREE.Vector3(0, 10, -18);
    const rotatedOffset = offset.clone().applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.atan2(boatDirection.x, boatDirection.z)
    );

    this.targetPosition.copy(boatPosition).add(rotatedOffset);
    // Look ahead of the boat for better anticipation
    this.targetLookAt.copy(boatPosition).add(boatDirection.clone().multiplyScalar(15));
    this.targetLookAt.y = boatPosition.y + 2; // Look slightly above water
  }

  private updateHelmCamera(boatPosition: THREE.Vector3, boatDirection: THREE.Vector3): void {
    // Close to boat, slightly behind and at helm level
    const offset = new THREE.Vector3(0, 3.5, -6);
    const rotatedOffset = offset.clone().applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.atan2(boatDirection.x, boatDirection.z)
    );

    this.targetPosition.copy(boatPosition).add(rotatedOffset);
    this.targetLookAt.copy(boatPosition).add(boatDirection.clone().multiplyScalar(20));
    this.targetLookAt.y = boatPosition.y + 1;
  }

  private updateCinematicCamera(boatPosition: THREE.Vector3, _boatDirection: THREE.Vector3): void {
    // Wide angle from the side and above
    const time = Date.now() * 0.0001;
    const offset = new THREE.Vector3(
      Math.sin(time) * 15,
      8,
      Math.cos(time) * 15
    );

    this.targetPosition.copy(boatPosition).add(offset);
    this.targetLookAt.copy(boatPosition).add(new THREE.Vector3(0, 1, 0));
  }

  public cycleMode(): CameraMode {
    const modes = [CameraMode.FOLLOW, CameraMode.HELM, CameraMode.CINEMATIC];
    const currentIndex = modes.indexOf(this.mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.mode = modes[nextIndex];
    return this.mode;
  }
}
