const canvas = document.createElement('canvas') as HTMLCanvasElement;
const context = canvas.getContext('2d');
function smooth_gaussian(
  width: number,
  height: number,
  original: Uint8ClampedArray,
  smoothed: Uint8ClampedArray,
  sigma: number
) {
  const r = Math.ceil(sigma * 3);
  const r2 = 2 * r + 1;
  // precompute spatial stencil
  const stencil = new Float32Array(r2 * r2);
  for (let dy = -r; dy <= r; ++dy)
    for (let dx = -r; dx <= r; ++dx) {
      const h = Math.sqrt(dx * dx + dy * dy);
      const idx = dx + r + r2 * (dy + r);
      stencil[idx] = Math.exp((-h * h) / (2 * sigma * sigma));
    }
  // apply filter
  for (let py = 0; py < height; py++)
    for (let px = 0; px < width; px++) {
      const idx0 = px + width * py;
      let r_sum = 0;
      let g_sum = 0;
      let b_sum = 0;
      let w_sum = 0;
      for (let dy = -r; dy <= r; ++dy)
        for (let dx = -r; dx <= r; ++dx) {
          const px1 = px + dx;
          const py1 = py + dy;
          if (0 <= px1 && 0 <= py1 && px1 < width && py1 < height) {
            const w = stencil[dx + r + r2 * (dy + r)];
            const idx1 = px1 + width * py1;
            const r1 = original[4 * idx1];
            const g1 = original[4 * idx1 + 1];
            const b1 = original[4 * idx1 + 2];
            r_sum += w * r1;
            g_sum += w * g1;
            b_sum += w * b1;
            w_sum += w;
          }
        }
      smoothed[4 * idx0] = r_sum / w_sum;
      smoothed[4 * idx0 + 1] = g_sum / w_sum;
      smoothed[4 * idx0 + 2] = b_sum / w_sum;
      smoothed[4 * idx0 + 3] = 255;
    }
}
function smooth_bilateral(
  width: number,
  height: number,
  original: Uint8ClampedArray,
  smoothed: Uint8ClampedArray,
  sigma_space: number,
  sigma_range: number
) {
  const r = Math.ceil(sigma_space * 3);
  const r2 = 2 * r + 1;
  // precompute spatial stencil
  const stencil = new Float32Array(r2 * r2);
  for (let dy = -r; dy <= r; ++dy)
    for (let dx = -r; dx <= r; ++dx) {
      const h = Math.sqrt(dx * dx + dy * dy);
      const idx = dx + r + r2 * (dy + r);
      stencil[idx] = Math.exp((-h * h) / (2 * sigma_space * sigma_space));
    }
  // apply filter
  for (let py = 0; py < height; py++)
    for (let px = 0; px < width; px++) {
      const idx0 = px + width * py;
      let r_sum = 0;
      let g_sum = 0;
      let b_sum = 0;
      let w_sum = 0;
      for (let dy = -r; dy <= r; ++dy)
        for (let dx = -r; dx <= r; ++dx) {
          const px1 = px + dx;
          const py1 = py + dy;
          if (0 <= px1 && 0 <= py1 && px1 < width && py1 < height) {
            const w_space = stencil[dx + r + r2 * (dy + r)];
            const idx1 = px1 + width * py1;
            const r1 = original[4 * idx1];
            const g1 = original[4 * idx1 + 1];
            const b1 = original[4 * idx1 + 2];
            const r0 = original[4 * idx0];
            const g0 = original[4 * idx0 + 0];
            const b0 = original[4 * idx0 + 2];
            const h = Math.sqrt(
              (r0 - r1) * (r0 - r1) +
                (g0 - g1) * (g0 - g1) +
                (b1 - b0) * (b1 - b0)
            );
            const w_range = Math.exp(
              (-h * h) / (2 * sigma_range * sigma_space)
            );
            const w = w_space * w_range;
            r_sum += w * r1;
            g_sum += w * g1;
            b_sum += w * b1;
            w_sum += w;
          }
        }
      smoothed[4 * idx0] = r_sum / w_sum;
      smoothed[4 * idx0 + 1] = g_sum / w_sum;
      smoothed[4 * idx0 + 2] = b_sum / w_sum;
      smoothed[4 * idx0 + 3] = 255;
    }
}
function subtract(
  width: number,
  height: number,
  original: Uint8ClampedArray,
  smoothed: Uint8ClampedArray,
  detail: Uint8ClampedArray
) {
  for (let i = 0; i < width * height; ++i) {
    for (let j = 0; j < 3; ++j) {
      const ij = 4 * i + j;
      detail[ij] = 128 + original[ij] - smoothed[ij];
    }
    detail[4 * i + 3] = 255;
  }
}
function enhance_detail(
  width: number,
  height: number,
  smoothed: Uint8ClampedArray,
  detail: Uint8ClampedArray,
  scaling: number,
  enhanced: Uint8ClampedArray
) {
  for (let i = 0; i < width * height; ++i) {
    for (let j = 0; j < 3; ++j) {
      const ij = 4 * i + j;
      enhanced[ij] = Math.min(
        255,
        Math.max(0, smoothed[ij] + scaling * (detail[ij] - 128))
      );
    }
    enhanced[4 * i + 3] = 255;
  }
}
function init() {
  const img_original = document.getElementById(
    'img_original'
  ) as HTMLImageElement;
  const img_smoothed = document.getElementById(
    'img_smoothed'
  ) as HTMLImageElement;
  const img_detail = document.getElementById('img_detail') as HTMLImageElement;
  const img_enhanced = document.getElementById(
    'img_enhanced'
  ) as HTMLImageElement;
  img_original.onload = function () {
    canvas.width = img_original.width;
    canvas.height = img_original.height;
    img_smoothed.width = img_original.width;
    img_smoothed.height = img_original.height;
    img_detail.width = img_original.width;
    img_detail.height = img_original.height;
    img_enhanced.width = img_original.width;
    img_enhanced.height = img_original.height;
  };
  const input_file_original = document.getElementById(
    'input_file_original'
  ) as HTMLInputElement;
  input_file_original.onchange = function () {
    const reader = new FileReader();
    reader.readAsDataURL(input_file_original.files[0]);
    reader.onload = function () {
      img_original.src = String(reader.result);
    };
  };
  const btn_do_smoothing = document.getElementById(
    'btn_do_smoothing'
  ) as HTMLInputElement;
  btn_do_smoothing.onclick = function () {
    const width = canvas.width;
    const height = canvas.height;
    // read original
    context.drawImage(img_original, 0, 0);
    const original = context.getImageData(0, 0, width, height);
    // do smoothing
    const smoothed = context.createImageData(width, height);
    const sigma_space = Number(
      (document.getElementById('input_num_sigma_space') as HTMLInputElement)
        .value
    );
    const sigma_range = Number(
      (document.getElementById('input_num_sigma_range') as HTMLInputElement)
        .value
    );
    if (
      (document.getElementById('input_chk_use_bilateral') as HTMLInputElement)
        .checked
    )
      smooth_bilateral(
        width,
        height,
        original.data,
        smoothed.data,
        sigma_space,
        sigma_range
      );
    else
      smooth_gaussian(width, height, original.data, smoothed.data, sigma_space);
    context.putImageData(smoothed, 0, 0);
    img_smoothed.src = canvas.toDataURL();
    // detail = original - smoothed
    const detail = context.createImageData(width, height);
    subtract(width, height, original.data, smoothed.data, detail.data);
    context.putImageData(detail, 0, 0);
    img_detail.src = canvas.toDataURL();
  };
  document.getElementById('btn_enhance_detail').onclick = function () {
    const width = canvas.width;
    const height = canvas.height;
    // read smoothed and detail
    context.drawImage(img_smoothed, 0, 0);
    const smoothed = context.getImageData(0, 0, width, height);
    context.drawImage(img_detail, 0, 0);
    const detail = context.getImageData(0, 0, width, height);
    // enhanced = smoothed + scale * detail
    const enhanced = context.createImageData(width, height);
    const detail_scaling = Number(
      (document.getElementById('input_num_detail_scaling') as HTMLInputElement)
        .value
    );
    enhance_detail(
      width,
      height,
      smoothed.data,
      detail.data,
      detail_scaling,
      enhanced.data
    );
    context.putImageData(enhanced, 0, 0);
    img_enhanced.src = canvas.toDataURL();
  };
  img_original.src =
    'https://cdn.glitch.com/1214143e-0c44-41fb-b1ad-e9aa3347cdaa%2Frock.png?v=1562148154890';
}

window.init = init;
