export function googleDriveShareToDirect(url: string): { directUrl?: string; id?: string } {
  if (!url) return {};
  try {
    // Supported formats:
    // - https://drive.google.com/file/d/{ID}/view?usp=sharing
    // - https://drive.google.com/open?id={ID}
    // - https://drive.google.com/uc?id={ID}&export=download
    // - https://drive.google.com/thumbnail?id={ID}
    const fileIdMatch =
      url.match(/\/file\/d\/([^/]+)/)?.[1] ||
      url.match(/[?&]id=([^&]+)/)?.[1] ||
      url.match(/(?:uc|thumbnail)\?id=([^&]+)/)?.[1];

    if (!fileIdMatch) return {};
    const id = decodeURIComponent(fileIdMatch);
    const directUrl = `https://drive.google.com/uc?export=download&id=${id}`;
    return { directUrl, id };
  } catch {
    return {};
  }
}