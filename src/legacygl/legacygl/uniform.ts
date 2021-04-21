import {vec2, vec3, vec4, mat2, mat3, mat4} from 'gl-matrix';

export type UniformType =
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

export type UniformValue = number | vec2 | vec3 | vec4 | mat2 | mat3 | mat4;

interface UniformBase {
  location: WebGLUniformLocation;
  type: UniformType;
  is_array: boolean;
  value: UniformValue | UniformValue[];
}

export class ArrayUniform implements UniformBase {
  location: WebGLUniformLocation;
  is_array: true;
  type: UniformType;
  value: UniformValue[];

  constructor(location: WebGLUniformLocation, type: UniformType, size: number) {
    this.location = location;
    this.type = type;
    this.is_array = true;
    function make_default_value() {
      const default_value =
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
    this.value = [];
    for (let i = 0; i < size; ++i) this.value.push(make_default_value());
  }
}

export class Uniform implements UniformBase {
  location: WebGLUniformLocation;
  type: UniformType;
  is_array: false;
  value: UniformValue;
  stack: UniformValue[];

  constructor(location: WebGLUniformLocation, type: UniformType) {
    this.location = location;
    this.type = type;
    this.is_array = false;
    this.value =
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
    this.stack = [];
  }

  push() {
    const copy =
      this.type == '1f' || this.type == '1i'
        ? (this.value as number)
        : this.type == '2f' || this.type == '2i'
        ? vec2.copy(vec2.create(), this.value as vec2)
        : this.type == '3f' || this.type == '3i'
        ? vec3.copy(vec3.create(), this.value as vec3)
        : this.type == '4f' || this.type == '4i'
        ? vec4.copy(vec4.create(), this.value as vec4)
        : this.type == 'Matrix2f'
        ? mat2.copy(mat2.create(), this.value as mat2)
        : this.type == 'Matrix3f'
        ? mat3.copy(mat3.create(), this.value as mat3)
        : this.type == 'Matrix4f'
        ? mat4.copy(mat4.create(), this.value as mat4)
        : undefined;
    this.stack.push(copy);
  }

  pop() {
    const copy = this.stack[this.stack.length - 1];
    this.value =
      this.type == '1f' || this.type == '1i'
        ? (copy as number)
        : this.type == '2f' || this.type == '2i'
        ? vec2.copy(vec2.create(), copy as vec2)
        : this.type == '3f' || this.type == '3i'
        ? vec3.copy(vec3.create(), copy as vec3)
        : this.type == '4f' || this.type == '4i'
        ? vec4.copy(vec4.create(), copy as vec4)
        : this.type == 'Matrix2f'
        ? mat2.copy(mat2.create(), copy as mat2)
        : this.type == 'Matrix3f'
        ? mat3.copy(mat3.create(), copy as mat3)
        : this.type == 'Matrix4f'
        ? mat4.copy(mat4.create(), copy as mat4)
        : undefined;
    this.stack.pop();
  }
}
