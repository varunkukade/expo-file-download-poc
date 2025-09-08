import { Image } from "expo-image";
import { Button, StyleSheet } from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { downloadFiles } from "@/utils/download-file";
import { getFreeDiskStorage, getRemoteFileSize } from "@/utils/file-system";
import { handleNotificationPermission } from "@/utils/notification-permission";

const getToken = () => {
  return "kuudwukudwkudwkukwuudwkukwdkdw";
};

export default function HomeScreen() {
  const getHeaders = () => {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const downloadSingleFile = async () => {
    handleNotificationPermission(() => {
      const files = [
        {
          url: "https://s24.q4cdn.com/216390268/files/doc_downloads/test.pdf",
          filename: "test.pdf",
        },
      ];
      downloadFiles(files);
    });
  };

  const downloadMultipleFiles = async () => {
    handleNotificationPermission(() => {
      const files = [
        // {
        //   url: "https://mmatechnical.com/Download/Download-Test-File/(MMA)-100MB.zip",
        //   filename: "100mb.zip",
        // },
        // {
        //   url: "https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-large-zip-file.zip",
        //   filename: "large.zip",
        // },
        // {
        //   url: "https://mmatechnical.com/Download/Download-Test-File/(MMA)-1GB.zip",
        //   filename: "1gb.zip",
        // },
        {
          url: "https://ash-speed.hetzner.com/10GB.bin",
          filename: "10gb.bin",
          size: 10 * 1024 * 1024 * 1024,
        },
        {
          url: "https://s24.q4cdn.com/216390268/files/doc_downloads/test.pdf",
          filename: "test.pdf",
        },
        // {
        //   url: "https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf",
        //   filename: "adobe.pdf",
        // },
        // {
        //   url: "https://www.aeee.in/wp-content/uploads/2020/08/Sample-pdf.pdf",
        //   filename: "aeee.pdf",
        // },
        // {
        //   url: "https://www.archlou.org/wp-content/uploads/2019/02/HyperlinkTest.pdf",
        //   filename: "archlou.pdf",
        // },
        // {
        //   url: "https://ontheline.trincoll.edu/images/bookdown/sample-local-pdf.pdf",
        //   filename: "ontheline.pdf",
        // },
      ];
      downloadFiles(files);
    });
  };

  const downloadAuthenticatedFile = async () => {
    handleNotificationPermission(() => {
      const files = [
        {
          url: "https://s24.q4cdn.com/216390268/files/doc_downloads/test.pdf",
          filename: "test.pdf",
          headers: getHeaders(),
        },
      ];
      downloadFiles(files);
    });
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <Button title="Download Single File" onPress={downloadSingleFile} />
      <Button title="Download Multiple Files" onPress={downloadMultipleFiles} />
      <Button
        title="Download authenticated file"
        onPress={downloadAuthenticatedFile}
      />
      <Button
        title="Get Free Disk Storage"
        onPress={async () => {
          const freeDiskStorage = await getFreeDiskStorage();
          console.log("Free Disk Storage", freeDiskStorage);
        }}
      />
      <Button
        title="Get Remote File Size"
        onPress={async () => {
          const remoteFileSize = await getRemoteFileSize(
            "https://s24.q4cdn.com/216390268/files/doc_downloads/test.pdf"
          );
          console.log("Remote File Size", remoteFileSize);
        }}
      />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
