import {vec3} from 'gl-matrix';

export namespace colormap {
  function _internal(colors: vec3[], t: number) {
    t = Math.max(0, Math.min(1, t));
    let n = colors.length - 1;
    let nt = n * t;
    let i = Math.floor(nt);
    let dt = nt - i;
    let j = i == n ? i : i + 1;
    return vec3.lerp(vec3.create(), colors[i], colors[j], dt);
  }
  // http://www.mathworks.com/matlabcentral/fileexchange/35242-matlab-plot-gallery-colormap-chart/content/html/Colormap_Chart.html
  export function parula(t: number) {
    let colors: vec3[] = [
      [53 / 255, 42 / 255, 135 / 255],
      [19 / 255, 136 / 255, 211 / 255],
      [73 / 255, 188 / 255, 148 / 255],
      [236 / 255, 185 / 255, 76 / 255],
      [249 / 255, 251 / 255, 14 / 255],
    ];
    return _internal(colors, t);
  }
  export function jet(t: number) {
    let colors: vec3[] = [
      [0, 0, 0.5],
      [0, 0, 1],
      [0, 1, 1],
      [1, 1, 0],
      [1, 0, 0],
      [0.5, 0, 0],
    ];
    return _internal(colors, t);
  }
  export function hsv(t: number) {
    let colors: vec3[] = [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
      [1, 0, 1],
      [1, 0, 0],
    ];
    return _internal(colors, t);
  }
  export function hot(t: number) {
    let colors: vec3[] = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ];
    return _internal(colors, t);
  }
  export function cool(t: number) {
    let colors: vec3[] = [
      [0, 1, 1],
      [1, 0, 1],
    ];
    return _internal(colors, t);
  }
  export function spring(t: number) {
    let colors: vec3[] = [
      [1, 0, 1],
      [1, 1, 0],
    ];
    return _internal(colors, t);
  }
  export function summer(t: number) {
    let colors: vec3[] = [
      [0, 0.5, 0],
      [1, 1, 0],
    ];
    return _internal(colors, t);
  }
  export function autumn(t: number) {
    let colors: vec3[] = [
      [1, 0, 0],
      [1, 1, 0],
    ];
    return _internal(colors, t);
  }
  export function winter(t: number) {
    let colors: vec3[] = [
      [0, 0, 1],
      [0, 1, 0.5],
    ];
    return _internal(colors, t);
  }
  export function gray(t: number) {
    let colors: vec3[] = [
      [0, 0, 0],
      [1, 1, 1],
    ];
    return _internal(colors, t);
  }
  export function bone(t: number) {
    let colors: vec3[] = [
      [0, 0, 0],
      [119 / 255, 135 / 255, 151 / 255],
      [1, 1, 1],
    ];
    return _internal(colors, t);
  }
  export function copper(t: number) {
    let colors: vec3[] = [
      [0, 0, 0],
      [1, 199 / 255, 127 / 255],
    ];
    return _internal(colors, t);
  }
  export function pink(t: number) {
    let colors: vec3[] = [
      [60 / 255, 0, 0],
      [212 / 255, 184 / 255, 152 / 255],
      [1, 1, 1],
    ];
    return _internal(colors, t);
  }
}
