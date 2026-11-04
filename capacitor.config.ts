import type { CapacitorConfig } from "@capacitor/cli";

// The Android app loads the deployed site; server actions cannot be bundled. For the emulator
// against a local server: `CAPACITOR_SERVER_URL=http://localhost:3100 npm run cap:sync` with
// `adb reverse tcp:3100 tcp:3100` (localhost keeps the secure session cookie and the camera).
const serverUrl = process.env.CAPACITOR_SERVER_URL || "https://petpro.kodleon.com";

const config: CapacitorConfig = {
  appId: "com.kodleon.petpro",
  appName: "PetPro",
  webDir: "capacitor/www",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    errorPath: "offline.html",
  },
  android: {
    backgroundColor: "#0b0e14",
  },
  plugins: {
    // The site hides the splash once it loads; the timeout covers pages that never do
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#0b0e14",
      showSpinner: false,
    },
  },
};

export default config;
