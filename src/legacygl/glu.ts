import {vec3, vec4, mat4} from 'gl-matrix';

export namespace glu {
  export function project(
    obj_xyz: vec3,
    modelview: mat4,
    projection: mat4,
    viewport: vec4
  ): vec3 {
    // object coordinate to normalized device coordinate
    var m = mat4.mul(mat4.create(), projection, modelview);
    var ndc = vec4.transformMat4(
      vec4.create(),
      [obj_xyz[0], obj_xyz[1], obj_xyz[2], 1],
      m
    );
    vec4.scale_ip(ndc, 1 / ndc[3]);
    // normalized device coordinate to viewport coordinate
    var win_x = ((ndc[0] + 1) * viewport[2]) / 2 + viewport[0];
    var win_y = ((ndc[1] + 1) * viewport[3]) / 2 + viewport[1];
    var win_z = (ndc[2] + 1) / 2;
    return [win_x, win_y, win_z];
  }

  export function unproject(
    win_xyz: vec3,
    modelview: mat4,
    projection: mat4,
    viewport: vec4
  ): vec3 {
    // viewport coordinate to normalized device coordinate
    var ndc_x = ((win_xyz[0] - viewport[0]) * 2) / viewport[2] - 1;
    var ndc_y = ((win_xyz[1] - viewport[1]) * 2) / viewport[3] - 1;
    var ndc_z = win_xyz[2] * 2 - 1;
    var ndc: vec4 = [ndc_x, ndc_y, ndc_z, 1];
    // normalized device coordinate to object coordinate
    var m = mat4.mul(mat4.create(), projection, modelview);
    mat4.invert_ip(m);
    var obj_xyzw = vec4.transformMat4(vec4.create(), ndc, m);
    vec4.scale_ip(obj_xyzw, 1 / obj_xyzw[3]);
    return [obj_xyzw[0], obj_xyzw[1], obj_xyzw[2]];
  }

  export function ortho2D(
    out: mat4,
    left: number,
    right: number,
    bottom: number,
    top: number
  ) {
    return mat4.ortho(out, left, right, bottom, top, -1, 1);
  }
}
