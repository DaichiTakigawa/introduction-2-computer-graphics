import {vec2, vec3, vec4, mat2, mat3, mat4} from 'gl-matrix';

type UniformType =
  | '1f'
  | '1i'
  | '2f'
  | '2i'
  | '3f'
  | '3i'
  | '4f'
  | '4i'
  | 'Matrix2f'
  | 'Matrix3f'
  | 'Matrix4f';

export interface Shader {
  vertex_shader?: WebGLShader;
  fragment_shader?: WebGLShader;
  program?: WebGLProgram;
}

export interface Uniform {
  location: WebGLUniformLocation;
  type: any;
  is_array: boolean;
  value: any;
  stack: any[];
  push(): void;
  pop(): void;
}

export interface VertexAttribute {
  name: string;
  size: number;
  current?: number[];
  location?: number;
}

export interface LegacyGL {
  shader: Shader;
  uniforms: {
    [key: string]: Uniform;
  };
  add_uniform(name: string, type: UniformType): void;
  add_uniform_array(name: string, type: UniformType, size: number): void;
  set_uniforms(): void;
  vertex_attributes: VertexAttribute[];
  add_vertex_attribute(name: string, size: number): void;
  vertex: (x: number, y: number, z: number) => void;
  begin(mode: number | string): void;
  end(): void;
  QUADS: string;
  displists: {};
  current_displist_name: any;
  newList(name: string): void;
  endList(): void;
  callList(name: string): void;
  displist_wrapper(
    name: string
  ): {
    is_valid: boolean;
    draw(drawfunc: () => void): void;
    invalidate(): void;
  };
  AUTO_NORMAL: string;
  flags: {
    AUTO_NORMAL: boolean;
  };
  enable(flag: string): void;
  disable(flag: string): void;
}

export function get_legacygl(
  gl: WebGLRenderingContext,
  vertex_shader_src: string,
  fragment_shader_src: string
): LegacyGL {
  var legacygl: any = {};

  var shader: Shader = {};
  // vertex shader
  shader.vertex_shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader.vertex_shader, vertex_shader_src);
  gl.compileShader(shader.vertex_shader);
  if (!gl.getShaderParameter(shader.vertex_shader, gl.COMPILE_STATUS))
    alert(gl.getShaderInfoLog(shader.vertex_shader));
  // fragment shader
  shader.fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader.fragment_shader, fragment_shader_src);
  gl.compileShader(shader.fragment_shader);
  if (!gl.getShaderParameter(shader.fragment_shader, gl.COMPILE_STATUS))
    alert(gl.getShaderInfoLog(shader.fragment_shader));
  // shader program
  shader.program = gl.createProgram();
  gl.attachShader(shader.program, shader.vertex_shader);
  gl.attachShader(shader.program, shader.fragment_shader);
  gl.linkProgram(shader.program);
  gl.useProgram(shader.program);
  if (!gl.getProgramParameter(shader.program, gl.LINK_STATUS))
    alert('Could not initialize shaders!');
  legacygl.shader = shader;

  // utility for uniforms
  legacygl.uniforms = {};
  legacygl.add_uniform = function (name: string, type: UniformType) {
    var uniform: any = {
      location: gl.getUniformLocation(this.shader.program, 'u_' + name),
      type: type,
      is_array: false,
    };
    uniform.value =
      type == '1f' || type == '1i'
        ? 0
        : type == '2f' || type == '2i'
        ? vec2.create()
        : type == '3f' || type == '3i'
        ? vec3.create()
        : type == '4f' || type == '4i'
        ? vec4.create()
        : type == 'Matrix2f'
        ? mat2.create()
        : type == 'Matrix3f'
        ? mat3.create()
        : type == 'Matrix4f'
        ? mat4.create()
        : undefined;
    uniform.stack = [];
    uniform.push = function () {
      var copy =
        type == '1f' || type == '1i'
          ? this.value
          : type == '2f' || type == '2i'
          ? vec2.copy([] as any, this.value)
          : type == '3f' || type == '3i'
          ? vec3.copy([] as any, this.value)
          : type == '4f' || type == '4i'
          ? vec4.copy([] as any, this.value)
          : type == 'Matrix2f'
          ? mat2.copy([] as any, this.value)
          : type == 'Matrix3f'
          ? mat3.copy([] as any, this.value)
          : type == 'Matrix4f'
          ? mat4.copy([] as any, this.value)
          : undefined;
      this.stack.push(copy);
    };
    uniform.pop = function () {
      var copy = this.stack[this.stack.length - 1];
      this.value =
        type == '1f' || type == '1i'
          ? copy
          : type == '2f' || type == '2i'
          ? vec2.copy([] as any, copy)
          : type == '3f' || type == '3i'
          ? vec3.copy([] as any, copy)
          : type == '4f' || type == '4i'
          ? vec4.copy([] as any, copy)
          : type == 'Matrix2f'
          ? mat2.copy([] as any, copy)
          : type == 'Matrix3f'
          ? mat3.copy([] as any, copy)
          : type == 'Matrix4f'
          ? mat4.copy([] as any, copy)
          : undefined;
      this.stack.pop();
    };
    this.uniforms[name] = uniform;
  };
  legacygl.add_uniform_array = function (
    name: string,
    type: UniformType,
    size: number
  ) {
    var uniform: any = {
      location: gl.getUniformLocation(this.shader.program, 'u_' + name),
      type: type,
      is_array: true,
    };
    function make_default_value() {
      var default_value =
        type == '1f' || type == '1i'
          ? 0
          : type == '2f' || type == '2i'
          ? vec2.create()
          : type == '3f' || type == '3i'
          ? vec3.create()
          : type == '4f' || type == '4i'
          ? vec4.create()
          : type == 'Matrix2f'
          ? mat2.create()
          : type == 'Matrix3f'
          ? mat3.create()
          : type == 'Matrix4f'
          ? mat4.create()
          : undefined;
      return default_value;
    }
    uniform.value = [];
    for (var i = 0; i < size; ++i) uniform.value.push(make_default_value());
    // stack push/pop unsupported for now
    this.uniforms[name] = uniform;
  };
  legacygl.set_uniforms = function () {
    for (var name in this.uniforms) {
      var uniform = this.uniforms[name];
      var type = uniform.type;
      // in case of array type, flatten values
      var passed_value;
      if (uniform.is_array) {
        passed_value = [];
        for (var i = 0; i < uniform.value.length; ++i) {
          var v = uniform.value[i];
          for (var j = 0; j < v.length; ++j) passed_value.push(v[j]);
        }
      } else {
        passed_value = uniform.value;
      }
      // call appropriate WebGL function depending on data type
      var func_name = 'uniform' + type;
      if (uniform.is_array || (type != '1f' && type != '1i')) func_name += 'v';
      if (type == 'Matrix2f' || type == 'Matrix3f' || type == 'Matrix4f') {
        (gl as any)[func_name](uniform.location, false, passed_value);
      } else (gl as any)[func_name](uniform.location, passed_value);
    }
  };

  // utility for vertex attributes
  legacygl.vertex_attributes = [];
  legacygl.add_vertex_attribute = function (name: string, size: number) {
    var vertex_attribute: VertexAttribute = {name: name, size: size};
    // initialize current value with 0
    vertex_attribute.current = [];
    for (var i = 0; i < size; ++i) vertex_attribute.current.push(0);
    // register current value setter func
    this[name] = function () {
      for (var i = 0; i < size; ++i) vertex_attribute.current[i] = arguments[i];
    };
    // shader location
    vertex_attribute.location = gl.getAttribLocation(
      this.shader.program,
      'a_' + name
    );
    gl.enableVertexAttribArray(vertex_attribute.location);
    // add to the list
    this.vertex_attributes.push(vertex_attribute);
  };
  // special treatment for vertex position attribute
  legacygl.add_vertex_attribute('vertex', 3);
  delete legacygl.vertex_attributes[0].current;
  function vertex(x: number, y: number, z: number) {
    for (var i = 0; i < this.vertex_attributes.length; ++i) {
      var vertex_attribute = this.vertex_attributes[i];
      var value =
        vertex_attribute.name == 'vertex'
          ? [x, y, z]
          : vertex_attribute.current;
      for (var j = 0; j < vertex_attribute.size; ++j)
        vertex_attribute.array.push(value[j]);
    }
    // emulate GL_QUADS
    var num_vertices = this.vertex_attributes[0].array.length / 3;
    if (this.mode == this.QUADS && num_vertices % 6 == 4) {
      // 6 vertices per quad (= 2 triangles)
      var v0 = num_vertices - 4;
      // add 2 vertices identical to [v0] and [v0+2] to construct the other half of the quad
      for (var k = 0; k < 3; ++k) {
        if (k == 1) continue;
        for (var i = 0; i < this.vertex_attributes.length; ++i) {
          var vertex_attribute = this.vertex_attributes[i];
          for (var j = 0; j < vertex_attribute.size; ++j)
            vertex_attribute.array.push(
              vertex_attribute.array[vertex_attribute.size * (v0 + k) + j]
            );
        }
      }
    }
  }
  legacygl.vertex = vertex;
  // begin and end
  legacygl.begin = function (mode: string) {
    this.set_uniforms();
    this.mode = mode;
    for (var i = 0; i < this.vertex_attributes.length; ++i) {
      this.vertex_attributes[i].array = [];
    }
  };
  legacygl.end = function () {
    var drawcall = {
      buffers: [] as WebGLBuffer[],
      mode: this.mode == this.QUADS ? gl.TRIANGLES : this.mode,
      num_vertices: this.vertex_attributes[0].array.length / 3,
    };
    for (var k = 0; k < this.vertex_attributes.length; ++k) {
      var vertex_attribute = this.vertex_attributes[k];
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      drawcall.buffers.push(buffer);
      // simulate GL_AUTO_NORMAL
      if (
        drawcall.mode == gl.TRIANGLES &&
        vertex_attribute.name == 'normal' &&
        legacygl.flags.AUTO_NORMAL
      ) {
        for (var i = 0; i < drawcall.num_vertices / 3; ++i) {
          var v = [];
          for (var j = 0; j < 3; ++j) {
            var slicepos = 3 * (3 * i + j);
            v.push(
              legacygl.vertex_attributes[0].array.slice(slicepos, slicepos + 3)
            );
          }
          vec3.sub_ip(v[1], v[0]);
          vec3.sub_ip(v[2], v[0]);
          var n = vec3.cross([] as any, v[1], v[2]);
          vec3.normalize_ip(n);
          for (var j = 0; j < 3; ++j)
            vertex_attribute.array.splice(3 * (3 * i + j), 3, n[0], n[1], n[2]);
        }
      }
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertex_attribute.array),
        gl.STATIC_DRAW
      );
      gl.vertexAttribPointer(
        vertex_attribute.location,
        vertex_attribute.size,
        gl.FLOAT,
        false,
        0,
        0
      );
    }
    gl.drawArrays(drawcall.mode, 0, drawcall.num_vertices);
    // display list
    if (this.current_displist_name)
      this.displists[this.current_displist_name].drawcalls.push(drawcall);
    else
      for (var i = 0; i < drawcall.buffers.length; ++i) {
        gl.deleteBuffer(drawcall.buffers[i]);
      }
  };
  // emulate GL_QUADS
  legacygl.QUADS = 'QUADS';
  // display list
  legacygl.displists = {};
  legacygl.current_displist_name = null;
  legacygl.newList = function (name: string) {
    var displist = this.displists[name];
    if (displist) {
      // delete existing buffers
      for (var i = 0; i < displist.drawcalls.length; ++i) {
        var drawcall = displist.drawcalls[i];
        for (var j = 0; j < drawcall.buffers.length; ++j) {
          gl.deleteBuffer(drawcall.buffers[j]);
        }
      }
      displist.drawcalls = [];
    } else {
      this.displists[name] = displist = {
        name: name,
        drawcalls: [], // { buffers, mode, num_vertices }
      };
    }
    this.current_displist_name = name;
  };
  legacygl.endList = function () {
    this.current_displist_name = null;
  };
  legacygl.callList = function (name: string) {
    var displist = this.displists[name];
    if (!displist) return;
    this.set_uniforms();
    for (var k = 0; k < displist.drawcalls.length; ++k) {
      var drawcall = displist.drawcalls[k];
      for (var i = 0; i < this.vertex_attributes.length; ++i) {
        var vertex_attribute = this.vertex_attributes[i];
        gl.bindBuffer(gl.ARRAY_BUFFER, drawcall.buffers[i]);
        gl.vertexAttribPointer(
          vertex_attribute.location,
          vertex_attribute.size,
          gl.FLOAT,
          false,
          0,
          0
        );
      }
      gl.drawArrays(drawcall.mode, 0, drawcall.num_vertices);
    }
  };
  // wrapper
  legacygl.displist_wrapper = function (name: string) {
    var wrapper: any = {};
    wrapper.is_valid = false;
    wrapper.draw = function (drawfunc: () => void) {
      if (!this.is_valid) {
        legacygl.newList(name);
        drawfunc();
        legacygl.endList();
        this.is_valid = true;
      } else {
        legacygl.callList(name);
      }
    };
    wrapper.invalidate = function () {
      this.is_valid = false;
    };
    return wrapper;
  };
  // emulate GL_AUTO_NORMAL
  legacygl.AUTO_NORMAL = 'AUTO_NORMAL';
  legacygl.flags = {
    AUTO_NORMAL: false,
  };
  legacygl.enable = function (flag: string) {
    this.flags[flag] = true;
  };
  legacygl.disable = function (flag: string) {
    this.flags[flag] = false;
  };
  return legacygl;
}
