import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { splitFileName } from "./format";
import { storeDownload } from "./global";
import { getNotificationId } from "./notifee";
import { DownloadFile } from "./types";

export const DOCUMENT_DIR = `${FileSystem.documentDirectory}`;

export const getFileDownloadPath = (dir: string, filename: string) =>
  dir + filename;

export const doesDirExist = async (dir: string) => {
  const dirInfo = await FileSystem.getInfoAsync(dir);
  return dirInfo.exists;
};

// Creates the directory
export const createDir = async (dir: string) => {
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
};

// Checks if gif directory exists. If not, creates it
export const ensureDirExists = async (dir: string) => {
  const isExist = await doesDirExist(dir);
  if (!isExist) {
    console.log("File directory doesn't exist, creating…");
    await createDir(dir);
  }
};

export const download = async (
  file: DownloadFile,
  callback: (progress: FileSystem.DownloadProgressData) => void
): Promise<FileSystem.FileSystemDownloadResult | undefined> => {
  const downloadResumable = FileSystem.createDownloadResumable(
    file.url,
    getFileDownloadPath(DOCUMENT_DIR, file.filename),
    file.headers ? { headers: file.headers, md5: true } : { md5: true },
    callback
  );
  const notificationId = getNotificationId(file.filename);
  storeDownload(notificationId, downloadResumable);
  const result = await downloadResumable.downloadAsync();
  return result;
};

export const getStoragePermissions = async () => {
  let directoryUri: string | null = null;

  if (Platform.OS === "android") {
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (permissions.granted) {
      directoryUri = permissions.directoryUri;
    } else {
      console.log("User denied permission → fallback to sharing");
      directoryUri = null;
    }
  }
  return directoryUri;
};

export const readFileContentAsBase64 = async (uri: string) => {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
};

export const createNewFile = async (
  dirUri: string,
  filename: string,
  contentType: string
): Promise<string> => {
  const uniqueName = await getUniqueFilename(dirUri, filename);

  try {
    const result = await FileSystem.StorageAccessFramework.createFileAsync(
      dirUri,
      uniqueName,
      contentType
    );
    return result;
  } catch (err) {
    console.log(`❌ Error creating file:`, err);
    throw err;
  }
};

export const writeFileContent = async (
  fileUri: string,
  base64: string
): Promise<void> => {
  try {
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(`✅ Saved file successfully`);
  } catch (err) {
    console.log(`❌ Error writing file:`, err);
    throw err;
  }
};

export async function getUniqueFilename(dirUri: string, filename: string) {
  const { name, extension } = splitFileName(filename);

  // Get all files in the folder
  const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(
    dirUri
  );

  let newName = filename;
  let counter = 1;

  // Check if name already exists
  while (files.some((fileUri) => fileUri.endsWith("/" + newName))) {
    newName = `${name} (${counter})${extension}`;
    counter++;
  }

  return newName;
}

export const deleteAllFiles = async () => {
  console.log("Deleting all files…");
  await FileSystem.deleteAsync(DOCUMENT_DIR);
};

export const getFreeDiskStorage = async () => {
  const info = await FileSystem.getFreeDiskStorageAsync();
  return info;
};

export const getRemoteFileSize = async (
  url: string
): Promise<number | null> => {
  try {
    const response = await fetch(url, { method: "HEAD" });
    const contentLength = response.headers.get("Content-Length");
    return contentLength ? parseInt(contentLength, 10) : null;
  } catch (e) {
    console.error("Error fetching file size:", e);
    return null;
  }
};
