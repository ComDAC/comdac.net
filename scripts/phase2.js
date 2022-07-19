'use strict';

(function () {
    var ctx;
    var divCanvas;

    var stats;
    
    window.onload = function () {
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
    var poly, point, sprite, points, mul, shift, dim;

    var objs = [];

    var caxis = [1, 1, 0];

    var ar = 0;
    var ar2 = 0;
    var vr = 0;
    var tm = new Array(16);

    var radTop = Math.PI * 2;

    var lastFrame;

    var bpe = new Array();

    var awpos = [0, 0, 50];

    var bpedirection = [0, 0.3, 0];
    var bped = new Array(3);
    var pleft = [-28, 90, 0];
    var pright = [28, 90, 0];

    function init() {
        objs.push(new object3d(createAWing(), 1.5));

        bpe.push(new particleEngine("../images/particle-red.png", 0.25, 100, 200));
        bpe.push(new particleEngine("../images/particle-red.png", 0.25, 100, 200));
    }

    function loop(ct) {
        requestAnimationFrame(loop);

        let ms = ct - lastFrame;
        lastFrame = ct;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        stage = [];

        M4x4_clone(M4x4_I, tm);

        //translate ship
        M4x4_rotate(ar2, caxis, tm, tm);
        M4x4_rotateX(ar, tm, tm);
        M4x4_rotateY(ar2, tm, tm);

        V3_mul4x4(tm, bpedirection, bped);

        //translate ship pos in space
        M4x4_translate3(awpos, tm, tm);
        M4x4_rotateY(vr, tm, tm);

        //draw ship to stage
        objs[0].draw(stage, tm);

        bpe[0].render(stage, V3_mul4x4(tm, pleft), bped, ms, 5);
        bpe[1].render(stage, V3_mul4x4(tm, pright), bped, ms, 5);

        //adjust rotation amounts.
        ar += 0.001571 * ms;
        if (ar > radTop) ar -= radTop;

        ar2 += 0.0012 * ms;
        if (ar2 > radTop) ar2 -= radTop;

        vr += 0.0002 * ms;
        if (vr > radTop) vr -= radTop;

        renderStage(stage, ctx);

        ctx.globalAlpha = 1;

        stats.update();
    }    
})();
