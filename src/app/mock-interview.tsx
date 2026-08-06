import { useEffect, useState } from "react";
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

import {
  startMockInterview,
  StarFeedback,
  submitMockInterviewAnswer,
} from "../api";


export default function InterviewScreen() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [questionId, setQuestionId] = useState<number | null>(null);
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [feedback, setFeedback] = useState<StarFeedback | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
    const beginInterview = async () => {
      try {
        setIsStarting(true);

        // Later, load this from the user's profile.
        const result = await startMockInterview(
          "Software Engineer"
        );

        setSessionId(result.session_id);
        setQuestionId(result.question_id);
        setQuestion(result.question);
      } catch (error) {
        Alert.alert(
          "Interview error",
          error instanceof Error
            ? error.message
            : "Unable to start the interview."
        );
      } finally {
        setIsStarting(false);
      }
    };

    beginInterview();
  }, []);
  
  const handleSubmit = async () => {
  if (!answer.trim()) {
    Alert.alert(
      "Answer required",
      "Enter an answer before submitting."
    );
    return;
  }

  if (sessionId === null || questionId === null) {
    Alert.alert(
      "Interview unavailable",
      "The interview has not loaded yet."
    );
    return;
  }

  try {
    setIsSubmitting(true);

    const result = await submitMockInterviewAnswer(
      sessionId,
      questionId,
      answer.trim()
    );

    setFeedback(result);
  } catch (error) {
    Alert.alert(
      "Evaluation error",
      error instanceof Error
        ? error.message
        : "Unable to evaluate the answer."
    );
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <View style={styles.page}>
      <Pressable style={styles.menuButton} onPress={() => setMenuOpen(!menuOpen)}>
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
      </Pressable>

      {menuOpen && (
        <View style={styles.dropdown}>
          <Pressable
            style={styles.dropdownItem}
            onPress={() => {
              setMenuOpen(false);
              router.push("/home");
            }}
          >
            <Text style={styles.dropdownText}>Home</Text>
          </Pressable>

          <Pressable
            style={styles.dropdownItem}
            onPress={() => {
              setMenuOpen(false);
              router.push("/feedback");
            }}
          >
            <Text style={styles.dropdownText}>Feedback</Text>
          </Pressable>

          <Pressable
            style={styles.dropdownItem}
            onPress={() => {
              setMenuOpen(false);
              router.push("/mock-interview");
            }}
          >
            <Text style={styles.dropdownText}>Mock Interview</Text>
          </Pressable>
        </View>
      )}
      
      <Text style={styles.title}>Mock Interview</Text>

      <View style={styles.questionArea}>
        {isStarting ? (
          <ActivityIndicator size="large" />
        ) : (
          <Text style={styles.questionText}>
            {question}
          </Text>
        )}
      </View>

      <View style={styles.bottomSection}>
        <TextInput
          style={styles.input}
          value={answer}
          onChangeText={setAnswer}
          multiline
          textAlignVertical="top"
          placeholder="Describe the situation, task, action, and result..."
        />
      <View style={styles.buttonRow}>
        <Pressable
          style={styles.secondaryButton}
          onPress={handleSubmit}
          disabled={isSubmitting || isStarting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.secondaryButtonText}>
              Submit
            </Text>
          )}
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/feedback")}
        >
          <Text style={styles.secondaryButtonText}>End Interview</Text>
        </Pressable>
      </View>
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
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#6C63FF",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
    menuButton: {
    position: "absolute",
    top: 60,
    left: 24,
    width: 40,
    height: 40,
    justifyContent: "center",
    gap: 5,
    zIndex: 10,
  },
  menuLine: {
    height: 3,
    width: 24,
    borderRadius: 2,
    backgroundColor: "#27245C",
  },
    dropdown: {
    position: "absolute",
    top: 105,
    left: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DFE2EA",
    paddingVertical: 6,
    minWidth: 180,
    zIndex: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#27245C",
  },
  buttonRow: {
  gap: 12,
},

});