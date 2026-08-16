import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as DocumentPicker from "expo-document-picker";
import { signupAccount } from "../api";

export default function SignupScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [careerField, setCareerField] = useState("");
  const [targetJob, setTargetJob] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateAccount = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      Alert.alert(
        "Missing information",
        "First name, last name, email, and password are required."
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await signupAccount({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        career_field: careerField.trim() || undefined,
        target_job: targetJob.trim() || undefined,
      });

      await SecureStore.setItemAsync("access_token", result.access_token);
      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Unable to create account",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>

        <Text style={styles.label}>First name</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Last name</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />

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
        />

        <Text style={styles.label}>Career field</Text>
        <TextInput
          style={styles.input}
          value={careerField}
          onChangeText={setCareerField}
          placeholder="Computer Science"
        />

        <Text style={styles.label}>Target job</Text>
        <TextInput
          style={styles.input}
          value={targetJob}
          onChangeText={setTargetJob}
          placeholder="Software Engineer"
          onSubmitEditing={handleCreateAccount}
        />

        <Pressable
          style={[styles.secondaryButton, isSubmitting && styles.disabledButton]}
          onPress={handleCreateAccount}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F7F8FC" },
  container: { padding: 24 },
  title: {
    marginVertical: 28,
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
  secondaryButton: {
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6C63FF",
    backgroundColor: "#6C63FF",
  },
  disabledButton: { opacity: 0.65 },
  secondaryButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },

  uploadLink: {
    color: "#6C63FF",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 25,
    textDecorationLine: "underline",
  },
});
