import * as THREE from 'three';

export class Boat {
  private mesh: THREE.Group;
  public position: THREE.Vector3;
  public direction: THREE.Vector3;
  public velocity: THREE.Vector3;
  private rotation: number = 0;

  constructor(scene: THREE.Scene, startPosition: THREE.Vector3, startDirection: THREE.Vector3) {
    this.position = startPosition.clone();
    this.direction = startDirection.clone().normalize();
    this.velocity = new THREE.Vector3();

    // Create simple boat mesh
    this.mesh = this.createBoatMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);

    this.updateRotation();
  }

  private createBoatMesh(): THREE.Group {
    const group = new THREE.Group();

    // Hull - larger and more visible with red accent stripe
    const hullGeometry = new THREE.BoxGeometry(2, 0.6, 4);
    const hullMaterial = new THREE.MeshStandardMaterial({
      color: 0xD4A574, // Lighter wood color for better visibility
      roughness: 0.7,
      metalness: 0.1
    });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.position.y = 0.3;
    group.add(hull);

    // Red accent stripe for visibility
    const stripeGeometry = new THREE.BoxGeometry(2.05, 0.15, 4.05);
    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: 0xCC3333,
      roughness: 0.6
    });
    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe.position.y = 0.25;
    group.add(stripe);

    // Bow (front) - more prominent
    const bowGeometry = new THREE.ConeGeometry(1, 1.5, 4);
    const bow = new THREE.Mesh(bowGeometry, hullMaterial);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.3, 2);
    group.add(bow);

    // Bow accent
    const bowAccent = new THREE.Mesh(
      new THREE.ConeGeometry(1.05, 1.5, 4),
      stripeMaterial
    );
    bowAccent.rotation.x = Math.PI / 2;
    bowAccent.rotation.y = Math.PI / 4;
    bowAccent.position.set(0, 0.25, 2);
    group.add(bowAccent);

    // Mast - taller and darker for contrast
    const mastGeometry = new THREE.CylinderGeometry(0.12, 0.15, 3);
    const mastMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a2f1f,
      roughness: 0.9
    });
    const mast = new THREE.Mesh(mastGeometry, mastMaterial);
    mast.position.set(0, 1.8, 0);
    group.add(mast);

    // Simple sail for visual interest
    const sailGeometry = new THREE.PlaneGeometry(1.5, 2);
    const sailMaterial = new THREE.MeshStandardMaterial({
      color: 0xF5E6D3,
      roughness: 0.8,
      side: THREE.DoubleSide
    });
    const sail = new THREE.Mesh(sailGeometry, sailMaterial);
    sail.position.set(0.8, 2, 0);
    sail.rotation.y = Math.PI / 6;
    group.add(sail);

    // Raise entire boat slightly above water for better visibility
    group.position.y = 0.2;

    return group;
  }

  private updateRotation(): void {
    this.rotation = Math.atan2(this.direction.x, this.direction.z);
    this.mesh.rotation.y = this.rotation;
  }

  public update(position: THREE.Vector3, direction: THREE.Vector3, pitch: number = 0, roll: number = 0): void {
    this.position.copy(position);
    this.direction.copy(direction);

    this.mesh.position.copy(this.position);
    this.mesh.position.y += 0.2; // Keep boat raised
    this.updateRotation();

    // Apply pitch and roll for water movement
    this.mesh.rotation.x = pitch;
    this.mesh.rotation.z = roll;
  }

  public getMesh(): THREE.Group {
    return this.mesh;
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public getDirection(): THREE.Vector3 {
    return this.direction.clone();
  }
}
