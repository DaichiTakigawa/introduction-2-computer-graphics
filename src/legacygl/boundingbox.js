
export function make_boundingbox() {
    var bbox = {};
    bbox.set_empty = function() {
        this.min = [ Number.MAX_VALUE,  Number.MAX_VALUE,  Number.MAX_VALUE];
        this.max = [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE];
    };
    bbox.set_empty();
    bbox.extend = function(p) {
        this.min = vec3.min(this.min, this.min, p);
        this.max = vec3.max(this.max, this.max, p);
    };
    bbox.diagonal = function() {
        return vec3.sub([], this.max, this.min);
    };
    bbox.diagonal_norm = function() {
        return vec3.len(this.diagonal());
    };
    bbox.center = function() {
        return vec3.lerp([], this.max, this.min, 0.5);
    };
    bbox.is_empty = function() {
        return !(this.min[0] < this.max[0] && this.min[1] < this.max[1] && this.min[2] < this.max[2]);
    };
    return bbox;
}
