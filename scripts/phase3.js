import * as site from "./site.js";
import * as stats from "./stats.js";

class page {
    stats;
    gl;
    shaderProgram;
    textureFiles = ["../images/db1.png","../images/db2.png","../images/db3.png","../images/db4.png","../images/db5.png","../images/db6.png","../images/db7.png"];
    glTexture = [7];
    ballMul = 20;
    balls = [];
    lastFrame = 0;

    dom = {
        divCanvas: null,
        cnvs: null,
        vertexShader: null,
        fragmentShader: null
    };

    createShader(gl, type, source) {
        let shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

        if (success) {
          return shader;
        }
       
        console.log(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }

    createProgram(gl, vertexShader, fragmentShader) {
        let program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        let success = gl.getProgramParameter(program, gl.LINK_STATUS);

        if (success) {
          return program;
        }

        console.log(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }

    isPowerOf2(value) {
        return (value & (value - 1)) == 0;
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

    initBalls() {
        const totalBalls = this.textureFiles.length * this.ballMul;

        for(let i=0; i<totalBalls; i++) {
            this.balls.push({
                x: Math.random() * this.gl.canvas.width,
                y: Math.random() * this.gl.canvas.height,
                xvel: (Math.random() - 0.5) * 0.7,
                yvel: (Math.random() - 0.5) * 0.7
            });
        }
    }

    processBalls(time) {
        this.balls.forEach(b => {
            b.x += b.xvel * time;
            b.y += b.yvel * time;
            
            if (((b.x < 0) && (b.xvel < 0)) || ((b.x > this.gl.canvas.width) && (b.xvel > 0))) {
                b.xvel *= -1;
                b.x += b.xvel * (time / 1000);
            }            
            
            if (((b.y < 0) && (b.yvel < 0)) || ((b.y > this.gl.canvas.height) && (b.yvel > 0))) {
                b.yvel *= -1;
                b.y += b.yvel * (time / 1000);
            }
        });
    }

    updatePointsArray(gl, points, shaderProgram, name) {
        const glBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, points, gl.DYNAMIC_DRAW);

        const loc = gl.getAttribLocation(shaderProgram, name);

        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }

    loop = (ct) => {
        requestAnimationFrame(this.loop);

        this.stats.begin();

        const ms = ct - this.lastFrame;
        this.lastFrame = ct;
        
        this.processBalls(ms);

        let points = new Float32Array(this.balls.length * 2);

        this.balls.forEach((b, i) => {
            points[i*2] = Math.round(b.x);
            points[i*2+1] = Math.round(b.y);
        });
        
        this.updatePointsArray(this.gl, points, this.shaderProgram, "spritePosition");

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        for (let i =0; i<this.glTexture.length; i++) {            
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.glTexture[i]);

            this.gl.drawArrays(this.gl.POINTS, i * this.ballMul, this.ballMul);
        }

        this.stats.end();
    } 

    initTextures(done) {
        var loadCounter = 0;

        this.textureFiles.forEach((tf, i) => {
            loadCounter++;

            let img = new Image();
            img.src = tf;

            img.onload = () => {
                this.glTexture[i] = this.loadTexture(this.gl, img);

                loadCounter--;
                if (loadCounter === 0) {
                    done();
                }
            };
        });
    }

    init(done) {
        let vertexShaderSource = this.dom.vertexShader.text;
        let fragmentShaderSource = this.dom.fragmentShader.text;
        
        let vertexShader = this.createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderSource);
        let fragmentShader = this.createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.shaderProgram = this.createProgram(this.gl, vertexShader, fragmentShader);

        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        this.gl.clearColor(0, 0, 0, 1);

        this.gl.useProgram(this.shaderProgram);

        this.gl.uniform2f(this.gl.getUniformLocation(this.shaderProgram, "screenSize"), this.gl.canvas.width, this.gl.canvas.height);

        this.gl.useProgram(this.shaderProgram);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);   

        this.initBalls();

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