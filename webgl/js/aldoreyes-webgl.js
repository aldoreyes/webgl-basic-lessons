function Engine(canvasId, vshader, fshader, attribs){
	this.ambientColor = [0.1, 0.1, .1, 1.0];
	this.diffuseColor = [0.1, 0.1, .1, 1.0];
	this.specularColor = [0.3, 0.3, 0.3, 1];
	this.eyePos = [0,0,-6.0,1.0];
	
	this.lightPos = new J3DIVector3(1.0, 4.0, -2.0);
	this.lightColor = [0.8, 0.8, 1, 1];
	
	this.objects = [];
	this.canvas = document.getElementById(canvasId);
	this.gl = this.createContext(this.canvas);
	if(!this.gl){
		//show error
		return;
	}
	this.program = new ProgramShader(this.gl, vshader, fshader, attribs);
	this.clearColor = [0,0,0.5,1];
	this.clearDepth = 10000;
	
	this.gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
	this.gl.clearDepth(this.clearDepth);

	this.gl.enable(this.gl.DEPTH_TEST);
	this.gl.enable(this.gl.BLEND);
	this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
	
	this.viewMatrix = new J3DIMatrix4();
	this.viewMatrix.lookat(this.eyePos[0],this.eyePos[1],this.eyePos[2],0,0,0,0,1,0);
	
	if(this.program.uniforms[Engine.EYE_POS]){
		this.gl.uniform4fv(this.program.uniforms[Engine.EYE_POS], this.eyePos);
	}
	
	if(this.program.uniforms[Engine.LIGHT_POS]){
		this.gl.uniform4f(this.program.uniforms[Engine.LIGHT_POS], this.lightPos[0], this.lightPos[1], this.lightPos[2], 1);
	}
	
	if(this.program.uniforms[Engine.UNIFORM_AMBIENT_COLOR]){
		this.gl.uniform4fv(this.program.uniforms[Engine.UNIFORM_AMBIENT_COLOR], this.ambientColor);
	}
	
	if(this.program.uniforms[Engine.UNIFORM_SPECULAR_COLOR]){
		this.gl.uniform4fv(this.program.uniforms[Engine.UNIFORM_SPECULAR_COLOR], this.specularColor);
	}
	
	if(this.program.uniforms[Engine.UNIFORM_LIGHT_COLOR]){
		this.gl.uniform4fv(this.program.uniforms[Engine.UNIFORM_LIGHT_COLOR], this.lightColor);
	}
	
}


Engine.prototype.createContext = function(canvas) {
  var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
  var context = null;
  for (var i = 0; i < names.length; ++i) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  return context;
}

Engine.prototype.resize = function(){
	if (this.canvas.clientWidth == this.canvas.width && this.canvas.clientHeight == this.canvas.height)
       return;

	this.canvas.width = this.canvas.clientWidth;
	this.canvas.height = this.canvas.clientHeight;

	this.gl.viewport(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
	
	var ratio = this.canvas.clientWidth / this.canvas.clientHeight;
	this.perspectiveMatrix = new J3DIMatrix4();
	this.perspectiveMatrix.frustum(-ratio, ratio, -1, 1, 2, 12);
	
	this.VPMatrix = new J3DIMatrix4(this.perspectiveMatrix);
	this.VPMatrix.multiply(this.viewMatrix);
	
	
	
}

Engine.prototype.setOnTick = function(callback){
	this.onTickCallback = callback;
}

Engine.prototype.start = function(){
	var that = this;
	this.f = function(){
		that.tick.apply(that);
	};
	this.tick();
	
}

Engine.prototype.tick = function(){
	if(this.onTickCallback){
		this.onTickCallback();
	}
	this.render();
	window.requestAnimFrame(this.f);
}

Engine.prototype.render = function(){
	
	this.resize();
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	
	if(this.program.uniforms[Engine.LIGHT_POS]){
		var LVMatrix = new J3DIMatrix4(this.viewMatrix);
		var LVector = new J3DIVector3(this.lightPos[0],this.lightPos[1],this.lightPos[2]);
		
		LVector.multVecMatrix(this.viewMatrix);
		
		this.gl.uniform4f(this.program.uniforms[Engine.LIGHT_POS], LVector[0], LVector[1], LVector[2], 1);
	}
	
	for(var i=0; i<this.objects.length; i++){
		this.objects[i].render(this);
	}
}

Engine.UNIFORM_MVP_MATRIX = "u_MVPMatrix";
Engine.UNIFORM_M_MATRIX = "u_MMatrix";
Engine.ATTRIBUTE_POSTION = "a_Position";
Engine.NORMAL_ATTRIBUTE = "a_Normal";
Engine.COLOR_ATTRIBUTE = "a_Color";
Engine.EYE_POS = "u_eyePos";
Engine.LIGHT_POS = "u_LightPos";
Engine.UNIFORM_AMBIENT_COLOR = "u_Ambient";
Engine.UNIFORM_DIFFUSE_COLOR = "u_Diffuse";
Engine.UNIFORM_SPECULAR_COLOR = "u_Specular";
Engine.UNIFORM_LIGHT_COLOR = "u_lightColor";

Engine.ATTRIBUTE_POSITION_SIZE = 3;

function ProgramShader(gl, vshader, fshader){
	this.vshader=this.loadShader(gl, vshader);
	this.fshader=this.loadShader(gl, fshader);
	this.program = gl.createProgram();
	
	gl.attachShader(this.program, this.vshader);
	gl.attachShader(this.program, this.fshader);

	// Link the program
	gl.linkProgram(this.program);

	//set attributes
	this.attribsLength = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
	this.attribs = {};
	for (var i = 0; i < this.attribsLength; ++i){
	    var toAdd = gl.getActiveAttrib(this.program, i);
		this.attribs[toAdd.name] = toAdd;
		gl.bindAttribLocation(this.program, i, toAdd.name);
	}
	
	//set uniforms
	this.uniformsLength = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
	this.uniforms = {};

	for (var i = 0; i < this.uniformsLength; ++i){
	    var toAdd = gl.getActiveUniform(this.program, i);
		this.uniforms[toAdd.name] = gl.getUniformLocation(this.program, toAdd.name);
	}

	// Check the link status
	var linked = gl.getProgramParameter(this.program, gl.LINK_STATUS);
	if (!linked && !gl.isContextLost()) {
	    // something went wrong with the link
	    var error = gl.getProgramInfoLog (this.program);
	    console.log("Error in program linking:"+error);
      	
		gl.deleteProgram(this.program);
	    gl.deleteProgram(this.vshader);
	    gl.deleteProgram(this.fshader);

	    return null;
	}
    gl.useProgram(this.program);
	
}

ProgramShader.prototype.loadShader = function(gl, sourceId){
	var sourceShader = document.getElementById(sourceId);
	if (sourceShader.type == "x-shader/x-vertex")
	    var shaderType = gl.VERTEX_SHADER;
	else if (sourceShader.type == "x-shader/x-fragment")
	    var shaderType = gl.FRAGMENT_SHADER;
	else
		return; //error
	// Create the shader object
	var shader = gl.createShader(shaderType);

	// Load the shader source
	gl.shaderSource(shader, sourceShader.text);

	// Compile the shader
	gl.compileShader(shader);

	// Check the compile status
	var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (!compiled && !gl.isContextLost()) {
	     // Something went wrong during compilation; get the error
	     var error = gl.getShaderInfoLog(shader);
	     console.log("*** Error compiling shader '"+sourceId+"':"+error);
	     gl.deleteShader(shader);
	     return null;
	}

	return shader;
	
};


function Mesh(){
	this.mMatrix = new J3DIMatrix4();
	this.mMatrix.makeIdentity();
}

Mesh.prototype.setVertices = function(gl, verts){
	this.vertices = gl.createBuffer();
	
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

Mesh.prototype.setNormals = function(gl, norms){
	this.normals = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.normals);
    gl.bufferData(gl.ARRAY_BUFFER, norms, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

Mesh.prototype.setTexCoords = function(gl, texCoords){
	this.textureCoords = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoords);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

Mesh.prototype.setIndices = function(gl, inds){
	this.length = inds.length;
	this.indices = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, inds, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

Mesh.prototype.render = function(engine){
	
	this.bind(engine);
	engine.gl.drawElements(engine.gl.TRIANGLES, this.length, engine.gl.UNSIGNED_BYTE, 0);
	this.unbind(engine);
}

Mesh.prototype.bind = function(engine){
	
	//bind attributes
	var prop;
	var ind =0;
	
	//position
	if(engine.program.attribs[Engine.ATTRIBUTE_POSTION]){
		engine.gl.enableVertexAttribArray(ind);
		engine.gl.bindBuffer(engine.gl.ARRAY_BUFFER, this.vertices);
		engine.gl.vertexAttribPointer(ind, 3, engine.gl.FLOAT, false, 0, 0);
		ind++;
	}
	
	//normal
	if(engine.program.attribs[Engine.NORMAL_ATTRIBUTE]){
		engine.gl.enableVertexAttribArray(ind);
		engine.gl.bindBuffer(engine.gl.ARRAY_BUFFER, this.normals);
		engine.gl.vertexAttribPointer(ind, 3, engine.gl.FLOAT, false, 0, 0);
		ind++;
	}

	engine.gl.bindBuffer(engine.gl.ELEMENT_ARRAY_BUFFER, this.indices);
	
	//bind uniforms
	if(engine.program.uniforms[Engine.UNIFORM_MVP_MATRIX]){
		var MVPMatrix = new J3DIMatrix4(engine.VPMatrix);
		MVPMatrix.multiply(this.mMatrix);
		MVPMatrix.setUniform(engine.gl, engine.program.uniforms[Engine.UNIFORM_MVP_MATRIX], false);
	}
	
	if(engine.program.uniforms[Engine.UNIFORM_M_MATRIX]){
		this.mMatrix.setUniform(engine.gl, engine.program.uniforms[Engine.UNIFORM_M_MATRIX], false);
	}
}

Mesh.prototype.unbind = function(engine){
	var ind = 0;
	for(prop in engine.program.attribs){
		engine.gl.disableVertexAttribArray(ind);
		ind++;
	}
}

//////////////////////////////////////
/// UTILS
/////////////////////////////////////
// makeBox
//
// Create a box with vertices, normals and texCoords. Create VBOs for each as well as the index array.
// Return an object with the following properties:
//
//  normalObject        WebGLBuffer object for normals
//  texCoordObject      WebGLBuffer object for texCoords
//  vertexObject        WebGLBuffer object for vertices
//  indexObject         WebGLBuffer object for indices
//  numIndices          The number of indices in the indexObject
//
function makeBox(gl)
{
    // vertex coords array
    var vertices = new Float32Array(
        [  1, 1, 1,  -1, 1, 1,  -1,-1, 1,   1,-1, 1,    // v0-v1-v2-v3 front
           1, 1, 1,   1,-1, 1,   1,-1,-1,   1, 1,-1,    // v0-v3-v4-v5 right
           1, 1, 1,   1, 1,-1,  -1, 1,-1,  -1, 1, 1,    // v0-v5-v6-v1 top
          -1, 1, 1,  -1, 1,-1,  -1,-1,-1,  -1,-1, 1,    // v1-v6-v7-v2 left
          -1,-1,-1,   1,-1,-1,   1,-1, 1,  -1,-1, 1,    // v7-v4-v3-v2 bottom
           1,-1,-1,  -1,-1,-1,  -1, 1,-1,   1, 1,-1 ]   // v4-v7-v6-v5 back
    );

    // normal array
    var normals = new Float32Array(
        [  0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,     // v0-v1-v2-v3 front
           1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,     // v0-v3-v4-v5 right
           0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,     // v0-v5-v6-v1 top
          -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,     // v1-v6-v7-v2 left
           0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,     // v7-v4-v3-v2 bottom
           0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1 ]    // v4-v7-v6-v5 back
       );


    // texCoord array
    var texCoords = new Float32Array(
        [  1, 1,   0, 1,   0, 0,   1, 0,    // v0-v1-v2-v3 front
           0, 1,   0, 0,   1, 0,   1, 1,    // v0-v3-v4-v5 right
           1, 0,   1, 1,   0, 1,   0, 0,    // v0-v5-v6-v1 top
           1, 1,   0, 1,   0, 0,   1, 0,    // v1-v6-v7-v2 left
           0, 0,   1, 0,   1, 1,   0, 1,    // v7-v4-v3-v2 bottom
           0, 0,   1, 0,   1, 1,   0, 1 ]   // v4-v7-v6-v5 back
       );

    // index array
    var indices = new Uint8Array(
        [  0, 1, 2,   0, 2, 3,    // front
           4, 5, 6,   4, 6, 7,    // right
           8, 9,10,   8,10,11,    // top
          12,13,14,  12,14,15,    // left
          16,17,18,  16,18,19,    // bottom
          20,21,22,  20,22,23 ]   // back
      );
	var mesh = new Mesh();
	mesh.setNormals(gl, normals);
	mesh.setTexCoords(gl, texCoords);
	mesh.setVertices(gl, vertices);
	mesh.setIndices(gl, indices);
	
	return mesh;
}

/////////////////////////////////
/// COMPATIBILITY HACKS
////////////////////////////////
window.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         window.oRequestAnimationFrame ||
         window.msRequestAnimationFrame ||
         function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
           return window.setTimeout(callback, 1000/60);
         };
})();