import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import bukowskiLogo from "./bukowski.png";

import CustomButton from "../components/CustomButton";

const Welcome = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Add a View to set the status bar background color */}
      <View style={{ height: 32, backgroundColor: "#161622" }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <Image
            source={bukowskiLogo}
            resizeMode="contain"
            style={styles.logo}
          />
          <CustomButton
            title="Logowanie"
            handlePress={() => router.push("/(auth)/sign-in")}
            containerStyles={styles.button}
          />
        </View>
      </ScrollView>
      <StatusBar style="light" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    flexGrow: 1,
    height: "100%",
  },
  container: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  logo: {
    width: 190,
    height: 54,
    alignSelf: "center",
  },
  button: {
    width: "100%",
    marginTop: 28,
    height: 64,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
});

export default Welcome;