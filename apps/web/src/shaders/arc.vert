attribute float arcProgress;

uniform float uDrawProgress;
uniform float uFadeProgress;

varying float vAlpha;
varying float vProgress;

void main() {
  vProgress = arcProgress;

  // Draw-in: vertex visible only when arcProgress <= uDrawProgress
  float drawMask = step(arcProgress, uDrawProgress);

  // Fade-out: alpha decreases as uFadeProgress increases
  float fade = 1.0 - uFadeProgress;

  // Glow brighter near the "head" of the arc
  float headDist = abs(arcProgress - uDrawProgress);
  float headGlow = exp(-headDist * 15.0) * 2.0;

  vAlpha = drawMask * fade * (0.6 + headGlow);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
