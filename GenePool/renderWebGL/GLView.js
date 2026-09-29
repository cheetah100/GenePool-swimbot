//--------------------------------------------------------------------------
//
//    This file is part of GenePool Swimbots.
//    Copyright (c) 2021 by Jeffrey Ventrella - All Rights Reserved.
//
//    See the README file or go to swimbots.com for full license details.
//    You may use, distribute, and modify this code only under the terms
//    of the "Commons Clause" license (commonsclause.com).
//
//    This software is intended for education, game design, and research.
//
// --------------------------------------------------------------------------

"use strict";

//----------------------------------------------------------------------------------
//	GLView owns the WebGL2 canvas that sits underneath the 2D 'Canvas' element.
//
//	The 2D canvas stays on top and is still used for overlays (text, selection
//	circles, mouths, genitals, trails) and for all mouse input. Everything solid
//	(pool floor, food bits, swimbot bodies, obstacle) is drawn here.
//
//	Each frame the renderers push instances into two batches:
//		tubes      - a part body: a cubic Bezier centerline with tapering radius
//		ellipsoids - joints, end caps, food bits and far-away dots
//	and endFrame() draws each batch with one instanced draw call (plus a shadow pass).
//
//	Coordinates: x/y are pool coordinates (same as the 2D renderer) and z is
//	height toward the viewer. The view is straight down, so mouse picking and
//	the camera work exactly as they do in 2D.
//----------------------------------------------------------------------------------
function GLView()
{
	const MAX_PIXEL_RATIO	= 2;
	const DEPTH_SCALE		= 1.0 / 200.0;		// maps z (height) into clip space
	const FLOOR_Z			= -30.0;			// pool floor sits this far below the swimbots
	const SHADOW_ALPHA		= 0.28;
	const LIGHT				= normalize3( -0.35, -0.45, 0.82 );	// direction toward the light (up-left)

	const TUBE_FLOATS		= 16;	// p0.xy p1.xy | c0.xy c1.xy | r0 r1 z squash | r g b emissive
	const ELLIPSOID_FLOATS	= 12;	// center.xy axis.xy | a r z squash | r g b emissive

	let _gl				= null;
	let _glCanvas		= null;
	let _overlayCanvas	= null;
	let _ready			= false;

	let _tubes			= new InstanceBatch( TUBE_FLOATS,      4096 );
	let _ellipsoids		= new InstanceBatch( ELLIPSOID_FLOATS, 4096 );
	let _highDetail		= false;

	let _camera			= null;
	let _pool			= null;		// { bounds, margin, color, marginColor, viewScale }
	let _startTime		= performance.now();

	// GL resources (rebuilt if the context is lost and restored)
	let _bodyProgram	= null;
	let _ellipsoidProgram = null;
	let _floorProgram	= null;
	let _tubeBuffer		= null;
	let _ellipsoidBuffer = null;
	let _tubeMeshes		= null;		// { fine, coarse }
	let _ellipsoidMeshes = null;
	let _floorVao		= null;

	//-------------------------------------------------
	// one time setup: create the GL canvas under the 2D canvas
	//-------------------------------------------------
	this.initialize = function( overlayCanvas )
	{
		_overlayCanvas = overlayCanvas;

		_glCanvas = document.createElement( 'canvas' );
		_glCanvas.id = 'glCanvas';
		_glCanvas.style.position = 'absolute';
		_glCanvas.style.pointerEvents = 'none';
		_overlayCanvas.parentNode.insertBefore( _glCanvas, _overlayCanvas );

		// keep visibility in sync with the 2D canvas (the "rendering OFF" button hides it)
		new MutationObserver( syncCanvas ).observe( _overlayCanvas, { attributes: true, attributeFilter: [ 'style' ] } );

		_glCanvas.addEventListener( 'webglcontextlost', function( e ) {
			e.preventDefault();
			_ready = false;
			console.warn( "GLView: WebGL context lost" );
		});
		_glCanvas.addEventListener( 'webglcontextrestored', function() {
			console.warn( "GLView: WebGL context restored" );
			createResources();
		});

		_gl = _glCanvas.getContext( 'webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, depth: true, stencil: true } );
		if ( _gl === null )
		{
			console.error( "GLView: WebGL2 is not available in this browser - swimbots will not be drawn." );
			return;
		}

		createResources();
		syncCanvas();
	}

	//-------------------------------------------------
	// start of frame
	//-------------------------------------------------
	this.beginFrame = function( camera )
	{
		_camera = camera;
		_tubes.count = 0;
		_ellipsoids.count = 0;
		_highDetail = false;
		syncCanvas();
	}

	this.setHighDetail = function() { _highDetail = true; }

	this.setPool = function( bounds, margin, color, marginColor, viewScale )
	{
		_pool = { bounds: bounds, margin: margin, color: color, marginColor: marginColor, viewScale: viewScale };
	}

	//-------------------------------------------------------------------------
	//	Add a tube: centerline is the cubic Bezier p0, p0 + c0, p1 + c1, p1.
	//	Radius goes from r0 to r1. For a straight tube use addStraightTube.
	//-------------------------------------------------------------------------
	this.addTube = function( p0x, p0y, p1x, p1y, c0x, c0y, c1x, c1y, r0, r1, z, squash, color, emissive )
	{
		let o = _tubes.alloc();
		let d = _tubes.data;
		d[o   ] = p0x;	d[o+ 1] = p0y;	d[o+ 2] = p1x;	d[o+ 3] = p1y;
		d[o+ 4] = c0x;	d[o+ 5] = c0y;	d[o+ 6] = c1x;	d[o+ 7] = c1y;
		d[o+ 8] = r0;	d[o+ 9] = r1;	d[o+10] = z;	d[o+11] = squash;
		d[o+12] = color.red;	d[o+13] = color.green;	d[o+14] = color.blue;	d[o+15] = emissive;
	}

	this.addStraightTube = function( p0x, p0y, p1x, p1y, r0, r1, z, squash, color, emissive )
	{
		//	control points at thirds give a straight line with constant speed (non-zero tangent at the ends)
		let tx = ( p1x - p0x ) / 3.0;
		let ty = ( p1y - p0y ) / 3.0;
		this.addTube( p0x, p0y, p1x, p1y, tx, ty, -tx, -ty, r0, r1, z, squash, color, emissive );
	}

	//-------------------------------------------------------------------------
	//	Add an ellipsoid dome. 'a' is the radius along (axisX, axisY) and 'r'
	//	the radius across it; the height is r * squash.
	//-------------------------------------------------------------------------
	this.addEllipsoid = function( x, y, axisX, axisY, a, r, z, squash, color, emissive )
	{
		let o = _ellipsoids.alloc();
		let d = _ellipsoids.data;
		d[o  ] = x;		d[o+1] = y;		d[o+2] = axisX;	d[o+3] = axisY;
		d[o+4] = a;		d[o+5] = r;		d[o+6] = z;		d[o+7] = squash;
		d[o+8] = color.red;	d[o+9] = color.green;	d[o+10] = color.blue;	d[o+11] = emissive;
	}

	this.addSphere = function( x, y, r, z, squash, color, emissive )
	{
		this.addEllipsoid( x, y, 1.0, 0.0, r, r, z, squash, color, emissive );
	}

	//-------------------------------------------------
	// end of frame: draw everything
	//-------------------------------------------------
	this.endFrame = function()
	{
		if ( ! _ready || _camera === null ) return;

		let gl = _gl;
		gl.viewport( 0, 0, _glCanvas.width, _glCanvas.height );
		gl.clearColor( 0, 0, 0, 0 );
		gl.clearDepth( 1.0 );
		gl.clearStencil( 0 );
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT );

		let view = [
			_camera.getPosition().x,
			_camera.getPosition().y,
			_camera.getXDimension() * ONE_HALF,
			_camera.getYDimension() * ONE_HALF
		];

		//--------------------------------
		// floor
		//--------------------------------
		gl.disable( gl.DEPTH_TEST );
		gl.disable( gl.BLEND );
		gl.disable( gl.STENCIL_TEST );
		if ( _pool !== null ) drawFloor( view );

		//--------------------------------
		// upload instances
		//--------------------------------
		upload( _tubeBuffer, _tubes );
		upload( _ellipsoidBuffer, _ellipsoids );

		let tubeMesh      = _highDetail ? _tubeMeshes.fine      : _tubeMeshes.coarse;
		let ellipsoidMesh = _highDetail ? _ellipsoidMeshes.fine : _ellipsoidMeshes.coarse;

		//-----------------------------------------------------------------------
		// shadows: flattened onto the floor, stencil keeps overlaps from darkening twice
		//-----------------------------------------------------------------------
		gl.enable( gl.BLEND );
		gl.blendFunc( gl.ONE, gl.ONE_MINUS_SRC_ALPHA );
		gl.enable( gl.STENCIL_TEST );
		gl.stencilFunc( gl.EQUAL, 0, 0xFF );
		gl.stencilOp( gl.KEEP, gl.KEEP, gl.INCR );
		drawInstances( _bodyProgram,      tubeMesh,      _tubes.count,      view, true );
		drawInstances( _ellipsoidProgram, ellipsoidMesh, _ellipsoids.count, view, true );
		gl.disable( gl.STENCIL_TEST );
		gl.disable( gl.BLEND );

		//--------------------------------
		// solid bodies
		//--------------------------------
		gl.enable( gl.DEPTH_TEST );
		gl.depthFunc( gl.LEQUAL );
		gl.depthMask( true );
		drawInstances( _bodyProgram,      tubeMesh,      _tubes.count,      view, false );
		drawInstances( _ellipsoidProgram, ellipsoidMesh, _ellipsoids.count, view, false );

		gl.bindVertexArray( null );
	}

	//=======================================================================================
	//	internals
	//=======================================================================================

	//---------------------------------------------------------------------
	// match the 2D canvas' position, size and visibility (at device resolution)
	//---------------------------------------------------------------------
	function syncCanvas()
	{
		if ( _glCanvas === null ) return;

		let w = _overlayCanvas.width;
		let h = _overlayCanvas.height;
		let ratio = Math.min( window.devicePixelRatio || 1, MAX_PIXEL_RATIO );
		let bw = Math.max( 1, Math.round( w * ratio ) );
		let bh = Math.max( 1, Math.round( h * ratio ) );

		if ( _glCanvas.width !== bw || _glCanvas.height !== bh )
		{
			_glCanvas.width  = bw;
			_glCanvas.height = bh;
		}

		let s = _glCanvas.style;
		let left = _overlayCanvas.offsetLeft + 'px';
		let top  = _overlayCanvas.offsetTop  + 'px';
		if ( s.width  !== w + 'px' ) s.width  = w + 'px';
		if ( s.height !== h + 'px' ) s.height = h + 'px';
		if ( s.left   !== left     ) s.left   = left;
		if ( s.top    !== top      ) s.top    = top;
		if ( s.visibility !== _overlayCanvas.style.visibility ) s.visibility = _overlayCanvas.style.visibility;
	}

	//---------------------------------------------------------------------
	function createResources()
	{
		let gl = _gl;

		_bodyProgram      = createProgram( TUBE_VS,      BODY_FS  );
		_ellipsoidProgram = createProgram( ELLIPSOID_VS, BODY_FS  );
		_floorProgram     = createProgram( FLOOR_VS,     FLOOR_FS );

		_tubeBuffer      = gl.createBuffer();
		_ellipsoidBuffer = gl.createBuffer();

		_tubeMeshes = {
			fine:   createMesh( buildTubeGeometry( 12, 10 ), 2, _tubeBuffer,      TUBE_FLOATS      ),
			coarse: createMesh( buildTubeGeometry(  3,  4 ), 2, _tubeBuffer,      TUBE_FLOATS      )
		};
		_ellipsoidMeshes = {
			fine:   createMesh( buildDomeGeometry( 16, 5 ),  3, _ellipsoidBuffer, ELLIPSOID_FLOATS ),
			coarse: createMesh( buildDomeGeometry(  8, 2 ),  3, _ellipsoidBuffer, ELLIPSOID_FLOATS )
		};

		//	floor is a unit quad stretched over the pool (plus margin) in the vertex shader
		_floorVao = gl.createVertexArray();
		gl.bindVertexArray( _floorVao );
		let quad = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, quad );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ 0,0, 1,0, 0,1, 1,1 ] ), gl.STATIC_DRAW );
		gl.enableVertexAttribArray( 0 );
		gl.vertexAttribPointer( 0, 2, gl.FLOAT, false, 0, 0 );
		gl.bindVertexArray( null );

		_ready = ( _bodyProgram !== null && _ellipsoidProgram !== null && _floorProgram !== null );
	}

	//---------------------------------------------------------------------
	//	A mesh VAO: per-vertex attribute 0 from the geometry, and per-instance
	//	vec4 attributes 1..N (divisor 1) from the shared instance buffer.
	//---------------------------------------------------------------------
	function createMesh( geometry, vertexSize, instanceBuffer, instanceFloats )
	{
		let gl = _gl;
		let vao = gl.createVertexArray();
		gl.bindVertexArray( vao );

		let vbo = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, vbo );
		gl.bufferData( gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW );
		gl.enableVertexAttribArray( 0 );
		gl.vertexAttribPointer( 0, vertexSize, gl.FLOAT, false, 0, 0 );

		let ibo = gl.createBuffer();
		gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, ibo );
		gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW );

		gl.bindBuffer( gl.ARRAY_BUFFER, instanceBuffer );
		let stride = instanceFloats * 4;
		for (let a=0; a<instanceFloats/4; a++)
		{
			gl.enableVertexAttribArray( a + 1 );
			gl.vertexAttribPointer( a + 1, 4, gl.FLOAT, false, stride, a * 16 );
			gl.vertexAttribDivisor( a + 1, 1 );
		}

		gl.bindVertexArray( null );
		return { vao: vao, indexCount: geometry.indices.length };
	}

	//---------------------------------------------------------------------
	function upload( buffer, batch )
	{
		if ( batch.count === 0 ) return;
		let gl = _gl;
		gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
		gl.bufferData( gl.ARRAY_BUFFER, batch.data.subarray( 0, batch.count * batch.floatsPerInstance ), gl.STREAM_DRAW );
	}

	//---------------------------------------------------------------------
	function drawInstances( program, mesh, count, view, shadow )
	{
		if ( count === 0 ) return;
		let gl = _gl;
		gl.useProgram( program.handle );
		gl.uniform4fv( program.u.u_view, view );
		gl.uniform1f ( program.u.u_depthScale, DEPTH_SCALE );
		gl.uniform3fv( program.u.u_light, LIGHT );
		gl.uniform1f ( program.u.u_floorZ, FLOOR_Z );
		gl.uniform2f ( program.u.u_shadowDir, -LIGHT[0] / LIGHT[2], -LIGHT[1] / LIGHT[2] );
		gl.uniform1i ( program.u.u_shadow, shadow ? 1 : 0 );
		gl.uniform1f ( program.u.u_shadowAlpha, SHADOW_ALPHA );
		gl.bindVertexArray( mesh.vao );
		gl.drawElementsInstanced( gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0, count );
	}

	//---------------------------------------------------------------------
	function drawFloor( view )
	{
		let gl = _gl;
		let p  = _floorProgram;
		let b  = _pool.bounds;		// left, right, top, bottom
		let m  = _pool.margin;

		//	caustics fade out as the camera zooms out (they would just alias into noise)
		let caustic = Math.min( Math.max( ( 3000.0 - _pool.viewScale ) / 2000.0, 0.0 ), 1.0 );

		gl.useProgram( p.handle );
		gl.uniform4fv( p.u.u_view, view );
		gl.uniform4f ( p.u.u_rect, b[0] - m, b[2] - m, b[1] + m, b[3] + m );
		gl.uniform4f ( p.u.u_pool, b[0], b[2], b[1], b[3] );
		gl.uniform3f ( p.u.u_poolColor,   _pool.color.red,       _pool.color.green,       _pool.color.blue       );
		gl.uniform3f ( p.u.u_marginColor, _pool.marginColor.red, _pool.marginColor.green, _pool.marginColor.blue );
		gl.uniform1f ( p.u.u_time, ( performance.now() - _startTime ) * 0.001 );
		gl.uniform1f ( p.u.u_caustic, caustic );
		gl.bindVertexArray( _floorVao );
		gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
	}

	//---------------------------------------------------------------------
	function createProgram( vsSource, fsSource )
	{
		let gl = _gl;
		let vs = compileShader( gl.VERTEX_SHADER,   vsSource );
		let fs = compileShader( gl.FRAGMENT_SHADER, fsSource );
		if ( vs === null || fs === null ) return null;

		let handle = gl.createProgram();
		gl.attachShader( handle, vs );
		gl.attachShader( handle, fs );
		gl.linkProgram( handle );
		if ( ! gl.getProgramParameter( handle, gl.LINK_STATUS ) )
		{
			console.error( "GLView: program link failed: " + gl.getProgramInfoLog( handle ) );
			return null;
		}

		let uniforms = {};
		let n = gl.getProgramParameter( handle, gl.ACTIVE_UNIFORMS );
		for (let i=0; i<n; i++)
		{
			let name = gl.getActiveUniform( handle, i ).name;
			uniforms[ name ] = gl.getUniformLocation( handle, name );
		}
		return { handle: handle, u: uniforms };
	}

	function compileShader( type, source )
	{
		let gl = _gl;
		let shader = gl.createShader( type );
		gl.shaderSource( shader, source );
		gl.compileShader( shader );
		if ( ! gl.getShaderParameter( shader, gl.COMPILE_STATUS ) )
		{
			console.error( "GLView: shader compile failed: " + gl.getShaderInfoLog( shader ) );
			return null;
		}
		return shader;
	}

	//---------------------------------------------------------------------
	//	tube: u along the length (0..1), v around the top half (0..1 -> 0..PI)
	//---------------------------------------------------------------------
	function buildTubeGeometry( segmentsU, segmentsV )
	{
		let vertices = new Float32Array( ( segmentsU + 1 ) * ( segmentsV + 1 ) * 2 );
		let k = 0;
		for (let i=0; i<=segmentsU; i++)
		{
			for (let j=0; j<=segmentsV; j++)
			{
				vertices[k++] = i / segmentsU;
				vertices[k++] = j / segmentsV;
			}
		}
		return { vertices: vertices, indices: gridIndices( segmentsU, segmentsV ) };
	}

	//---------------------------------------------------------------------
	//	dome: top half of a unit sphere (z >= 0); only the top is ever seen
	//---------------------------------------------------------------------
	function buildDomeGeometry( segmentsAround, segmentsUp )
	{
		let vertices = new Float32Array( ( segmentsUp + 1 ) * ( segmentsAround + 1 ) * 3 );
		let k = 0;
		for (let i=0; i<=segmentsUp; i++)
		{
			let elevation = ( i / segmentsUp ) * Math.PI * ONE_HALF;
			for (let j=0; j<=segmentsAround; j++)
			{
				let around = ( j / segmentsAround ) * Math.PI * 2.0;
				vertices[k++] = Math.cos( around ) * Math.cos( elevation );
				vertices[k++] = Math.sin( around ) * Math.cos( elevation );
				vertices[k++] = Math.sin( elevation );
			}
		}
		return { vertices: vertices, indices: gridIndices( segmentsUp, segmentsAround ) };
	}

	function gridIndices( rows, columns )
	{
		let indices = new Uint16Array( rows * columns * 6 );
		let k = 0;
		for (let i=0; i<rows; i++)
		{
			for (let j=0; j<columns; j++)
			{
				let a = i * ( columns + 1 ) + j;
				let b = a + columns + 1;
				indices[k++] = a;	indices[k++] = b;	indices[k++] = a + 1;
				indices[k++] = b;	indices[k++] = b + 1;	indices[k++] = a + 1;
			}
		}
		return indices;
	}

	function normalize3( x, y, z )
	{
		let l = Math.sqrt( x * x + y * y + z * z );
		return new Float32Array( [ x / l, y / l, z / l ] );
	}

	//---------------------------------------------------------------------
	//	growable array of per-instance floats
	//---------------------------------------------------------------------
	function InstanceBatch( floatsPerInstance, initialCapacity )
	{
		this.floatsPerInstance = floatsPerInstance;
		this.data  = new Float32Array( floatsPerInstance * initialCapacity );
		this.count = 0;

		// returns the float offset of a new instance
		this.alloc = function()
		{
			let offset = this.count * this.floatsPerInstance;
			if ( offset + this.floatsPerInstance > this.data.length )
			{
				let bigger = new Float32Array( this.data.length * 2 );
				bigger.set( this.data );
				this.data = bigger;
			}
			this.count ++;
			return offset;
		}
	}

	//=======================================================================================
	//	shaders
	//=======================================================================================
	const VIEW_GLSL = `
		uniform vec4  u_view;			// camera x, y, half width, half height (pool units)
		uniform float u_depthScale;
		uniform float u_floorZ;
		uniform vec2  u_shadowDir;
		uniform int   u_shadow;

		vec4 toClip( vec3 p )
		{
			if ( u_shadow == 1 )
			{
				// project onto the floor along the light direction
				p.xy += u_shadowDir * ( p.z - u_floorZ );
				p.z   = u_floorZ + 0.5;
			}
			return vec4( ( p.x - u_view.x ) / u_view.z, -( p.y - u_view.y ) / u_view.w, -p.z * u_depthScale, 1.0 );
		}
	`;

	const TUBE_VS = `#version 300 es
		layout(location=0) in vec2 a_uv;
		layout(location=1) in vec4 i_ends;		// p0.xy, p1.xy
		layout(location=2) in vec4 i_controls;	// c0.xy, c1.xy (offsets from p0 and p1)
		layout(location=3) in vec4 i_shape;		// r0, r1, z, squash
		layout(location=4) in vec4 i_color;		// rgb, emissive
		${VIEW_GLSL}
		out vec3 v_normal;
		out vec4 v_color;

		void main()
		{
			float u  = a_uv.x;
			float t  = a_uv.y * 3.14159265;
			float iu = 1.0 - u;

			vec2 p0 = i_ends.xy;
			vec2 p1 = i_ends.zw;
			vec2 q1 = p0 + i_controls.xy;
			vec2 q2 = p1 + i_controls.zw;

			vec2 center  = iu*iu*iu*p0 + 3.0*iu*iu*u*q1 + 3.0*iu*u*u*q2 + u*u*u*p1;
			vec2 tangent = 3.0*iu*iu*(q1 - p0) + 6.0*iu*u*(q2 - q1) + 3.0*u*u*(p1 - q2);
			float tl = length( tangent );
			tangent = ( tl > 1e-5 ) ? tangent / tl : vec2( 1.0, 0.0 );
			vec2 side = vec2( -tangent.y, tangent.x );

			// same easing the 2D renderer gets from offsetting the Bezier edges
			float radius = i_shape.x * ( iu*iu*iu + 3.0*iu*iu*u ) + i_shape.y * ( 3.0*iu*u*u + u*u*u );
			float squash = i_shape.w;
			float c = cos( t );
			float s = sin( t );

			vec3 position = vec3( center + side * radius * c, i_shape.z + radius * squash * s );
			v_normal = normalize( vec3( side * squash * c, s ) );
			v_color  = i_color;
			gl_Position = toClip( position );
		}
	`;

	const ELLIPSOID_VS = `#version 300 es
		layout(location=0) in vec3 a_position;	// unit dome
		layout(location=1) in vec4 i_place;		// center.xy, axis.xy
		layout(location=2) in vec4 i_shape;		// a, r, z, squash
		layout(location=3) in vec4 i_color;		// rgb, emissive
		${VIEW_GLSL}
		out vec3 v_normal;
		out vec4 v_color;

		void main()
		{
			vec2  axis = i_place.zw;
			vec2  side = vec2( -axis.y, axis.x );
			float a = i_shape.x;
			float r = i_shape.y;
			float h = r * i_shape.w;

			vec3 position = vec3( i_place.xy + axis * a * a_position.x + side * r * a_position.y, i_shape.z + h * a_position.z );
			v_normal = normalize( vec3( axis * ( a_position.x / a ) + side * ( a_position.y / r ), a_position.z / h ) );
			v_color  = i_color;
			gl_Position = toClip( position );
		}
	`;

	const BODY_FS = `#version 300 es
		precision highp float;
		precision highp int;
		uniform vec3  u_light;
		uniform int   u_shadow;
		uniform float u_shadowAlpha;
		in vec3 v_normal;
		in vec4 v_color;
		out vec4 fragColor;

		void main()
		{
			if ( u_shadow == 1 )
			{
				fragColor = vec4( 0.0, 0.0, 0.0, u_shadowAlpha );	// premultiplied black
				return;
			}

			vec3  n    = normalize( v_normal );
			vec3  base = v_color.rgb;
			float diffuse  = max( dot( n, u_light ), 0.0 );
			vec3  halfway  = normalize( u_light + vec3( 0.0, 0.0, 1.0 ) );
			float specular = pow( max( dot( n, halfway ), 0.0 ), 36.0 );

			vec3 color = base * ( 0.38 + 0.72 * diffuse );
			color *= mix( 0.45, 1.0, smoothstep( 0.0, 0.45, n.z ) );	// darker edges, like the 2D outline
			color += vec3( 0.28 * specular );
			color  = mix( color, base * 1.1 + 0.1, v_color.a );		// emissive (food bits)
			fragColor = vec4( color, 1.0 );
		}
	`;

	const FLOOR_VS = `#version 300 es
		layout(location=0) in vec2 a_corner;
		uniform vec4 u_view;
		uniform vec4 u_rect;		// left, top, right, bottom
		out vec2 v_world;

		void main()
		{
			v_world = mix( u_rect.xy, u_rect.zw, a_corner );
			gl_Position = vec4( ( v_world.x - u_view.x ) / u_view.z, -( v_world.y - u_view.y ) / u_view.w, 0.999, 1.0 );
		}
	`;

	const FLOOR_FS = `#version 300 es
		precision highp float;
		uniform vec4  u_pool;		// left, top, right, bottom
		uniform vec3  u_poolColor;
		uniform vec3  u_marginColor;
		uniform float u_time;
		uniform float u_caustic;
		in vec2 v_world;
		out vec4 fragColor;

		// bright ridges where a few slowly warping wave fronts cross
		float caustic( vec2 p, float t )
		{
			float v = 0.0;
			v += sin( p.x * 1.3 + t * 0.7 + sin( p.y * 0.9 - t * 0.5 ) * 1.8 );
			v += sin( p.y * 1.1 - t * 0.6 + sin( p.x * 0.8 + t * 0.4 ) * 1.8 );
			v += sin( ( p.x + p.y ) * 0.9 + t * 0.5 + sin( ( p.x - p.y ) * 0.7 + t * 0.3 ) * 1.5 );
			v = 1.0 - abs( v ) / 3.0;
			return pow( v, 6.0 );
		}

		void main()
		{
			vec2 p = v_world;
			if ( p.x < u_pool.x || p.x > u_pool.z || p.y < u_pool.y || p.y > u_pool.w )
			{
				fragColor = vec4( u_marginColor, 1.0 );
				return;
			}

			vec3 color = u_poolColor;
			if ( u_caustic > 0.0 )
			{
				float c = caustic( p * 0.012, u_time ) * 0.7 + caustic( p * 0.021 + 3.7, u_time * 1.3 ) * 0.3;
				color += c * u_caustic * vec3( 0.07, 0.10, 0.12 );
			}
			fragColor = vec4( color, 1.0 );
		}
	`;
}
