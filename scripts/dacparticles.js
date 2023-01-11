import * as THREE from "three";

const vertexShader = `
  uniform float pointMultiplier;

  in int textureIndex;
  in float scale;
  in float alpha;

  flat out int vIndex;
  flat out float vAlpha;

  void main() {
    vIndex = textureIndex;
    vAlpha = alpha;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = pointMultiplier * 1500.0 * scale / gl_Position.w;
  }
`;
 
const fragmentShader = `
  flat in int vIndex;
  flat in float vAlpha;

  uniform sampler2D uTextures[1]; //texture array init

  out vec4 outColor;

  void main() {
    if (vIndex == 0) outColor = texture2D(uTextures[0], gl_PointCoord) * vec4(1.0, 1.0, 1.0, vAlpha);
    //conditions
  }
`;
 
export class ParticleSystem {
  particles = new Array();
  geometry;
  material;
  mesh;

  buildFragmentShader(textureCount) {
    let fs = fragmentShader.replace("uTextures[1]; //texture array init", "uTextures[" + textureCount + "];");
    let conditions = [];

    if (textureCount > 1) {
        for (let i = 1; i < textureCount; i++) {
            conditions.push("else if (vIndex == " + i + ") outColor = texture2D(uTextures[" + i + "], gl_PointCoord) * vec4(1.0, 1.0, 1.0, vAlpha);");
        }
    }

    return fs.replace("//conditions", conditions.join("\n"));
}

  constructor (textures, width, height, blending) {
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTextures: { value: textures },
        pointMultiplier: { value: height / width }
      },
      vertexShader: vertexShader,
      fragmentShader: this.buildFragmentShader(textures.length),
      blending: blending,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
      glslVersion: THREE.GLSL3
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
 
  spawn(x, y, z, textureIndex, scale, alpha, deathTime) {
    const particle = {
      position: [x, y, z],
      scale: scale,
      alpha: alpha,
      deathTime: deathTime,
      textureIndex: textureIndex    
    };

    this.particles.push(particle);

    return particle;
  }
 
  update(elapsedTime) { 
    this.particles = this.particles.filter((particle) => elapsedTime <= particle.deathTime);
 
    this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.particles.map((particle) => particle.position).flat(), 3));
    this.geometry.setAttribute("scale", new THREE.Float32BufferAttribute(this.particles.map((particle) => particle.scale), 1));
    this.geometry.setAttribute("alpha", new THREE.Float32BufferAttribute(this.particles.map((particle) => particle.alpha), 1));
    this.geometry.setAttribute('textureIndex', new THREE.Int32BufferAttribute(this.particles.map((particle) => particle.textureIndex), 1));
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.scale.needsUpdate = true;
  }
}