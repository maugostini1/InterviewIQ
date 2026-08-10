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
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import {
  cancelMockInterview,
  completeMockInterview,
  startMockInterview,
  submitMockInterviewAnswer,
  type InterviewQuestion,
  type StarFeedback,
} from "../api";

const TOTAL_QUESTIONS = 5;
const QUESTION_TIME_SECONDS = 150;

export default function InterviewScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessionId, setSessionId] =
    useState<number | null>(null);
  const [questions, setQuestions] =
    useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] =
    useState(0);
  const [answer, setAnswer] = useState("");
  const [feedbackResults, setFeedbackResults] =
    useState<StarFeedback[]>([]);
  const [secondsRemaining, setSecondsRemaining] =
    useState(QUESTION_TIME_SECONDS);
  const [isStarting, setIsStarting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submissionInProgress = useRef(false);
  const answerRef = useRef("");

  const currentQuestion =
    questions[currentQuestionIndex];

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  /*Begins Interview*/
  useEffect(() => {
    const beginInterview = async () => {
      try {
        setIsStarting(true);
        const storedUser =
          await SecureStore.getItemAsync("user");

        if (!storedUser) {
          throw new Error(
            "User information could not be loaded."
          );
        }

        const user = JSON.parse(storedUser);
        const targetJob = user.target_job;

        if (!targetJob) {
          throw new Error(
            "No target job is associated with this account."
          );
        }

        console.log(
          "Starting interview for:",
          targetJob
        );

        const result =
          await startMockInterview(targetJob);

        console.log(
          "Interview session:",
          result.session_id
        );

        console.log(
          "Questions received:",
          result.questions
        );

        if (
          !result.questions ||
          result.questions.length !== TOTAL_QUESTIONS
        ) {
          throw new Error(
            "The interview did not return exactly five questions."
          );
        }

        setSessionId(result.session_id);
        setQuestions(result.questions);

        setCurrentQuestionIndex(0);
        setSecondsRemaining(
          QUESTION_TIME_SECONDS
        );

        setAnswer("");
        answerRef.current = "";

        setFeedbackResults([]);
      } catch (error) {
        console.error(
          "Interview startup error:",
          error
        );

        Alert.alert(
          "Interview Error",
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

  useEffect(() => {
    if (
      isStarting ||
      isSubmitting ||
      !currentQuestion
    ) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((previousTime) => {
        if (previousTime <= 1) {
          clearInterval(timer);
          void submitAnswer(true);

          return 0;
        }

        return previousTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    currentQuestionIndex,
    isStarting,
    isSubmitting,
    currentQuestion?.question_id,
  ]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const submitAnswer = async (
    timeExpired = false
  ) => {
    if (
      submissionInProgress.current ||
      isSubmitting ||
      sessionId === null ||
      !currentQuestion
    ) {
      return;
    }

    const submittedAnswer =
      answerRef.current.trim();

    if (!timeExpired && !submittedAnswer) {
      Alert.alert(
        "Answer Required",
        "Enter an answer before continuing."
      );

      return;
    }

    try {
      submissionInProgress.current = true;
      setIsSubmitting(true);

      const answerToSubmit =
        submittedAnswer ||
        "No answer was provided before time expired.";

      console.log(
        `Submitting question ${
          currentQuestionIndex + 1
        }`
      );

      const result =
        await submitMockInterviewAnswer(
          sessionId,
          currentQuestion.question_id,
          answerToSubmit
        );

      console.log(
        "STAR evaluation:",
        result
      );

      const updatedFeedback = [
        ...feedbackResults,
        result,
      ];

      setFeedbackResults(updatedFeedback);

      const finalQuestion =
        currentQuestionIndex ===
        TOTAL_QUESTIONS - 1;

      if (finalQuestion) {
        console.log(
          "Completing interview session:",
          sessionId
        );

        await completeMockInterview(sessionId);

        router.replace({
          pathname: "/feedback",
          params: {
            sessionId:
              String(sessionId),
          },
        });

        return;
      }


      setCurrentQuestionIndex(
        (previous) => previous + 1
      );

      setAnswer("");
      answerRef.current = "";

      setSecondsRemaining(
        QUESTION_TIME_SECONDS
      );
    } catch (error) {
      console.error(
        "Answer submission error:",
        error
      );

      Alert.alert(
        "Evaluation Error",
        error instanceof Error
          ? error.message
          : "Unable to evaluate your answer."
      );

      if (timeExpired) {
        setSecondsRemaining(
          QUESTION_TIME_SECONDS
        );
      }
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  /*Ends Interview*/
const handleEndInterview = () => {
  Alert.alert(
    "End Interview?",
    "Are you sure you want to end this interview?",
    [
      {
        text: "Continue Interview",
        style: "cancel",
      },
      {
        text: "End Interview",
        style: "destructive",
        onPress: async () => {
          try {
            setIsSubmitting(true);

            if (sessionId !== null) {
              await cancelMockInterview(sessionId);
            }

            router.replace("/home");
          } catch (error) {
            Alert.alert(
              "Unable to end interview",
              error instanceof Error
                ? error.message
                : "The interview could not be cancelled."
            );
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]
  );
};

  /*Changes the status of interview to cancel to avoid infinite question loops*/
  const cancelAndNavigate = async (
    destination: "/home" | "/profile"
  ) => {
    try {
      // Close the dropdown immediately
      setMenuOpen(false);

      // Cancel the current interview
      if (sessionId !== null) {
        await cancelMockInterview(sessionId);

        console.log(
          `Interview ${sessionId} cancelled.`
        );
      }

      // Navigate after cancellation succeeds
      router.replace(destination);

    } catch (error) {
      console.error(
        "Unable to cancel interview:",
        error
      );

      // Still navigate instead of trapping the user
      router.replace(destination);
    }
  };

  /*Handles Logout*/
  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync(
        "access_token"
      );

      await SecureStore.deleteItemAsync(
        "user"
      );

      router.replace("/");
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable
          style={styles.menuButton}
          onPress={() =>
            setMenuOpen((current) => !current)
          }
          hitSlop={12}
        >
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </Pressable>

        <Text style={styles.headerTitle}>
          Mock Interview
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {menuOpen && (
        <Pressable
            style={styles.menuBackdrop}
            onPress={() => setMenuOpen(false)}
        />
      )}

      {menuOpen && (
        <View style={styles.dropdown}>
          <Pressable
            style={styles.dropdownItem}
            onPress={() => {
              void cancelAndNavigate('/home')
            }}
          >
            <Text style={styles.dropdownText}>
              Home
            </Text>
          </Pressable>

          <Pressable
            style={styles.dropdownItem}
            onPress={() => {
              void cancelAndNavigate('/profile')
            }}
          >
            <Text style={styles.dropdownText}>
              Profile
            </Text>
          </Pressable>

          <Pressable
            style={styles.dropdownItem}
            onPress={async () => {
              setMenuOpen(false);

              await handleLogout();
            }}
          >
            <Text style={styles.dropdownText}>
              Log Out
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="handled"
      >
        {isStarting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />

            <Text style={styles.loadingText}>
              Preparing your interview...
            </Text>
          </View>
        ) : !currentQuestion ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>
              No interview question is available.
            </Text>
          </View>
        ) : (
          <>

            <View style={styles.interviewStatus}>
              <Text style={styles.questionCounter}>
                Question{" "}
                {currentQuestionIndex + 1} of{" "}
                {TOTAL_QUESTIONS}
              </Text>

              <Text
                style={[
                  styles.timer,
                  secondsRemaining <= 30 &&
                    styles.timerWarning,
                ]}
              >
                {formatTime(secondsRemaining)}
              </Text>
            </View>

            {/* Progress Bar */}

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      ((currentQuestionIndex + 1) /
                        TOTAL_QUESTIONS) *
                      100
                    }%`,
                  },
                ]}
              />
            </View>

            <View style={styles.questionCard}>
              <Text style={styles.questionText}>
                {currentQuestion.question}
              </Text>
            </View>

            <Text style={styles.answerLabel}>
              Your STAR Response
            </Text>

            <TextInput
              style={styles.input}
              value={answer}
              onChangeText={(text) => {
                setAnswer(text);
                answerRef.current = text;
              }}
              multiline
              textAlignVertical="top"
              placeholder={
                "Describe the situation, task, action, and result..."
              }
              placeholderTextColor="#8A8DA1"
              editable={!isSubmitting}
            />

            <Pressable
              style={[
                styles.primaryButton,
                isSubmitting &&
                  styles.disabledButton,
              ]}
              onPress={() =>
                void submitAnswer(false)
              }
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  {currentQuestionIndex ===
                  TOTAL_QUESTIONS - 1
                    ? "Finish Interview"
                    : "Submit and Continue"}
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.endButton}
              onPress={handleEndInterview}
              disabled={isSubmitting}
            >
              <Text style={styles.endButtonText}>
                End Interview
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },

  header: {
    height: 64,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7F8FC",
    zIndex: 20,
    elevation: 20,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#27245C",
  },

  headerSpacer: {
    width: 44,
  },

  menuButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    elevation: 5,
  },

  menuLine: {
    width: 24,
    height: 3,
    marginVertical: 2.5,
    borderRadius: 2,
    backgroundColor: "#27245C",
  },

  dropdown: {
    position: "absolute",
    top: 64,
    left: 18,
    minWidth: 190,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#DFE2EA",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    zIndex: 100,
    elevation: 30,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
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

  dropdownDangerText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#B42318",
  },

  scrollView: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    minHeight: 400,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: "#6E7185",
  },

  errorText: {
    fontSize: 16,
    color: "#B42318",
  },

  interviewStatus: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  questionCounter: {
    fontSize: 17,
    fontWeight: "700",
    color: "#27245C",
  },

  timer: {
    fontSize: 25,
    fontWeight: "800",
    color: "#27245C",
  },

  timerWarning: {
    color: "#B42318",
  },

  progressTrack: {
    width: "100%",
    height: 8,
    marginBottom: 24,
    borderRadius: 4,
    backgroundColor: "#DFE2EA",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#6C63FF",
  },

  questionCard: {
    padding: 22,
    marginBottom: 26,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 12,

    elevation: 3,
  },

  questionText: {
    fontSize: 21,
    lineHeight: 30,
    fontWeight: "700",
    color: "#27245C",
  },

  answerLabel: {
    marginBottom: 8,
    fontSize: 17,
    fontWeight: "700",
    color: "#27245C",
  },

  input: {
    minHeight: 190,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,

    borderWidth: 1,
    borderColor: "#DFE2EA",
    borderRadius: 14,

    backgroundColor: "#FFFFFF",

    fontSize: 16,
    lineHeight: 23,
    color: "#333344",
  },

  primaryButton: {
    minHeight: 54,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#6C63FF",
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  disabledButton: {
    opacity: 0.6,
  },

  endButton: {
    minHeight: 52,
    marginTop: 12,
    justifyContent: "center",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#B42318",
    borderRadius: 12,

    backgroundColor: "#FFFFFF",
  },

  endButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#B42318",
  },

  menuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
    backgroundColor: "transparent",
  },
});