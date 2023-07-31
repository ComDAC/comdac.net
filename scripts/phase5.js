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

class TimeTunnelTube {
    #xvel;
    #yvel;
    #rotvel;

    #material;
    #mesh; 

    constructor(scene, map, radius, opacity, xvel, yvel, rotvel) {
        this.#xvel = xvel;
        this.#yvel = yvel;
        this.#rotvel = rotvel;

        const path = new CustomSinCurve( 30 );

        const geometry = new THREE.TubeGeometry( path, 170, radius, 30, false );

        const materialOptions = {
            map: map,
            side: THREE.BackSide
        };

        if (opacity < 1) {
            materialOptions.transparent = true;
            materialOptions.opacity = 0.2;
            materialOptions.blending = THREE.MultiplyBlending;
        }

        this.#material = new THREE.MeshBasicMaterial(materialOptions);

        this.#mesh = new THREE.Mesh( geometry, this.#material );

        this.#mesh.rotation.y = 0.1;

        scene.add( this.#mesh );
    }

    update(deltaTime) {
        this.#material.map.offset.x += this.#xvel * deltaTime;
        this.#material.map.offset.y += this.#yvel * deltaTime;
        
        this.#mesh.rotation.z += this.#rotvel * deltaTime;
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

    tunnelTexture;
    tunnelTexture2;
    tunnelTexture3;

    tunnels = new Array();

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

        function createLight(col, intensity, x, y, z, parent) {
            const light = new THREE.PointLight(col, intensity, 0, 0.001);

            light.position.set(x, y, z);

            parent.add(light);
        }

        createLight(0xaaaaaa, 0.9, 0, 0, 200, this.scene);
        createLight(0xff9999, 1.0, -200, 0, 0, this.tardispivot);
        createLight(0x9999ff, 1.0, 120, 120, 0, this.tardispivot);

        //build tunnel here.
        this.tunnels.push(new TimeTunnelTube(this.scene, this.tunnelTexture, 42, 1, -0.0012, 0.0001, 0.0015));
        this.tunnels.push(new TimeTunnelTube(this.scene, this.tunnelTexture2, 41, 0.2, -0.0016, -0.001, 0.0015));
        this.tunnels.push(new TimeTunnelTube(this.scene, this.tunnelTexture3, 40, 0.3, -0.002, 0.0008, 0.0015));

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
        
        this.tunnels.forEach(t => t.update(deltaTime));

        //render final scene
        this.renderer.render(this.scene, this.camera);
    }

    //--background stuff
    onLoad = () => {
        this.stats = stats.init();

        let loadCounter = 4;
      
        new GLTFLoader().load("../models/tardis.glb", (glb) => {
            this.tardis = glb.scene;

            if (--loadCounter === 0) this.init();
        });

        new THREE.TextureLoader().load("../images/tunnelOutside.png", (texture) => {
            texture.wrapS = THREE.MirroredRepeatWrapping;
            texture.wrapT = THREE.MirroredRepeatWrapping;
            texture.repeat.set(4, 2);

            this.tunnelTexture = texture;

            if (--loadCounter === 0) this.init();
        });

        new THREE.TextureLoader().load("../images/tunnelInside.png", (texture) => {
            texture.wrapS = THREE.MirroredRepeatWrapping;
            texture.wrapT = THREE.MirroredRepeatWrapping;
            texture.repeat.set(3, 4);

            this.tunnelTexture2 = texture;

            if (--loadCounter === 0) this.init();
        });

        new THREE.TextureLoader().load("../images/tunnelInside.png", (texture) => {
            texture.wrapS = THREE.MirroredRepeatWrapping;
            texture.wrapT = THREE.MirroredRepeatWrapping;
            texture.repeat.set(4, 2);

            this.tunnelTexture3 = texture;

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
