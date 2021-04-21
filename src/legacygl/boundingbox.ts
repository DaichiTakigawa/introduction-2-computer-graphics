import {vec3} from 'gl-matrix';

export class BBox {
  private min: vec3;
  private max: vec3;

  constructor() {
    this.set_empty();
  }

  set_empty() {
    this.min = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE];
    this.max = [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE];
  }

  extend(p: vec3) {
    this.min = vec3.min(this.min, this.min, p);
    this.max = vec3.max(this.max, this.max, p);
  }

  diagonal() {
    return vec3.sub(vec3.create(), this.max, this.min);
  }

  diagonal_norm() {
    return vec3.len(this.diagonal());
  }

  center() {
    return vec3.lerp(vec3.create(), this.max, this.min, 0.5);
  }

  is_empty() {
    return !(
      this.min[0] < this.max[0] &&
      this.min[1] < this.max[1] &&
      this.min[2] < this.max[2]
    );
  }
}

export function make_boundingbox() {
  return new BBox();
}
