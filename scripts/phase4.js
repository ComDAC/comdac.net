import * as site from "./site.js";
import * as stats from "./stats.js";
import * as THREE from "three";
import { GLTFLoader } from "GTFLoader";
import { TrackballControls } from './TrackballControls.js';



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
  constructor (texture, emit_every, particle_life) {
    this.texture = texture;
    this.emit_every = emit_every;
    this.particle_life = particle_life;
    this.last_emission = 0;
 
    this.geometry = new THREE.BufferGeometry();
    this.particles = [];
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        diffuseTexture: { value: texture },
        pointMultiplier: { value: window.innerHeight / window.innerWidth }
      },
      vertexShader,
      fragmentShader,
      blending: THREE.NormalBlending,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
    });
 
    this.mesh = new THREE.Points(this.geometry, this.material);
    this.clock = new THREE.Clock();
  }
 
  setPosition(position) {
    this.mesh.position.x = position.x;
    this.mesh.position.y = position.y;
    this.mesh.position.z = position.z;
  }
 
  getMesh() {
    return this.mesh;
  }
 
  updateAspect() {
    this.material.uniforms.pointMultiplier.value = window.innerHeight / window.innerWidth;
  }
 
  spawn() {
    this.particles.push({
      position: [0, 0, 0],
      scale: 1,
      alpha: 1,
      spawnTime: this.clock.elapsedTime,
    });
 
    this.last_emission = this.clock.elapsedTime;
  }
 
  update() {
    const elapsedTime = this.clock.getElapsedTime();
 
    this.particles = this.particles.filter((particle) => elapsedTime - particle.spawnTime < this.particle_life);
 
    if (elapsedTime - this.last_emission >= this.emit_every) {
      this.spawn();
    }
 
    this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.particles.map((particle) => particle.position).flat(), 3));
    this.geometry.setAttribute("scale", new THREE.Float32BufferAttribute(this.particles.map((particle) => particle.scale).flat(), 1));
    this.geometry.setAttribute("alpha", new THREE.Float32BufferAttribute(this.particles.map((particle) => particle.alpha).flat(), 1));
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.scale.needsUpdate = true;
  }
}

class ExpelParticleSystem extends ParticleSystem {
    spawn() {
      super.spawn();
      //this.particles[this.particles.length - 1].dartX = Math.random() * 0.005 * (Math.random() > 0.5 ? 1 : -1 );
      //this.particles[this.particles.length - 1].dartZ = Math.random() * 0.005 * (Math.random() > 0.5 ? 1 : -1 );
    }
   
    update() {
      const elapsedTime = this.clock.getElapsedTime();

      for (let i = 0; i < this.particles.length; i++) {
        this.particles[i].position[1] += 0.1;
        this.particles[i].alpha = 1 - Math.max((elapsedTime - this.particles[i].spawnTime) / this.particle_life, 0);
      }
   
      super.update();
    }
}

class page {
    stats;

    camera;
    scene;
    renderer;
    controls;

    lastFrameTime = 0;

    awing;
    awingpivot;
    awingobj;
    awingEnginePosCords = [-4.7, 2.5, 0, -4.7,-2.5, 0];
    awingEnginePos = [2];

    light;

    pointLights = [2];

    particleSpinner;

    loader;

    particleTest;
    particleTest2;

    init() {
        this.loader = new THREE.TextureLoader();

        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });

        this.stats = stats.init();

        let loadCounter = 0;

        loadCounter++;        
        new GLTFLoader().load("../models/awing.glb", (glb) => {
            this.awing = glb.scene;

            loadCounter--;

            if (loadCounter === 0) {
                this.loadComplete();
            }
        });
    }

    makeCube(size, col, x = 0, y = 0, z = 0) {
        const geometry = new THREE.BoxGeometry( size, size, size );
        const material = new THREE.MeshBasicMaterial( { color: col } );
        const cube = new THREE.Mesh( geometry, material );

        cube.position.set(x, y, z);

        return cube;
    }

    loadComplete() {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

        this.camera.position.z = 40;

        this.controls = new TrackballControls(this.camera, this.renderer.domElement);
        
        this.controls.rotateSpeed = 18.0;
        this.controls.zoomSpeed = 1.2;
        this.controls.panSpeed = 0.2;        
        this.controls.minDistance = 10;
        this.controls.maxDistance = 100;

        //initialize objects

        this.awingpivot = new THREE.Object3D();
        this.awingobj = new THREE.Object3D();
        for(let i = 0; i < this.awingEnginePosCords.length; i+=3) {  
            this.awingEnginePos[i] = new THREE.Vector3();
        }

        this.awingpivot.position.set(0, 0, 0);
        this.awingpivot.rotation.y = 1;
        this.scene.add(this.awingpivot);

        this.awing.rotation.x = (Math.PI / 2);
        this.awing.rotation.z = -0.04;
        this.awingobj.add(this.awing);

        for(let i = 0; i < this.awingEnginePosCords.length; i+=3) {            
            this.awingobj.add(this.makeCube(2, 0x00FF00, this.awingEnginePosCords[i],this.awingEnginePosCords[i+1],this.awingEnginePosCords[i+2]));
        }

        this.awingobj.position.x = 20;
        this.awingobj.rotation.x = -Math.PI / 2;
        this.awingobj.rotation.z = Math.PI / 2;
        this.awingobj.rotation.y = -0.4;
        
        this.awingpivot.add(this.awingobj);

        this.awingobj.matrixAutoUpdate = false;

        this.light = new THREE.PointLight(0xFFFFFF);
        this.light.position.set(0, 0, 300);

        this.scene.add(this.light);
        
        this.particleSpinner = new THREE.Object3D();

        const lights = [25, -25];

        for(let i=0; i<lights.length; i++) {
            this.pointLights[i] = new THREE.PointLight(0xFF9999);
            this.pointLights[i].position.set(lights[i], 0, 0);
            this.particleSpinner.add(this.pointLights[i]);

            this.particleSpinner.add(this.makeCube(2, 0xFF0000, lights[i], 0, 0));
        }

        this.particleSpinner.matrixAutoUpdate = false;
        
        this.scene.add(this.particleSpinner);

        //particle test.
        const particleWhite = this.loader.load("../images/particle-white.png");
        particleWhite.flipY = false;

        this.particleTest = new ExpelParticleSystem(particleWhite, 0.06, 2.7);
        this.particleTest.setPosition(new THREE.Vector3(-5,0,0));

        this.scene.add(this.particleTest.getMesh());

        
        const particleRed = this.loader.load("../images/particle-red.png");
        particleRed.flipY = false;

        this.particleTest2 = new ExpelParticleSystem(particleRed, 0.08, 2.3);
        this.particleTest2.setPosition(new THREE.Vector3(5,0,0));

        this.scene.add(this.particleTest2.getMesh());

        //initialize viewport
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this.renderer.domElement);

        this.onResize();

        requestAnimationFrame(this.animate);
    }

    render(tm) {
        const deltaTime = tm - this.lastFrameTime;
        this.lastFrameTime = tm;

        //do delta stuff here.

        this.awingpivot.rotation.y += 0.0012 * deltaTime;

        this.particleSpinner.rotation.z += 0.001 * deltaTime;
        this.particleSpinner.rotation.y += Math.sin(this.particleSpinner.rotation.z / 5) / 24;
        this.particleSpinner.rotation.x += Math.sin(this.particleSpinner.rotation.z / 10) / 22;

        this.awingobj.updateMatrix();
        this.particleSpinner.updateMatrix();

        for(let i = 0; i < this.awingEnginePosCords.length; i+=3) {            
            this.awingEnginePos[i].set(this.awingEnginePosCords[i],this.awingEnginePosCords[i+1],this.awingEnginePosCords[i+2]);

            this.awingEnginePos[i].applyMatrix4(this.awingobj.matrixWorld);

            //engine pos now has proper world position for particle system.
        }

        this.particleTest.update();
        this.particleTest2.update();

        //render final scene
        this.renderer.render(this.scene, this.camera);
    }

    //--background stuff
    onLoad = () => {
        this.init();
    }

    onResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        
        this.particleTest.updateAspect();
        this.particleTest2.updateAspect();

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.controls.handleResize();

        this.renderer.setSize(width, height);
    }

    animate = (tm) => {
        requestAnimationFrame(this.animate);

        this.controls.update();

        this.stats.begin();

        this.render(tm);

        this.stats.end();
    }
}

site.registerPage(page);
