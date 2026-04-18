export const exportCanvasAsBase64 = (canvas) => {
  if (!canvas) return null;
  // canvas.width/height are now properly set pixel dimensions
  const dataURL = canvas.toDataURL('image/png');
  return dataURL.split(',')[1]; // strip "data:image/png;base64," prefix
};

export const isCanvasBlank = (canvas) => {
  if (!canvas) return true;
  // Create a same-sized blank white canvas and compare data URLs
  const blank = document.createElement('canvas');
  blank.width = canvas.width;
  blank.height = canvas.height;
  const ctx = blank.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, blank.width, blank.height);
  return canvas.toDataURL('image/png') === blank.toDataURL('image/png');
};
