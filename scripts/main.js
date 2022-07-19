'use strict';

(function () {
    var ctx;
    var divCanvas;

    window.onload = function () {
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
    var objs = [];

    var ar = 0;
    var vr = 0;
    var tm = new Array(16);

    var radTop = Math.PI * 2;

    var lastFrame;

    var bpe = new Array();

    var pelocation = [120, 0, 0];
    var pedirection = [0, 0.12, 0];
    var pev = new Array(3);
    var ped = new Array(3);

    function init() {
        objs.push(new object3d(createCube("#666666"), 23));

        bpe.push(new particleEngine("images/particle-red.png", Math.PI / 2, 800, 1200));
        bpe.push(new particleEngine("images/particle-red.png", Math.PI / 2, 800, 1200));
    }

    function loop(ct) {
        requestAnimationFrame(loop);

        let ms = ct - lastFrame;
        lastFrame = ct;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        stage = [];

        M4x4_rotateY(ar, M4x4_I, tm);
        M4x4_rotateX(ar * 2, tm, tm);
        objs[0].draw(stage, tm);

        ar += 0.001571 * ms;
        if (ar > radTop) ar -= radTop;

        vr += 0.0016 * ms;
        if (vr > radTop) vr -= radTop;

        M4x4_rotateZ(vr, M4x4_I, tm);

        V3_mul4x4(tm, pelocation, pev);
        V3_mul4x4(tm, pedirection, ped);
        bpe[0].render(stage, pev, ped, ms, 5);

        M4x4_rotateZ(Math.PI, tm, tm);
        V3_mul4x4(tm, pelocation, pev);
        V3_mul4x4(tm, pedirection, ped);
        bpe[1].render(stage, pev, ped, ms, 5);

        renderStage(stage, ctx);

        ctx.globalAlpha = 1;
    }
})();
