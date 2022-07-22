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

    tardis;
    tardispivot;
    tardisobj;

    light;

    pointLights = [2];

    particleSpinner;

    particleRed;
    particleWhite;

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

        this.controls = new TrackballControls(this.camera, this.renderer.domElement);
        
        this.controls.rotateSpeed = 18.0;
        this.controls.zoomSpeed = 1.2;
        this.controls.panSpeed = 0.2;        
        this.controls.minDistance = 10;
        this.controls.maxDistance = 100;

        //initialize objects

        this.tardispivot = new THREE.Object3D();
        this.tardisobj = new THREE.Object3D();

        this.tardispivot.position.set(0, 0, 0);
        this.tardispivot.rotation.y = 1;
        this.scene.add(this.tardispivot);

        this.tardis.rotation.x = (Math.PI / 2);
        this.tardisobj.add(this.tardis);

        this.tardisobj.position.x = 13;
        this.tardisobj.rotation.x = -Math.PI / 2;
        this.tardisobj.rotation.z = Math.PI / 2;
        this.tardisobj.rotation.y = -0.4;
        
        this.tardispivot.add(this.tardisobj);

        this.tardisobj.matrixAutoUpdate = false;

        this.light = new THREE.PointLight(0xFFFFFF);
        this.light.position.set(0, 0, 300);

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

        this.particleSpinner.rotation.z += 0.001 * deltaTime;
        this.particleSpinner.rotation.y += Math.sin(this.particleSpinner.rotation.z / 5) / 24;
        this.particleSpinner.rotation.x += Math.cos(this.particleSpinner.rotation.z / 10) / 22;

        this.tardisobj.updateMatrix();
        this.particleSpinner.updateMatrix();

        //spinner particles.
        const spinnerPos = [new THREE.Vector3(25,0,0), new THREE.Vector3(-25,0,0), new THREE.Vector3(0,25,0), new THREE.Vector3(0,-25,0)];
        const spinnerVel = [new THREE.Vector3(0,-100,0), new THREE.Vector3(0,100,0), new THREE.Vector3(0,0,-100),new THREE.Vector3(0,0,100)];
        const spinnerSpray = Math.PI * 0.25;
        const spinnerEmission = Math.floor(deltaTime * 1.5);

        for(let i = 0; i < spinnerPos.length; i++) {
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
