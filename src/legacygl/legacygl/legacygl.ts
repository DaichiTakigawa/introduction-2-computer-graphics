import {vec3} from 'gl-matrix';
import {Shader} from './shader';
import {UniformType, Uniform, ArrayUniform} from './uniform';
import {VertexAttribute} from './vertex-attribute';

type Mode = 'QUADS' | number;

export class LegacyGL {
  private gl: WebGLRenderingContext;
  private mode: Mode;

  shader: Shader;
  uniforms: {
    [key: string]: Uniform | ArrayUniform;
  };
  vertex_attributes: VertexAttribute[];
  QUADS: 'QUADS';
  displists: {
    [key: string]: {
      name: string;
      drawcalls: {
        buffers: WebGLBuffer[];
        mode: number;
        num_vertices: number;
      }[];
    };
  };
  current_displist_name: string;
  AUTO_NORMAL: string;
  flags: {
    [key: string]: boolean;
  };

  constructor(
    gl: WebGLRenderingContext,
    vertex_shader_src: string,
    fragment_shader_src: string
  ) {
    this.gl = gl;
    this.shader = new Shader(gl, vertex_shader_src, fragment_shader_src);
    this.uniforms = {};
    this.vertex_attributes = [];
    // special treatment for vertex position attribute
    this.add_vertex_attribute('vertex', 3);
    delete this.vertex_attributes[0].current;
    const vertex = function (x: number, y: number, z: number) {
      for (let i = 0; i < this.vertex_attributes.length; ++i) {
        const vertex_attribute = this.vertex_attributes[i];
        const value =
          vertex_attribute.name == 'vertex'
            ? [x, y, z]
            : vertex_attribute.current;
        for (let j = 0; j < vertex_attribute.size; ++j)
          vertex_attribute.array.push(value[j]);
      }
      // emulate GL_QUADS
      const num_vertices = this.vertex_attributes[0].array.length / 3;
      if (this.mode == this.QUADS && num_vertices % 6 == 4) {
        // 6 vertices per quad (= 2 triangles)
        const v0 = num_vertices - 4;
        // add 2 vertices identical to [v0] and [v0+2] to construct the other half of the quad
        for (let k = 0; k < 3; ++k) {
          if (k == 1) continue;
          for (let i = 0; i < this.vertex_attributes.length; ++i) {
            const vertex_attribute = this.vertex_attributes[i];
            for (let j = 0; j < vertex_attribute.size; ++j)
              vertex_attribute.array.push(
                vertex_attribute.array[vertex_attribute.size * (v0 + k) + j]
              );
          }
        }
      }
    };
    (this as any)['vertex'] = vertex;
    // emulate GL_QUADS
    this.QUADS = 'QUADS';
    // display list
    this.displists = {};
    this.current_displist_name = null;
    // emulate GL_AUTO_NORMAL
    this.AUTO_NORMAL = 'AUTO_NORMAL';
    this.flags = {
      AUTO_NORMAL: false,
    };
  }

  add_uniform(name: string, type: UniformType) {
    const location = this.gl.getUniformLocation(
      this.shader.program,
      'u_' + name
    );
    const uniform = new Uniform(location, type);
    this.uniforms[name] = uniform;
  }

  add_uniform_array(name: string, type: UniformType, size: number) {
    const location = this.gl.getUniformLocation(
      this.shader.program,
      'u_' + name
    );
    const uniform = new ArrayUniform(location, type, size);
    this.uniforms[name] = uniform;
  }

  set_uniforms() {
    for (const name in this.uniforms) {
      const uniform = this.uniforms[name];
      const type = uniform.type;
      // in case of array type, flatten values
      let passed_value;
      if (uniform.is_array) {
        passed_value = [];
        for (let i = 0; i < uniform.value.length; ++i) {
          const v: any = uniform.value[i];
          if (type != '1f' && type != '1i') {
            for (let j = 0; j < v.length; ++j) passed_value.push(v[j]);
          } else {
            passed_value.push(v);
          }
        }
      } else {
        passed_value = uniform.value;
      }
      // call appropriate WebGL function depending on data type
      let func_name = 'uniform' + type;
      if (uniform.is_array || (type != '1f' && type != '1i')) func_name += 'v';
      if (type == 'Matrix2f' || type == 'Matrix3f' || type == 'Matrix4f') {
        (this.gl as any)[func_name](uniform.location, false, passed_value);
      } else (this.gl as any)[func_name](uniform.location, passed_value);
    }
  }

  add_vertex_attribute(name: string, size: number) {
    // shader location
    const location = this.gl.getAttribLocation(
      this.shader.program,
      'a_' + name
    );
    const vertex_attribute = new VertexAttribute(location, name, size);
    // initialize current value with 0
    for (let i = 0; i < size; ++i) vertex_attribute.current.push(0);
    // register current value setter func
    (this as any)[name] = function (...args: number[]) {
      for (let i = 0; i < size; ++i) vertex_attribute.current[i] = args[i];
    };
    this.gl.enableVertexAttribArray(vertex_attribute.location);
    // add to the list
    this.vertex_attributes.push(vertex_attribute);
  }

  begin(mode: Mode) {
    this.set_uniforms();
    this.mode = mode;
    for (let i = 0; i < this.vertex_attributes.length; ++i) {
      this.vertex_attributes[i].array = [];
    }
  }

  end() {
    const gl = this.gl;
    const drawcall = {
      buffers: [] as WebGLBuffer[],
      mode: this.mode == this.QUADS ? gl.TRIANGLES : this.mode,
      num_vertices: this.vertex_attributes[0].array.length / 3,
    };
    for (let k = 0; k < this.vertex_attributes.length; ++k) {
      const vertex_attribute = this.vertex_attributes[k];
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      drawcall.buffers.push(buffer);
      // simulate GL_AUTO_NORMAL
      if (
        drawcall.mode == gl.TRIANGLES &&
        vertex_attribute.name == 'normal' &&
        this.flags.AUTO_NORMAL
      ) {
        for (let i = 0; i < drawcall.num_vertices / 3; ++i) {
          const v: vec3[] = [];
          for (let j = 0; j < 3; ++j) {
            const slicepos = 3 * (3 * i + j);
            v.push(
              this.vertex_attributes[0].array.slice(
                slicepos,
                slicepos + 3
              ) as vec3
            );
          }
          vec3.sub_ip(v[1], v[0]);
          vec3.sub_ip(v[2], v[0]);
          const n = vec3.cross(vec3.create(), v[1], v[2]);
          vec3.normalize_ip(n);
          for (let j = 0; j < 3; ++j) {
            vertex_attribute.array.splice(3 * (3 * i + j), 3, n[0], n[1], n[2]);
          }
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
    if (this.current_displist_name) {
      this.displists[this.current_displist_name].drawcalls.push(drawcall);
    } else {
      for (let i = 0; i < drawcall.buffers.length; ++i) {
        gl.deleteBuffer(drawcall.buffers[i]);
      }
    }
  }

  newList(name: string) {
    const displist = this.displists[name];
    if (displist) {
      // delete existing buffers
      for (let i = 0; i < displist.drawcalls.length; ++i) {
        const drawcall = displist.drawcalls[i];
        for (let j = 0; j < drawcall.buffers.length; ++j) {
          this.gl.deleteBuffer(drawcall.buffers[j]);
        }
      }
      displist.drawcalls = [];
    } else {
      this.displists[name] = {
        name: name,
        drawcalls: [], // { buffers, mode, num_vertices }
      };
    }
    this.current_displist_name = name;
  }

  endList() {
    this.current_displist_name = null;
  }

  callList(name: string) {
    const gl = this.gl;
    const displist = this.displists[name];
    if (!displist) return;
    this.set_uniforms();
    for (let k = 0; k < displist.drawcalls.length; ++k) {
      const drawcall = displist.drawcalls[k];
      for (let i = 0; i < this.vertex_attributes.length; ++i) {
        const vertex_attribute = this.vertex_attributes[i];
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
  }

  displist_wrapper(name: string) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const legacygl = this;
    const wrapper = {
      is_valid: false,
      draw(drawfunc: () => void) {
        if (!this.is_valid) {
          legacygl.newList(name);
          drawfunc();
          legacygl.endList();
          this.is_valid = true;
        } else {
          legacygl.callList(name);
        }
      },
      invalidate() {
        this.is_valid = false;
      },
    };
    return wrapper;
  }

  enable(flag: string) {
    this.flags[flag] = true;
  }

  disable(flag: string) {
    this.flags[flag] = false;
  }
}

/* eslint-disable no-unused-vars */
export interface LegacyGL {
  vertex?(x: number, y: number, z: number): void;
  color?(r: number, g: number, b: number): void;
}
/* eslint-enable no-unused-vars */

export function get_legacygl(
  gl: WebGLRenderingContext,
  vertex_shader_src: string,
  fragment_shader_src: string
) {
  return new LegacyGL(gl, vertex_shader_src, fragment_shader_src);
}
