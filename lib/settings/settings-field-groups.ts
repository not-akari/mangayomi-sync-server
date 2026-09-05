// Groups raw settings keys to match the app's own Settings menu instead of one flat ~200-key dump; prefix match first, then an explicit list.

const PREFIX_GROUPS: [prefix: string, group: string][] = [
  ["libraryFilter", "Library"],
  ["animeLibrary", "Library"],
  ["novelLibrary", "Library"],
  ["library", "Library"],
  ["novelReader", "Reader"],
  ["novelFont", "Reader"],
  ["novelTapToScroll", "Reader"],
  ["novelShowScrollPercentage", "Reader"],
  ["novelRemoveExtraParagraphSpacing", "Reader"],
  ["webtoon", "Reader"],
  ["dualPage", "Reader"],
  ["flash", "Reader"],
  ["tapping", "Reader"],
  ["zoom", "Reader"],
  ["reader", "Reader"],
  ["tts", "Reader"],
  ["backgroundColor", "Reader"],
  ["borderColor", "Reader"],
  ["textColor", "Reader"],
  ["backup", "Backup"],
  ["rpc", "General"],
  ["doH", "General"],
  ["tv", "TV"],
];

const EXPLICIT_GROUPS: Record<string, string> = {
  appFontFamily: "Appearance",
  appUiScale: "Appearance",
  dateFormat: "Appearance",
  flexColorSchemeBlendLevel: "Appearance",
  flexSchemeColorIndex: "Appearance",
  followSystemTheme: "Appearance",
  pureBlackDarkMode: "Appearance",
  relativeTimesTamps: "Appearance",
  themeIsDark: "Appearance",

  androidProxyServer: "Browse & Extensions",
  autoExtensionsUpdates: "Browse & Extensions",
  autoStartExtensionServerOnLaunch: "Browse & Extensions",
  checkForExtensionUpdates: "Browse & Extensions",
  extensionServerPath: "Browse & Extensions",
  jrePath: "Browse & Extensions",
  onlyIncludePinnedSources: "Browse & Extensions",
  showNSFW: "Browse & Extensions",

  allowConcurrentDownloads: "Downloads",
  askDownloadDestination: "Downloads",
  concurrentDownloads: "Downloads",
  deleteDownloadAfterReading: "Downloads",
  downloadDelaySeconds: "Downloads",
  downloadLocation: "Downloads",
  downloadLocalFolderName: "Downloads",
  downloadOnlyOnWifi: "Downloads",
  downloadedOnlyMode: "Downloads",
  saveAsCBZArchive: "Downloads",

  customDns: "General",
  customDohUrl: "General",
  doHProviderId: "General",
  enableDiscordRpc: "General",
  hideDiscordRpcInIncognito: "General",
  userAgent: "General",
  checkForAppUpdates: "General",
  incognitoMode: "General",
  onboardingCompleted: "General",
  clearChapterCacheOnAppLaunch: "General",
  enableLogs: "General",
  cfProxyUrl: "General",
  btServerAddress: "General",
  btServerPort: "General",
  mangaGridSize: "Library",
  animeGridSize: "Library",
  novelGridSize: "Library",

  aniSkipTimeoutLength: "Player",
  audioPreferredLanguages: "Player",
  defaultDoubleTapToSkipLength: "Player",
  defaultPlayBackSpeed: "Player",
  defaultSkipIntroLength: "Player",
  enableAniSkip: "Player",
  enableAudioPitchCorrection: "Player",
  enableAutoSkip: "Player",
  enableGpuNext: "Player",
  enableHardwareAcceleration: "Player",
  forceLandscapePlayer: "Player",
  fullScreenPlayer: "Player",
  hwdecMode: "Player",
  markEpisodeAsSeenType: "Player",
  useLibass: "Player",
  useMpvConfig: "Player",
  useYUV420P: "Player",
  volumeBoostCap: "Player",
  autoPlayNextEpisode: "Player",

  animatePageTransitions: "Reader",
  autoReadDuplicateChapters: "Reader",
  cropBorders: "Reader",
  doubleTapAnimationSpeed: "Reader",
  fullScreenReader: "Reader",
  grayscale: "Reader",
  invertColors: "Reader",
  keepScreenOnReader: "Reader",
  mergeLibraryNavMobile: "Reader",
  navigateToPan: "Reader",
  pagePreloadAmount: "Reader",
  readerBrightness: "Reader",
  readerContrast: "Reader",
  readerHideThreshold: "Reader",
  readerNavigationLayout: "Reader",
  readerSaturation: "Reader",
  showNavigationOverlayOnStart: "Reader",
  showPageGaps: "Reader",
  showPagesNumber: "Reader",
  splitWidePages: "Reader",
  automaticBackground: "Reader",
  enableCustomColorFilter: "Reader",
  fontSize: "Reader",
  useBold: "Reader",
  useItalic: "Reader",

  appLockEnabled: "Security",

  lastTrackerLibraryLocation: "Tracking",
  updateProgressAfterReading: "Tracking",
};

const GROUP_ORDER = [
  "Appearance",
  "Library",
  "Browse & Extensions",
  "Downloads",
  "Reader",
  "Player",
  "Backup",
  "Tracking",
  "Security",
  "TV",
  "General",
  "Other",
];

export function groupSettingsFields(data: Record<string, unknown>): {
  group: string;
  entries: [key: string, value: unknown][];
}[] {
  const byGroup = new Map<string, [string, unknown][]>();
  for (const [key, value] of Object.entries(data)) {
    let group = EXPLICIT_GROUPS[key];
    if (!group) {
      const prefixMatch = PREFIX_GROUPS.find(([prefix]) =>
        key.startsWith(prefix),
      );
      group = prefixMatch?.[1] ?? "Other";
    }
    const entries = byGroup.get(group) ?? [];
    entries.push([key, value]);
    byGroup.set(group, entries);
  }

  return GROUP_ORDER.flatMap((group) => {
    const entries = byGroup.get(group);
    return entries ? [{ group, entries }] : [];
  });
}

// Lucide icon names for a caller to render - a plain .ts file can't import JSX components directly.
export const GROUP_ICON_NAMES: Record<string, string> = {
  Appearance: "Palette",
  Library: "LayoutGrid",
  "Browse & Extensions": "Compass",
  Downloads: "Download",
  Reader: "BookOpen",
  Player: "Play",
  Backup: "Archive",
  Tracking: "Radar",
  Security: "Lock",
  TV: "Tv",
  General: "Settings",
  Other: "MoreHorizontal",
};
