# Control Fix - Steering Inversion

## Issue
**A key was turning right, D key was turning left** - opposite of expected behavior.

## Root Cause
The turn amount values were inverted in the BoatController.

## Fix Applied
```typescript
// Before (WRONG):
if (this.input.isKeyDown('KeyA')) {
  turnAmount = -1; // Was turning right
}
if (this.input.isKeyDown('KeyD')) {
  turnAmount = 1;  // Was turning left
}

// After (CORRECT):
if (this.input.isKeyDown('KeyA')) {
  turnAmount = 1;  // Turn left (positive rotation)
}
if (this.input.isKeyDown('KeyD')) {
  turnAmount = -1; // Turn right (negative rotation)
}
```

## Verification
- **A key** now correctly turns the boat **left**
- **D key** now correctly turns the boat **right**

Controls now match standard WASD expectations.

---
Fixed: 2026-09-25
