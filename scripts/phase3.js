'use strict';

(function () {
    var camera, scene, renderer;
    var controls;

    var loadingCount = 0;

    var deltaTime, lastFrameTime;

    var awing, light, ambient;
    var awingpivot, awingobj, particleSpinner;

    var particleShader = {};
    var particleMaterial;
    var particleGeometry;
    var particlePosStart;
    var particleVelCol;
    var particleSize = 480.0;
    var particleCount = 10000;
    var particleSystem;
    var particleCursor = 0;
    var particles;

    var stats;

    var mpi = Math.PI;
    var msin = Math.sin;
    var mr = Math.random;
    var msqrt = Math.sqrt;

    var currentTime;

    var engineVel;

    //render loop variables.
    var mw, psr, sp0, sp1, ep0, ep1, sv0, sv1, pl0, pl1;

    //particle system variables;
    var pi, p, pp, av, ppv, teul, tm;

    var pointCount = 4000;
    var pointPositions;
    var pointAlphas;
    var pointGeometry;
    var pointProperties = [];
    var pointPool = [];

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
            new THREE.TextureLoader().load("../images/particle-white.png", function (texture) {
                particleShader = {
                    uniforms: {
                        texture: { type: "t", value: texture },
                        size: { type: "f", value: particleSize },
                        time: { type: "f", value: 0.0 }
                    },
                    vertexShader: document.getElementById("particleVertexShader").innerHTML,
                    fragmentShader: document.getElementById("particleFragmentShader").innerHTML,
                    blending: THREE.AdditiveBlending,
                    transparent: true,
                    depthWrite: false
                }

                loaded();
            });

            loading();
            new THREE.JSONLoader().load("../models/awing.js", function (geometry, materials) {
                var material = new THREE.MeshFaceMaterial(materials);
                awing = new THREE.Mesh(geometry, material);

                loaded();
            }, "../models/awing");
        }
    }

    function loadComplete() {
        tm = new THREE.Matrix4();

        ep0 = new THREE.Vector3();
        ep1 = new THREE.Vector3();

        engineVel = new THREE.Vector3();

        sp0 = new THREE.Vector3();
        sp1 = new THREE.Vector3();
        sv0 = new THREE.Vector3();
        sv1 = new THREE.Vector3();

        teul = new THREE.Euler(0, 0, 0, "XYZ");

        awingpivot = new THREE.Object3D();
        awingobj = new THREE.Object3D();
        particleSpinner = new THREE.Object3D();

        pointPositions = new Float32Array(pointCount * 3);
        pointAlphas = new Float32Array(pointCount);

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

        //init particle system here.
        particles = new THREE.Geometry();
        particleGeometry = new THREE.BufferGeometry();

        var particleVertices = new Float32Array(particleCount * 3); // position
        var particlePositionsStartTime = new Float32Array(particleCount * 4); // position
        var particleVelColSizeLife = new Float32Array(particleCount * 4);

        for (var i = 0; i < particleCount; i++) {
            particlePositionsStartTime[i * 4 + 0] = 100; //x
            particlePositionsStartTime[i * 4 + 1] = 0; //y
            particlePositionsStartTime[i * 4 + 2] = 0.0; //z
            particlePositionsStartTime[i * 4 + 3] = 0.0; //startTime

            particleVertices[i * 3 + 0] = 0; //x
            particleVertices[i * 3 + 1] = 0; //y
            particleVertices[i * 3 + 2] = 0.0; //z

            particleVelColSizeLife[i * 4 + 0] = decodeFloat(128, 128, 0, 0); //vel
            particleVelColSizeLife[i * 4 + 1] = decodeFloat(0, 254, 0, 254); //color
            particleVelColSizeLife[i * 4 + 2] = 1.0; //size
            particleVelColSizeLife[i * 4 + 3] = 0.0; //lifespan
        }

        particleGeometry.addAttribute('position', new THREE.BufferAttribute(particleVertices, 3));
        particleGeometry.addAttribute('particlePositionsStartTime', new THREE.BufferAttribute(particlePositionsStartTime, 4).setDynamic(true));
        particleGeometry.addAttribute('particleVelColSizeLife', new THREE.BufferAttribute(particleVelColSizeLife, 4).setDynamic(true));

        particlePosStart = particleGeometry.getAttribute('particlePositionsStartTime')
        particleVelCol = particleGeometry.getAttribute('particleVelColSizeLife');

        particleMaterial = new THREE.ShaderMaterial(particleShader);

        particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        particleSystem.sortParticles = true;
        scene.add(particleSystem);

        //init other stuff here

        for (var i = 0, i3 = 0; i < pointCount; i++, i3 += 3) {
            pointAlphas[i] = 0.3;

            pointPositions[i3 + 0] = Number.POSITIVE_INFINITY;
            pointPositions[i3 + 1] = Number.POSITIVE_INFINITY;
            pointPositions[i3 + 2] = Number.POSITIVE_INFINITY;

            pointProperties.push({ "ttl": 0, "max": 0, "vel": new THREE.Vector3(), "alive": false });

            pointPool.push(i);
        }


        pointGeometry = new THREE.BufferGeometry();

        pointGeometry.addAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
        pointGeometry.addAttribute('alpha', new THREE.BufferAttribute(pointAlphas, 1));

        var pMaterial = new THREE.ShaderMaterial(particleShader);

        particleSystem = new THREE.Points(pointGeometry, pMaterial);
        particleSystem.sortParticles = true;
        scene.add(particleSystem);

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

        //particle base variables
        //av = particleShader.attributes.alpha.value;

        requestAnimationFrame(animate);
    }

    function render() {
        currentTime = Date.now();
        deltaTime = currentTime - lastFrameTime;
        lastFrameTime = currentTime;


        pointGeometry.attributes.position.needsUpdate = true;
        pointGeometry.attributes.alpha.needsUpdate = true;

        //update all particles in the system.
        pi = pointCount;
        
        while (pi--) {
            pp = pointProperties[pi];
            if (pp.alive) {
                pp.ttl -= deltaTime;
        
                if (pp.ttl < 1) {
                    pointPositions[(pi * 3) + 0] = Number.POSITIVE_INFINITY;
                    pointPositions[(pi * 3) + 1] = Number.POSITIVE_INFINITY;
                    pointPositions[(pi * 3) + 2] = Number.POSITIVE_INFINITY;
                    pp.alive = false;
                    pointPool.push(pi);
                } else {
                    pointPositions[(pi * 3) + 0] += pp.vel.x * deltaTime;
                    pointPositions[(pi * 3) + 1] += pp.vel.y * deltaTime;
                    pointPositions[(pi * 3) + 2] += pp.vel.z * deltaTime;
                    pointAlphas[pi] = pp.ttl / pp.max * 0.3;
                }
            }
        }

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

        particleEmitter(particles, pointProperties, 0.15, 80, 120, ep0, engineVel, deltaTime, 5);
        particleEmitter(particles, pointProperties, 0.15, 80, 120, ep1, engineVel, deltaTime, 5);

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

        particleEmitter(particles, pointProperties, mpi * 1.2, 700, 1500, sp0, sv0, deltaTime, 25);
        particleEmitter(particles, pointProperties, mpi * 1.2, 700, 1500, sp1, sv1, deltaTime, 25);

        renderer.render(scene, camera);
    }

    function particleEmitter(ps, psp, spray, minlife, maxlife, pos, dir, deltaTime, n) {
        while (n--) {
            particlePosStart.array[particleCursor * 4 + 0] = pos.x;
            particlePosStart.array[particleCursor * 4 + 1] = pos.y;
            particlePosStart.array[particleCursor * 4 + 2] = pos.z;
            particlePosStart.array[particleCursor * 4 + 3] = currentTime;

            //ps.vertices[pi].copy(pos);
            pp = psp[pi];
            //ppv = pp.vel.copy(dir);
    
            teul.x = (mr() - 0.5) * spray;
            teul.y = (mr() - 0.5) * spray;
            teul.z = (mr() - 0.5) * spray;
    
            tm.makeRotationFromEuler(teul);
    
            ppv.applyMatrix4(tm);

            particleVelCol.array[particleCursor * 4 + 0] = decodeFloat(ppv.x, ppv.y, ppv.z);
            particleVelCol.
    
            av[pi] = 0.3;
            pp.max = pp.ttl = mr() * (maxlife - minlife) + minlife;
            pp.alive = true;

            particleCursor++;
        }
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

        particleShader.uniforms.size.value = particleSize * (msqrt(width * width + height * height) / 1280.0);

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

    //--helper functions
    var UINT8_VIEW = new Uint8Array(4)
    var FLOAT_VIEW = new Float32Array(UINT8_VIEW.buffer)

    function decodeFloat(x, y, z, w) {
        UINT8_VIEW[0] = Math.floor(w)
        UINT8_VIEW[1] = Math.floor(z)
        UINT8_VIEW[2] = Math.floor(y)
        UINT8_VIEW[3] = Math.floor(x)
        return FLOAT_VIEW[0]
    }
})();
