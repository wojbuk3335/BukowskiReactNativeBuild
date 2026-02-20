import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomButton from "../../components/CustomButton";
import { AuthContext } from "../../context/AuthContext";
import { GlobalStateContext } from "../../context/GlobalState";
import { getApiUrl } from "../../config/api";
import tokenService from "../../services/tokenService";

const TwoFactorScreen = () => {
  const params = useLocalSearchParams();
  const { userId, email, step = "2fa_verification" } = params || {};
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [setupSecret, setSetupSecret] = useState("");
  const [setupOtpAuthUrl, setSetupOtpAuthUrl] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  const { setUser, setIsLoggedIn } = useContext(GlobalStateContext);
  const authContext = useContext(AuthContext);

  useEffect(() => {
    const loadSetup = async () => {
      if (step !== "2fa_setup" || !userId) return;
      try {
        const response = await fetch(getApiUrl("/user/2fa/setup"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        const data = await response.json();
        if (!response.ok || !data?.success) {
          setError(data?.message || "Błąd inicjalizacji 2FA");
          return;
        }

        setSetupSecret(data.secret || "");
        setSetupOtpAuthUrl(data.otpauthUrl || "");
      } catch {
        setError("Błąd podczas inicjalizacji 2FA");
      }
    };

    loadSetup();
  }, [step, userId]);

  const handleSubmit = async () => {
    const codeValue = verificationCode.join("");
    if (!codeValue || codeValue.length !== 6) {
      setError("Wprowadź 6-cyfrowy kod weryfikacyjny");
      return;
    }

    if (!userId) {
      setError("Brak danych użytkownika do weryfikacji");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const endpoint = step === "2fa_setup" ? "/user/2fa/confirm" : "/user/verify-2fa";
      const response = await fetch(getApiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          verificationCode: codeValue,
          rememberMe: false,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        setError(data?.message || "Niepoprawny kod weryfikacyjny");
        return;
      }

      const accessToken = data.accessToken || data.token;
      if (accessToken) {
        await tokenService.setTokens(accessToken, data.refreshToken);
      }

      await AsyncStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      setIsLoggedIn(true);
      if (authContext?.login) {
        authContext.login(data);
      }

      if (data?.recoveryCodes?.length) {
        setRecoveryCodes(data.recoveryCodes);
        return;
      }

      router.replace("/(admin-tabs)/dashboard");
    } catch {
      setError("Wystąpił błąd podczas weryfikacji. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAuthenticator = async () => {
    if (!setupOtpAuthUrl) return;
    try {
      await Linking.openURL(setupOtpAuthUrl);
    } catch {
      setError("Nie udało się otworzyć Authenticatora");
    }
  };

  const handleBack = () => {
    router.replace("/(auth)/sign-in");
  };


  return (
    <SafeAreaView style={{ backgroundColor: "#000", flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Weryfikacja dwuetapowa</Text>
        <Text style={styles.subtitle}>
          Użyj aplikacji Google Authenticator i wpisz 6-cyfrowy kod.
        </Text>

        {step === "2fa_setup" && (
          <View style={styles.setupBlock}>
            <Text style={styles.label}>Dodaj konto w Authenticatorze jako:</Text>
            <Text style={styles.value}>{email || ""}</Text>

            {setupOtpAuthUrl ? (
              <View style={styles.qrWrap}>
                <Text style={styles.qrHint}>Otworz link w Authenticatorze</Text>
              </View>
            ) : null}

            {setupSecret ? (
              <Text style={styles.manualKey}>Klucz ręczny: {setupSecret}</Text>
            ) : null}

            {setupOtpAuthUrl ? (
              <CustomButton
                title="Otwórz w Authenticatorze"
                handlePress={handleOpenAuthenticator}
                containerStyles={styles.secondaryButton}
                textStyles={styles.secondaryButtonText}
              />
            ) : null}
          </View>
        )}

        <Text style={styles.tileLabel}>Kod weryfikacyjny</Text>
        <View style={styles.tileContainer}>
          {verificationCode.map((digit, index) => (
            <TextInput
              key={`otp-${index}`}
              ref={(el) => (inputRefs.current[index] = el)}
              value={digit}
              onChangeText={(value) => {
                const digits = value.replace(/\D/g, "");
                if (!digits) {
                  const next = [...verificationCode];
                  next[index] = "";
                  setVerificationCode(next);
                  return;
                }

                const next = [...verificationCode];
                for (let i = 0; i < digits.length && index + i < 6; i += 1) {
                  next[index + i] = digits[i];
                }
                setVerificationCode(next);
                if (error) setError("");

                const nextIndex = Math.min(index + digits.length, 5);
                inputRefs.current[nextIndex]?.focus();
              }}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === "Backspace" && !verificationCode[index] && index > 0) {
                  inputRefs.current[index - 1]?.focus();
                }
              }}
              keyboardType="numeric"
              maxLength={1}
              placeholder="-"
              placeholderTextColor="#6b7280"
              style={styles.tileInput}
              textAlign="center"
              selectionColor="#0d6efd"
            />
          ))}
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <CustomButton
          title={loading ? "Weryfikacja..." : "Zweryfikuj kod"}
          handlePress={handleSubmit}
          containerStyles={styles.button}
          isLoading={loading}
        />


        <CustomButton
          title="Powrót do logowania"
          handlePress={handleBack}
          containerStyles={styles.secondaryButton}
          textStyles={styles.secondaryButtonText}
        />

        {recoveryCodes.length > 0 && (
          <View style={styles.recoveryBox}>
            <Text style={styles.recoveryTitle}>Zapisz kody zapasowe:</Text>
            <View style={styles.recoveryList}>
              {recoveryCodes.map((code) => (
                <Text key={code} style={styles.recoveryCode}>{code}</Text>
              ))}
            </View>
            <CustomButton
              title="Przejdź do panelu"
              handlePress={() => router.replace("/(admin-tabs)/dashboard")}
              containerStyles={styles.button}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  setupBlock: {
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  label: {
    color: "#9ca3af",
    fontSize: 13,
    textAlign: "center",
  },
  value: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  qrWrap: {
    alignItems: "center",
    marginBottom: 12,
  },
  qrHint: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 8,
  },
  tileLabel: {
    color: "#f3f4f6",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 6,
  },
  tileContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  tileInput: {
    width: 46,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#18181b",
    borderWidth: 2,
    borderColor: "#0d6efd",
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  manualKey: {
    color: "#e5e7eb",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
  },
  inputSpacing: {
    marginTop: 8,
  },
  button: {
    marginTop: 12,
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: "#1f2937",
  },
  secondaryButtonText: {
    color: "#e5e7eb",
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: "#dc2626",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  recoveryBox: {
    marginTop: 20,
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 16,
  },
  recoveryTitle: {
    color: "#f9fafb",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  recoveryList: {
    alignItems: "center",
    marginBottom: 12,
  },
  recoveryCode: {
    color: "#fff",
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 4,
  },
});

export default TwoFactorScreen;
