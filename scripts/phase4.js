import * as site from "./site.js";
import * as stats from "./stats.js";
import * as THREE from "three";
import { GLTFLoader } from "GTFLoader";
import { TrackballControls } from './TrackballControls.js';

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

    init() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });

        this.stats = stats.init();

        let loadCounter = 0;

        loadCounter++;        
        new GLTFLoader().load("../models/awing.glb", (glb) => {
            console.log("load");
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
