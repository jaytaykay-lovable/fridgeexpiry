/**
 * Compress an image file to a small JPEG thumbnail using Canvas API.
 */
export function createThumbnail(
  file: File,
  maxSize = 150,
  quality = 0.7
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Get the thumbnail storage path from an original image path.
 * e.g. "user_id/1234.jpg" -> "user_id/thumb_1234.jpg"
 */
export function getThumbnailPath(originalPath: string): string {
  const lastSlash = originalPath.lastIndexOf('/');
  if (lastSlash === -1) return `thumb_${originalPath}`;
  const dir = originalPath.substring(0, lastSlash + 1);
  const filename = originalPath.substring(lastSlash + 1);
  return `${dir}thumb_${filename}`;
}
