export function calculateContainerWidths(settings: {
  hideVideo: boolean;
  hideWebcam: boolean;
  videoSize: number;
}) {
  const videoContainerWidth = !settings.hideVideo
    ? settings.hideWebcam
      ? "100%"
      : `${settings.videoSize}%`
    : "0%";

  const webcamContainerWidth = !settings.hideWebcam
    ? settings.hideVideo
      ? "100%"
      : `${100 - settings.videoSize}%`
    : "0%";

  return {
    videoContainerWidth,
    webcamContainerWidth,
  };
}
