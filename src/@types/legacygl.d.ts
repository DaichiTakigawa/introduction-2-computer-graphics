declare module 'legacygl' {
  type vec2 = [number, number];
  type vec3 = [number, number, number];

  // boundingbox.d.ts
  export function make_boundingbox(): {
    set_empty(): void;
    extend(p: any): void;
    diagonal(): any;
    diagonal_norm(): any;
    center(): any;
    is_empty(): any;
  };

  // camera.d.ts
  export function get_camera(
    viewport_width: any
  ): {
    eye: vec3;
    center: vec3;
    up: vec3;
    center_to_eye(): any;
    eye_to_center(): any;
    right(): any;
    lookAt(modelview_matrix: any): void;
    mode: string;
    is_moving(): boolean;
    prevpos: any;
    start_moving(mousepos: any, mode: any): void;
    move(mousepos: any): void;
    finish_moving(): void;
  };

  // colormap.d.ts
  export namespace colormap {
    function _internal(colors: any, t: any): any;
    function parula(t: any): any;
    function jet(t: any): any;
    function hsv(t: any): any;
    function hot(t: any): any;
    function cool(t: any): any;
    function spring(t: any): any;
    function summer(t: any): any;
    function autumn(t: any): any;
    function winter(t: any): any;
    function gray(t: any): any;
    function bone(t: any): any;
    function copper(t: any): any;
    function pink(t: any): any;
  }

  // drawutil.d.ts
  export function get_drawutil(
    gl: any,
    legacygl: any
  ): {
    xyzaxis(): void;
    xygrid(size: any): void;
    yzgrid(size: any): void;
    zxgrid(size: any): void;
    quadmesh(mode: any, vertices: any, faces: any): void;
    trimesh(mode: any, vertices: any, faces: any): void;
    cube(mode: any, size: any): void;
    circle(mode: any, size: any, numdiv: any): void;
    sphere(mode: any, radius: any, slices: any, stacks: any): void;
    triangle_with_lines(p0: any, p1: any, p2: any, num_lines?: number): void;
    quad_with_lines(
      p0: any,
      p1: any,
      p2: any,
      p3: any,
      num_lines?: number
    ): void;
  };

  // glu.d.ts
  export namespace glu {
    function project(
      obj_xyz: number[],
      modelview: any,
      projection: any,
      viewport: any
    ): number[];
    function unproject(
      win_xyz: number[],
      modelview: any,
      projection: any,
      viewport: any
    ): number[];
    function ortho2D(
      out: any,
      left: any,
      right: any,
      bottom: any,
      top: any
    ): any;
  }

  // halfedge.d.ts
  export function make_halfedge_mesh(): {
    vertices: any[];
    faces: any[];
    halfedges: {};
    edges: {};
  };

  // legacygl.d.ts
  export function get_legacygl(
    gl: WebGLRenderingContext,
    vertex_shader_src: string,
    fragment_shader_src: string
  ): {
    shader: {
      vertex_shader: WebGLShader;
      fragment_shader: WebGLShader;
      program: WebGLProgram;
    };
    uniforms: {
      [key: string]: {
        location: any;
        type: any;
        is_array: boolean;
        value: any;
        stack: any[];
        push(): void;
        pop(): void;
      };
    };
    add_uniform(name: any, type: any): void;
    add_uniform_array(name: any, type: any, size: any): void;
    set_uniforms(): void;
    vertex_attributes: any[];
    add_vertex_attribute(name: any, size: any): void;
    vertex: (x: any, y: any, z: any) => void;
    begin(mode: any): void;
    end(): void;
    QUADS: string;
    displists: {};
    current_displist_name: any;
    newList(name: any): void;
    endList(): void;
    callList(name: any): void;
    displist_wrapper(
      name: any
    ): {
      is_valid: boolean;
      draw(drawfunc: any): void;
      invalidate(): void;
    };
    AUTO_NORMAL: string;
    flags: {
      AUTO_NORMAL: boolean;
    };
    enable(flag: any): void;
    disable(flag: any): void;
  };

  // meshio.d.ts
  export namespace meshio {
    function read_obj(
      file_content: any
    ): {
      vertices: any[];
      faces: any[];
      halfedges: {};
      edges: {};
    };
    function read_off(
      file_content: any
    ): {
      vertices: any[];
      faces: any[];
      halfedges: {};
      edges: {};
    };
    function read(
      filename: any,
      content: any
    ): {
      vertices: any[];
      faces: any[];
      halfedges: {};
      edges: {};
    };
    function write_obj(mesh: any): string;
    function write_off(mesh: any): string;
    function write(mesh: any, filename: any): string;
  }

  // util.d.ts
  export function get_filename_extension(filename: any): string;
  export function verify_filename_extension(
    filename: any,
    supported_extensions: any
  ): string;

}

// gl-matrix-util.d.ts
declare module 'gl-matrix' {
  export module mat2 {
    export function add_ip(a: mat2, b: mat2): mat2;
    export function adjoint_ip(a: mat2): mat2;
    export function invert_ip(a: mat2): mat2;
    export function mul_ip(a: mat2, b: mat2): mat2;
    export function multiply_ip(a: mat2, b: mat2): mat2;
    export function rotate_ip(a: mat2, rad: number): mat2;
    export function scale_ip(a: mat2, v: number): mat2;
    export function transpose_ip(a: mat2): mat2;
  }

  export module mat3 {
    export function add_ip(a: mat3, b: mat3): mat3;
    export function adjoint_ip(a: mat3): mat3;
    export function invert_ip(a: mat3): mat3;
    export function mul_ip(a: mat3, b: mat3): mat3;
    export function multiply_ip(a: mat3, b: mat3): mat3;
    export function rotate_ip(a: mat3, rad: number): mat3;
    export function scale_ip(a: mat3, v: vec2): mat3;
    export function translate_ip(a: mat3, v: vec2): mat3;
    export function transpose_ip(a: mat3): mat3;
  }

  export module mat4 {
    export function add_ip(a: mat4, b: mat4): mat4;
    export function adjoint_ip(a: mat4): mat4;
    export function invert_ip(a: mat4): mat4;
    export function mul_ip(a: mat4, b: mat4): mat4;
    export function multiply_ip(a: mat4, b: mat4): mat4;
    export function rotate_ip(a: mat4, rad: number, axis: vec3): mat4;
    export function rotateX_ip(a: mat4, rad: number): mat4;
    export function rotateY_ip(a: mat4, rad: number): mat4;
    export function rotateZ_ip(a: mat4, rad: number): mat4;
    export function scale_ip(a: mat4, v: vec3): mat4;
    export function translate_ip(a: mat4, v: vec3): mat4;
    export function transpose_ip(a: mat4): mat4;
    export function ortho2d(
      a: mat4,
      left: number,
      right: number,
      bottom: number,
      top: number
    ): mat4;
  }

  export module vec2 {
    export function add_ip(a: vec2, b: vec2): vec2;
    export function div_ip(a: vec2, b: vec2): vec2;
    export function divide_ip(a: vec2, b: vec2): vec2;
    export function lerp_ip(a: vec2, b: vec2, t: number): vec2;
    export function max_ip(a: vec2, b: vec2): vec2;
    export function min_ip(a: vec2, b: vec2): vec2;
    export function mul_ip(a: vec2, b: vec2): vec2;
    export function multiply_ip(a: vec2, b: vec2): vec2;
    export function negate_ip(a: vec2): vec2;
    export function normalize_ip(a: vec2): vec2;
    export function scale_ip(a: vec2, b: number): vec2;
    export function scaleAndAdd_ip(a: vec2, b: vec2, scale: number): vec2;
    export function sub_ip(a: vec2, b: vec2): vec2;
    export function subtract_ip(a: vec2, b: vec2): vec2;
    export function transformMat2_ip(a: vec2, m: mat2): vec2;
    export function transformMat2d_ip(a: vec2, m: mat2d): vec2;
    export function transformMat3_ip(a: vec2, m: mat3): vec2;
    export function transformMat4_ip(a: vec2, m: mat4): vec2;
  }

  export module vec3 {
    export function add_ip(a: vec3, b: vec3): vec3;
    export function cross_ip(a: vec3, b: vec3): vec3;
    export function div_ip(a: vec3, b: vec3): vec3;
    export function divide_ip(a: vec3, b: vec3): vec3;
    export function lerp_ip(a: vec3, b: vec3, t: number): vec3;
    export function max_ip(a: vec3, b: vec3): vec3;
    export function min_ip(a: vec3, b: vec3): vec3;
    export function mul_ip(a: vec3, b: vec3): vec3;
    export function multiply_ip(a: vec3, b: vec3): vec3;
    export function negate_ip(a: vec3): vec3;
    export function normalize_ip(a: vec3): vec3;
    export function scale_ip(a: vec3, b: vec3): vec3;
    export function scaleAndAdd_ip(a: vec3, b: vec3, scale: number): vec3;
    export function sub_ip(a: vec3, b: vec3): vec3;
    export function subtract_ip(a: vec3, b: vec3): vec3;
    export function transformMat3_ip(a: vec3, m: mat3): vec3;
    export function transformMat4_ip(a: vec3, m: mat4): vec3;
    export function transformQuat_ip(a: vec3, q: quat): vec3;
  }

  export module vec4 {
    export function add_ip(a: vec4, b: vec4): vec4;
    export function div_ip(a: vec4, b: vec4): vec4;
    export function divide_ip(a: vec4, b: vec4): vec4;
    export function lerp_ip(a: vec4, b: vec4, t: number): vec4;
    export function max_ip(a: vec4, b: vec4): vec4;
    export function min_ip(a: vec4, b: vec4): vec4;
    export function mul_ip(a: vec4, b: vec4): vec4;
    export function multiply_ip(a: vec4, b: vec4): vec4;
    export function negate_ip(a: vec4): vec4;
    export function normalize_ip(a: vec4): vec4;
    export function scale_ip(a: vec4, b: number): vec4;
    export function scaleAndAdd_ip(a: vec4, b: vec4, scale: number): vec4;
    export function sub_ip(a: vec4, b: vec4): vec4;
    export function subtract_ip(a: vec4, b: vec4): vec4;
    export function transformMat4_ip(a: vec4, m: mat4): vec4;
    export function transformQuat_ip(a: vec4, q: quat): vec4;
  }

  export module quat {
    export function add_ip(a: vec4, b: vec4): vec4;
    export function calculateW_ip(a: quat): quat;
    export function conjugate_ip(a: quat): quat;
    export function invert_ip(a: quat): quat;
    export function lerp_ip(a: vec4, b: vec4, t: number): vec4;
    export function mul_ip(a: quat, b: quat): quat;
    export function multiply_ip(a: quat, b: quat): quat;
    export function normalize_ip(a: vec4): vec4;
    export function rotateX_ip(a: quat, rad: number): quat;
    export function rotateY_ip(a: quat, rad: number): quat;
    export function rotateZ_ip(a: quat, rad: number): quat;
    export function scale_ip(a: vec4, b: number): vec4;
    export function slerp_ip(a: quat, b: quat, t: number): quat;
  }
}
