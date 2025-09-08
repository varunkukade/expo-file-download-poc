import notifee, {
  AndroidGroupAlertBehavior,
  EventType,
  Notification,
  NotificationAndroid,
} from "@notifee/react-native";
import { fetchDownload, removeDownload } from "./global";
import { fileDownloadChannelId } from "./notification-permission";
import { DownloadFile } from "./types";

export const getNotificationId = (filename: string) => `download-${filename}`;
export const groupNotificationId = `download-summary`;
export const groupId = `download-group`;
export const groupAlertBehavior = AndroidGroupAlertBehavior.SUMMARY;

const cancelNotification = async (notificationId: string) => {
  // 1. Cancel notification
  await notifee.cancelNotification(notificationId);

  // 2. Cancel actual download
  const resumable = fetchDownload(notificationId);
  if (resumable) {
    try {
      await resumable.cancelAsync();
      console.log(`✅ Download cancelled: ${notificationId}`);
    } catch (err) {
      console.log(`❌ Error cancelling: ${notificationId}`, err);
    } finally {
      removeDownload(notificationId); // cleanup
    }
  }
};

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "cancel") {
    const notificationId = detail.notification?.id;
    if (!notificationId) return;

    console.log("Cancel pressed for", notificationId);

    await cancelNotification(notificationId);
  }
});

notifee.onForegroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "cancel") {
    const notificationId = detail.notification?.id;
    if (!notificationId) return;

    console.log("Cancel pressed for", notificationId);

    await cancelNotification(notificationId);
  }
});

export const updateSummaryNotification = async (
  title: string,
  body?: string
) => {
  await notifee.displayNotification({
    id: groupNotificationId,
    title,
    body,
    android: {
      channelId: fileDownloadChannelId,
      groupId: groupId,
      groupSummary: true,
      groupAlertBehavior: groupAlertBehavior,
    },
  });
};

export const updateFileNotification = ({
  file,
  title,
  body,
  progress,
  actions,
  iosSound,
}: {
  file: DownloadFile;
  title: string;
  body?: string;
  progress?: { indeterminate: boolean; max: number; current: number };
  actions?: {
    title: string;
    pressAction: { id: string; launchActivity: string | undefined };
  }[];
  iosSound?: string;
}) => {
  console.log("---------------------------------------------");
  console.log("Updating file notification for", file.filename);
  console.log("Progress", progress);
  console.log("title", title);
  console.log("body", body);
  console.log("---------------------------------------------");

  const notificationId = getNotificationId(file.filename);

  const androidRequest: NotificationAndroid = {
    channelId: fileDownloadChannelId,
    onlyAlertOnce: true,
    groupId: groupId,
    groupAlertBehavior: groupAlertBehavior,
  };
  if (progress) {
    androidRequest.progress = progress;
  } else {
    androidRequest.progress = undefined;
  }
  if (actions) {
    androidRequest.actions = actions;
  } else {
    androidRequest.actions = [];
  }
  const request: Notification = {
    id: notificationId,
    title,
    android: androidRequest,
  };
  if (iosSound) {
    request.ios = {
      sound: iosSound,
    };
  }
  if (body) {
    request.body = body;
  } else {
    request.body = "";
  }
  console.log("Updating notification", request);
  notifee.displayNotification(request);
};
