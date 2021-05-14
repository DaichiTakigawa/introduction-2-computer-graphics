import {vec2, vec3, vec4, mat4} from 'gl-matrix';
import {
  get_legacygl,
  get_drawutil,
  get_camera,
  glu,
  LegacyGL,
  DrawUtil,
  Camera,
  Mat4Uniform,
} from '../legacygl';

interface MyLegacyGL extends LegacyGL {
  vertex2(a: vec2): void;
}

let gl: WebGLRenderingContext;
let canvas: HTMLCanvasElement;
let legacygl: MyLegacyGL;
let drawutil: DrawUtil;
let camera: Camera;

interface Linkage {
  angle: number;
  length: number;
  position?: vec2;
}

const linkages: Linkage[] = [
  {angle: 0, length: 0.8},
  {angle: 0, length: 0.9},
  {angle: 0, length: 1.5},
  {angle: 0, length: 0.7},
];
let is_dragging = false;

function update_position() {
  linkages.forEach(function (linkage, index) {
    linkage.position = [0, 0];
    let angle_sum = 0;
    for (let j = 0; j <= index; ++j) {
      angle_sum += linkages[j].angle;
      linkage.position[0] +=
        linkages[j].length * Math.cos((angle_sum * Math.PI) / 180);
      linkage.position[1] +=
        linkages[j].length * Math.sin((angle_sum * Math.PI) / 180);
    }
  });
}

function compute_ik(target_position: vec3) {
  // TODO
}

function draw() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // projection & camera position
  const projection = legacygl.uniforms.projection as Mat4Uniform;
  mat4.perspective(
    projection.value,
    Math.PI / 6,
    canvas.aspect_ratio(),
    0.1,
    1000
  );
  const modelview = legacygl.uniforms.modelview as Mat4Uniform;
  camera.lookAt(modelview.value);

  // xy grid
  gl.lineWidth(1);
  legacygl.color(0.5, 0.5, 0.5);
  drawutil.xygrid(100);

  // linkages
  const input_selected = document.getElementById(
    'input_selected'
  ) as HTMLInputElement;
  const selected = Number(input_selected.value);
  legacygl.begin(gl.LINES);
  linkages.forEach(function (linkage, index) {
    if (index == selected) legacygl.color(1, 0, 0);
    else legacygl.color(0, 0, 0);
    if (index == 0) legacygl.vertex(0, 0, 0);
    else legacygl.vertex2(linkages[index - 1].position);
    legacygl.vertex2(linkage.position);
  });
  legacygl.end();
  legacygl.begin(gl.POINTS);
  legacygl.color(0, 0, 0);
  legacygl.vertex(0, 0, 0);
  linkages.forEach(function (linkage, index) {
    if (index == selected) legacygl.color(1, 0, 0);
    else legacygl.color(0, 0, 0);
    legacygl.vertex2(linkage.position);
  });
  legacygl.end();
}
function init() {
  // OpenGL context
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  gl = canvas.getContext('experimental-webgl') as WebGLRenderingContext;
  if (!gl) alert('Could not initialise WebGL, sorry :-(');
  const vertex_shader_src =
    '\
    attribute vec3 a_vertex;\
    attribute vec3 a_color;\
    varying vec3 v_color;\
    uniform mat4 u_modelview;\
    uniform mat4 u_projection;\
    void main(void) {\
      gl_Position = u_projection * u_modelview * vec4(a_vertex, 1.0);\
      v_color = a_color;\
      gl_PointSize = 5.0;\
    }\
    ';
  const fragment_shader_src =
    '\
    precision mediump float;\
    varying vec3 v_color;\
    void main(void) {\
      gl_FragColor = vec4(v_color, 1.0);\
    }\
    ';
  legacygl = get_legacygl(
    gl,
    vertex_shader_src,
    fragment_shader_src
  ) as MyLegacyGL;
  legacygl.add_uniform('modelview', 'Matrix4f');
  legacygl.add_uniform('projection', 'Matrix4f');
  legacygl.add_vertex_attribute('color', 3);
  legacygl.vertex2 = function (p) {
    this.vertex(p[0], p[1], 0);
  };
  drawutil = get_drawutil(gl, legacygl);
  camera = get_camera(canvas.width);
  camera.center = [2, 0, 0];
  camera.eye = [2, 0, 7];
  update_position();
  // event handlers
  canvas.onmousedown = function (evt) {
    const mouse_win = canvas.get_mousepos(evt);
    if (evt.altKey) {
      camera.start_moving(mouse_win, evt.shiftKey ? 'zoom' : 'pan');
      return;
    }
    const input_ikmode = document.getElementById(
      'input_ikmode'
    ) as HTMLInputElement;
    if (input_ikmode.checked) is_dragging = true;
  };
  canvas.onmousemove = function (evt) {
    const mouse_win = canvas.get_mousepos(evt);
    if (camera.is_moving()) {
      camera.move(mouse_win);
      draw();
      return;
    }
    if (!is_dragging) return;
    const viewport = [0, 0, canvas.width, canvas.height] as vec4;
    const mouse_pos = [mouse_win[0], mouse_win[1], 1] as vec3;
    const modelview = legacygl.uniforms.modelview as Mat4Uniform;
    const projection = legacygl.uniforms.projection as Mat4Uniform;
    const mouse_obj = glu.unproject(
      mouse_pos,
      modelview.value,
      projection.value,
      viewport
    );
    // just reuse the same code as the 3D case
    const plane_origin: vec3 = [0, 0, 0];
    const plane_normal: vec3 = [0, 0, 1];
    const eye_to_mouse = vec3.sub(vec3.create(), mouse_obj, camera.eye);
    const eye_to_origin = vec3.sub(vec3.create(), plane_origin, camera.eye);
    const s1 = vec3.dot(eye_to_mouse, plane_normal);
    const s2 = vec3.dot(eye_to_origin, plane_normal);
    const eye_to_intersection = vec3.scale(
      vec3.create(),
      eye_to_mouse,
      s2 / s1
    );
    const target_position = vec3.add(
      vec3.create(),
      camera.eye,
      eye_to_intersection
    );
    compute_ik(target_position);
    draw();
    (document.getElementById('input_selected') as HTMLInputElement).onchange(
      null
    );
  };
  document.onmouseup = function (evt) {
    if (camera.is_moving()) {
      camera.finish_moving();
      return;
    }
    is_dragging = false;
  };
  const input_selected = document.getElementById(
    'input_selected'
  ) as HTMLInputElement;
  input_selected.max = String(linkages.length - 1);
  input_selected.onchange = function () {
    const input_angle = document.getElementById(
      'input_angle'
    ) as HTMLInputElement;
    input_angle.value = String(linkages[Number(input_selected.value)].angle);
    draw();
  };
  const input_angle = document.getElementById(
    'input_angle'
  ) as HTMLInputElement;
  input_angle.onchange = function () {
    const selected = Number(input_selected.value);
    linkages[selected].angle = Number(input_angle.value);
    update_position();
    draw();
  };
  // init OpenGL settings
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1, 1, 1, 1);
}

declare global {
  interface Window {
    init(): void;
    draw(): void;
  }
}

window.init = init;
window.draw = draw;
