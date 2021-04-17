
export function get_drawutil(gl, legacygl) {
  var drawutil = {};
  drawutil.xyzaxis = function() {
    legacygl.begin(gl.LINES);
    legacygl.color(1, 0, 0);    legacygl.vertex(0, 0, 0);    legacygl.vertex(1, 0, 0);
    legacygl.color(0, 1, 0);    legacygl.vertex(0, 0, 0);    legacygl.vertex(0, 1, 0);
    legacygl.color(0, 0, 1);    legacygl.vertex(0, 0, 0);    legacygl.vertex(0, 0, 1);
    legacygl.end();
  };
  drawutil.xygrid = function(size) {
    legacygl.begin(gl.LINES);
    for (var i = -size; i <= size; ++i) {
      legacygl.vertex(i, -size, 0);
      legacygl.vertex(i,  size, 0);
      legacygl.vertex(-size, i, 0);
      legacygl.vertex( size, i, 0);
    }
    legacygl.end();
  };
  drawutil.yzgrid = function(size) {
    legacygl.begin(gl.LINES);
    for (var i = -size; i <= size; ++i) {
      legacygl.vertex(0, i, -size);
      legacygl.vertex(0, i,  size);
      legacygl.vertex(0, -size, i);
      legacygl.vertex(0,  size, i);
    }
    legacygl.end();
  };
  drawutil.zxgrid = function(size) {
    legacygl.begin(gl.LINES);
    for (var i = -size; i <= size; ++i) {
      legacygl.vertex(i, 0, -size);
      legacygl.vertex(i, 0,  size);
      legacygl.vertex(-size, 0, i);
      legacygl.vertex( size, 0, i);
    }
    legacygl.end();
  };
  drawutil.quadmesh = function(mode, vertices, faces) {
    legacygl.begin(mode == "line" ? gl.LINES : legacygl.QUADS);
    for (var f = 0; f < faces.length / 4; ++f) {
      for (var i = 0; i < 4; ++i) {
        var v0 = faces[4 * f + i];
        var x0 = vertices[3 * v0];
        var y0 = vertices[3 * v0 + 1];
        var z0 = vertices[3 * v0 + 2];
        legacygl.vertex(x0, y0, z0);
        if (mode == "line") {
          var v1 = faces[4 * f + (i + 1) % 4];
          var x1 = vertices[3 * v1];
          var y1 = vertices[3 * v1 + 1];
          var z1 = vertices[3 * v1 + 2];
          legacygl.vertex(x1, y1, z1);
        }
      }
    }
    legacygl.end();
  };
  drawutil.trimesh = function(mode, vertices, faces) {
    legacygl.begin(mode == "line" ? gl.LINES : gl.TRIANGLES);
    for (var f = 0; f < faces.length / 3; ++f) {
      for (var i = 0; i < 3; ++i) {
        var v0 = faces[3 * f + i];
        var x0 = vertices[3 * v0];
        var y0 = vertices[3 * v0 + 1];
        var z0 = vertices[3 * v0 + 2];
        legacygl.vertex(x0, y0, z0);
        if (mode == "line") {
          var v1 = faces[3 * f + (i + 1) % 3];
          var x1 = vertices[3 * v1];
          var y1 = vertices[3 * v1 + 1];
          var z1 = vertices[3 * v1 + 2];
          legacygl.vertex(x1, y1, z1);
        }
      }
    }
    legacygl.end();
  };
  drawutil.cube = function(mode, size) {
    var r = size / 2;
    this.quadmesh(mode, 
      [ // vertices
      -r, -r, -r,
       r, -r, -r,
      -r,  r, -r,
       r,  r, -r,
      -r, -r,  r,
       r, -r,  r,
      -r,  r,  r,
       r,  r,  r
      ], [ // faces
      1, 3, 7, 5, // positive-x
      3, 2, 6, 7, // positive-y
      2, 0, 4, 6, // negative-x
      0, 1, 5, 4, // negative-y
      4, 5, 7, 6, // positive-z
      0, 2, 3, 1  // negative-z
      ]
    );
  };
  drawutil.circle = function(mode, size, numdiv) {
    if (!numdiv) numdiv = 12;
    var r = size / 2;
    legacygl.begin(mode == "line" ? gl.LINE_LOOP : gl.TRIANGLE_FAN);
    for (var i = 0; i < numdiv; ++i) {
      var theta = i * 2 * Math.PI / numdiv;
      var x = r * Math.cos(theta);
      var y = r * Math.sin(theta);
      legacygl.vertex(x, y, 0);
    }
    legacygl.end();
  };
  drawutil.sphere = function(mode, radius, slices, stacks) {
    function angle2pos(theta, phi) {
      var x = radius * Math.cos(theta) * Math.sin(phi);
      var y = radius * Math.sin(theta) * Math.sin(phi);
      var z = radius * Math.cos(phi);
      return [x, y, z];
    };
    legacygl.begin(mode == "line" ? gl.LINES : legacygl.QUADS);
    var phi = 0;
    var dphi = Math.PI / stacks;
    for (var i = 0; i < stacks; ++i, phi += dphi) {
      var theta = 0;
      var dtheta = 2 * Math.PI / slices;
      for (var j = 0; j < slices; ++j, theta += dtheta) {
        var p = [
          angle2pos(theta, phi),
          angle2pos(theta + dtheta, phi),
          angle2pos(theta + dtheta, phi + dphi),
          angle2pos(theta         , phi + dphi)
        ];
        for (var k = 0; k < 4; ++k) {
          legacygl.vertex(p[k][0], p[k][1], p[k][2]);
          if (mode == "line") {
            var k1 = (k + 1) % 4;
            legacygl.vertex(p[k1][0], p[k1][1], p[k1][2]);
          }
        }
      }
    }
    legacygl.end();
  };
  drawutil.triangle_with_lines = function(p0, p1, p2, num_lines=10) {
    var p = [p0, p1, p2];
    legacygl.begin(gl.LINES);
    for (var i = 0; i < num_lines; ++i) {
      var t = i / num_lines;
      for (var j = 0; j < 3; ++j) {
        var a = vec3.lerp([], p[j], p[(j+2)%3], t);
        var b = vec3.lerp([], p[(j+1)%3], p[(j+2)%3], t);
        legacygl.vertex(a[0], a[1], a[2]);
        legacygl.vertex(b[0], b[1], b[2]);
      }
    }
    legacygl.end();
  };
  drawutil.quad_with_lines = function(p0, p1, p2, p3, num_lines=10) {
    legacygl.begin(gl.LINES);
    for (var i = 0; i <= num_lines; ++i) {
      var t = i / num_lines;
      {
        var a = vec3.lerp([], p0, p1, t);
        var b = vec3.lerp([], p3, p2, t);
        legacygl.vertex(a[0], a[1], a[2]);
        legacygl.vertex(b[0], b[1], b[2]);
      }
      {
        var a = vec3.lerp([], p0, p3, t);
        var b = vec3.lerp([], p1, p2, t);
        legacygl.vertex(a[0], a[1], a[2]);
        legacygl.vertex(b[0], b[1], b[2]);
      }
    }
    legacygl.end();
  };
  return drawutil;
}
