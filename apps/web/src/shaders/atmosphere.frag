uniform vec3 uColor;
uniform float uIntensity;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 viewDir = normalize(-vPosition);
  float ndotv = max(dot(viewDir, vNormal), 0.0);

  // Fresnel glow — peaks at rim (ndotv → 0)
  float fresnel = pow(1.0 - ndotv, 3.0);

  // Soft edge fade — only kills the very outermost pixel edge
  float edgeFade = smoothstep(0.0, 0.05, ndotv);

  float alpha = fresnel * edgeFade * uIntensity;
  gl_FragColor = vec4(uColor, alpha);
}
