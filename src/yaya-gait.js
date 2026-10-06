// Local-space gait, independent of camera yaw. Positive forward points toward
// the nose; the renderer projects forward * sin(yaw) onto the screen.
(() => {
  const TAU = Math.PI * 2;
  const constants = Object.freeze({ stride: 1.05, clearance: .48, toeAngle: .26 });

  function foot(gait, side, speed = 1) {
    const amount = Math.max(0, Math.min(1, Number.isFinite(speed) ? speed : 0));
    const phase = ((Number.isFinite(gait) ? gait : 0) + (side < 0 ? 0 : Math.PI)) % TAU;
    const swing = Math.max(0, -Math.sin(phase));
    // Phase 0..PI is grounded: the foot goes FRONT -> BACK relative to the
    // body. Phase PI..2PI recovers BACK -> FRONT above the ground. Squaring
    // the arch gives zero vertical velocity at toe-off and touchdown.
    return {
      forward: Math.cos(phase) * constants.stride * amount,
      lift: swing * swing * constants.clearance * amount,
      // Canvas positive angles point toes downward when facing right. A
      // small down-to-up curl occurs only during recovery; stance is flat.
      // Multiply this angle by sin(yaw) alongside the forward projection.
      angle: Math.sin(2 * phase) * swing * constants.toeAngle * amount,
    };
  }

  globalThis.YayaGait = Object.freeze({ foot, constants, period: TAU });
})();
