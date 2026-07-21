import { router } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
      />

      <Pressable style={styles.button} onPress={() => router.push("/home")}>
        <Text style={styles.buttonText}>Login</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/signup")}>
        <Text style={styles.link}>Create an account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#F7F8FC",
  },
  title: {
    marginTop: 40,
    marginBottom: 30,
    alignSelf: "center",
    fontSize: 32,
    fontWeight: "800",
    color: "#27245C",
  },
  label: {
    marginBottom: 7,
    fontWeight: "700",
    color: "#17172A",
  },
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
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#6C63FF",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    marginTop: 22,
    textAlign: "center",
    color: "#6C63FF",
    fontWeight: "600",
  },
});