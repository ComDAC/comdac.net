'use strict';

(function () {
    var showGreenCube = true;
    var showRedCube = true;
    var showBlueStar = true;
    var showTorus = true;
    var showTorusParticles = true;
    var showRotator = true;

    var ctx;
    var divCanvas;

    var stats;

    // statics items
    
    window.onload = function () {
        document.getElementById("cbRedCube").onchange = function () {
            showRedCube = this.checked;
        };
        document.getElementById("cbGreenCube").onchange = function () {
            showGreenCube = this.checked;
        };
        document.getElementById("cbBlueStar").onchange = function () {
            showBlueStar = this.checked;
        };
        document.getElementById("cbTorus").onchange = function () {
            showTorus = this.checked;
        };
        document.getElementById("cbTorusParticles").onchange = function () {
            showTorusParticles = this.checked;
        };
        document.getElementById("cbRotator").onchange = function () {
            showRotator = this.checked;
        };

        stats = new Stats();
        stats.domElement.style.position = "absolute";
        stats.domElement.style.top = "10px";
        stats.domElement.style.right = "10px";
        document.body.appendChild(stats.domElement);

        setTimeout(start, 256);
    }

    function resize() {
        resizeStage(divCanvas, ctx);
    }

    function start() {
        if (!!document.createElement('canvas').getContext) {
            divCanvas = document.getElementById("divCanvas");
 
            ctx = document.getElementById("cnvs").getContext("2d");

            resize();

            window.onresize = resize;

            init();

            lastFrame = +new Date;

            requestAnimationFrame(loop);
        }
    }



    //-- main rendering code -----------------------------------------------------------------------

    var stage = [];

    var objPointX = [100, 0, 0];
    var objPointY = [0, 100, 0];
    var objPointZ = [-100, 0, 0];
    var objs = [];

    var caxis = [1, 1, 0];
    var baxis = [0, 1, 1];

    var ar = 0;
    var ar2 = 0;
    var vr = 0;
    var tm = new Array(16);

    var radTop = Math.PI * 2;

    var lastFrame;

    var bpe = new Array();

    var pelocation = [160, 0, 0];
    var pedirection = [0, 0.12, 0];
    var pev = new Array(3);
    var ped = new Array(3);

    var pzero = [0, 0, 0];
    var bpedirection = [0, 0, 0.3];
    var bped = new Array(3);

    function init() {
        objs.push(new object3d(createCube("#ff0000"), 8));
        objs.push(new object3d(createCube("#00ff00"), 8));
        objs.push(new object3d(createStar("#0000ff"), 4));
        objs.push(new object3d(createTorus(30, 15, 30, 20, "#999999"), 1));
        objs.push(new object3d(createTorus(32, 3, 22, 3, "#ff0000"), 1));
        objs.push(new object3d(createTorus(32, 3, 22, 3, "#00ff00"), 1));
        objs.push(new object3d(createTorus(32, 3, 22, 3, "#0000ff"), 1));

        bpe.push(new particleEngine("../images/particle-white.png", 0.25, 2000, 3000));
        bpe.push(new particleEngine("../images/particle-white.png", 0.25, 2000, 3000));
        bpe.push(new particleEngine("../images/particle-red.png", Math.PI / 2, 800, 1200));
        bpe.push(new particleEngine("../images/particle-red.png", Math.PI / 2, 800, 1200));
    }


    function loop(ct) {
        requestAnimationFrame(loop);

        let ms = ct - lastFrame;
        lastFrame = ct;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        stage = [];

        if (showRedCube) {
            M4x4_rotateY(ar, M4x4_I, tm);
            M4x4_translate3(objPointX, tm, tm);
            M4x4_rotateX(ar * 2, tm, tm);
            objs[0].draw(stage, tm);
            objs[4].draw(stage, tm);
        }

        if (showGreenCube) {
            M4x4_rotateX(ar, M4x4_I, tm);
            M4x4_translate3(objPointY, tm, tm);
            M4x4_rotateY(ar * 3, tm, tm);
            objs[1].draw(stage, tm);
            objs[5].draw(stage, tm);
        }

        if (showBlueStar) {
            M4x4_rotate(ar, baxis, M4x4_I, tm);
            M4x4_translate3(objPointZ, tm, tm);
            M4x4_rotateX(ar * 2, tm, tm);
            objs[2].draw(stage, tm);
            objs[6].draw(stage, tm);
        }

        if (showTorus || showTorusParticles) {
            M4x4_rotate(ar2, caxis, M4x4_I, tm);
            M4x4_rotateX(ar * 2, tm, tm);
        }

        if (showTorus) {
            objs[3].draw(stage, tm);
        }

        if (showTorusParticles) {
            V3_mul4x4(tm, bpedirection, bped);
            bpe[0].render(stage, pzero, bped, ms, 5);
            V3_neg(bped, bped);
            bpe[1].render(stage, pzero, bped, ms, 5);
        } else {
            bpe[0].renderOff(stage, ms);
            bpe[1].renderOff(stage, ms);
        }

        ar += 0.001571 * ms;
        if (ar > radTop) ar -= radTop;

        ar2 += 0.0012 * ms;
        if (ar2 > radTop) ar2 -= radTop;

        if (showRotator) {
            vr += 0.0016 * ms;
            if (vr > radTop) vr -= radTop;

            M4x4_rotateZ(vr, M4x4_I, tm);

            V3_mul4x4(tm, pelocation, pev);
            V3_mul4x4(tm, pedirection, ped);
            bpe[2].render(stage, pev, ped, ms, 5);

            M4x4_rotateZ(Math.PI, tm, tm);
            V3_mul4x4(tm, pelocation, pev);
            V3_mul4x4(tm, pedirection, ped);
            bpe[3].render(stage, pev, ped, ms, 5);
        } else {
            bpe[2].renderOff(stage, ms);
            bpe[3].renderOff(stage, ms);
        }

        renderStage(stage, ctx);

        ctx.globalAlpha = 1;

        stats.update();
    }
})();
