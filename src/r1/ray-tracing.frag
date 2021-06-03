#ifdef GL_ES
precision mediump float;
#endif

#define NUM_SPHERE 4
#define M_PI 3.14159

uniform float time;
uniform vec2 resolution;

struct Ray {
  vec3 origin;
  vec3 direction;
};

struct Sphere {
  float radius;
  float frequency;
  vec3 center;
  vec3 color;
};

struct Light {
  vec3 position;
};

struct Plane {
  float height;
};

Sphere spheres[NUM_SPHERE]; 
Light light;
Plane plane;


vec3 ray_trace(Ray ray) {
  bool hit = false;
  vec3 color = vec3(0.0);
  float min_t = 1e9;
  for (int i = 0; i < NUM_SPHERE; ++i) {
    Sphere sphere = spheres[i];
    vec3 center = sphere.center +  vec3(0.0, sin(sphere.frequency*2.0*M_PI*time), 0.0);
    vec3 v = ray.origin - center;
    float b = dot(ray.direction, v);
    float c = dot(v, v) - (sphere.radius * sphere.radius);
    float D = b * b - c;
    if (D > 0.0) {
      float t = -b - sqrt(D);
      if (0.0 < t && t < min_t) {
        vec3 hit_point = ray.origin + ray.direction * t;
        vec3 normal = (hit_point - center) / sphere.radius;
        float d = clamp(dot(normalize(light.position - center), normal), 0.1, 1.0);
        color = sphere.color * d;
        min_t = t;
        hit = true;
      }
    }
  }

  if (hit) {
    return color;
  }

  if (ray.direction.y < 0.0) {
    float t = (plane.height - ray.origin.y) / ray.direction.y;
    Ray ray2;
    ray2.origin = ray.origin + t*ray.direction;
    ray2.direction = normalize(light.position - ray2.origin);
    color = vec3(1.0);
    for (int i = 0; i < NUM_SPHERE; ++i) {
      Sphere sphere = spheres[i];
      vec3 center = sphere.center +  vec3(0.0, sin(sphere.frequency*2.0*M_PI*time), 0.0);
      vec3 v = ray2.origin - center;
      float b = dot(ray2.direction, v);
      float c = dot(v, v) - (sphere.radius * sphere.radius);
      float D = b * b - c;
      if (D > 0.0) {
        float t2 = -b - sqrt(D);
        if (0.0 < t2) {
          color = vec3(0.2);
        }
      }
    }
  }

  return color;
}

void main(void) {
  // 球を初期化
  spheres[0] =  Sphere(1.0, 0.1, vec3(-2.0, -1.0, 12.0), vec3(0.5, 1.0, 1.0));
  spheres[1] =  Sphere(1.0, 0.4, vec3(-2.0, 0.0, 18.0), vec3(1.0, 1.0, 0.5));
  spheres[2] =  Sphere(1.0, 0.2, vec3(2.0, -1.0, 12.0), vec3(1.0, 1.0, 1.0));
  spheres[3] = Sphere(1.0, 0.3, vec3(5.0, 1.0, 20.0), vec3(1.0, 0.5, 1.0));

  // 光源を初期化
  light =  Light(vec3(10.0, 10.0, 10.0));

  // 床を初期化
  plane = Plane(-5.0);

  // 縦横比を揃える
  vec2 p = (gl_FragCoord.xy - resolution / 2.0) / min(resolution.x, resolution.y);

  // レイの初期値
  Ray ray;
  ray.origin = vec3(0.0, 0.0, 1.0);
  ray.direction = normalize(vec3(p.x, p.y, 1.0));

  // 交差判定
  vec3 color = ray_trace(ray);
  gl_FragColor = vec4(color, 1.0);
}
