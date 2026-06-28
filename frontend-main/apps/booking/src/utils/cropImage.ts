export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // to avoid CORS issues on toBlob
    image.src = url;
  });

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotation = 0,
  outputType: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.92
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  // set canvas to the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // move anchor to center, rotate, draw image
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  // extract the cropped image
  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

  // set canvas to the desired crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // paste extracted image data at top left
  const ctx2 = canvas.getContext('2d');
  if (!ctx2) throw new Error('Canvas 2D context not available');
  ctx2.putImageData(data, 0, 0);

  // convert to Blob
  return await new Promise<Blob>((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob(
        (file) => {
          if (file) resolve(file);
          else reject(new Error('Canvas is empty'));
        },
        outputType,
        quality
      );
    } else {
      try {
        const dataUrl = canvas.toDataURL(outputType, quality);
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || outputType;
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        resolve(new Blob([u8arr], { type: mime }));
      } catch (e) {
        reject(e as any);
      }
    }
  });
}

