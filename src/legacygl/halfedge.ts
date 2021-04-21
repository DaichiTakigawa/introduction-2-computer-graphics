import {vec2, vec3} from 'gl-matrix';

export class Vertex {
  id: number;
  halfedge: HalfEdge;
  point: vec3;
  normal: vec3;

  constructor() {
    this.halfedge = null;
    this.point = null;
    this.normal = null;
  }

  outgoing_halfedges() {
    const result = [];
    let h = this.halfedge;
    for (;;) {
      result.push(h);
      h = h.opposite.next;
      if (h == this.halfedge) break;
    }
    return result;
  }

  incoming_halfedges() {
    return this.outgoing_halfedges().map(function (h) {
      return h.opposite;
    });
  }

  vertices() {
    return this.outgoing_halfedges().map(function (h) {
      return h.vertex;
    });
  }

  faces() {
    const result: Face[] = [];
    this.outgoing_halfedges().forEach(function (h) {
      if (h.face) result.push(h.face);
    });
    return result;
  }

  edges() {
    return this.outgoing_halfedges().map(function (h) {
      return h.edge;
    });
  }

  is_boundary() {
    return this.halfedge.is_boundary();
  }

  degree() {
    return this.outgoing_halfedges().length;
  }
}

export class Face {
  id: number;
  halfedge: HalfEdge;
  normal: vec3;

  halfedges() {
    const result = [];
    let h = this.halfedge;
    for (;;) {
      result.push(h);
      h = h.next;
      if (h == this.halfedge) break;
    }
    return result;
  }

  vertices() {
    return this.halfedges().map(function (h) {
      return h.vertex;
    });
  }

  faces() {
    return this.halfedges().map(function (h) {
      return h.opposite.face;
    });
  }

  edges() {
    return this.halfedges().map(function (h) {
      return h.edge;
    });
  }

  is_boundary() {
    return this.halfedges().some(function (h) {
      return h.opposite.is_boundary();
    });
  }

  centroid() {
    const result: vec3 = [0, 0, 0];
    let cnt = 0;
    this.vertices().forEach(function (v) {
      vec3.add_ip(result, v.point);
      ++cnt;
    });
    return vec3.scale_ip(result, 1 / cnt);
  }

  degree() {
    return this.halfedges().length;
  }
}

export class HalfEdge {
  id: number;
  vertex: Vertex;
  face: Face;
  edge: Edge;
  next: HalfEdge;
  prev: HalfEdge;
  opposite: HalfEdge;
  texcoord: vec2;
  normal: vec3;

  from_vertex() {
    return this.opposite.vertex;
  }

  is_boundary() {
    return this.face == null;
  }
}

export class Edge {
  id: number;
  halfedge: HalfEdge;

  halfedges() {
    return [this.halfedge, this.halfedge.opposite];
  }

  vertices() {
    return this.halfedges().map(function (h) {
      return h.vertex;
    });
  }

  faces() {
    return this.halfedges().map(function (h) {
      return h.face;
    });
  }

  is_boundary() {
    return this.halfedges().some(function (h) {
      return h.is_boundary();
    });
  }
}

export class Mesh {
  vertices: Vertex[];
  faces: Face[];
  halfedges: {[key: string]: HalfEdge};
  edges: {[key: string]: Edge};

  constructor() {
    this.vertices = [];
    this.faces = [];
    this.halfedges = {};
    this.edges = {};
  }

  add_face(
    fv_indices: number[],
    face_normals?: vec3[],
    face_texcoords?: vec2[]
  ) {
    // check the size consistency for face_normals & face_texcoords
    if (face_normals && face_normals.length != fv_indices.length) {
      console.log('The size of face_normals is inconsistent with fv_indices');
      return;
    }
    if (face_texcoords && face_texcoords.length != fv_indices.length) {
      console.log('The size of face_texcoords is inconsistent with fv_indices');
      return;
    }
    // check for existence of nonmanifold edges
    for (let k = 0; k < fv_indices.length; ++k) {
      const i = fv_indices[k];
      const j = fv_indices[(k + 1) % fv_indices.length];
      const h_key = i + ':' + j;
      const h = this.halfedges[h_key];
      if (h && h.face) {
        console.log('Nonmanifold edge found at (' + [i, j] + ')');
        return;
      }
    }
    const face = new Face();
    for (let k = 0; k < fv_indices.length; ++k) {
      const i = fv_indices[k];
      const j = fv_indices[(k + 1) % fv_indices.length];
      // two vertices
      let vi = this.vertices[i];
      let vj = this.vertices[j];
      if (!vi) vi = this.vertices[i] = new Vertex();
      if (!vj) vj = this.vertices[j] = new Vertex();
      // edge and two halfedges
      const hij_key = i + ':' + j;
      const hji_key = j + ':' + i;
      const eij_key = Math.min(i, j) + ':' + Math.max(i, j);
      let eij = this.edges[eij_key];
      let hij, hji;
      if (!eij) {
        hij = this.halfedges[hij_key] = new HalfEdge();
        hji = this.halfedges[hji_key] = new HalfEdge();
        eij = this.edges[eij_key] = new Edge();
      } else {
        hij = this.halfedges[hij_key];
        hji = this.halfedges[hji_key];
      }
      // connectivity around vertices
      vi.halfedge = hij;
      vj.halfedge = hji;
      // connectivity around halfedges
      hij.vertex = vj;
      hji.vertex = vi;
      hij.opposite = hji;
      hji.opposite = hij;
      hij.edge = hji.edge = eij;
      eij.halfedge = hij;
      hij.face = face;
      // connectivity around face
      face.halfedge = hij;
    }
    // set prev/next for halfedges, link from vertex to halfedge
    for (let k = 0; k < fv_indices.length; ++k) {
      const i0 = fv_indices[k];
      const i1 = fv_indices[(k + 1) % fv_indices.length];
      const i2 = fv_indices[(k + 2) % fv_indices.length];
      const h01 = this.halfedges[i0 + ':' + i1];
      const h12 = this.halfedges[i1 + ':' + i2];
      h01.next = h12;
      h12.prev = h01;
    }
    // set normal & texcoord for from_vertex of each halfedge
    for (let k = 0; k < fv_indices.length; ++k) {
      const i = fv_indices[k];
      const j = fv_indices[(k + 1) % fv_indices.length];
      const h_key = i + ':' + j;
      const h = this.halfedges[h_key];
      if (!h) {
        console.log('Something weird is happening!');
        return;
      }
      if (face_normals) {
        h.normal = face_normals[k];
      }
      if (face_texcoords) {
        h.texcoord = face_texcoords[k];
      }
    }
    this.faces.push(face);
  }

  halfedges_forEach(func: (halfedge: HalfEdge, index: number) => void) {
    Object.keys(this.halfedges).forEach(function (key, index) {
      func(this.halfedges[key], index);
    });
  }

  edges_forEach(func: (edge: Edge, index: number) => void) {
    Object.keys(this.edges).forEach(function (key, index) {
      func(this.edges[key], index);
    });
  }

  init_ids() {
    // make vertices a contiguous array
    for (let vid = 0; vid < this.vertices.length; ++vid) {
      this.vertices[vid].id = vid;
    }
    this.faces.forEach(function (f, i) {
      f.id = i;
    });
    this.edges_forEach(function (e, i) {
      e.id = i;
    });
    this.halfedges_forEach(function (h, i) {
      h.id = i;
    });
  }

  init_boundaries() {
    // make sure that boundary vertex is linked to boundary halfedge, next/prev ordering between boundary halfedges
    this.halfedges_forEach(function (h) {
      if (h.is_boundary()) h.from_vertex().halfedge = h;
    });
    this.halfedges_forEach(function (h) {
      if (h.is_boundary()) {
        h.next = h.vertex.halfedge;
        h.vertex.halfedge.prev = h;
      }
    });
  }

  num_vertices() {
    return this.vertices.length;
  }

  num_faces() {
    return this.faces.length;
  }

  num_edges() {
    return Object.keys(this.edges).length;
  }

  compute_normals() {
    // per-face
    this.faces.forEach(function (f) {
      f.normal = [0, 0, 0];
      f.halfedges().forEach(function (h) {
        const p0 = h.from_vertex().point;
        const p1 = h.vertex.point;
        const p2 = h.next.vertex.point;
        const d1 = vec3.sub(vec3.create(), p1, p0);
        const d2 = vec3.sub(vec3.create(), p2, p0);
        const n = vec3.cross(vec3.create(), d1, d2);
        vec3.add_ip(f.normal, n);
      });
      vec3.normalize_ip(f.normal);
    });
    // per-vertex
    this.vertices.forEach(function (v, index) {
      v.normal = [0, 0, 0];
      if (v.faces === undefined) return;
      v.faces().forEach(function (f) {
        vec3.add_ip(v.normal, f.normal);
      });
      vec3.normalize_ip(v.normal);
    });
  }
}

export function make_halfedge_mesh() {
  return new Mesh();
}
