export class VertexAttribute {
  location: number;
  name: string;
  size: number;
  current: number[] = [];
  array: number[] = [];

  constructor(location: number, name: string, size: number) {
    this.location = location;
    this.name = name;
    this.size = size;
  }
}
