import * as FileSystem from "expo-file-system";

export const activeDownloads: Record<string, FileSystem.DownloadResumable> = {};

export const fetchDownload = (id: string) => {
  return activeDownloads[id];
};

export const storeDownload = (
  id: string,
  downloadResumable: FileSystem.DownloadResumable
) => {
  activeDownloads[id] = downloadResumable;
};

export const removeDownload = (id: string) => {
  delete activeDownloads[id];
};

export const eraseDownloads = () => {
  Object.keys(activeDownloads).forEach((key) => {
    removeDownload(key);
  });
};
