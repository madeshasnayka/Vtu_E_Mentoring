import ImageKit from 'imagekit';

let imagekitInstance: ImageKit | null = null;

const getImageKit = (): ImageKit => {
  if (!imagekitInstance) {
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || '';
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || '';
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || '';

    if (!publicKey || !privateKey || !urlEndpoint) {
      throw new Error(
        'ImageKit credentials missing. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in .env'
      );
    }

    imagekitInstance = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });
  }
  return imagekitInstance;
};

export interface ICloudUploadResult {
  url: string;
  fileId: string;
  name: string;
  size: number;
}

export const uploadBufferToImageKit = async (
  fileBuffer: Buffer,
  originalName: string,
  folder = '/vtu-mentoring-docs'
): Promise<ICloudUploadResult> => {
  const ik = getImageKit();
  const cleanName = `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const response = await ik.upload({
    file: fileBuffer,
    fileName: cleanName,
    folder,
    useUniqueFileName: true,
  });

  return {
    url: response.url,
    fileId: response.fileId,
    name: response.name,
    size: response.size,
  };
};

export const deleteFromImageKit = async (fileId?: string): Promise<void> => {
  if (!fileId) return;
  try {
    const ik = getImageKit();
    await ik.deleteFile(fileId);
  } catch (err: any) {
    console.warn('[ImageKit Delete Notice]:', err?.message);
  }
};