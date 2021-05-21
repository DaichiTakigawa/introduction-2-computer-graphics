import {vec2, vec3, vec4, mat2, mat4} from 'gl-matrix';
import * as SVDJS from 'svd-js';
import {
  get_legacygl,
  get_drawutil,
  get_camera,
  glu,
  LegacyGL,
  DispListWrapper,
  DrawUtil,
  Camera,
  Mat4Uniform,
} from '../legacygl';

interface MyLegacyGL extends LegacyGL {
  vertex2(a: vec2): void;
  color3(a: vec3): void;
}

let gl: WebGLRenderingContext;
let canvas: HTMLCanvasElement;
let legacygl: MyLegacyGL;
let displist: DispListWrapper;
let drawutil: DrawUtil;
let camera: Camera;

interface Scene {
  particles: Particle[];
  constraints: (DistanceConstraint | ShapeMatchingConstraint)[];
  walls: Wall[];
  chains: Chain[];
  boxes: Box[];
}

const scene: Scene = {
  particles: [],
  constraints: [],
  walls: [],
  chains: [],
  boxes: [],
};

interface Param {
  gravity: vec2;
  timestep: number;
  damping: number;
  solver_iterations: number;
  userhandle_springcoeff: number;
  stiffness: number; // set same stiffness globally (for testing)
}

const param: Param = {
  gravity: [0, -9.8],
  timestep: 1 / 60,
  damping: 0.005,
  solver_iterations: 2,
  userhandle_springcoeff: 100,
  stiffness: 1, // set same stiffness globally (for testing)
};

let selected_particle: Particle = null;
let userhandle_position: vec2 = null;
const EPSILON = 1.0e-16;

class Particle {
  id: number;
  mass: number;
  position: vec2;
  velocity: vec2;
  coef_restitution: number;
  coef_friction: number;
  position_temp: vec2;
  relative_position: vec2;
  relative_position_rest: vec2;

  constructor(
    id: number,
    mass: number,
    init_position: vec2,
    init_velocity: vec2,
    coef_restitution: number,
    coef_friction: number
  ) {
    this.id = id;
    this.mass = mass;
    this.position = init_position;
    this.velocity = init_velocity;
    this.coef_restitution = coef_restitution;
    this.coef_friction = coef_friction;
  }
}

class Wall {
  id: number;
  position: vec2;
  normal: vec2;

  constructor(id: number, position: vec2, normal: vec2) {
    this.id = id;
    this.position = position;
    this.normal = normal;
  }

  dist(position: vec2) {
    return vec2.dot(
      this.normal,
      vec2.sub(vec2.create(), position, this.position)
    );
  }
}

class DistanceConstraint {
  id: number;
  particle1: Particle;
  particle2: Particle;
  restlength: number;
  stiffness: number;

  constructor(
    id: number,
    particle1: Particle,
    particle2: Particle,
    stiffness: number
  ) {
    this.id = id;
    this.particle1 = particle1;
    this.particle2 = particle2;
    this.restlength = vec2.len(
      vec2.sub(vec2.create(), particle1.position, particle2.position)
    );
    this.stiffness = stiffness;
  }

  enforce() {
    const p1 = this.particle1.position_temp;
    const p2 = this.particle2.position_temp;
    const dir = vec2.sub(vec2.create(), p1, p2);
    const len = vec2.len(dir);
    if (len < EPSILON) return;
    const w1 = 1 / this.particle1.mass;
    const w2 = 1 / this.particle2.mass;
    if (w1 + w2 < EPSILON) return;
    const stiffness_adapted =
      1 - Math.pow(1 - this.stiffness, 1 / param.solver_iterations);
    const delta_p = vec2.scale(
      vec2.create(),
      dir,
      ((len - this.restlength) * stiffness_adapted) / ((w1 + w2) * len)
    );
    this.particle1.position_temp = vec2.add(
      vec2.create(),
      p1,
      vec2.scale(vec2.create(), delta_p, -w1)
    );
    this.particle2.position_temp = vec2.add(
      vec2.create(),
      p2,
      vec2.scale(vec2.create(), delta_p, w2)
    );
  }
}

function tensor2(a: vec2, b: vec2) {
  // tensor product between column vector a and row vector b
  return mat2.fromValues(a[0] * b[0], a[1] * b[0], a[0] * b[1], a[1] * b[1]);
}

function diag(a: vec2) {
  return mat2.fromValues(a[0], 0, 0, a[1]);
}

function mat2_vec2_prod(A: mat2, b: vec2) {
  return [A[0] * b[0] + A[2] * b[1], A[1] * b[0] + A[3] * b[1]] as vec2;
}

function compute_svd(A: mat2) {
  // https://github.com/danilosalvati/svd-js
  const {u, v, q} = SVDJS.SVD([
    [A[0], A[2]],
    [A[1], A[3]],
  ]);
  return {
    U: mat2.fromValues(u[0][0], u[1][0], u[0][1], u[1][1]),
    S: [q[0], q[1]],
    V: mat2.fromValues(v[0][0], v[1][0], v[0][1], v[1][1]),
  };
}

class ShapeMatchingConstraint {
  id: number;
  particles: Particle[];
  stiffness: number;

  constructor(id: number, particles: Particle[], stiffness: number) {
    this.id = id;
    this.particles = particles;
    this.stiffness = stiffness;
    // store rest configuration
    const centerofmass_rest: vec2 = [0, 0];
    particles.forEach(function (particle) {
      vec2.add_ip(centerofmass_rest, particle.position);
    });
    vec2.scale_ip(centerofmass_rest, 1 / particles.length);
    particles.forEach(function (particle) {
      particle.relative_position_rest = vec2.sub(
        vec2.create(),
        particle.position,
        centerofmass_rest
      );
    });
  }

  enforce() {
    // compute current configuration
    const centerofmass: vec2 = [0, 0];
    this.particles.forEach(function (particle) {
      vec2.add_ip(centerofmass, particle.position_temp);
    });
    vec2.scale_ip(centerofmass, 1 / this.particles.length);
    // A = sum(m_i * p_i * q_i^t)
    const A: mat2 = [0, 0, 0, 0];
    this.particles.forEach(function (particle) {
      particle.relative_position = vec2.sub(
        vec2.create(),
        particle.position_temp,
        centerofmass
      );
      mat2.add_ip(
        A,
        mat2.multiplyScalar(
          mat2.create(),
          tensor2(particle.relative_position, particle.relative_position_rest),
          particle.mass
        )
      );
    });
    // A = R * S = R * sqrt(A^t * A) = R * U * sqrt(Sigma) * V^t
    // R = A * S^(-1) = A * V * Sigma^(-0.5) * U^t
    const AtA = mat2.mul(mat2.create(), mat2.transpose(mat2.create(), A), A);
    const svd = compute_svd(AtA);
    const Ut = mat2.transpose(mat2.create(), svd.U);
    const V = svd.V;
    const D = diag([1 / Math.sqrt(svd.S[0]), 1 / Math.sqrt(svd.S[1])]);
    const Sinv = mat2.mul(mat2.create(), V, mat2.mul(mat2.create(), D, Ut));
    const R = mat2.mul(mat2.create(), A, Sinv);
    const stiffness_adapted =
      1 - Math.pow(1 - this.stiffness, 1 / param.solver_iterations);
    this.particles.forEach(function (particle) {
      const goal_position = vec2.add(
        vec2.create(),
        mat2_vec2_prod(R, particle.relative_position_rest),
        centerofmass
      );
      const delta_p = vec2.sub(
        vec2.create(),
        goal_position,
        particle.position_temp
      );
      vec2.add_ip(
        particle.position_temp,
        vec2.scale(vec2.create(), delta_p, stiffness_adapted)
      );
    });
  }
}

class Chain {
  id: number;
  color: vec3;
  particles: Particle[];

  constructor(
    id: number,
    color: vec3,
    start_position: vec2,
    num_segments: number,
    segment_length: number
  ) {
    this.id = id;
    this.color = color;
    this.particles = [];
    let prev_particle: Particle;
    for (let i = 0; i <= num_segments; ++i) {
      const particle = new Particle(
        scene.particles.length,
        i == 0 ? Number.POSITIVE_INFINITY : 0.1,
        vec2.add(vec2.create(), start_position, [0, -segment_length * i]),
        [0, 0],
        0.05,
        0.5
      );
      this.particles.push(particle);
      scene.particles.push(particle);
      if (i > 0)
        scene.constraints.push(
          new DistanceConstraint(
            scene.constraints.length,
            prev_particle,
            particle,
            param.stiffness
          )
        );
      prev_particle = particle;
    }
  }
}

class Box {
  id: number;
  color: vec3;
  particles: Particle[];

  constructor(
    id: number,
    color: vec3,
    start_position: vec2,
    num_segments: number,
    segment_length: number
  ) {
    this.id = id;
    this.color = color;
    this.particles = [];
    let position = start_position;
    for (let i = 0; i < num_segments; ++i) {
      const particle = new Particle(
        scene.particles.length,
        0.1,
        position,
        [0, 0],
        0.9,
        0.9
      );
      this.particles.push(particle);
      scene.particles.push(particle);
      position = vec2.add(vec2.create(), position, [segment_length, 0]);
    }
    for (let i = 0; i < num_segments; ++i) {
      const particle = new Particle(
        scene.particles.length,
        0.1,
        position,
        [0, 0],
        0.9,
        0.9
      );
      this.particles.push(particle);
      scene.particles.push(particle);
      position = vec2.add(vec2.create(), position, [0, segment_length]);
    }
    for (let i = 0; i < num_segments; ++i) {
      const particle = new Particle(
        scene.particles.length,
        0.1,
        position,
        [0, 0],
        0.9,
        0.9
      );
      this.particles.push(particle);
      scene.particles.push(particle);
      position = vec2.add(vec2.create(), position, [-segment_length, 0]);
    }
    for (let i = 0; i < num_segments; ++i) {
      const particle = new Particle(
        scene.particles.length,
        0.1,
        position,
        [0, 0],
        0.9,
        0.9
      );
      this.particles.push(particle);
      scene.particles.push(particle);
      position = vec2.add(vec2.create(), position, [0, -segment_length]);
    }
    scene.particles.concat(this.particles);
    scene.constraints.push(
      new ShapeMatchingConstraint(
        scene.constraints.length,
        this.particles,
        param.stiffness
      )
    );
  }
}

function simulateOneStep() {
  // step numbers according to Mueller's VRIPhys06 paper
  scene.particles.forEach(function (particle) {
    // (5) velocity affected by external forces
    let force = param.gravity;
    if (particle == selected_particle)
      force = vec2.add(
        vec2.create(),
        force,
        vec2.scale(
          vec2.create(),
          vec2.sub(vec2.create(), userhandle_position, particle.position),
          param.userhandle_springcoeff
        )
      );
    particle.velocity = vec2.add(
      vec2.create(),
      particle.velocity,
      vec2.scale(vec2.create(), force, param.timestep / particle.mass)
    );
    // (6) damp velocity
    particle.velocity = vec2.scale(
      vec2.create(),
      particle.velocity,
      1 - param.damping
    );
    // (7) predicted position
    particle.position_temp = vec2.add(
      vec2.create(),
      particle.position,
      vec2.scale(vec2.create(), particle.velocity, param.timestep)
    );
    // detect & resolve collision against walls (cf. http://matthias-mueller-fischer.ch/demos/matching2dSource.zip)
    // instead of doing step (8) ... is this correct?
    scene.walls.forEach(function (wall) {
      let dist = wall.dist(particle.position_temp);
      if (dist <= 0) {
        let velocity_normal = vec2.scale(
          vec2.create(),
          wall.normal,
          vec2.dot(wall.normal, particle.velocity)
        );
        let velocity_tangent = vec2.sub(
          vec2.create(),
          particle.velocity,
          velocity_normal
        );
        velocity_normal = vec2.scale(
          vec2.create(),
          velocity_normal,
          -particle.coef_restitution
        );
        velocity_tangent = vec2.scale(
          vec2.create(),
          velocity_tangent,
          1 - particle.coef_friction
        );
        particle.position_temp = vec2.add(
          vec2.create(),
          particle.position,
          vec2.scale(
            vec2.create(),
            vec2.add(vec2.create(), velocity_normal, velocity_tangent),
            param.timestep
          )
        );
        dist = wall.dist(particle.position_temp);
        if (dist < 0)
          particle.position_temp = vec2.add(
            vec2.create(),
            particle.position_temp,
            vec2.scale(vec2.create(), wall.normal, -dist)
          );
      }
    });
  });
  // (9)-(11) iteratively enforce constraints in sequence
  for (let iter = 0; iter < param.solver_iterations; ++iter) {
    scene.constraints.forEach(function (constraint) {
      constraint.enforce();
    });
  }
  // (12)-(15) update velocity & position
  scene.particles.forEach(function (particle) {
    particle.velocity = vec2.scale(
      vec2.create(),
      vec2.sub(vec2.create(), particle.position_temp, particle.position),
      1 / param.timestep
    );
    particle.position = particle.position_temp;
  });
  // step (16) doesn't seem necessary ... is this correct?
}

function draw() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // projection & camera position
  const projectionMatrix = legacygl.uniforms.projectionMatrix as Mat4Uniform;
  mat4.perspective(
    projectionMatrix.value,
    Math.PI / 6,
    canvas.aspect_ratio(),
    0.1,
    1000
  );
  const modelviewMatrix = legacygl.uniforms.modelviewMatrix as Mat4Uniform;
  camera.lookAt(modelviewMatrix.value);

  // xy grid
  gl.lineWidth(1);
  legacygl.color(0.5, 0.5, 0.5);
  drawutil.xygrid(100);

  // walls
  legacygl.color(0, 0, 1);
  legacygl.begin(gl.LINES);
  scene.walls.forEach(function (wall) {
    const d: vec2 = [1000 * wall.normal[1], -1000 * wall.normal[0]];
    legacygl.vertex2(vec2.add(vec2.create(), wall.position, d));
    legacygl.vertex2(vec2.sub(vec2.create(), wall.position, d));
    legacygl.vertex2(wall.position);
    legacygl.vertex2(
      vec2.add(
        vec2.create(),
        wall.position,
        vec2.scale(vec2.create(), wall.normal, 0.1)
      )
    );
  });
  legacygl.end();

  // animated objects
  displist.draw(function () {
    // chains
    legacygl.begin(gl.LINES);
    scene.chains.forEach(function (chain) {
      legacygl.color3(chain.color);
      chain.particles.forEach(function (particle, i) {
        if (i == 0) return;
        legacygl.vertex2(particle.position);
        legacygl.vertex2(chain.particles[i - 1].position);
      });
    });
    legacygl.end();
    // boxes
    legacygl.begin(gl.TRIANGLES);
    scene.boxes.forEach(function (box) {
      legacygl.color3(box.color);
      let g: vec2 = [0, 0];
      box.particles.forEach(function (particle) {
        g = vec2.add(vec2.create(), g, particle.position);
      });
      g = vec2.scale(vec2.create(), g, 1 / box.particles.length);
      box.particles.forEach(function (particle, i) {
        legacygl.vertex2(g);
        legacygl.vertex2(particle.position);
        legacygl.vertex2(
          box.particles[(i + 1) % box.particles.length].position
        );
      });
    });
    legacygl.end();
    // particles
    legacygl.begin(gl.POINTS);
    scene.particles.forEach(function (particle) {
      if (particle.mass == Number.POSITIVE_INFINITY) legacygl.color(1, 0, 0);
      else legacygl.color(0, 0, 0);
      legacygl.vertex2(particle.position);
    });
    legacygl.end();
  });
  // user handle
  if (selected_particle) {
    legacygl.color(1, 0, 0);
    legacygl.begin(gl.LINES);
    legacygl.vertex2(selected_particle.position);
    legacygl.vertex2(userhandle_position);
    legacygl.end();
    legacygl.begin(gl.POINTS);
    legacygl.vertex2(selected_particle.position);
    legacygl.vertex2(userhandle_position);
    legacygl.end();
  }
}

function animLoop() {
  simulateOneStep();
  displist.invalidate();
  draw();
  const input_chk_simulate = document.getElementById(
    'input_chk_simulate'
  ) as HTMLInputElement;
  if (input_chk_simulate.checked)
    window.setTimeout(animLoop, param.timestep * 1000);
}

function init() {
  // OpenGL context
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  gl = canvas.getContext('experimental-webgl') as WebGLRenderingContext;
  if (!gl) alert('Could not initialize WebGL!');
  const vertex_shader_src =
    '\
    attribute vec3 a_vertex;\
    attribute vec3 a_color;\
    varying vec3 v_color;\
    uniform mat4 u_modelviewMatrix;\
    uniform mat4 u_projectionMatrix;\
    void main(void) {\
      gl_Position = u_projectionMatrix * u_modelviewMatrix * vec4(a_vertex, 1.0);\
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
  legacygl.add_uniform('modelviewMatrix', 'Matrix4f');
  legacygl.add_uniform('projectionMatrix', 'Matrix4f');
  legacygl.add_vertex_attribute('color', 3);
  legacygl.vertex2 = function (p) {
    this.vertex(p[0], p[1], 0);
  };
  legacygl.color3 = function (c) {
    this.color(c[0], c[1], c[2]);
  };
  displist = legacygl.displist_wrapper('displist');
  drawutil = get_drawutil(gl, legacygl);
  camera = get_camera(canvas.width);
  camera.center = [5, 4, 0];
  camera.eye = vec3.add(vec3.create(), camera.center, [0, 0, 20]);
  // init scene
  scene.walls.push(new Wall(0, [0, 5], [1, 0]));
  scene.walls.push(new Wall(1, [5, 0], [Math.cos(1.3), Math.sin(1.3)]));
  scene.walls.push(new Wall(2, [7, 2], [Math.cos(2.2), Math.sin(2.2)]));
  scene.walls.push(new Wall(3, [10, 5], [-1, 0]));
  add_chain();
  add_box();
  // event handlers
  function mouse_to_world(wincoord: vec2) {
    const viewport: vec4 = [0, 0, canvas.width, canvas.height];
    const modelviewMatrix = legacygl.uniforms.modelviewMatrix as Mat4Uniform;
    const projectionMatrix = legacygl.uniforms.projectionMatrix as Mat4Uniform;
    const mouse_win = glu.unproject(
      [wincoord[0], wincoord[1], 1],
      modelviewMatrix.value,
      projectionMatrix.value,
      viewport
    );
    // just reuse the same code as the 3D case
    const plane_origin: vec3 = [0, 0, 0];
    const plane_normal: vec3 = [0, 0, 1];
    const eye_to_mouse = vec3.sub(vec3.create(), mouse_win, camera.eye);
    const eye_to_origin = vec3.sub(vec3.create(), plane_origin, camera.eye);
    const s1 = vec3.dot(eye_to_mouse, plane_normal);
    const s2 = vec3.dot(eye_to_origin, plane_normal);
    const eye_to_intersection = vec3.scale(
      vec3.create(),
      eye_to_mouse,
      s2 / s1
    );
    return vec3.add(vec3.create(), camera.eye, eye_to_intersection);
  }
  canvas.onmousedown = function (evt) {
    const mouse_win = canvas.get_mousepos(evt);
    if (evt.altKey) {
      camera.start_moving(mouse_win, evt.shiftKey ? 'zoom' : 'pan');
      return;
    }
    selected_particle = null;
    // find nearest particle
    userhandle_position = mouse_to_world(mouse_win) as vec2;
    let dist_min = Number.MAX_VALUE;
    scene.particles.forEach(function (particle) {
      if (particle.mass == Number.POSITIVE_INFINITY) return;
      const dist = vec2.len(
        vec2.sub(vec2.create(), userhandle_position, particle.position)
      );
      if (dist < dist_min) {
        dist_min = dist;
        selected_particle = particle;
      }
    });
    if (!selected_particle) userhandle_position = null;
  };
  canvas.onmousemove = function (evt) {
    const mouse_win = canvas.get_mousepos(evt);
    if (camera.is_moving()) {
      camera.move(mouse_win);
      draw();
      return;
    }
    if (selected_particle) {
      userhandle_position = mouse_to_world(mouse_win) as vec2;
    }
  };
  document.onmouseup = function (evt) {
    if (camera.is_moving()) {
      camera.finish_moving();
      return;
    }
    selected_particle = userhandle_position = null;
  };
  const input_num_gravity = document.getElementById(
    'input_num_gravity'
  ) as HTMLInputElement;
  input_num_gravity.value = String(param.gravity[1]);
  input_num_gravity.onchange = function () {
    param.gravity[1] = Number(input_num_gravity.value);
  };
  const input_num_timestep = document.getElementById(
    'input_num_timestep'
  ) as HTMLInputElement;
  input_num_timestep.value = String(param.timestep);
  input_num_timestep.onchange = function () {
    param.timestep = Number(input_num_timestep.value);
  };
  const input_num_soliter = document.getElementById(
    'input_num_soliter'
  ) as HTMLInputElement;
  input_num_soliter.value = String(param.solver_iterations);
  input_num_soliter.onchange = function () {
    param.solver_iterations = Number(input_num_soliter.value);
  };
  const input_num_damping = document.getElementById(
    'input_num_damping'
  ) as HTMLInputElement;
  input_num_damping.value = String(param.damping);
  input_num_damping.onchange = function () {
    param.damping = Number(input_num_damping.value);
  };
  const input_num_stiffness = document.getElementById(
    'input_num_stiffness'
  ) as HTMLInputElement;
  input_num_stiffness.value = String(param.stiffness);
  input_num_stiffness.onchange = function () {
    param.stiffness = Number(input_num_stiffness.value);
    scene.constraints.forEach(function (constraint) {
      constraint.stiffness = param.stiffness;
    });
  };
  // init OpenGL settings
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1, 1, 1, 1);
  // start animation
  animLoop();
}

function add_chain() {
  const start_position = vec2.add(
    vec2.create(),
    [1, 5],
    [8 * Math.random(), 5 * Math.random()]
  );
  scene.chains.push(
    new Chain(
      scene.chains.length,
      [Math.random(), Math.random(), Math.random()],
      start_position,
      10,
      0.2
    )
  );
}

function add_box() {
  const start_position = vec2.add(
    vec2.create(),
    [1, 5],
    [8 * Math.random(), 5 * Math.random()]
  );
  scene.boxes.push(
    new Box(
      scene.chains.length,
      [Math.random(), Math.random(), Math.random()],
      start_position,
      10,
      0.2
    )
  );
}

function clear_scene() {
  scene.particles = [];
  scene.constraints = [];
  scene.chains = [];
  scene.boxes = [];
  displist.invalidate();
  draw();
}

declare global {
  interface Window {
    draw(): void;
    init(): void;
    add_chain(): void;
    add_box(): void;
    clear_scene(): void;
    animLoop(): void;
  }
}

window.draw = draw;
window.init = init;
window.add_chain = add_chain;
window.add_box = add_box;
window.clear_scene = clear_scene;
window.animLoop = animLoop;
