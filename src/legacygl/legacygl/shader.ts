export class Shader {
  vertex_shader: WebGLShader;
  fragment_shader: WebGLShader;
  program: WebGLProgram;

  constructor(
    gl: WebGLRenderingContext,
    vertex_shader_src: string,
    fragment_shader_src: string
  ) {
    this.vertex_shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(this.vertex_shader, vertex_shader_src);
    gl.compileShader(this.vertex_shader);
    if (!gl.getShaderParameter(this.vertex_shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(this.vertex_shader));
    }
    // fragment shader
    this.fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(this.fragment_shader, fragment_shader_src);
    gl.compileShader(this.fragment_shader);
    if (!gl.getShaderParameter(this.fragment_shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(this.fragment_shader));
    }
    // shader program
    this.program = gl.createProgram();
    gl.attachShader(this.program, this.vertex_shader);
    gl.attachShader(this.program, this.fragment_shader);
    gl.linkProgram(this.program);
    gl.useProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      alert('Could not initialize shaders!');
    }
  }
}
