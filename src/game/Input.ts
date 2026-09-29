export class Input {
  private keys: Map<string, boolean> = new Map();
  private keysPressed: Map<string, boolean> = new Map();

  constructor() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.keys.get(event.code)) {
      this.keysPressed.set(event.code, true);
    }
    this.keys.set(event.code, true);
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.set(event.code, false);
    this.keysPressed.set(event.code, false);
  }

  public isKeyDown(code: string): boolean {
    return this.keys.get(code) || false;
  }

  public isKeyPressed(code: string): boolean {
    const pressed = this.keysPressed.get(code) || false;
    if (pressed) {
      this.keysPressed.set(code, false);
    }
    return pressed;
  }

  public clear(): void {
    this.keys.clear();
    this.keysPressed.clear();
  }
}
