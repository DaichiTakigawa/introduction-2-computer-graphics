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
  Vertex,
  Edge,
  Face,
  Mode,
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

interface SubDivFace extends Face {
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

function draw(mesh_draw_mode: Mode = gl.TRIANGLES) {
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
  displist_subdiv_faces.draw(() => {
    // NOTE: this code assumes all faces are triangles!
    // Quads can be drawn by using gl.QUADS which internally splits each quad into two triangles
    legacygl.begin(mesh_draw_mode);
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

function subdivide_catmull_clark() {
  // for each face, compute subdivided point
  mesh_subdiv.faces.forEach(function (f: SubDivFace) {
    const v = f.vertices();
    f.subdiv_point = vec3.create();
    for (let i = 0; i < v.length; ++i) {
      vec3.add_ip(f.subdiv_point, v[i].point);
    }
    vec3.scale_ip(f.subdiv_point, 1 / v.length);
  });
  // for each edge, compute subdivided point
  mesh_subdiv.edges_forEach(function (e: SubDivEdge) {
    const v = e.vertices();
    const f = e.faces() as SubDivFace[]; // assume that all edge are not boundary
    e.subdiv_point = vec3.scale(
      vec3.create(),
      vec3.add(vec3.create(), f[0].subdiv_point, f[1].subdiv_point),
      0.5
    );
    e.subdiv_point = vec3.add(
      vec3.create(),
      e.subdiv_point,
      vec3.scale(
        vec3.create(),
        vec3.add(vec3.create(), v[0].point, v[1].point),
        0.5
      )
    );
    vec3.scale_ip(e.subdiv_point, 0.5);
  });
  // for each vertex, compute displaced point
  mesh_subdiv.vertices.forEach(function (v: SubDivVertex) {
    const f = v.faces() as SubDivFace[];
    const e = v.edges() as SubDivEdge[];
    let q = vec3.create();
    for (let i = 0; i < f.length; ++i) {
      q = vec3.add(vec3.create(), q, f[i].subdiv_point);
    }
    q = vec3.scale(vec3.create(), q, 1 / f.length);
    let r = vec3.create();
    for (let i = 0; i < e.length; ++i) {
      const ev = e[i].vertices();
      vec3.add_ip(
        r,
        vec3.scale(
          vec3.create(),
          vec3.add(vec3.create(), ev[0].point, ev[1].point),
          0.5
        )
      );
    }
    r = vec3.scale(vec3.create(), r, 1 / e.length);
    const n = e.length;
    v.subdiv_point = vec3.scale(vec3.create(), q, 1 / n);
    v.subdiv_point = vec3.add(
      vec3.create(),
      v.subdiv_point,
      vec3.scale(vec3.create(), r, 2 / n)
    );
    v.subdiv_point = vec3.add(
      vec3.create(),
      v.subdiv_point,
      vec3.scale(vec3.create(), v.point, (n - 3) / n)
    );
  });
  // make next subdiv mesh topology
  const mesh_subdiv_next = make_halfedge_mesh();
  const edge_offset = mesh_subdiv.num_vertices();
  const face_offset = edge_offset + mesh_subdiv.num_edges();
  mesh_subdiv.halfedges_forEach(function (h) {
    const v = h.from_vertex() as SubDivVertex;
    const ev1 = h.prev.edge as SubDivEdge;
    const ev2 = h.edge as SubDivEdge;
    const fv = h.face as SubDivFace;
    const fv_indices: number[] = [];
    fv_indices.push(ev1.id + edge_offset);
    fv_indices.push(v.id);
    fv_indices.push(ev2.id + edge_offset);
    fv_indices.push(fv.id + face_offset);
    mesh_subdiv_next.add_face(fv_indices);
  });
  mesh_subdiv.vertices.forEach(function (v: SubDivVertex) {
    mesh_subdiv_next.vertices[v.id].point = v.subdiv_point;
  });
  mesh_subdiv.edges_forEach(function (e: SubDivEdge) {
    mesh_subdiv_next.vertices[e.id + edge_offset].point = e.subdiv_point;
  });
  mesh_subdiv.faces.forEach(function (f: SubDivFace) {
    mesh_subdiv_next.vertices[f.id + face_offset].point = f.subdiv_point;
  });
  mesh_subdiv = mesh_subdiv_next;
  mesh_subdiv.init_ids();
  mesh_subdiv.init_boundaries();
  mesh_subdiv.compute_normals();
  displist_subdiv_faces.invalidate();
  displist_subdiv_edges.invalidate();
  draw('QUADS');
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
    'https://www.takigawa-memo.com/introduction-2-computer-graphics/m2/cube.obj'
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
    'https://www.takigawa-memo.com/introduction-2-computer-graphics/m2/blue-to-purple.jpg'
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
window.subdivide = subdivide_catmull_clark;
window.write_mesh = write_mesh;
