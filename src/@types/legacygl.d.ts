declare module 'legacygl' {
  type vec2 = [number, number];
  type vec3 = [number, number, number];

  // boundingbox.d.ts
  export function make_boundingbox(): {
    set_empty(): void;
    extend(p: any): void;
    diagonal(): any;
    diagonal_norm(): any;
    center(): any;
    is_empty(): any;
  };

  // colormap.d.ts
  export namespace colormap {
    function _internal(colors: any, t: any): any;
    function parula(t: any): any;
    function jet(t: any): any;
    function hsv(t: any): any;
    function hot(t: any): any;
    function cool(t: any): any;
    function spring(t: any): any;
    function summer(t: any): any;
    function autumn(t: any): any;
    function winter(t: any): any;
    function gray(t: any): any;
    function bone(t: any): any;
    function copper(t: any): any;
    function pink(t: any): any;
  }

  // halfedge.d.ts
  export function make_halfedge_mesh(): {
    vertices: any[];
    faces: any[];
    halfedges: {};
    edges: {};
  };

  // meshio.d.ts
  export namespace meshio {
    function read_obj(
      file_content: any
    ): {
      vertices: any[];
      faces: any[];
      halfedges: {};
      edges: {};
    };
    function read_off(
      file_content: any
    ): {
      vertices: any[];
      faces: any[];
      halfedges: {};
      edges: {};
    };
    function read(
      filename: any,
      content: any
    ): {
      vertices: any[];
      faces: any[];
      halfedges: {};
      edges: {};
    };
    function write_obj(mesh: any): string;
    function write_off(mesh: any): string;
    function write(mesh: any, filename: any): string;
  }
}
