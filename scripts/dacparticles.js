import * as THREE from "three";

const vertexShader = `
  uniform float pointMultiplier;
  attribute float scale;
  attribute float alpha;

  varying float alphaToFrag;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = pointMultiplier * 1500.0 * scale / gl_Position.w;

    alphaToFrag = alpha;
  }
`;
 
const fragmentShader = `
  uniform sampler2D diffuseTexture;

  varying float alphaToFrag;

  void main() {
    gl_FragColor = texture2D(diffuseTexture, gl_PointCoord) * vec4(1.0, 1.0, 1.0, alphaToFrag);
  }
`;
 
export class ParticleSystem {
  texture;
  particles = new Array();
  geometry;
  material;
  mesh;

  constructor (texture, width, height, blending) {
    this.texture = texture;
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        diffuseTexture: { value: texture },
        pointMultiplier: { value: height / width }
      },
      vertexShader,
      fragmentShader,
      blending: blending,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
    });
 
    this.mesh = new THREE.Points(this.geometry, this.material);
  }
 
  setPosition(position) {
    this.mesh.position.x = position.x;
    this.mesh.position.y = position.y;
    this.mesh.position.z = position.z;
  }
 
  updateAspect(width, height) {
    this.material.uniforms.pointMultiplier.value = height / width;
  }
 
  spawn(x, y, z, scale, alpha, deathTime) {
    const particle = {
      position: [x, y, z],
      scale: scale,
      alpha: alpha,
      deathTime: deathTime     
    };

    this.particles.push(particle);

    return particle;
  }
 
  update(elapsedTime) { 
    this.particles = this.particles.filter((particle) => elapsedTime <= particle.deathTime);
 
    this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.particles.map((particle) => particle.position).flat(), 3));
    this.geometry.setAttribute("scale", new THREE.Float32BufferAttribute(this.particles.map((particle) => particle.scale), 1));
    this.geometry.setAttribute("alpha", new THREE.Float32BufferAttribute(this.particles.map((particle) => particle.alpha), 1));
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.scale.needsUpdate = true;
  }
}