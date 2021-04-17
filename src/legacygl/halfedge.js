
export function make_halfedge_mesh() {
    var mesh = {
        vertices : [],
        faces    : [],
        halfedges: {},
        edges    : {},
    };
    mesh.add_face = function(fv_indices, face_normals, face_texcoords) {
        // element constructors >>>>
        function make_vertex() {
            var vertex = {
                halfedge: null,
                point: null,
                normal: null
            };
            vertex.outgoing_halfedges = function() {
                var result = [];
                var h = this.halfedge;
                while (true) {
                    result.push(h);
                    h = h.opposite.next;
                    if (h == this.halfedge) break;
                }
                return result;
            };
            vertex.incoming_halfedges = function() {
                return this.outgoing_halfedges().map(function(h) { return h.opposite; });
            };
            vertex.vertices = function() {
                return this.outgoing_halfedges().map(function(h) { return h.vertex; });
            };
            vertex.faces = function() {
                var result = [];
                this.outgoing_halfedges().forEach(function(h) {
                    if(h.face)
                        result.push(h.face);
                });
                return result;
            };
            vertex.edges = function() {
                return this.outgoing_halfedges().map(function(h) { return h.edge; });
            };
            vertex.is_boundary = function() {
                return this.halfedge.is_boundary();
            };
            vertex.degree = function() {
                return this.outgoing_halfedges().length;
            }
            return vertex;
        };
        function make_face() {
            var face = {
                halfedge: null,
                normal: null,
            };
            face.halfedges = function() {
                var result = [];
                var h = this.halfedge;
                while (true) {
                    result.push(h);
                    h = h.next;
                    if (h == this.halfedge) break;
                }
                return result;
            };
            face.vertices = function() {
                return this.halfedges().map(function(h) { return h.vertex; });
            };
            face.faces = function() {
                return this.halfedges().map(function(h) { return h.opposite.face; });
            };
            face.edges = function() {
                return this.halfedges().map(function(h) { return h.edge; });
            };
            face.is_boundary = function() {
                return this.halfedges().some(function(h) { return h.opposite.is_boundary(); });
            };
            face.centroid = function() {
                var result = [0, 0, 0];
                var cnt = 0;
                this.vertices().forEach(function(v) {
                    vec3.add_ip(result, v.point);
                    ++cnt;
                });
                return vec3.scale_ip(result, 1 / cnt);
            };
            face.degree = function() {
                return this.halfedges().length;
            }
            return face;
        };
        function make_halfedge() {
            var halfedge = {
                vertex: null,
                face: null,
                edge: null,
                next: null,
                prev: null,
                opposite: null,
                texcoord: null,
                normal: null,
            };
            halfedge.from_vertex = function() {
                return this.opposite.vertex;
            };
            halfedge.is_boundary = function() {
                return this.face == null;
            };
            return halfedge;
        };
        function make_edge() {
            var edge = {
                halfedge: null
            };
            edge.halfedges = function() {
                return [this.halfedge, this.halfedge.opposite];
            };
            edge.vertices = function() {
                return this.halfedges().map(function(h) { return h.vertex; });
            };
            edge.faces = function() {
                return this.halfedges().map(function(h) { return h.face; });
            };
            edge.is_boundary= function() {
                return this.halfedges().some(function(h) { return h.is_boundary(); });
            };
            return edge;
        };
        // <<<< element constructors
        // check the size consistency for face_normals & face_texcoords
        if (face_normals && face_normals.length != fv_indices.length) {
            console.log("The size of face_normals is inconsistent with fv_indices");
            return;
        }
        if (face_texcoords && face_texcoords.length != fv_indices.length) {
            console.log("The size of face_texcoords is inconsistent with fv_indices");
            return;
        }
        // check for existence of nonmanifold edges
        for (var k = 0; k < fv_indices.length; ++k) {
            var i = fv_indices[k];
            var j = fv_indices[(k + 1) % fv_indices.length];
            var h_key = i + ":" + j;
            var h = this.halfedges[h_key];
            if (h && h.face) {
                console.log("Nonmanifold edge found at (" + [i, j] + ")");
                return;
            }
        }
        var face = make_face();
        for (var k = 0; k < fv_indices.length; ++k) {
            var i = fv_indices[k];
            var j = fv_indices[(k + 1) % fv_indices.length];
            // two vertices
            var vi = this.vertices[i];
            var vj = this.vertices[j];
            if (!vi) vi = this.vertices[i] = make_vertex();
            if (!vj) vj = this.vertices[j] = make_vertex();
            // edge and two halfedges
            var hij_key = i + ":" + j;
            var hji_key = j + ":" + i;
            var eij_key = Math.min(i, j) + ":" + Math.max(i, j);
            var eij = this.edges[eij_key];
            var hij, hji;
            if (!eij) {
                hij = this.halfedges[hij_key] = make_halfedge();
                hji = this.halfedges[hji_key] = make_halfedge();
                eij = this.edges[eij_key] = make_edge();
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
        for (var k = 0; k < fv_indices.length; ++k) {
            var i0 = fv_indices[k];
            var i1 = fv_indices[(k + 1) % fv_indices.length];
            var i2 = fv_indices[(k + 2) % fv_indices.length];
            var h01 = this.halfedges[i0 + ":" + i1];
            var h12 = this.halfedges[i1 + ":" + i2];
            h01.next = h12;
            h12.prev = h01;
        }
        // set normal & texcoord for from_vertex of each halfedge
        for (var k = 0; k < fv_indices.length; ++k) {
            var i = fv_indices[k];
            var j = fv_indices[(k + 1) % fv_indices.length];
            var h_key = i + ":" + j;
            var h = this.halfedges[h_key];
            if (!h) {
                console.log("Something weird is happening!");
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
    };
    mesh.halfedges_forEach = function(func) {
        Object.keys(this.halfedges).forEach(function(key, index) {
            func(mesh.halfedges[key], index);
        });
    };
    mesh.edges_forEach = function(func) {
        Object.keys(this.edges).forEach(function(key, index) {
            func(mesh.edges[key], index);
        });
    };
    mesh.init_ids = function() {
        // make vertices a contiguous array
        var vid_max = Math.max(...Object.keys(this.vertices));
        for (var vid = 0; vid <= vid_max; ++vid) {
            if (this.vertices[vid] === undefined) this.vertices[vid] = {};
          this.vertices[vid].id = vid;
        }
        this.faces.forEach(function(f, i) { f.id = i; });
        this.edges_forEach(function(e, i) { e.id = i; });
        this.halfedges_forEach(function(h, i) { h.id = i; });
    };
    mesh.init_boundaries = function() {
        // make sure that boundary vertex is linked to boundary halfedge, next/prev ordering between boundary halfedges
        this.halfedges_forEach(function(h){
            if (h.is_boundary())
                h.from_vertex().halfedge = h;
        });
        this.halfedges_forEach(function(h){
            if (h.is_boundary()) {
                h.next = h.vertex.halfedge;
                h.vertex.halfedge.prev = h;
            }
        });
    };
    mesh.num_vertices = function() {
        return this.vertices.length;
    };
    mesh.num_faces = function() {
        return this.faces.length;
    };
    mesh.num_edges = function() {
        return Object.keys(this.edges).length;
    };
    mesh.compute_normals = function() {
        // per-face
        this.faces.forEach(function(f){
            f.normal = [0, 0, 0];
            f.halfedges().forEach(function(h){
                var p0 = h.from_vertex().point;
                var p1 = h.vertex.point;
                var p2 = h.next.vertex.point;
                var d1 = vec3.sub([], p1, p0);
                var d2 = vec3.sub([], p2, p0);
                var n = vec3.cross([], d1, d2);
                vec3.add_ip(f.normal, n);
            });
            vec3.normalize_ip(f.normal);
        });
        // per-vertex
        this.vertices.forEach(function(v, index){
            v.normal = [0, 0, 0];
            if (v.faces === undefined) return;
            v.faces().forEach(function(f){
                vec3.add_ip(v.normal, f.normal);
            });
            vec3.normalize_ip(v.normal);
        });
    };
    return mesh;
};
