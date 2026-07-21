const { config } = require("dotenv");
config();

const GOOGLE_MAPS_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAP_KEY ||
  "";

module.exports = {
  expo: {
    name: "Kabayan",
    slug: "Kabayan",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "kabayan",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      config: {
        googleMapsApiKey: GOOGLE_MAPS_KEY,
      },
      infoPlist: {
        NSCameraUsageDescription:
          "Allow Kabayan to access your camera for ID checks and posting photos",
        NSMicrophoneUsageDescription:
          "Allow Kabayan to access your microphone for video recording",
        NSPhotoLibraryUsageDescription:
          "Allow Kabayan to access your photo library for uploads",
        NSLocationWhenInUseUsageDescription:
          "Allow Kabayan to access your location for maps and nearby opportunities",
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_KEY,
        },
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.READ_MEDIA_IMAGES",
      ],
      package: "com.kabayan",
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
      bundler: "metro",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      "react-native-vision-camera",
      "expo-secure-store",
      [
        "expo-camera",
        {
          cameraPermission: "Allow Kabayan to access your camera",
          microphonePermission: "Allow Kabayan to access your microphone",
          recordAudioAndroid: true,
          barcodeScannerEnabled: true,
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "Allow Kabayan to access your photos for job and marketplace uploads",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Allow Kabayan to access your location for maps and nearby opportunities",
        },
      ],
      "expo-font",
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "a5cfb15d-016b-454d-ac66-5b44341f32de",
      },
    },
  },
};
