import { useEffect, useRef, useState } from "react";
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
  completeMockInterview,
  InterviewQuestion,
  startMockInterview,
  StarFeedback,
  submitMockInterviewAnswer,
} from "../api";


export default function InterviewScreen() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [answer, setAnswer] = useState("");
    const [isStarting, setIsStarting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submissionInProgress = useRef(false);
    const QUESTION_TIME_SECONDS = 150;
    const TOTAL_QUESTIONS = 5;
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [feedbackResults, setFeedbackResults] = useState<StarFeedback[]>([]);
    const [secondsRemaining, setSecondsRemaining] = useState(
      QUESTION_TIME_SECONDS
    );
    const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
    };

const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    const beginInterview = async () => {
      try {
        setIsStarting(true);

        const result = await startMockInterview(
          "Software Engineer"
        );

        if (result.questions.length !== TOTAL_QUESTIONS) {
          throw new Error(
            "The interview did not return exactly five questions."
          );
        }

        setSessionId(result.session_id);
        setQuestions(result.questions);
        setCurrentQuestionIndex(0);
        setSecondsRemaining(QUESTION_TIME_SECONDS);
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

  void beginInterview();
  }, []);
  
const handleSubmit = async (timeExpired = false) => {
  if (
    submissionInProgress.current ||
    isSubmitting ||
    sessionId === null ||
    !currentQuestion
  ) {
    return;
  }

  const submittedAnswer = answer.trim();

  if (!timeExpired && !submittedAnswer) {
    Alert.alert(
      "Answer required",
      "Enter an answer before submitting."
    );
    return;
  }

  try {
    submissionInProgress.current = true;
    setIsSubmitting(true);

    const result = await submitMockInterviewAnswer(
      sessionId,
      currentQuestion.question_id,
      submittedAnswer ||
        "No answer was submitted before time expired."
    );

    const updatedFeedback = [
      ...feedbackResults,
      result,
    ];

    setFeedbackResults(updatedFeedback);

    const finalQuestion = currentQuestionIndex === TOTAL_QUESTIONS - 1;

    console.log("Fifth answer saved:", result);

    if (finalQuestion) {
      const completed = await completeMockInterview(sessionId);

      console.log("Session completed:", completed);

      router.replace({
        pathname: "/feedback",
        params: {
          sessionId: String(sessionId),
        },
      });

      return;
    }

    setCurrentQuestionIndex((previous) => previous + 1);
    setAnswer("");
    setSecondsRemaining(QUESTION_TIME_SECONDS);
  } catch (error) {
    Alert.alert(
      "Evaluation error",
      error instanceof Error
        ? error.message
        : "Unable to evaluate the answer."
    );

    if (timeExpired) {
      setSecondsRemaining(QUESTION_TIME_SECONDS);
    }
  } finally {
    setIsSubmitting(false);
    submissionInProgress.current = false;
  }
};

useEffect(() => {
  if (
    isStarting ||
    isSubmitting ||
    !currentQuestion
  ) {
    return;
  }

  const timer = setInterval(() => {
    setSecondsRemaining((previous) => {
      if (previous <= 1) {
        clearInterval(timer);

        void handleSubmit(true);

        return 0;
      }

      return previous - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, [
  currentQuestionIndex,
  isStarting,
  isSubmitting,
  currentQuestion?.question_id,
]);

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

    <View style={styles.interviewHeader}>
      <Text style={styles.questionCounter}>
        Question {currentQuestionIndex + 1} of {TOTAL_QUESTIONS}
      </Text>

      <Text
        style={[
          styles.timer,
          secondsRemaining <= 30 && styles.timerWarning,
        ]}
      >
        {formatTime(secondsRemaining)}
      </Text>
    </View>

<View style={styles.questionArea}>
  {isStarting ? (
    <ActivityIndicator size="large" />
  ) : currentQuestion ? (
    <Text style={styles.questionText}>
      {currentQuestion.question}
    </Text>
  ) : (
    <Text style={styles.questionText}>
      No question available.
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
        onPress={() => void handleSubmit(false)}
        disabled={isSubmitting || isStarting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.secondaryButtonText}>
            {currentQuestionIndex === TOTAL_QUESTIONS - 1
              ? "Finish Interview"
              : "Submit and Continue"}
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
interviewHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 18,
},

questionCounter: {
  fontSize: 17,
  fontWeight: "700",
  color: "#27245C",
},

timer: {
  fontSize: 24,
  fontWeight: "800",
  color: "#27245C",
},

timerWarning: {
  color: "#B42318",
},
});