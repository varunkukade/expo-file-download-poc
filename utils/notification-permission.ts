import notifee, { AndroidImportance } from "@notifee/react-native";
import { Platform } from "react-native";
import {
  checkNotifications,
  requestNotifications,
  RESULTS,
} from "react-native-permissions";
import { load, remove, save, StorageKey } from "./storage";

export const isIos = () => Platform.OS === "ios";
export const isAndroid = () => Platform.OS === "android";
export const getPlatformVersion = () => Number(Platform.Version);
export const fileDownloadChannelId = "file-downloads";
export const fileDownloadChannelName = "File Downloads";

// Save this instance to storage
export const savePermissionShown = (value: boolean) => {
  save(StorageKey.isNotificationPermissionShown, value);
};

// Remove from storage
export const clearPermissionShown = (): void => {
  remove(StorageKey.isNotificationPermissionShown);
};

// Load from storage
export const loadPermissionShown = (): boolean => {
  const raw = load<boolean>(StorageKey.isNotificationPermissionShown);
  return raw ? raw : false;
};

export const requestNotificationsPermission = (
  onGranted: () => void,
  onBlocked?: () => void
) => {
  requestNotifications(["alert", "sound", "badge"]).then(({ status }) => {
    if (status === RESULTS.GRANTED) {
      onGranted();
    } else {
      onBlocked?.();
    }
  });
};

export const checkNotificationsPermission = (
  onGranted: () => void,
  onBlocked?: () => void
) => {
  checkNotifications().then(({ status }) => {
    if (status === RESULTS.GRANTED) {
      onGranted();
    } else {
      onBlocked?.();
    }
  });
};

export const createChannel = (channelId: string, channelName: string) => {
  if (isIos()) {
    return;
  }
  notifee.isChannelCreated(channelId).then((isCreated) => {
    if (!isCreated) {
      notifee.createChannel({
        id: channelId,
        name: channelName,
        sound: "default",
        importance: AndroidImportance.HIGH,
      });
    }
  });
};

const createChannels = () => {
  //create new channels with any new channelId and channelName.
  createChannel(fileDownloadChannelId, fileDownloadChannelName);
};

export const handleNotificationPermission = (callback: () => void) => {
  //First check if notification permission already shown
  const isNotificationPermissionShown = loadPermissionShown();
  if (isNotificationPermissionShown) {
    //if shown already, don't ask it again.
    callback();
  } else {
    //If not shown, check notification permission
    checkNotificationsPermission(
      () => {
        createChannels();
        //if already granted, save it and execute callback code
        savePermissionShown(true);
        callback();
      },
      () => {
        //if not granted yet, ask for the permission
        if (isIos() || (isAndroid() && getPlatformVersion() >= 33)) {
          //only try to ask for permission for ios and android 33 and above
          requestNotificationsPermission(
            () => {
              createChannels();
              //if granted, save it
              savePermissionShown(true);
              callback();
            },
            () => {
              //if not granted, save it and execute callback code
              savePermissionShown(false);
              callback();
            }
          );
        } else {
          //for android below 33, we don't have to ask for permission as its already granted for them
          savePermissionShown(true);
          callback();
        }
      }
    );
  }
};
