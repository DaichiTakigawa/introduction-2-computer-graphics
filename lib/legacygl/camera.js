
export function get_camera(viewport_width) {
  var camera = {};
  camera.eye = [0, 0, 1];
  camera.center = [0, 0, 0];
  camera.up = [0, 1, 0];
  camera.center_to_eye = function () {
    return vec3.sub([], this.eye, this.center);
  };
  camera.eye_to_center = function () {
    return vec3.sub([], this.center, this.eye);
  };
  camera.right = function () {
    return vec3.normalize([], vec3.cross([], this.eye_to_center(), this.up));
  };
  camera.lookAt = function (modelview_matrix) {
    mat4.lookAt(modelview_matrix, this.eye, this.center, this.up);
  };
  camera.mode = 'none';
  camera.is_moving = function () {
    return this.mode != 'none';
  };
  camera.prevpos = vec2.create();
  camera.start_moving = function (mousepos, mode) {
    vec2.copy(this.prevpos, mousepos);
    this.mode = mode;
    // correct up vector
    this.up = vec3.normalize(
      [],
      vec3.cross([], this.right(), this.eye_to_center())
    );
  };
  camera.move = function (mousepos) {
    var diff = vec2.scale_ip(
      vec2.sub([], mousepos, this.prevpos),
      1 / viewport_width
    );
    if (this.mode == 'rotate') {
      var theta = vec2.scale([], diff, 1.7 * Math.PI);
      var rot_hrz = quat.setAxisAngle([], this.up, -theta[0]);
      var rot_vrt = quat.setAxisAngle([], this.right(), theta[1]);
      var rot = quat.mul([], rot_vrt, rot_hrz);
      this.eye = vec3.transformQuat([], this.center_to_eye(), rot);
      vec3.add_ip(this.eye, this.center);
      vec3.transformQuat_ip(this.up, rot);
    } else if (this.mode == 'pan') {
      var s = vec2.scale([], diff, vec3.len(this.center_to_eye()));
      var d0 = vec3.scale([], this.right(), -s[0]);
      var d1 = vec3.scale([], this.up, -s[1]);
      var d = vec3.add([], d0, d1);
      vec3.add_ip(this.eye, d);
      vec3.add_ip(this.center, d);
    } else if (this.mode == 'zoom') {
      var d = vec3.scale([], this.eye_to_center(), diff[0] - diff[1]);
      vec3.add_ip(this.eye, d);
    }
    vec2.copy(this.prevpos, mousepos);
  };
  camera.finish_moving = function () {
    this.mode = 'none';
  };
  return camera;
}
