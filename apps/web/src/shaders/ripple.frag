uniform vec3 uColor;
uniform float uProgress;

varying vec2 vUv;

void main() {
  float dist = length(vUv - 0.5) * 2.0;

  // Expanding ring
  float ring = abs(dist - uProgress);
  float ringAlpha = smoothstep(0.1, 0.0, ring);

  // Fade out as the ring expands
  float fade = 1.0 - uProgress;

  float alpha = ringAlpha * fade;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(uColor, alpha);
}
