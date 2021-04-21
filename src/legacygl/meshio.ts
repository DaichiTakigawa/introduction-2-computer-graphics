import {vec2, vec3} from 'gl-matrix';
import {get_filename_extension} from './util';
import {make_halfedge_mesh, Mesh} from './halfedge';

export function read_obj(file_content: string) {
  const mesh = make_halfedge_mesh();
  const points: vec3[] = [];
  const normals: vec3[] = [];
  const texcoords: vec2[] = [];
  file_content.split('\n').forEach(function (line) {
    const tokens = line.trim().split(/\s+/);
    if (tokens.length < 4 || tokens[0][0] == '#') return;
    const head = tokens[0];
    if (head == 'v') {
      const x = parseFloat(tokens[1]);
      const y = parseFloat(tokens[2]);
      const z = parseFloat(tokens[3]);
      points.push([x, y, z]);
    } else if (head == 'vn') {
      const x = parseFloat(tokens[1]);
      const y = parseFloat(tokens[2]);
      const z = parseFloat(tokens[3]);
      normals.push([x, y, z]);
    } else if (head == 'vt') {
      const u = parseFloat(tokens[1]);
      const v = parseFloat(tokens[2]);
      texcoords.push([u, v]);
    } else if (head == 'f') {
      const fv_indices = [];
      let face_texcoords = [];
      let face_normals = [];
      for (let i = 1; i < tokens.length; ++i) {
        const tokens2 = tokens[i].split('/');
        fv_indices.push(parseInt(tokens2[0]) - 1);
        if (tokens2.length > 1 && tokens2[1].length > 0) {
          const vt_idx = parseInt(tokens2[1]) - 1;
          if (vt_idx < texcoords.length) face_texcoords.push(texcoords[vt_idx]);
        }
        if (tokens2.length > 2 && tokens2[2].length > 0) {
          const vn_idx = parseInt(tokens2[2]) - 1;
          if (vn_idx < normals.length) face_normals.push(normals[vn_idx]);
        }
      }
      if (face_normals.length != fv_indices.length) {
        face_normals = null;
      }
      if (face_texcoords.length != fv_indices.length) {
        face_texcoords = null;
      }
      mesh.add_face(fv_indices, face_normals, face_texcoords);
    }
  });
  for (let i = 0; i < points.length; ++i) mesh.vertices[i].point = points[i];
  mesh.init_ids();
  mesh.init_boundaries();
  return mesh;
}

export function read_off(file_content: string) {
  const mesh = make_halfedge_mesh();
  let magic;
  let num_vertices;
  let num_faces;
  const points: vec3[] = [];
  const lines = file_content.split('\n');
  let cnt_vertices = 0;
  let cnt_faces = 0;
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    const tokens = line.trim().split(' ');
    if (tokens.length == 0 || tokens[0][0] == '#') continue;
    if (!magic) {
      if (tokens[0] != 'OFF') {
        console.log('Bad magic: ' + tokens[0]);
        return;
      }
      magic = true;
    } else if (!num_vertices) {
      num_vertices = parseInt(tokens[0]);
      num_faces = parseInt(tokens[1]);
    } else if (cnt_vertices < num_vertices) {
      const x = parseFloat(tokens[0]);
      const y = parseFloat(tokens[1]);
      const z = parseFloat(tokens[2]);
      points.push([x, y, z]);
      ++cnt_vertices;
    } else if (cnt_faces < num_faces) {
      const fv_indices = [];
      for (let j = 1; j < tokens.length; ++j)
        fv_indices.push(parseInt(tokens[j]));
      if (parseInt(tokens[0]) != fv_indices.length)
        console.log('Inconsistent face-vertex count: ' + tokens);
      mesh.add_face(fv_indices);
      ++cnt_faces;
    }
  }
  if (cnt_faces != num_faces)
    console.log(
      'Inconsistent face count: ' +
        num_faces +
        ' as declared vs ' +
        cnt_faces +
        ' found'
    );
  for (let i = 0; i < points.length; ++i) mesh.vertices[i].point = points[i];
  mesh.init_ids();
  mesh.init_boundaries();
  return mesh;
}

export function read(filename: string, content: string) {
  const file_extension = get_filename_extension(filename);
  if (file_extension == '.obj') return read_obj(content);
  if (file_extension == '.off') return read_off(content);
  console.log('Unsupported format: ' + file_extension);
}

export function write_obj(mesh: Mesh) {
  const lines: string[] = [];
  mesh.vertices.forEach(function (v) {
    let line = 'v ';
    for (let i = 0; i < 3; ++i) line += v.point[i] + ' ';
    lines.push(line);
  });
  mesh.faces.forEach(function (f) {
    let line = 'f ';
    f.vertices().forEach(function (v) {
      line += v.id + 1 + ' ';
    });
    lines.push(line);
  });
  return lines.join('\n');
}

export function write_off(mesh: Mesh) {
  const lines = ['OFF'];
  lines.push(mesh.num_vertices() + ' ' + mesh.num_faces() + ' 0');
  mesh.vertices.forEach(function (v) {
    let line = '';
    for (let i = 0; i < 3; ++i) line += v.point[i] + ' ';
    lines.push(line);
  });
  mesh.faces.forEach(function (f) {
    const f_vertices = f.vertices();
    let line = f_vertices.length + ' ';
    f_vertices.forEach(function (v) {
      line += v.id + ' ';
    });
    lines.push(line);
  });
  return lines.join('\n');
}

export function write(mesh: Mesh, filename: string) {
  const file_extension = get_filename_extension(filename);
  if (file_extension == '.obj') return write_obj(mesh);
  if (file_extension == '.off') return write_off(mesh);
  console.log('Unsupported format: ' + file_extension);
}
