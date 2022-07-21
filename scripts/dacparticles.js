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
 
class ParticleSystem {
  texture;
  particles = [];
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

export class ExpelParticleSystem extends ParticleSystem {   
  spawn(elapsedTime, spray, minlife, maxlife, pos, dir, scale) {
    const life = Math.random() * (maxlife - minlife) + minlife;

    const particle = super.spawn(pos.x, pos.y, pos.z, scale, 1, elapsedTime + life);

    const euler = new THREE.Euler((Math.random() - 0.5) * spray, (Math.random() - 0.5) * spray, (Math.random() - 0.5) * spray, "XYZ");
    const tm = new THREE.Matrix4();
    tm.makeRotationFromEuler(euler);

    const vel = new THREE.Vector3().copy(dir);

    vel.applyMatrix4(tm);

    particle.life = life;
    particle.velocity = [vel.x, vel.y, vel.z];
  }

  update(elapsedTime, deltaTime) {
    this.particles.forEach((p) => {
      p.position[0] += p.velocity[0] * deltaTime;
      p.position[1] += p.velocity[1] * deltaTime;
      p.position[2] += p.velocity[2] * deltaTime;
      p.alpha = Math.max(((p.deathTime - elapsedTime) / (p.life)), 0) * 0.3;
    });
  
    super.update(elapsedTime);
  }
}