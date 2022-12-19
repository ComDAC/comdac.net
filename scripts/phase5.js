import * as site from "./site.js";
import * as stats from "./stats.js";
import * as THREE from "three";
import { ParticleSystem } from "./dacparticles.js";
import { GLTFLoader } from "GTFLoader";

class PortalParticleSystem extends ParticleSystem {   
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
        p.alpha = (1 - Math.max(((p.deathTime - elapsedTime) / (p.life)), 0)) * 1;
      });
    
      super.update(elapsedTime);
    }
  }

class page {
    stats;

    camera;
    scene;
    renderer;

    lastFrameTime = 0;

    tardis;
    tardispivot;
    tardisobj;

    particleSpinner;

    particleRed;

    spinnerParticle;

    dom = {
        divLoadingMessage: null
    };

    init() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);

        this.camera.position.z = 40;

        //initialize objects

        this.tardispivot = new THREE.Object3D();
        this.tardisobj = new THREE.Object3D();

        this.tardispivot.position.set(0, 0, 0);
        this.tardispivot.rotation.y = 0.7;
        this.scene.add(this.tardispivot);

        this.tardis.rotation.x = (Math.PI / 2);
        this.tardisobj.add(this.tardis);

        this.tardisobj.position.x = 13;
        this.tardisobj.rotation.x = -Math.PI / 2;
        this.tardisobj.rotation.z = Math.PI / 2;
        this.tardisobj.rotation.y = -0.4;
        
        this.tardispivot.add(this.tardisobj);

        this.tardisobj.matrixAutoUpdate = false;

        //scene light
        for (let i=0; i<3; i++) {
            const light = new THREE.PointLight(0xFFFFFF);
    
            light.position.set(0, 0, 200);
    
            this.scene.add(light);
        }
        
        this.particleSpinner = new THREE.Object3D();

        //particle engine initialization.
        this.spinnerParticle = new PortalParticleSystem(this.particleRed, width, height, THREE.AdditiveBlending);
        this.scene.add(this.spinnerParticle.mesh);

        //initialize viewport        
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this.renderer.domElement);

        this.onResize();

        this.dom.divLoadingMessage.style.display = "none";

        requestAnimationFrame(this.loop);
    }

    render(tm) {
        const deltaTime = tm - this.lastFrameTime;
        this.lastFrameTime = tm;
        //do delta stuff here.

        this.tardispivot.rotation.y += 0.0018 * deltaTime;
        this.tardispivot.rotation.z = Math.sin(((tm % 4200) / 4200) * (Math.PI * 2)) * 0.4;
        
        this.tardis.rotation.y += 0.003 * deltaTime;
        this.tardis.rotation.z = Math.sin(((tm % 5000) / 5000) * (Math.PI * 2)) * 0.3;

        this.tardisobj.updateMatrix();

        //spinner particles.
        const spinnerPos = new THREE.Vector3(0,0,-200);
        const spinnerVel = new THREE.Vector3(0,0,100);
        const spinnerSpray = Math.PI * 1;
        const spinnerEmission = Math.min(Math.floor(deltaTime * 1.55), 25);

        spinnerVel.setLength(0.1);

        for(let p = 0; p < spinnerEmission; p++) {
            this.spinnerParticle.spawn(tm, spinnerSpray, 3000, 3500, spinnerPos, spinnerVel, 2);
        }

        this.spinnerParticle.update(tm, deltaTime);

        //render final scene
        this.renderer.render(this.scene, this.camera);
    }

    //--background stuff
    onLoad = () => {
        this.stats = stats.init();

        let loadCounter = 2;
      
        new GLTFLoader().load("../models/tardis.glb", (glb) => {
            this.tardis = glb.scene;

            if (--loadCounter === 0) this.init();
        });
      
        new THREE.TextureLoader().load("../images/particle-red.png", (texture) => {
            this.particleRed = texture;

            if (--loadCounter === 0) this.init();
        });
    }

    onResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.spinnerParticle.updateAspect(width, height);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    loop = (tm) => {
        requestAnimationFrame(this.loop);

        this.stats.begin();

        this.render(tm);

        this.stats.end();
    }
}

site.registerPage(page);
