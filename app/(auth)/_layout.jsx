import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

const AuthLayout = () => {

  return (
    <>
      {/* Add a View to set the status bar background color */}
      <View style={{ height: 32, backgroundColor: "#161622" }} />
      <Stack options={{ headerShown: false }}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="two-factor" options={{ headerShown: false }} />
      </Stack>

      <StatusBar style="light" />
    </>
  );
};

export default AuthLayout;
