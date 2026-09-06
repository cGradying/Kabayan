import CustomLoading from "@/components/CustomComponents/CustomLoadingSpinner";
import AppPermissionsModal from "@/components/PermissionModal/AppPermissionsModal";
import useLandingPage from "@/hooks/useLandingPage";
import { useTheme } from "@/hooks/useTheme";
import Drawer from "expo-router/drawer";
import { useEffect, useState } from "react";
import { StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Index from "./index"
import { SafeAreaProvider } from "react-native-safe-area-context";
import CustomDrawerContent from "@/components/CustomComponents/CustomDrawerContent" 
import "../global.css";
import {DocumentPickerContextProvider} from "@/context/DocumentPickerContext"
import { ImagePickerContextProvider } from "@/context/ImagePicker";
import { storage, ready } from "@/utils/MMKVConfig";

export default function RootLayout() {
  const { t } = useTheme();
  const { getIsFirstOpened } = useLandingPage();
  const [FirstOpened, setFirstOpened] = useState<boolean | null>(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    ready.then(() => {
      const hasOpened = getIsFirstOpened();
      const LandingPageValue = hasOpened === undefined ? true : !hasOpened;
      setFirstOpened(LandingPageValue);
    });
  }, [getIsFirstOpened]);

  useEffect(() => {
    if (FirstOpened !== false) return;
    ready.then(() => {
      const hasSeenPermissionModal = storage.getBoolean("app_permissions_modal_seen");
      if (!hasSeenPermissionModal) {
        setShowPermissionModal(true);
      }
    });
  }, [FirstOpened]);

  const handlePermissionModalDone = () => {
    storage.set("app_permissions_modal_seen", true);
    setShowPermissionModal(false);
  };

  if (FirstOpened === null) {
    return (
      <View className="flex flex-1">
        <CustomLoading />
      </View>
    );
  }

   if (FirstOpened) {
    return <Index  />
   }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={t.isDarkMode ? 'light-content' : 'dark-content'} />
        <ImagePickerContextProvider>
          <DocumentPickerContextProvider>
            <Drawer
              drawerContent={(props) => <CustomDrawerContent {...props} />}
              screenOptions={{
                headerShown: false,
                drawerStyle: { width: '78%' },
                overlayColor: 'rgba(0,0,0,0.45)',
              }}
            >
              <Drawer.Screen
                name="(tabs)"
                options={{ drawerLabel: "Home" }}
              />
              <Drawer.Screen
                name="(ProtectedRoutes)"
                options={{ drawerItemStyle: { display: "none" } }}
              />
              <Drawer.Screen
                name="index"
                options={{ drawerItemStyle: { display: "none" } }}
              />
            </Drawer>
            <AppPermissionsModal visible={showPermissionModal} onDone={handlePermissionModalDone} />
          </DocumentPickerContextProvider>
        </ImagePickerContextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
