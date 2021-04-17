
export var colormap = {};
colormap._internal = function(colors, t) {
    t = Math.max(0, Math.min(1, t));
    var n = colors.length - 1;
    var nt = n * t;
    var i = Math.floor(nt);
    var dt = nt - i;
    var j = i == n ? i : (i + 1);
    return vec3.lerp([], colors[i], colors[j], dt);
};
// http://www.mathworks.com/matlabcentral/fileexchange/35242-matlab-plot-gallery-colormap-chart/content/html/Colormap_Chart.html
colormap.parula = function(t) {
    var colors = [
        [53/255, 42/255, 135/255],
        [19/255, 136/255, 211/255],
        [73/255, 188/255, 148/255],
        [236/255, 185/255, 76/255],
        [249/255, 251/255, 14/255],
    ];
    return this._internal(colors, t);
};
colormap.jet = function(t) {
    var colors = [
        [0, 0, 0.5],
        [0, 0, 1],
        [0, 1, 1],
        [1, 1, 0],
        [1, 0, 0],
        [0.5, 0, 0],
    ];
    return this._internal(colors, t);
};
colormap.hsv = function(t) {
    var colors = [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
        [0, 1, 1],
        [0, 0, 1],
        [1, 0, 1],
        [1, 0, 0],
    ];
    return this._internal(colors, t);
};
colormap.hot = function(t) {
    var colors = [
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0],
        [1, 1, 1],
    ];
    return this._internal(colors, t);
};
colormap.cool = function(t) {
    var colors = [
        [0, 1, 1],
        [1, 0, 1],
    ];
    return this._internal(colors, t);
};
colormap.spring = function(t) {
    var colors = [
        [1, 0, 1],
        [1, 1, 0],
    ];
    return this._internal(colors, t);
};
colormap.summer = function(t) {
    var colors = [
        [0, 0.5, 0],
        [1, 1, 0],
    ];
    return this._internal(colors, t);
};
colormap.autumn = function(t) {
    var colors = [
        [1, 0, 0],
        [1, 1, 0],
    ];
    return this._internal(colors, t);
};
colormap.winter = function(t) {
    var colors = [
        [0, 0, 1],
        [0, 1, 0.5],
    ];
    return this._internal(colors, t);
};
colormap.gray = function(t) {
    var colors = [
        [0, 0, 0],
        [1, 1, 1],
    ];
    return this._internal(colors, t);
};
colormap.bone = function(t) {
    var colors = [
        [0, 0, 0],
        [119/255, 135/255, 151/255],
        [1, 1, 1],
    ];
    return this._internal(colors, t);
};
colormap.copper = function(t) {
    var colors = [
        [0, 0, 0],
        [1, 199/255, 127/255],
    ];
    return this._internal(colors, t);
};
colormap.pink = function(t) {
    var colors = [
        [60/255, 0, 0],
        [212/255, 184/255, 152/255],
        [1, 1, 1]
    ];
    return this._internal(colors, t);
};
