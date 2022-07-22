import * as site from "./site.js";
import * as stats from "./stats.js";
import * as THREE from "three";
import * as particles from "./dacparticles.js";
import { GLTFLoader } from "GTFLoader";
import { TrackballControls } from "TrackballControls";

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

    particleRed;
    particleWhite;

    spinnerParticle;
    engineParticle;

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

        this.awingobj.position.x = 20;
        this.awingobj.rotation.x = -Math.PI / 2;
        this.awingobj.rotation.z = Math.PI / 2;
        this.awingobj.rotation.y = -0.4;
        
        this.awingpivot.add(this.awingobj);

        this.awingobj.matrixAutoUpdate = false;

        this.light = new THREE.PointLight(0x999999);
        this.light.position.set(0, 0, 200);

        this.scene.add(this.light);
        
        this.particleSpinner = new THREE.Object3D();

        const lights = [25, -25];

        for(let i=0; i<lights.length; i++) {
            this.pointLights[i] = new THREE.PointLight(0xFF9999);
            this.pointLights[i].position.set(lights[i], 0, 0);
            this.particleSpinner.add(this.pointLights[i]);
        }

        this.particleSpinner.matrixAutoUpdate = false;
        
        this.scene.add(this.particleSpinner);

        //particle engine initialization.
        this.spinnerParticle = new particles.ExpelParticleSystem(this.particleRed, width, height, THREE.AdditiveBlending);
        this.scene.add(this.spinnerParticle.mesh);

        this.engineParticle = new particles.ExpelParticleSystem(this.particleWhite, width, height, THREE.AdditiveBlending);
        this.scene.add(this.engineParticle.mesh);

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

        this.awingpivot.rotation.y += 0.0012 * deltaTime;

        this.particleSpinner.rotation.z += 0.001 * deltaTime;
        this.particleSpinner.rotation.y += Math.sin(this.particleSpinner.rotation.z / 5) / 24;
        this.particleSpinner.rotation.x += Math.sin(this.particleSpinner.rotation.z / 10) / 22;

        this.awingobj.updateMatrix();
        this.particleSpinner.updateMatrix();

        const engineSpray = Math.PI * 0.1;

        const engineVel = new THREE.Vector3(-100,-20,-20);
        engineVel.applyMatrix4(this.awingobj.matrixWorld);
        engineVel.setLength(0.008);

        const engineEmission = Math.floor(deltaTime * 0.35);

        for(let i = 0; i < this.awingEnginePosCords.length; i+=3) {            
            this.awingEnginePos[i].set(this.awingEnginePosCords[i],this.awingEnginePosCords[i+1],this.awingEnginePosCords[i+2]);
            this.awingEnginePos[i].applyMatrix4(this.awingobj.matrixWorld);

            for(let p = 0; p < engineEmission; p++) {
              this.engineParticle.spawn(tm, engineSpray, 50, 150, this.awingEnginePos[i], engineVel, 2);
            }
        }

        this.engineParticle.update(tm, deltaTime);

        //spinner particles.
        const spinnerPos = [new THREE.Vector3(25,0,0),new THREE.Vector3(-25,0,0)];
        const spinnerVel = [new THREE.Vector3(0,-100,0),new THREE.Vector3(0,100,0)];
        const spinnerSpray = Math.PI * 0.25;
        const spinnerEmission = Math.floor(deltaTime * 1.5);

        for(let i=0; i<spinnerPos.length; i++) {
          spinnerPos[i].applyMatrix4(this.particleSpinner.matrixWorld);
          spinnerVel[i].applyMatrix4(this.particleSpinner.matrixWorld);

          spinnerVel[i].setLength(0.03);

          for(let p = 0; p < spinnerEmission; p++) {
            this.spinnerParticle.spawn(tm, spinnerSpray, 500, 1300, spinnerPos[i], spinnerVel[i], 2);
          }
        }

        this.spinnerParticle.update(tm, deltaTime);

        //render final scene
        this.renderer.render(this.scene, this.camera);
    }

    //--background stuff
    onLoad = () => {
        this.stats = stats.init();

        let loadCounter = 3;
      
        new GLTFLoader().load("../models/awing.glb", (glb) => {
            this.awing = glb.scene;

            if (--loadCounter === 0) this.init();
        });
      
        new THREE.TextureLoader().load("../images/particle-white.png", (texture) => {
            this.particleWhite = texture;

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
        this.engineParticle.updateAspect(width, height);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.controls.handleResize();

        this.renderer.setSize(width, height);
    }

    loop = (tm) => {
        requestAnimationFrame(this.loop);

        this.controls.update();

        this.stats.begin();

        this.render(tm);

        this.stats.end();
    }
}

site.registerPage(page);
