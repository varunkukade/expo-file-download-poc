import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import {
  createNewFile,
  deleteAllFiles,
  DOCUMENT_DIR,
  download,
  ensureDirExists,
  getFreeDiskStorage,
  getRemoteFileSize,
  getStoragePermissions,
  readFileContentAsBase64,
  writeFileContent,
} from "./file-system";
import { truncate } from "./format";
import { eraseDownloads } from "./global";
import { updateFileNotification, updateSummaryNotification } from "./notifee";
import { shareFile } from "./share-file";
import { DownloadFile } from "./types";
/**
 * Core reusable function to download multiple files
 * @param {Array} files - Array of { url, filename, mimetype?, headers? }
 */
export const downloadFiles = async (files: DownloadFile[]): Promise<void> => {
  const lastProgressMap: Record<string, number> = {};
  try {
    // Create summary notification (parent group holder)
    updateSummaryNotification("Downloading files...");

    //update each file notification as in-progress
    files.forEach((file) => {
      const truncatedFilename = truncate(file.filename);
      updateFileNotification({
        file,
        title: `Downloading: ${truncatedFilename}`,
        body: undefined,
        progress: undefined,
        actions: [],
        iosSound: undefined,
      });
    });

    await ensureDirExists(DOCUMENT_DIR);

    const promises = files.map(async (file) => {
      try {
        //first check if disk has enough storage for this file.
        let remoteFileSize = await getRemoteFileSize(file.url);
        let fileSize = file.size;
        if (!remoteFileSize && !fileSize) {
          throw new Error("Failed to get remote file size");
        }
        const freeDiskStorage = await getFreeDiskStorage();
        if (freeDiskStorage < (remoteFileSize || fileSize)) {
          throw new Error("Not enough disk space");
        }
        const result = await download(file, (progress) => {
          const prog =
            progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
          const percent = Math.floor(prog * 100);
          console.log("Received progress for " + file.filename + ":", percent);

          if (percent > 100 || percent < 0) {
            return;
          }

          const lastReported = lastProgressMap[file.filename] ?? 0;

          if (percent === 100) {
            // Always update on complete
            updateFileNotification({
              file,
              title: `${truncate(file.filename)}`,
              body: "Download complete.",
              progress: undefined,
              actions: [],
              iosSound: "default",
            });
            lastProgressMap[file.filename] = 100;
          } else {
            // Calculate threshold bucket (0–9 → 0, 10–19 → 10, etc.)
            const currentBucket = Math.floor(percent / 10) * 10;
            const lastBucket = Math.floor(lastReported / 10) * 10;

            if (currentBucket > lastBucket) {
              // Only update if we crossed a new bucket
              updateFileNotification({
                file,
                title: `Downloading: ${truncate(file.filename)} - ${percent}%`,
                body: undefined,
                progress: {
                  indeterminate: false,
                  max: 100,
                  current: percent,
                },
                actions: [
                  {
                    title: "Cancel",
                    pressAction: {
                      id: "cancel",
                      launchActivity: undefined,
                    },
                  },
                ],
                iosSound: undefined,
              });
              lastProgressMap[file.filename] = percent;
            }
          }
        });
        console.log("Download result for " + file.filename + ":", result?.uri);

        if (result?.uri) {
          return result;
        }
      } catch (error: any) {
        // Update failure notification
        updateFileNotification({
          file,
          title: `${truncate(file.filename)}`,
          body: "Failed: " + error.message,
          progress: undefined,
          actions: [],
          iosSound: "default",
        });
      }
    });

    // Download all files in parallel into sandbox storage directory
    const downloads = await Promise.allSettled(promises);
    console.log("Downloads result:", downloads);

    const successFiles = downloads.filter(
      (result) =>
        result !== undefined &&
        result.status === "fulfilled" &&
        result.value?.uri
    ) as PromiseSettledResult<FileSystem.FileSystemDownloadResult>[];
    const successCount = successFiles.length;
    const failCount = files.length - successCount;

    //Once all finished → update summary
    updateSummaryNotification(
      "Downloads Summary",
      failCount === 0
        ? `${successCount} file(s) downloaded successfully.`
        : `${
            successCount > 0 ? successCount + " succeeded, " : ""
          }${failCount} failed.`
    );

    if (successCount > 0) {
      const directoryUri = await getStoragePermissions();
      const urisToShare: string[] = [];

      //Process stored files one by one
      for (let i = 0; i < successFiles.length; i++) {
        const result = successFiles[i];
        const { filename } = files[i];

        if (result.status === "fulfilled") {
          const { uri } = result.value;
          if (Platform.OS === "android") {
            if (directoryUri) {
              try {
                const base64 = await readFileContentAsBase64(uri);
                const fileUri = await createNewFile(
                  directoryUri,
                  filename,
                  result.value.headers["content-type"]
                );
                await writeFileContent(fileUri, base64);
              } catch (err) {
                console.log(`❌ Error saving ${filename} to Downloads`, err);
              }
            } else {
              // Android fallback: add to share list
              urisToShare.push(uri);
            }
          } else {
            // iOS: add to share list
            urisToShare.push(uri);
          }
        } else {
          console.log(`❌ Download failed for ${filename}`, result.reason);
        }
      }

      // After loop, share all files at once (if any)
      if (urisToShare.length > 0) {
        try {
          await shareFile(urisToShare);
        } catch (err) {
          console.log("❌ Error sharing files:", err);
        }
      }
    }

    eraseDownloads();

    //also delete all the temporary files from the document directory
    deleteAllFiles();
  } catch (err) {
    console.log("Unexpected error while downloading files:", err);
  }
};
