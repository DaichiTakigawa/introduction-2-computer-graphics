import {vec2, vec3, quat, mat4} from 'gl-matrix';

type CameraMode = 'none' | 'rotate' | 'pan' | 'zoom';

export class Camera {
  private viewport_width: number;

  eye: vec3;
  center: vec3;
  up: vec3;
  mode: CameraMode;
  prevpos: vec2;

  constructor(viewport_width: number) {
    this.viewport_width = viewport_width;
    this.eye = [0, 0, 1];
    this.center = [0, 0, 0];
    this.up = [0, 1, 0];
    this.mode = 'none';
    this.prevpos = vec2.create();
  }

  center_to_eye() {
    return vec3.sub(vec3.create(), this.eye, this.center);
  }

  eye_to_center() {
    return vec3.sub(vec3.create(), this.center, this.eye);
  }

  right() {
    return vec3.normalize(
      vec3.create(),
      vec3.cross(vec3.create(), this.eye_to_center(), this.up)
    );
  }

  lookAt(modelview_matrix: mat4) {
    mat4.lookAt(modelview_matrix, this.eye, this.center, this.up);
  }

  is_moving() {
    return this.mode != 'none';
  }

  start_moving(mousepos: vec2, mode: CameraMode) {
    vec2.copy(this.prevpos, mousepos);
    this.mode = mode;
    // correct up vector
    this.up = vec3.normalize(
      vec3.create(),
      vec3.cross(vec3.create(), this.right(), this.eye_to_center())
    );
  }

  move(mousepos: vec2) {
    const diff = vec2.scale_ip(
      vec2.sub(vec2.create(), mousepos, this.prevpos),
      1 / this.viewport_width
    );
    if (this.mode == 'rotate') {
      const theta = vec2.scale(vec2.create(), diff, 1.7 * Math.PI);
      const rot_hrz = quat.setAxisAngle(quat.create(), this.up, -theta[0]);
      const rot_vrt = quat.setAxisAngle(quat.create(), this.right(), theta[1]);
      const rot = quat.mul(quat.create(), rot_vrt, rot_hrz);
      this.eye = vec3.transformQuat(vec3.create(), this.center_to_eye(), rot);
      vec3.add_ip(this.eye, this.center);
      vec3.transformQuat_ip(this.up, rot);
    } else if (this.mode == 'pan') {
      const s = vec2.scale(vec2.create(), diff, vec3.len(this.center_to_eye()));
      const d0 = vec3.scale(vec3.create(), this.right(), -s[0]);
      const d1 = vec3.scale(vec3.create(), this.up, -s[1]);
      const d = vec3.add(vec3.create(), d0, d1);
      vec3.add_ip(this.eye, d);
      vec3.add_ip(this.center, d);
    } else if (this.mode == 'zoom') {
      const d = vec3.scale(
        vec3.create(),
        this.eye_to_center(),
        diff[0] - diff[1]
      );
      vec3.add_ip(this.eye, d);
    }
    vec2.copy(this.prevpos, mousepos);
  }

  finish_moving() {
    this.mode = 'none';
  }
}

export function get_camera(viewport_width: number) {
  return new Camera(viewport_width);
}
