import { ScrollView, StyleSheet, Text, Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";

export default function SignupScreen() {
  return (
    <ScrollView style={styles.page}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>

        <Text style={styles.label}>First name</Text>
        <TextInput style={styles.input} />

        <Text style={styles.label}>Last name</Text>
        <TextInput style={styles.input} />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} secureTextEntry />

        <Text style={styles.label}>Career field</Text>
        <TextInput
          style={styles.input}
          placeholder="Computer Science"
        />

        <Text style={styles.label}>Target job</Text>
        <TextInput
          style={styles.input}
          placeholder="Software Engineer"
        />

        <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push("/login")}
        >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },
  container: {
    padding: 24,
  },
  title: {
    marginVertical: 28,
    fontSize: 32,
    alignSelf: "center",
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
  secondaryButton: {
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#6C63FF",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});