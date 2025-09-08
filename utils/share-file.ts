import Share from "react-native-share";

export const shareFile = async (urisToShare: string[]) => {
  try {
    await Share.open({
      urls: urisToShare,
      failOnCancel: false,
      saveToFiles: true,
    });
  } catch (err) {
    throw err;
  }
};
