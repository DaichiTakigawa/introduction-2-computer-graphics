import {vec2, vec3, vec4, mat2, mat3, mat4} from 'gl-matrix';

export type ScalarUniformType = '1f' | '1i';
export type Vec2UniformType = '2f' | '2i';
export type Vec3UniformType = '3f' | '3i';
export type Vec4UniformType = '4f' | '4i';
export type Mat2UniformType = 'Matrix2f';
export type Mat3UniformType = 'Matrix3f';
export type Mat4UniformType = 'Matrix4f';

export type UniformType =
  | ScalarUniformType
  | Vec2UniformType
  | Vec3UniformType
  | Vec4UniformType
  | Mat2UniformType
  | Mat3UniformType
  | Mat4UniformType;

export type UniformValue = number | vec2 | vec3 | vec4 | mat2 | mat3 | mat4;

abstract class UniformBase {
  location: WebGLUniformLocation;
  is_array: false;
  abstract type: UniformType;
  abstract value: UniformValue;
  abstract stack: UniformValue[];
  constructor(location: WebGLUniformLocation) {
    this.location = location;
    this.is_array = false;
  }
  abstract push(): void;
  abstract pop(): void;
}

export class ScalarUniform extends UniformBase {
  type: ScalarUniformType;
  value: number;
  stack: number[];
  constructor(location: WebGLUniformLocation, type: ScalarUniformType) {
    super(location);
    this.type = type;
    this.value = 0;
    this.stack = [];
  }
  pop(): void {
    const copy = this.value;
    this.stack.push(copy);
  }
  push(): void {
    const copy = this.stack[this.stack.length - 1];
    this.value = copy;
    this.stack.pop();
  }
}

export class Vec2Uniform extends UniformBase {
  type: Vec2UniformType;
  value: vec2;
  stack: vec2[];
  constructor(location: WebGLUniformLocation, type: Vec2UniformType) {
    super(location);
    this.type = type;
    this.value = vec2.create();
    this.stack = [];
  }
  push(): void {
    const copy = vec2.copy(vec2.create(), this.value);
    this.stack.push(copy);
  }
  pop(): void {
    const copy = this.stack[this.stack.length - 1];
    this.value = vec2.copy(vec2.create(), copy);
    this.stack.pop();
  }
}

export class Vec3Uniform extends UniformBase {
  type: Vec3UniformType;
  value: vec3;
  stack: vec3[];
  constructor(location: WebGLUniformLocation, type: Vec3UniformType) {
    super(location);
    this.type = type;
    this.value = vec3.create();
    this.stack = [];
  }
  push(): void {
    const copy = vec3.copy(vec3.create(), this.value);
    this.stack.push(copy);
  }
  pop(): void {
    const copy = this.stack[this.stack.length - 1];
    this.value = vec3.copy(vec3.create(), copy);
    this.stack.pop();
  }
}

export class Vec4Uniform extends UniformBase {
  type: Vec4UniformType;
  value: vec4;
  stack: vec4[];
  constructor(location: WebGLUniformLocation, type: Vec4UniformType) {
    super(location);
    this.type = type;
    this.value = vec4.create();
    this.stack = [];
  }
  push(): void {
    const copy = vec4.copy(vec4.create(), this.value);
    this.stack.push(copy);
  }
  pop(): void {
    const copy = this.stack[this.stack.length - 1];
    this.value = vec4.copy(vec4.create(), copy);
    this.stack.pop();
  }
}

export class Mat2Uniform extends UniformBase {
  type: Mat2UniformType;
  value: mat2;
  stack: mat2[];
  constructor(location: WebGLUniformLocation) {
    super(location);
    this.type = 'Matrix2f';
    this.value = mat2.create();
    this.stack = [];
  }
  push(): void {
    const copy = mat2.copy(mat2.create(), this.value);
    this.stack.push(copy);
  }
  pop(): void {
    const copy = this.stack[this.stack.length - 1];
    this.value = mat2.copy(mat2.create(), copy);
    this.stack.pop();
  }
}

export class Mat3Uniform extends UniformBase {
  type: Mat3UniformType;
  value: mat3;
  stack: mat3[];
  constructor(location: WebGLUniformLocation) {
    super(location);
    this.type = 'Matrix3f';
    this.value = mat3.create();
    this.stack = [];
  }
  push(): void {
    const copy = mat3.copy(mat3.create(), this.value);
    this.stack.push(copy);
  }
  pop(): void {
    const copy = this.stack[this.stack.length - 1];
    this.value = mat3.copy(mat3.create(), copy);
    this.stack.pop();
  }
}

export class Mat4Uniform extends UniformBase {
  type: Mat4UniformType;
  value: mat4;
  stack: mat4[];
  constructor(location: WebGLUniformLocation) {
    super(location);
    this.type = 'Matrix4f';
    this.value = mat4.create();
    this.stack = [];
  }
  push(): void {
    const copy = mat4.copy(mat4.create(), this.value);
    this.stack.push(copy);
  }
  pop(): void {
    const copy = this.stack[this.stack.length - 1];
    this.value = mat4.copy(mat4.create(), copy);
    this.stack.pop();
  }
}

abstract class ArrayUniformBase {
  location: WebGLUniformLocation;
  is_array: true;
  abstract type: UniformType;
  abstract value: UniformValue[];
  constructor(location: WebGLUniformLocation) {
    this.location = location;
    this.is_array = true;
  }
}

export class ScalarArrayUniform extends ArrayUniformBase {
  type: ScalarUniformType;
  value: number[];
  constructor(
    location: WebGLUniformLocation,
    type: ScalarUniformType,
    size: number
  ) {
    super(location);
    this.type = type;
    this.value = [];
    for (let i = 0; i < size; ++i) this.value.push(0);
  }
}

export class Vec2ArrayUniform extends ArrayUniformBase {
  type: Vec2UniformType;
  value: vec2[];
  constructor(
    location: WebGLUniformLocation,
    type: Vec2UniformType,
    size: number
  ) {
    super(location);
    this.type = type;
    this.value = [];
    for (let i = 0; i < size; ++i) this.value.push(vec2.create());
  }
}

export class Vec3ArrayUniform extends ArrayUniformBase {
  type: Vec3UniformType;
  value: vec3[];
  constructor(
    location: WebGLUniformLocation,
    type: Vec3UniformType,
    size: number
  ) {
    super(location);
    this.type = type;
    this.value = [];
    for (let i = 0; i < size; ++i) this.value.push(vec3.create());
  }
}

export class Vec4ArrayUniform extends ArrayUniformBase {
  type: Vec4UniformType;
  value: vec4[];
  constructor(
    location: WebGLUniformLocation,
    type: Vec4UniformType,
    size: number
  ) {
    super(location);
    this.type = type;
    this.value = [];
    for (let i = 0; i < size; ++i) this.value.push(vec4.create());
  }
}

export class Mat2ArrayUniform extends ArrayUniformBase {
  type: Mat2UniformType;
  value: mat2[];
  constructor(location: WebGLUniformLocation, size: number) {
    super(location);
    this.type = 'Matrix2f';
    this.value = [];
    for (let i = 0; i < size; ++i) this.value.push(mat2.create());
  }
}

export class Mat3ArrayUniform extends ArrayUniformBase {
  type: Mat3UniformType;
  value: mat3[];
  constructor(location: WebGLUniformLocation, size: number) {
    super(location);
    this.type = 'Matrix3f';
    this.value = [];
    for (let i = 0; i < size; ++i) this.value.push(mat3.create());
  }
}

export class Mat4ArrayUniform extends ArrayUniformBase {
  type: Mat4UniformType;
  value: mat4[];
  constructor(location: WebGLUniformLocation, size: number) {
    super(location);
    this.type = 'Matrix4f';
    this.value = [];
    for (let i = 0; i < size; ++i) this.value.push(mat4.create());
  }
}

export type Uniform =
  | ScalarUniform
  | Vec2Uniform
  | Vec3Uniform
  | Vec4Uniform
  | Mat2Uniform
  | Mat3Uniform
  | Mat4Uniform;

export type ArrayUniform =
  | ScalarArrayUniform
  | Vec2ArrayUniform
  | Vec3ArrayUniform
  | Vec4ArrayUniform
  | Mat2ArrayUniform
  | Mat3ArrayUniform
  | Mat4ArrayUniform;
