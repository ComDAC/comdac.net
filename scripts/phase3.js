'use strict';

(function () {
    var camera, scene, renderer;
    var controls;

    var loadingCount = 0;

    var deltaTime, lastFrameTime;

    var awing, light, ambient;
    var awingpivot, awingobj, particleSpinner;
    
    var stats;

    var mpi = Math.PI;
    var msin = Math.sin;

    var currentTime;

    var engineVel;

    //render loop variables.
    var mw, psr, sp0, sp1, ep0, ep1, sv0, sv1, pl0, pl1;

    function hasWebGL() {
        try {
            return !!window.WebGLRenderingContext && !!document.createElement('canvas').getContext('experimental-webgl');
        } catch (e) {
            return false;
        }
    }

    function init() {
        var ok = false;

        if (hasWebGL()) {
            renderer = new THREE.WebGLRenderer({
                antialias: true
            });

            stats = new Stats();
            stats.domElement.style.position = "absolute";
            stats.domElement.style.top = "10px";
            stats.domElement.style.right = "10px";
            document.body.appendChild(stats.domElement);

            ok = true;
        } else {
            document.getElementById("loadingMessage").style.display = "none";

            document.getElementById("canvaserror").style.display = "block";
        }

        if (ok) {
            loading();

            var loader = new THREE.JSONLoader();

            // load a resource
            loader.load(
                // resource URL
                "/models/awing.js",
                // Function when resource is loaded
                function (geometry, materials) {
                    var material = new THREE.MultiMaterial(materials);
                    awing = new THREE.Mesh(geometry, material);

                    loaded();
                }
            );
        }
    }

    function loadComplete() {
        ep0 = new THREE.Vector3();
        ep1 = new THREE.Vector3();

        engineVel = new THREE.Vector3();

        sp0 = new THREE.Vector3();
        sp1 = new THREE.Vector3();
        sv0 = new THREE.Vector3();
        sv1 = new THREE.Vector3();
        
        awingpivot = new THREE.Object3D();
        awingobj = new THREE.Object3D();
        particleSpinner = new THREE.Object3D();

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
        camera.position.z = 3000;

        controls = new THREE.TrackballControls(camera);
        
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 1.2;
        controls.panSpeed = 0.2;
        
        controls.noZoom = false;
        controls.noPan = false;
        
        controls.staticMoving = false;
        controls.dynamicDampingFactor = 0.3;
        
        controls.minDistance = 2000;
        controls.maxDistance = 8000;
        
        controls.keys = [65, 83, 68];
        
        //init other stuff here

        awingpivot.position.set(0, 0, 0);
        awingpivot.rotation.y = 1;
        scene.add(awingpivot);

        awing.scale.set(2.0, 2.0, 2.0);
        awing.rotation.x = (mpi / 2);
        awing.rotation.z = -0.04;
        awingobj.add(awing);

        awingobj.position.x = 700;
        awingobj.rotation.x = -mpi / 2;
        awingobj.rotation.z = mpi / 2;
        awingobj.rotation.y = -0.4;
        awingpivot.add(awingobj);

        light = new THREE.PointLight(0xFFFFFF);
        light.position.set(0, 0, 4000);
        scene.add(light);

        scene.add(particleSpinner);

        pl0 = new THREE.PointLight(0xFF9999);
        pl1 = new THREE.PointLight(0xFF9999);

        pl0.position.set(1200, 0, 0);
        pl1.position.set(-1200, 0, 0);

        particleSpinner.add(pl0);
        particleSpinner.add(pl1);

        particleSpinner.matrixAutoUpdate = false;
        pl0.matrixAutoUpdate = false;
        pl1.matrixAutoUpdate = false;
        awingobj.matrixAutoUpdate = false;

        renderer.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(renderer.domElement);

        window.onresize = resize;
        resize();

        document.getElementById("loadingMessage").style.display = "none";

        lastFrameTime = Date.now();

        //render base variables
        psr = particleSpinner.rotation;
        
        requestAnimationFrame(animate);
    }

    function render() {
        currentTime = Date.now();
        deltaTime = currentTime - lastFrameTime;
        lastFrameTime = currentTime;
        
        //process all objects in the scene.
        awingpivot.rotation.y += 0.0012 * deltaTime;

        psr.z += 0.001 * deltaTime;
        psr.y += msin(psr.z / 5) / 24;
        psr.x += msin(psr.z / 10) / 22;

        //setup particle engines

        ep0.set(-230, 133, 0);
        ep1.set(-230, -133, 0);
        engineVel.set(100, 0, 0);

        awingobj.updateMatrix();

        mw = awingobj.matrixWorld;
        ep0.applyMatrix4(mw);
        ep1.applyMatrix4(mw);
        engineVel.applyMatrix4(mw);

        engineVel.setLength(0.4);

        sp0.set(0, 0, 0);
        sp1.set(0, 0, 0);
        sv0.set(0, -80, 0);
        sv1.set(0, 80, 0);

        pl0.updateMatrix();
        pl1.updateMatrix();

        sp0.applyMatrix4(pl0.matrixWorld);
        sp1.applyMatrix4(pl1.matrixWorld);

        particleSpinner.updateMatrix();

        mw = particleSpinner.matrixWorld;
        sv0.applyMatrix4(mw);
        sv1.applyMatrix4(mw);

        sv0.setLength(0.4);
        sv1.setLength(0.4);

        renderer.render(scene, camera);
    }

    //--background stuff
    if (!window.console) console = { log: function () { } };

    window.onload = function () {
        init();
    }

    function resize() {
        var width = window.innerWidth;
        var height = window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        controls.handleResize();

        renderer.setSize(width, height);
    }

    function loading() {
        loadingCount++;
    }

    function loaded() {
        loadingCount--;
        if (loadingCount < 1) loadComplete();
    }

    function animate() {
        requestAnimationFrame(animate);

        controls.update();

        render();

        stats.update();
    }
})();
