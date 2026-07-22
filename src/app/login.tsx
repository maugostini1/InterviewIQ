import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { loginAccount } from "../api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing information", "Enter your email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await loginAccount({email: email.trim().toLowerCase(), password,});
      await SecureStore.setItemAsync("access_token", result.access_token);
      await SecureStore.setItemAsync("user", JSON.stringify(result.user));
      router.replace("/home");
    } catch (error) {
      Alert.alert(
        "Login failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Log In</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        secureTextEntry
        onSubmitEditing={handleLogin}
      />

      <Pressable
        style={[styles.button, isSubmitting && styles.disabledButton]}
        onPress={handleLogin}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F7F8FC",
  },
  title: {
    marginBottom: 28,
    fontSize: 32,
    alignSelf: "center",
    fontWeight: "800",
    color: "#27245C",
  },
  label: { marginBottom: 7, fontWeight: "700", color: "#17172A" },
  input: {
    height: 50,
    marginBottom: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#DFE2EA",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  button: {
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#6C63FF",
  },
  disabledButton: { opacity: 0.65 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
