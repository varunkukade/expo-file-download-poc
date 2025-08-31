import notifee, {
  AndroidGroupAlertBehavior,
  EventType,
} from "@notifee/react-native";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import Share from "react-native-share";
import { truncate } from "./format";
import { fileDownloadChannelId } from "./notification-permission";

const CACHE_DIR = `${FileSystem.documentDirectory}`;
// outside your functions
const activeDownloads: Record<string, FileSystem.DownloadResumable> = {};

const cancelDownload = async (notificationId: string) => {
  // 1. Cancel notification
  await notifee.cancelNotification(notificationId);

  // 2. Cancel actual download
  const resumable = activeDownloads[notificationId];
  if (resumable) {
    try {
      await resumable.cancelAsync();
      console.log(`✅ Download cancelled: ${notificationId}`);
    } catch (err) {
      console.log(`❌ Error cancelling: ${notificationId}`, err);
    } finally {
      delete activeDownloads[notificationId]; // cleanup
    }
  }
};

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "cancel") {
    const notificationId = detail.notification?.id;
    if (!notificationId) return;

    console.log("Cancel pressed for", notificationId);

    await cancelDownload(notificationId);
  }
});

notifee.onForegroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "cancel") {
    const notificationId = detail.notification?.id;
    if (!notificationId) return;

    console.log("Cancel pressed for", notificationId);

    await cancelDownload(notificationId);
  }
});

notifee.onForegroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "cancel") {
    const notificationId = detail.notification?.id;
    if (!notificationId) return;

    console.log("Cancel pressed for", notificationId);

    // 1. Cancel notification
    await notifee.cancelNotification(notificationId);

    // 2. Cancel actual download
    const resumable = activeDownloads[notificationId];
    if (resumable) {
      try {
        await resumable.cancelAsync();
        console.log(`✅ Download cancelled: ${notificationId}`);
      } catch (err) {
        console.log(`❌ Error cancelling: ${notificationId}`, err);
      } finally {
        delete activeDownloads[notificationId]; // cleanup
      }
    }
  }
});

async function getUniqueFilename(directoryUri: string, filename: string) {
  const { name, extension } = splitFileName(filename);

  // Get all files in the folder
  const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(
    directoryUri
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

function splitFileName(filename: string) {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) {
    return { name: filename, extension: "" };
  }
  return {
    name: filename.substring(0, dotIndex),
    extension: filename.substring(dotIndex),
  };
}

export type DownloadFile = {
  url: string;
  filename: string;
  headers?: Record<string, string>;
};

const getNotificationId = (filename: string) => `download-${filename}`;
const groupNotificationId = `download-summary`;
const groupId = `download-group`;
const groupAlertBehavior = AndroidGroupAlertBehavior.SUMMARY;

/**
 * Core reusable function to download multiple files
 * @param {Array} files - Array of { url, filename, mimetype?, headers? }
 */
export const downloadFiles = async (files: DownloadFile[]): Promise<void> => {
  try {
    // Create summary notification (parent group holder)
    await notifee.displayNotification({
      id: groupNotificationId,
      subtitle: `Downloading files...`,
      android: {
        channelId: fileDownloadChannelId,
        groupId: groupId,
        groupSummary: true,
        groupAlertBehavior: groupAlertBehavior,
      },
    });

    await Promise.all(
      files.map((file) => {
        const notificationId = getNotificationId(file.filename);
        return notifee.displayNotification({
          id: notificationId,
          title: `Downloading: ${truncate(file.filename)}`,
          android: {
            channelId: fileDownloadChannelId,
            progress: {
              indeterminate: true,
            },
            onlyAlertOnce: true,
            groupId: groupId,
            groupAlertBehavior: groupAlertBehavior,
          },
        });
      })
    );

    // Download all files in parallel into sandbox
    const downloads = await Promise.allSettled(
      files.map(async (file) => {
        const notificationId = getNotificationId(file.filename);

        try {
          const downloadResumable = FileSystem.createDownloadResumable(
            file.url,
            CACHE_DIR + file.filename,
            file.headers ? { headers: file.headers } : undefined,
            (progress) => {
              const prog =
                progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
              const percent = Math.floor(prog * 100);

              if (percent >= 100 || percent < 0) {
                return;
              }

              notifee.displayNotification({
                id: notificationId,
                title: `Downloading: ${truncate(file.filename)}`,
                android: {
                  channelId: fileDownloadChannelId,
                  progress: {
                    indeterminate: false,
                    max: 100,
                    current: percent, // ✅ integer between 0–100
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
                  onlyAlertOnce: true,
                  groupId: groupId,
                  groupAlertBehavior: groupAlertBehavior,
                },
              });
            }
          );

          activeDownloads[notificationId] = downloadResumable;

          const result = await downloadResumable.downloadAsync();
          console.log("Download result for " + file.filename + ":", result);

          if (result?.uri) {
            // Update success notification
            await notifee.displayNotification({
              id: notificationId,
              title: `${truncate(file.filename)}`,
              body: "Download complete.",
              android: {
                channelId: fileDownloadChannelId,
                progress: undefined,
                onlyAlertOnce: true,
                groupId: groupId,
                groupAlertBehavior: groupAlertBehavior,
              },
              ios: {
                sound: "default",
              },
            });
          }
          return result;
        } catch (error) {
          // Update failure notification
          await notifee.displayNotification({
            id: notificationId,
            title: `${truncate(file.filename)}`,
            body: "Download failed. Please try again.",
            android: {
              channelId: fileDownloadChannelId,
              progress: undefined,
              onlyAlertOnce: true,
              groupId: groupId,
              groupAlertBehavior: groupAlertBehavior,
            },
            ios: {
              sound: "default",
            },
          });
          return undefined;
        }
      })
    );

    const successFiles = downloads.filter(
      (result) => result !== undefined && result.status === "fulfilled"
    ) as PromiseSettledResult<FileSystem.FileSystemDownloadResult>[];
    const successCount = successFiles.length;
    const failCount = files.length - successCount;

    //Once all finished → update summary
    await notifee.displayNotification({
      id: groupNotificationId,
      title: `Downloads complete`,
      body:
        failCount === 0
          ? `${successCount} file(s) downloaded successfully.`
          : `${successCount} succeeded, ${failCount} failed.`,
      android: {
        channelId: fileDownloadChannelId,
        groupId: groupId,
        groupSummary: true,
        groupAlertBehavior: groupAlertBehavior,
      },
    });

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

    const urisToShare: string[] = [];

    // 2. Process results one by one
    for (let i = 0; i < successFiles.length; i++) {
      const result = successFiles[i];
      const { filename } = files[i];

      if (result.status === "fulfilled") {
        const { uri } = result.value;
        if (Platform.OS === "android") {
          if (directoryUri) {
            try {
              const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
              });

              const uniqueName = await getUniqueFilename(
                directoryUri,
                filename
              );

              await FileSystem.StorageAccessFramework.createFileAsync(
                directoryUri,
                uniqueName,
                result.value.headers["content-type"]
              )
                .then(async (fileUri) => {
                  await FileSystem.writeAsStringAsync(fileUri, base64, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                  console.log(`✅ Saved ${uniqueName} successfully`);
                })
                .catch((e) => console.log(`❌ Error writing file:`, e));
            } catch (err) {
              console.log(`❌ Failed saving ${filename} to Downloads`, err);
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
        await Share.open({
          urls: urisToShare,
          failOnCancel: false,
          saveToFiles: true,
        });
      } catch (err) {
        console.log("❌ Error sharing files:", err);
      }
    }
  } catch (err) {
    console.log("Unexpected error in downloadFiles:", err);
  }
};
