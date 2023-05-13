import * as site from "./site.js";
import * as stats from "./stats.js";
import * as THREE from "three";
import { GLTFLoader } from "GTFLoader";

class CustomSinCurve extends THREE.Curve {

	constructor( scale = 1 ) {
		super();
		this.scale = scale;
	}

	getPoint( t, optionalTarget = new THREE.Vector3() ) {
		const tx = Math.sin( t * Math.PI) * 2.5;
		const ty = Math.cos( (Math.PI / 2.2) * t );
		const tz = (t * 32) - 30;

		return optionalTarget.set( tx, ty, tz ).multiplyScalar( this.scale );
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

    galaxyTexture;

    tubeMaterial;
    tubeMesh;

    tubeMaterial2;
    tubeMesh2;

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

        const lightCols = [0xaaaaaa, 0xffaaaa, 0xaaaaff];
        //scene light
        lightCols.forEach(c => {
            const light = new THREE.PointLight(c);
    
            light.position.set(0, 0, 200);
    
            this.scene.add(light);
        });

        //TODO build tunnel here.
        this.createTunnel();

        //initialize viewport        
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this.renderer.domElement);

        this.onResize();

        this.dom.divLoadingMessage.style.display = "none";

        requestAnimationFrame(this.loop);
    }

    createTunnel() {
        const path = new CustomSinCurve( 30 );

        const geometry = new THREE.TubeGeometry( path, 170, 42, 30, false );

        this.tubeMaterial = new THREE.MeshBasicMaterial( { 
            map: this.galaxyTexture,
            side: THREE.BackSide
        });
    
        this.tubeMaterial.map.wrapS = THREE.MirroredRepeatWrapping;
        this.tubeMaterial.map.wrapT = THREE.MirroredRepeatWrapping;
        this.tubeMaterial.map.repeat.set(4, 2);

        this.tubeMesh = new THREE.Mesh( geometry, this.tubeMaterial );

        this.tubeMesh.rotation.y = 0.1;

        this.scene.add( this.tubeMesh );

        const geometry2 = new THREE.TubeGeometry( path, 170, 40, 30, false );

        this.tubeMaterial2 = new THREE.MeshBasicMaterial( { 
            map: this.galaxyTexture,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.5
        });
    
        this.tubeMaterial2.map.wrapS = THREE.MirroredRepeatWrapping;
        this.tubeMaterial2.map.wrapT = THREE.MirroredRepeatWrapping;
        this.tubeMaterial2.map.repeat.set(3, 4);

        this.tubeMesh2 = new THREE.Mesh( geometry2, this.tubeMaterial2 );

        this.tubeMesh2.rotation.y = 0.1;

        this.scene.add( this.tubeMesh2 );
    }
    

    render(tm) {
        const deltaTime = tm - this.lastFrameTime;
        this.lastFrameTime = tm;
        //do delta stuff here.

        this.tardispivot.rotation.y += 0.0018 * deltaTime;
        this.tardispivot.rotation.z = Math.sin(((tm % 4200) / 4200) * (Math.PI * 2)) * 0.4;
        
        this.tardis.rotation.y += 0.003 * deltaTime;
        this.tardis.rotation.z = Math.sin(((tm % 5000) / 5000) * (Math.PI * 2)) * 0.3;
        
        this.tubeMaterial.map.offset.x += 0.002 * deltaTime;
        this.tubeMaterial.map.offset.y += 0.0001 * deltaTime;

        this.tubeMaterial2.map.offset.x += 0.002 * deltaTime;
        this.tubeMaterial2.map.offset.y -= 0.001 * deltaTime;
        
        this.tubeMesh.rotation.z += 0.0015 * deltaTime;
        this.tubeMesh2.rotation.z += 0.0015 * deltaTime;

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

        new THREE.TextureLoader().load("../images/galaxyTexture.jpg", (texture) => {
            this.galaxyTexture = texture;

            if (--loadCounter === 0) this.init();
        });
    }

    onResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;

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
