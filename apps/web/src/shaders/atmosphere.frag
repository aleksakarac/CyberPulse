uniform vec3 uColor;
uniform float uIntensity;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 viewDir = normalize(-vPosition);
  float fresnel = pow(1.0 - dot(viewDir, vNormal), 3.0);
  float alpha = fresnel * uIntensity;
  gl_FragColor = vec4(uColor, alpha);
}
