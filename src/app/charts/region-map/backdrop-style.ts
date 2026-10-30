// The look of the satellite backdrop and the lines over it, as numbers the region map reads
export interface BackdropStyle {
  // The picture, as CSS filters
  brightness: number;  // 1 = as NASA's picture
  contrast: number;
  saturation: number;  // 0 = grey, 2 = twice as vivid
  hue: number;         // degrees round the colour wheel
  sepia: number;       // 0–1: an old-paper wash, for the early moments
  blur: number;        // px: softens the detail under the history colours
  opacity: number;     // the picture over the paper
  // The layers over it
  veil: number;        // the white veil on the land
  counties: number;    // the white county hairlines
  halo: number;        // the pale halo under each river
  coast: number;       // the white coastline
  outside: number;     // the paper veil over everything outside the moment's land
}

export const BACKDROP: BackdropStyle = {
  brightness: 1, contrast: 1, saturation: 1, hue: 0, sepia: 0, blur: 0, opacity: 0.95,
  veil: 0.12, counties: 0.45, halo: 0.75, coast: 0.7, outside: 0.55
};

// The picture's CSS filter, in one string
const b = BACKDROP;
export const BACKDROP_FILTER = `brightness(${b.brightness}) contrast(${b.contrast}) saturate(${b.saturation}) hue-rotate(${b.hue}deg) sepia(${b.sepia}) blur(${b.blur}px)`;
