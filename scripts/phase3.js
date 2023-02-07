import * as site from "./site.js";
import * as stats from "./stats.js";

const vertexShaderCode = `
    attribute vec2 spritePosition; 
    uniform vec2 screenSize; 

    void main() {
        vec4 screenTransform = vec4(2.0 / screenSize.x, -2.0 / screenSize.y, -1.0, 1.0);
        gl_Position = vec4(spritePosition * screenTransform.xy + screenTransform.zw, 1.0, 1.0);
        gl_PointSize = 48.0;
    }
`;
 
const fragmentShaderCode = `
    uniform sampler2D spriteTexture;

    void main() {
        gl_FragColor = texture2D(spriteTexture, gl_PointCoord);
    }
`;

class Vector {
    constructor(x, y){
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    subtr(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    mag() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }

    mult(n) {
        return new Vector(this.x * n, this.y * n);
    }

    normal() {
        return new Vector(-this.y, this.x).unit();
    }

    unit() {
        if(this.mag() === 0){
            return new Vector(0,0);
        } else {
            const m = this.mag();
            return new Vector(this.x / m, this.y / m);
        }
    }
    
    static dot(v1, v2) {
        return (v1.x * v2.x) + (v1.y * v2.y);
    }
}

class Ball {
    constructor(x, y, radius, velX, velY, texture) {
        this.pos = new Vector(x,y);
        this.r = radius;
        this.vel = new Vector(velX, velY);
        this.t = texture;
        
        return this;
    }

    reposition(time) {
        this.pos = this.pos.add(this.vel.mult(time));
    }
}

class page {
    stats;
    gl;
    shaderProgram;
    textureFiles = ["../images/db1.png","../images/db2.png","../images/db3.png","../images/db4.png","../images/db5.png","../images/db6.png","../images/db7.png"];
    glTexture = [];
    balls = [];
    lastFrame = 0;

    dom = {
        divCanvas: null,
        cnvs: null,
        divLoadingMessage: null
    };

    createShader(gl, type, source) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

        if (success) {
          return shader;
        }
       
        console.log(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }

    createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        const success = gl.getProgramParameter(program, gl.LINK_STATUS);

        if (success) {
          return program;
        }

        console.log(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }

    isPowerOf2(value) {
        return (value & (value - 1)) === 0;
    }

    loadTexture(gl, image) {
        const texture = gl.createTexture();
    
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        if (this.isPowerOf2(image.width) && this.isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    
        return texture;
    }

    initBalls(totalBalls, buffer, minSpeed, maxSpeed) {
        for(let i = 0; i < totalBalls; i++) {
            this.balls.push(new Ball(
                (Math.random() * (this.gl.canvas.width - (buffer * 2))) + buffer,
                (Math.random() * (this.gl.canvas.height - (buffer * 2))) + buffer,
                24,
                (maxSpeed / 2) - ((Math.random() * (maxSpeed - minSpeed)) + minSpeed),                
                (maxSpeed / 2) - ((Math.random() * (maxSpeed - minSpeed)) + minSpeed),
                Math.floor((Math.random() * 6.9999))
            ));
        }

        this.balls.sort((a, b) => {
            return a.t - b.t;
        });

        for(let bi = 0; bi < this.balls.length; bi++) {
            const b = this.balls[bi];

            if (bi < this.glTexture[b.t].min) {
                this.glTexture[b.t].min = bi;
            }

            if (bi > this.glTexture[b.t].max) {
                this.glTexture[b.t].max = bi;
            }
        }
    }

    round(number, precision){
        const factor = 10 ** precision;
        return Math.round(number * factor) / factor;
    }
    
    coll_det_bb(b1, b2){
        return b1.r + b2.r >= b2.pos.subtr(b1.pos).mag();
    }
    
    pen_res_bb(b1, b2){
        const dist = b1.pos.subtr(b2.pos);
        const pen_depth = b1.r + b2.r - dist.mag();
        const pen_res = dist.unit().mult(pen_depth / 2);
        b1.pos = b1.pos.add(pen_res);
        b2.pos = b2.pos.add(pen_res.mult(-1));
    }

    coll_res_bb(b1, b2){
        //collision normal vector
        const normal = b1.pos.subtr(b2.pos).unit();
        //relative velocity vector
        const relVel = b1.vel.subtr(b2.vel);
        //separating velocity - relVel projected onto the collision normal vector
        const sepVel = Vector.dot(relVel, normal);
        //the projection value after the collision (multiplied by -1)
        const new_sepVel = -sepVel;
        //collision normal vector with the magnitude of the new_sepVel
        const sepVelVec = normal.mult(new_sepVel);
    
        //adding the separating velocity vector to the original vel. vector
        b1.vel = b1.vel.add(sepVelVec);
        //adding its opposite to the other balls original vel. vector
        b2.vel = b2.vel.add(sepVelVec.mult(-1));
    }

    processBalls(time) {
        const l = this.balls.length;

        for(let index = 0; index < l; index++) {
            const b = this.balls[index];

            b.reposition(time);   

            if (((b.pos.x < b.r) && (b.vel.x < 0)) || ((b.pos.x > (this.gl.canvas.width - b.r)) && (b.vel.x > 0))) {
                b.vel.x *= -1;
            }
    
            if (((b.pos.y < b.r) && (b.vel.y < 0)) || ((b.pos.y > (this.gl.canvas.height - b.r)) && (b.vel.y > 0))) {
                b.vel.y *= -1;
            }

            for (let i = index + 1; i < l; i++) {
                let b2 = this.balls[i];

                if(this.coll_det_bb(b, b2)){
                    this.pen_res_bb(b, b2);
                    this.coll_res_bb(b, b2);
                }
            }         
        }
    }

    updatePointsArray(gl, points, shaderProgram, attributeName) {
        const glBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, points, gl.DYNAMIC_DRAW);

        const loc = gl.getAttribLocation(shaderProgram, attributeName);

        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }

    loop = (ct) => {
        requestAnimationFrame(this.loop);

        this.stats.begin();

        const ms = ct - this.lastFrame;
        this.lastFrame = ct;
        
        this.processBalls(ms);

        const points = new Float32Array(this.balls.length * 2);

        for(let i = 0; i < this.balls.length; i++) {
            const b = this.balls[i];

            points[i * 2] = Math.round(b.pos.x);
            points[i * 2 + 1] = Math.round(b.pos.y);
        }
        
        this.updatePointsArray(this.gl, points, this.shaderProgram, "spritePosition");

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        for(const t of this.glTexture) if ((t.max >= 0) && (t.min < 999)) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, t.tex);

            this.gl.drawArrays(this.gl.POINTS, t.min, (t.max - t.min) + 1);
        }

        this.stats.end();
    } 

    initGLTextureObject() {              
        for(let i = 0; i < this.textureFiles.length; i++) {
            this.glTexture[i] = {
                tex: null,
                min: 9999,
                max: -1,
                file: this.textureFiles[bi]
            };
        }
    }

    initTextures(done) {
        let loadCounter = 0;
    
        for(const t of this.glTexture) if ((t.max >= 0) && (t.min < 999)) {
            loadCounter++;

            const img = new Image();
            img.src = t.file;

            img.onload = () => {
                t.tex = this.loadTexture(this.gl, img);

                loadCounter--;
                if (loadCounter === 0) {
                    done();
                }
            };
        }
    }

    init(done) {        
        const vertexShader = this.createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderCode);
        const fragmentShader = this.createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentShaderCode);

        this.shaderProgram = this.createProgram(this.gl, vertexShader, fragmentShader);

        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        this.gl.clearColor(0, 0, 0, 1);

        this.gl.useProgram(this.shaderProgram);

        this.gl.uniform2f(this.gl.getUniformLocation(this.shaderProgram, "screenSize"), this.gl.canvas.width, this.gl.canvas.height);

        this.gl.useProgram(this.shaderProgram);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);  
        
        this.initGLTextureObject();

        this.initBalls(Math.max(10, Math.floor(Math.min(this.gl.canvas.width, this.gl.canvas.height) / 14)), 128, 0.1, 0.9);

        this.initTextures(done);
    }
    
    //-- entry points ----------------------------

    onLoad = () => {
        this.stats = stats.init();
 
        this.gl = this.dom.cnvs.getContext("webgl");

        this.gl.canvas.width = this.dom.divCanvas.clientWidth;
        this.gl.canvas.height = this.dom.divCanvas.clientHeight;

        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        this.init(() => {
            this.dom.divLoadingMessage.style.display = "none";

            requestAnimationFrame(this.loop);
        });
    }

    onResize = () => {
        this.gl.canvas.width = this.dom.divCanvas.clientWidth;
        this.gl.canvas.height = this.dom.divCanvas.clientHeight;
        
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        this.gl.uniform2f(this.gl.getUniformLocation(this.shaderProgram, "screenSize"), this.gl.canvas.width, this.gl.canvas.height);
    }
}

site.registerPage(page);