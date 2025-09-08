export type DownloadFile = {
  url: string;
  filename: string;
  headers?: Record<string, string>;
  size?: number;
};
