import { router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function HomeScreen() {
  return (
    <ScrollView style={styles.page}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome Back!</Text>

        <Text style={styles.label}>Interviews</Text>
        <View style={styles.statCard}>
          <Text style={styles.statText}>Interviews Taken</Text>
        </View>

        <Text style={styles.label}>Average Score</Text>
        <View style={styles.statCard}>
          <Text style={styles.statText}>85%</Text>
        </View>

        <Text style={styles.label}>Strengths</Text>
        <View style={styles.statCard}>
          <Text style={styles.statText}>Strong Communication Skills</Text>
        </View>

        <Text style={styles.label}>Improvement Areas</Text>
        <View style={styles.statCard}>
          <Text style={styles.statText}>Technical Knowledge</Text>
        </View>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/mock-interview")}
        >
          <Text style={styles.secondaryButtonText}>Start Mock Interview</Text>
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
    alignSelf: "center",
    fontSize: 24,
    fontWeight: "700",
    color: "#17172A",
  },
  statCard: {
    width: "100%",
    minHeight: 140,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 6,
  },
  statText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#27245C",
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
