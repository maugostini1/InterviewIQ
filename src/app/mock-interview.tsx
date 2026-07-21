import { ScrollView, StyleSheet, Text, Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";

export default function InterviewScreen() {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Mock Interview</Text>

      <View style={styles.questionArea}>
        <Text style={styles.questionText}>
          What is your greatest strength?
        </Text>
      </View>

      <View style={styles.bottomSection}>
        <Text style={styles.label}>Answer</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Type your answer..."
        />

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/mock-interview")}
        >
          <Text style={styles.secondaryButtonText}>Submit</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F7F8FC",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  title: {
    marginBottom: 28,
    fontSize: 32,
    alignSelf: "center",
    fontWeight: "800",
    color: "#27245C",
  },
  questionArea: {
    flex: 1,
    alignSelf: "center",
    justifyContent: "center",    
  },
  label: {
    marginBottom: 7,
    fontWeight: "700",
    color: "#17172A",
  },
  questionText: {
    fontSize: 24,
    color: "#27245C",
    lineHeight: 26,
  },
  bottomSection: {
    justifyContent: "flex-end",
  },
  input: {
    minHeight: 50,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
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