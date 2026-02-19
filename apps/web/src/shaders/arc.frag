uniform vec3 uColor;

varying float vAlpha;
varying float vProgress;

void main() {
  if (vAlpha < 0.01) discard;
  gl_FragColor = vec4(uColor * (1.0 + vAlpha * 0.5), vAlpha);
}
