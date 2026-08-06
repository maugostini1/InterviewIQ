import { router } from "expo-router";
import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function InitialScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("../../assets/images/InterviewIQ.png")}
          style={styles.logo}
        />

        <Text style={styles.tagline}>
          Practice smarter. Interview with confidence.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.primaryButtonText}>Login</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/signup")}
        >
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 500,
    height: 200,
    alignSelf: "center",
    marginBottom: 12,
  },
  tagline: {
    marginBottom: 40,
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
    color: "#6E7185",
  },
  primaryButton: {
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#6C63FF",
    marginBottom: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6C63FF",
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: {
    color: "#6C63FF",
    fontWeight: "700",
    fontSize: 16,
  },
});
