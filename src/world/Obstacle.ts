import * as THREE from 'three';

export class Obstacle {
  private mesh: THREE.Mesh;
  public position: THREE.Vector3;
  public radius: number;

  constructor(position: THREE.Vector3, size: number = 1, sharedMaterial: THREE.MeshStandardMaterial) {
    this.position = position.clone();
    this.radius = size;
    this.mesh = this.createRockMesh(size, sharedMaterial);
    this.mesh.position.copy(this.position);

    // Random rotation for variety
    this.mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
  }

  private createRockMesh(size: number, material: THREE.MeshStandardMaterial): THREE.Mesh {
    // Create irregular rock shape
    const geometry = new THREE.DodecahedronGeometry(size, 0);

    // Deform vertices for more natural look
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      const scale = 0.8 + Math.random() * 0.4;
      positions.setXYZ(i, x * scale, y * scale, z * scale);
    }
    geometry.computeVertexNormals();

    return new THREE.Mesh(geometry, material);
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public checkCollision(position: THREE.Vector3, checkRadius: number = 1.5): boolean {
    const distance = this.position.distanceTo(position);
    return distance < (this.radius + checkRadius);
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    // Don't dispose material - it's shared
  }
}
