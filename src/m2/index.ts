import {vec3, mat3, mat4} from 'gl-matrix';
import {
  get_legacygl,
  get_drawutil,
  get_camera,
  make_boundingbox,
  meshio,
  make_halfedge_mesh,
  verify_filename_extension,
  LegacyGL,
  BBox,
  DrawUtil,
  Camera,
  Mesh,
  Mat3Uniform,
  Mat4Uniform,
  ScalarUniform,
  DispListWrapper,
  Edge,
  Vertex,
} from '../legacygl';

interface MyLegacyGL extends LegacyGL {
  vertex3?(v: vec3): void;
  normal3?(v: vec3): void;
}

interface SubDivVertex extends Vertex {
  subdiv_point?: vec3;
}

interface SubDivEdge extends Edge {
  subdiv_point?: vec3;
}

let gl: WebGLRenderingContext;
let canvas: HTMLCanvasElement;
let legacygl: MyLegacyGL;
let texture: WebGLTexture;
let mesh_control: Mesh;
let mesh_subdiv: Mesh;
let bbox: BBox;
let displist_control: DispListWrapper;
let displist_subdiv_faces: DispListWrapper;
let displist_subdiv_edges: DispListWrapper;
let drawutil: DrawUtil;
let camera: Camera;

function draw() {
  const check_show_control = document.getElementById(
    'check_show_control'
  ) as HTMLInputElement;
  const check_show_edges = document.getElementById(
    'check_show_edges'
  ) as HTMLInputElement;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (!mesh_control) return;

  const modelviewMatrix = legacygl.uniforms.modelviewMatrix as Mat4Uniform;
  const projectionMatrix = legacygl.uniforms.projectionMatrix as Mat4Uniform;
  const normalMatrix = legacygl.uniforms.normalMatrix as Mat3Uniform;
  const use_material = legacygl.uniforms.use_material as ScalarUniform;
  // projection and camera position
  const zmin = vec3.length(camera.eye_to_center()) * 0.01;
  const zmax = zmin * 10000;
  mat4.perspective(
    projectionMatrix.value,
    Math.PI / 6,
    canvas.aspect_ratio(),
    zmin,
    zmax
  );
  camera.lookAt(modelviewMatrix.value);
  mat3.fromMat4(normalMatrix.value, modelviewMatrix.value);
  mat3.invert_ip(normalMatrix.value);
  mat3.transpose_ip(normalMatrix.value);
  use_material.value = 0;

  // bounding box
  modelviewMatrix.push();
  mat4.translate_ip(modelviewMatrix.value, bbox.center());
  mat4.scale_ip(modelviewMatrix.value, bbox.diagonal());
  legacygl.color(0.5, 0.5, 0.5);
  drawutil.cube('line', 1);
  modelviewMatrix.pop();

  // control mesh
  if (check_show_control.checked) {
    displist_control.draw(function () {
      legacygl.color(0, 0, 0.5);
      legacygl.begin(gl.LINES);
      mesh_control.edges_forEach(function (e) {
        e.vertices().forEach(function (v) {
          legacygl.vertex3(v.point);
        });
      });
      legacygl.end();
    });
  }

  // subdiv mesh faces
  use_material.push();
  use_material.value = 1;
  displist_subdiv_faces.draw(function () {
    // NOTE: this code assumes all faces are triangles!
    // Quads can be drawn by using gl.QUADS which internally splits each quad into two triangles
    legacygl.begin(gl.TRIANGLES);
    mesh_subdiv.faces.forEach(function (f) {
      legacygl.normal3(f.normal);
      f.vertices().forEach(function (v) {
        legacygl.vertex3(v.point);
      });
    });
    legacygl.end();
  });
  use_material.pop();

  // subdiv mesh edges
  if (check_show_edges.checked) {
    displist_subdiv_edges.draw(function () {
      legacygl.color(0, 0.5, 0.2);
      legacygl.begin(gl.LINES);
      mesh_subdiv.edges_forEach(function (e) {
        e.vertices().forEach(function (v) {
          legacygl.vertex3(v.point);
        });
      });
      legacygl.end();
    });
  }
}
function subdivide() {
  // for each edge, compute subdivided point
  mesh_subdiv.edges_forEach(function (e: SubDivEdge) {
    const v = e.vertices();
    const w = [e.halfedge.next.vertex, e.halfedge.opposite.next.vertex];
    if (e.is_boundary()) {
      e.subdiv_point = vec3.scale(
        vec3.create(),
        vec3.add(vec3.create(), v[0].point, v[1].point),
        0.5
      );
    } else {
      e.subdiv_point = vec3.add(
        vec3.create(),
        vec3.scale(
          vec3.create(),
          vec3.add(vec3.create(), v[0].point, v[1].point),
          3 / 8
        ),
        vec3.scale(
          vec3.create(),
          vec3.add(vec3.create(), w[0].point, w[1].point),
          1 / 8
        )
      );
    }
  });
  // for each vertex, compute displaced point
  mesh_subdiv.vertices.forEach(function (v: SubDivVertex) {
    if (v.is_boundary()) {
      const w0 = v.halfedge.prev.from_vertex();
      const w1 = v.halfedge.vertex;
      v.subdiv_point = vec3.add(
        vec3.create(),
        vec3.scale(vec3.create(), v.point, 3 / 4),
        vec3.scale(
          vec3.create(),
          vec3.add(vec3.create(), w0.point, w1.point),
          1 / 8
        )
      );
    } else {
      const w = v.vertices();
      const alpha =
        Math.pow(3 / 8 + (1 / 4) * Math.cos((2 * Math.PI) / w.length), 2) +
        3 / 8;
      v.subdiv_point = vec3.scale(vec3.create(), v.point, alpha);
      for (let i = 0; i < w.length; ++i)
        v.subdiv_point = vec3.add(
          vec3.create(),
          v.subdiv_point,
          vec3.scale(vec3.create(), w[i].point, (1 - alpha) / w.length)
        );
    }
  });
  // make next subdiv mesh topology
  const mesh_subdiv_next = make_halfedge_mesh();
  const offset = mesh_subdiv.num_vertices();
  mesh_subdiv.faces.forEach(function (f) {
    f.halfedges().forEach(function (h) {
      const fv_indices = [h.from_vertex().id];
      fv_indices.push(offset + h.edge.id);
      fv_indices.push(offset + h.prev.edge.id);
      mesh_subdiv_next.add_face(fv_indices);
    });
    const fv_indices: number[] = [];
    f.edges().forEach(function (e) {
      fv_indices.push(offset + e.id);
    });
    mesh_subdiv_next.add_face(fv_indices);
  });
  // set geometry for the next subdiv mesh
  mesh_subdiv.vertices.forEach(function (v: SubDivVertex) {
    mesh_subdiv_next.vertices[v.id].point = v.subdiv_point;
  });
  mesh_subdiv.edges_forEach(function (e: SubDivEdge) {
    mesh_subdiv_next.vertices[offset + e.id].point = e.subdiv_point;
  });
  mesh_subdiv = mesh_subdiv_next;
  mesh_subdiv.init_ids();
  mesh_subdiv.init_boundaries();
  mesh_subdiv.compute_normals();
  displist_subdiv_faces.invalidate();
  displist_subdiv_edges.invalidate();
  draw();
  document.getElementById('label_mesh_nv').innerHTML = String(
    mesh_subdiv.num_vertices()
  );
  document.getElementById('label_mesh_nf').innerHTML = String(
    mesh_subdiv.num_faces()
  );
  document.getElementById('label_mesh_ne').innerHTML = String(
    mesh_subdiv.num_edges()
  );
}
function write_mesh() {
  const filename = 'mesh_subdiv.obj';
  const content = meshio.write(mesh_subdiv, filename);
  const myBlob = new Blob([content], {type: 'octet/stream'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(myBlob);
  a.download = filename;
  a.click();
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
        attribute vec3 a_normal;\
        varying vec3 v_normal;\
        varying vec3 v_color;\
        uniform mat4 u_modelviewMatrix;\
        uniform mat4 u_projectionMatrix;\
        uniform mat3 u_normalMatrix;\
        void main(void) {\
            gl_Position = u_projectionMatrix * u_modelviewMatrix * vec4(a_vertex, 1.0);\
            v_color = a_color;\
            v_normal = u_normalMatrix * a_normal;\
        }\
        ';
  const fragment_shader_src =
    '\
        precision mediump float;\
        uniform sampler2D u_texture;\
        uniform int u_use_material;\
        varying vec3 v_normal;\
        varying vec3 v_color;\
        void main(void) {\
            if (u_use_material == 1) {\
                vec3 nnormal = normalize(v_normal);\
                nnormal.y *= -1.0;\
                vec2 texcoord = nnormal.xy * 0.45 + vec2(0.5, 0.5);\
                gl_FragColor = texture2D(u_texture, texcoord);\
            } else {\
                gl_FragColor = vec4(v_color, 1.0);\
            }\
        }\
        ';
  legacygl = get_legacygl(gl, vertex_shader_src, fragment_shader_src);
  legacygl.add_uniform('modelviewMatrix', 'Matrix4f');
  legacygl.add_uniform('projectionMatrix', 'Matrix4f');
  legacygl.add_uniform('normalMatrix', 'Matrix3f');
  legacygl.add_uniform('texture', '1i');
  legacygl.add_uniform('use_material', '1i');
  legacygl.add_vertex_attribute('color', 3);
  legacygl.add_vertex_attribute('normal', 3);
  legacygl.vertex3 = function (p) {
    this.vertex(p[0], p[1], p[2]);
  };
  legacygl.normal3 = function (n) {
    this.normal(n[0], n[1], n[2]);
  };
  displist_control = legacygl.displist_wrapper('control');
  displist_subdiv_faces = legacygl.displist_wrapper('subdiv_faces');
  displist_subdiv_edges = legacygl.displist_wrapper('subdiv_edges');
  drawutil = get_drawutil(gl, legacygl);
  camera = get_camera(canvas.width);
  // init OpenGL settings
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.POLYGON_OFFSET_FILL);
  gl.polygonOffset(1, 1);
  gl.clearColor(1, 1, 1, 1);
  // init texture
  texture = gl.createTexture();
  // event handlers
  canvas.onmousedown = function (evt) {
    camera.start_moving(
      canvas.get_mousepos(evt),
      evt.shiftKey ? 'zoom' : evt.ctrlKey ? 'pan' : 'rotate'
    );
  };
  canvas.onmousemove = function (evt) {
    if (camera.is_moving()) {
      camera.move(canvas.get_mousepos(evt));
      draw();
    }
  };
  document.onmouseup = function (evt) {
    if (camera.is_moving()) camera.finish_moving();
  };
  function read_mesh(filename: string, content: string) {
    const mesh_temp = meshio.read(filename, content);
    let has_nontriangle = false;
    for (let i = 0; i < mesh_temp.faces.length; ++i) {
      if (mesh_temp.faces[i].halfedges().length != 3) {
        has_nontriangle = true;
        break;
      }
    }
    if (has_nontriangle) {
      alert('Non-triangle polygon found! Please triangulate the mesh first.');
      return;
    }
    mesh_control = mesh_subdiv = mesh_temp;
    mesh_subdiv.compute_normals();
    bbox = make_boundingbox();
    mesh_control.vertices.forEach(function (v) {
      bbox.extend(v.point);
    });
    camera.center = bbox.center();
    camera.eye = vec3.add(vec3.create(), camera.center, [
      0,
      0,
      bbox.diagonal_norm() * 2,
    ]);
    camera.up = [0, 1, 0];
    displist_control.invalidate();
    displist_subdiv_faces.invalidate();
    displist_subdiv_edges.invalidate();
    draw();
    document.getElementById('label_mesh_nv').innerHTML = String(
      mesh_subdiv.num_vertices()
    );
    document.getElementById('label_mesh_nf').innerHTML = String(
      mesh_subdiv.num_faces()
    );
    document.getElementById('label_mesh_ne').innerHTML = String(
      mesh_subdiv.num_edges()
    );
  }
  const text_mesh_disk = document.getElementById(
    'text_mesh_disk'
  ) as HTMLInputElement;
  text_mesh_disk.onchange = function () {
    if (text_mesh_disk.files.length != 1) return;
    const file = text_mesh_disk.files[0];
    if (!verify_filename_extension(file.name, ['.obj', '.off'])) return;
    const reader = new FileReader();
    reader.onload = function () {
      read_mesh(file.name, reader.result as string);
    };
    reader.readAsText(file);
  };
  function read_default_mesh(url: string) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function () {
      if (this.status == 200) read_mesh(url, this.response);
    };
    xhr.send();
  }
  read_default_mesh(
    'https://cdn.glitch.com/e530aeed-ec07-4e9a-b2b2-e5dd9fc39322%2Floop-test.obj?1556153350921'
  );
  // texture
  function read_texture(dataurl: string) {
    const img = document.getElementById('img_material') as HTMLImageElement;
    img.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      displist_subdiv_faces.invalidate();
      draw();
    };
    img.crossOrigin = 'anonymous';
    img.src = dataurl;
  }
  const text_material_disk = document.getElementById(
    'text_material_disk'
  ) as HTMLInputElement;
  text_material_disk.onchange = function () {
    if (text_material_disk.files.length != 1) return;
    const file = text_material_disk.files[0];
    if (!verify_filename_extension(file.name, ['.png', '.jpg', '.gif'])) return;
    const reader = new FileReader();
    reader.onload = function () {
      read_texture(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  function read_default_texture(url: string) {
    if (!verify_filename_extension(url, ['.png', '.jpg', '.gif'])) return;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = function () {
      if (this.status == 200) read_texture(URL.createObjectURL(this.response));
    };
    xhr.send();
  }
  read_default_texture(
    'https://cdn.glitch.com/13696316-44e5-40d1-b312-830e260e4817%2Fmetal1.png?1555562471905'
  );
}

declare global {
  interface Window {
    draw(): void;
    init(): void;
    subdivide(): void;
    write_mesh(): void;
  }
}

window.draw = draw;
window.init = init;
window.subdivide = subdivide;
window.write_mesh = write_mesh;
