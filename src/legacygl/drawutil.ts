import {vec3} from 'gl-matrix';
import {LegacyGL} from './legacygl';

export interface Drawutil {
  xyzaxis(): void;
  xygrid(size: number): void;
  yzgrid(size: number): void;
  zxgrid(size: number): void;
  quadmesh(mode: string, vertices: number[], faces: number[]): void;
  trimesh(mode: string, vertices: number[], faces: number[]): void;
  cube(mode: string, size: number): void;
  circle(mode: string, size: number, numdiv: number): void;
  sphere(mode: string, radius: number, slices: number, stacks: number): void;
  triangle_with_lines(p0: vec3, p1: vec3, p2: vec3, num_lines?: number): void;
  quad_with_lines(
    p0: vec3,
    p1: vec3,
    p2: vec3,
    p3: vec3,
    num_lines?: number
  ): void;
}

export function get_drawutil(
  gl: WebGLRenderingContext,
  legacygl: LegacyGL
): Drawutil {
  let drawutil: any = {};
  drawutil.xyzaxis = function () {
    legacygl.begin(gl.LINES);
    legacygl.color(1, 0, 0);
    legacygl.vertex(0, 0, 0);
    legacygl.vertex(1, 0, 0);
    legacygl.color(0, 1, 0);
    legacygl.vertex(0, 0, 0);
    legacygl.vertex(0, 1, 0);
    legacygl.color(0, 0, 1);
    legacygl.vertex(0, 0, 0);
    legacygl.vertex(0, 0, 1);
    legacygl.end();
  };
  drawutil.xygrid = function (size: number) {
    legacygl.begin(gl.LINES);
    for (let i = -size; i <= size; ++i) {
      legacygl.vertex(i, -size, 0);
      legacygl.vertex(i, size, 0);
      legacygl.vertex(-size, i, 0);
      legacygl.vertex(size, i, 0);
    }
    legacygl.end();
  };
  drawutil.yzgrid = function (size: number) {
    legacygl.begin(gl.LINES);
    for (let i = -size; i <= size; ++i) {
      legacygl.vertex(0, i, -size);
      legacygl.vertex(0, i, size);
      legacygl.vertex(0, -size, i);
      legacygl.vertex(0, size, i);
    }
    legacygl.end();
  };
  drawutil.zxgrid = function (size: number) {
    legacygl.begin(gl.LINES);
    for (let i = -size; i <= size; ++i) {
      legacygl.vertex(i, 0, -size);
      legacygl.vertex(i, 0, size);
      legacygl.vertex(-size, 0, i);
      legacygl.vertex(size, 0, i);
    }
    legacygl.end();
  };
  drawutil.quadmesh = function (
    mode: string,
    vertices: number[],
    faces: number[]
  ) {
    legacygl.begin(mode == 'line' ? gl.LINES : legacygl.QUADS);
    for (let f = 0; f < faces.length / 4; ++f) {
      for (let i = 0; i < 4; ++i) {
        let v0 = faces[4 * f + i];
        let x0 = vertices[3 * v0];
        let y0 = vertices[3 * v0 + 1];
        let z0 = vertices[3 * v0 + 2];
        legacygl.vertex(x0, y0, z0);
        if (mode == 'line') {
          let v1 = faces[4 * f + ((i + 1) % 4)];
          let x1 = vertices[3 * v1];
          let y1 = vertices[3 * v1 + 1];
          let z1 = vertices[3 * v1 + 2];
          legacygl.vertex(x1, y1, z1);
        }
      }
    }
    legacygl.end();
  };
  drawutil.trimesh = function (
    mode: string,
    vertices: number[],
    faces: number[]
  ) {
    legacygl.begin(mode == 'line' ? gl.LINES : gl.TRIANGLES);
    for (let f = 0; f < faces.length / 3; ++f) {
      for (let i = 0; i < 3; ++i) {
        let v0 = faces[3 * f + i];
        let x0 = vertices[3 * v0];
        let y0 = vertices[3 * v0 + 1];
        let z0 = vertices[3 * v0 + 2];
        legacygl.vertex(x0, y0, z0);
        if (mode == 'line') {
          let v1 = faces[3 * f + ((i + 1) % 3)];
          let x1 = vertices[3 * v1];
          let y1 = vertices[3 * v1 + 1];
          let z1 = vertices[3 * v1 + 2];
          legacygl.vertex(x1, y1, z1);
        }
      }
    }
    legacygl.end();
  };
  drawutil.cube = function (mode: string, size: number) {
    let r = size / 2;
    this.quadmesh(
      mode,
      [
        // vertices
        -r,
        -r,
        -r,
        r,
        -r,
        -r,
        -r,
        r,
        -r,
        r,
        r,
        -r,
        -r,
        -r,
        r,
        r,
        -r,
        r,
        -r,
        r,
        r,
        r,
        r,
        r,
      ],
      [
        // faces
        1,
        3,
        7,
        5, // positive-x
        3,
        2,
        6,
        7, // positive-y
        2,
        0,
        4,
        6, // negative-x
        0,
        1,
        5,
        4, // negative-y
        4,
        5,
        7,
        6, // positive-z
        0,
        2,
        3,
        1, // negative-z
      ]
    );
  };
  drawutil.circle = function (mode: string, size: number, numdiv?: number) {
    if (!numdiv) numdiv = 12;
    let r = size / 2;
    legacygl.begin(mode == 'line' ? gl.LINE_LOOP : gl.TRIANGLE_FAN);
    for (let i = 0; i < numdiv; ++i) {
      let theta = (i * 2 * Math.PI) / numdiv;
      let x = r * Math.cos(theta);
      let y = r * Math.sin(theta);
      legacygl.vertex(x, y, 0);
    }
    legacygl.end();
  };
  drawutil.sphere = function (
    mode: string,
    radius: number,
    slices: number,
    stacks: number
  ) {
    function angle2pos(theta: number, phi: number) {
      let x = radius * Math.cos(theta) * Math.sin(phi);
      let y = radius * Math.sin(theta) * Math.sin(phi);
      let z = radius * Math.cos(phi);
      return [x, y, z];
    }
    legacygl.begin(mode == 'line' ? gl.LINES : legacygl.QUADS);
    let phi = 0;
    let dphi = Math.PI / stacks;
    for (let i = 0; i < stacks; ++i, phi += dphi) {
      let theta = 0;
      let dtheta = (2 * Math.PI) / slices;
      for (let j = 0; j < slices; ++j, theta += dtheta) {
        let p = [
          angle2pos(theta, phi),
          angle2pos(theta + dtheta, phi),
          angle2pos(theta + dtheta, phi + dphi),
          angle2pos(theta, phi + dphi),
        ];
        for (let k = 0; k < 4; ++k) {
          legacygl.vertex(p[k][0], p[k][1], p[k][2]);
          if (mode == 'line') {
            let k1 = (k + 1) % 4;
            legacygl.vertex(p[k1][0], p[k1][1], p[k1][2]);
          }
        }
      }
    }
    legacygl.end();
  };
  drawutil.triangle_with_lines = function (
    p0: vec3,
    p1: vec3,
    p2: vec3,
    num_lines = 10
  ) {
    let p = [p0, p1, p2];
    legacygl.begin(gl.LINES);
    for (let i = 0; i < num_lines; ++i) {
      let t = i / num_lines;
      for (let j = 0; j < 3; ++j) {
        let a = vec3.lerp([0, 0, 0], p[j], p[(j + 2) % 3], t);
        let b = vec3.lerp([0, 0, 0], p[(j + 1) % 3], p[(j + 2) % 3], t);
        legacygl.vertex(a[0], a[1], a[2]);
        legacygl.vertex(b[0], b[1], b[2]);
      }
    }
    legacygl.end();
  };
  drawutil.quad_with_lines = function (
    p0: vec3,
    p1: vec3,
    p2: vec3,
    p3: vec3,
    num_lines = 10
  ) {
    legacygl.begin(gl.LINES);
    for (let i = 0; i <= num_lines; ++i) {
      let t = i / num_lines;
      {
        let a = vec3.lerp([0, 0, 0], p0, p1, t);
        let b = vec3.lerp([0, 0, 0], p3, p2, t);
        legacygl.vertex(a[0], a[1], a[2]);
        legacygl.vertex(b[0], b[1], b[2]);
      }
      {
        let a = vec3.lerp([0, 0, 0], p0, p3, t);
        let b = vec3.lerp([0, 0, 0], p1, p2, t);
        legacygl.vertex(a[0], a[1], a[2]);
        legacygl.vertex(b[0], b[1], b[2]);
      }
    }
    legacygl.end();
  };
  return drawutil;
}
