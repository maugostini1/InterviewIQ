import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import {
  getInterviewSession,
  type CompletedInterview,
  type InterviewAnswerResult,
} from "../api";

const STRONG_STAR_THRESHOLD = 80;

export default function FeedbackScreen() {
  const params = useLocalSearchParams<{
    sessionId?: string;
  }>();

  const [session, setSession] =
    useState<CompletedInterview | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInterviewFeedback = async () => {
      if (!params.sessionId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const sessionId = Number(params.sessionId);

        if (Number.isNaN(sessionId)) {
          throw new Error("Invalid interview session.");
        }

        const result = await getInterviewSession(sessionId);

        setSession(result);
      } catch (error) {
        console.error(
          "Unable to load interview feedback:",
          error
        );

        Alert.alert(
          "Feedback error",
          error instanceof Error
            ? error.message
            : "Unable to load interview feedback."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadInterviewFeedback();
  }, [params.sessionId]);

  const strongAnswers = useMemo(() => {
    if (!session) {
      return [];
    }

    return session.questions.filter(
      (answer) =>
        answer.total_score !== null &&
        answer.total_score >= STRONG_STAR_THRESHOLD
    );
  }, [session]);

  const improvementAnswers = useMemo(() => {
    if (!session) {
      return [];
    }

    return session.questions.filter(
      (answer) =>
        answer.total_score !== null &&
        answer.total_score < STRONG_STAR_THRESHOLD
    );
  }, [session]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Loading interview feedback...
        </Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>
          Feedback unavailable
        </Text>

        <Text style={styles.errorText}>
          The completed interview could not be loaded.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace("/home")}
        >
          <Text style={styles.primaryButtonText}>
            Return Home
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>
        Interview Feedback
      </Text>

      <Text style={styles.subtitle}>
        {session.interview.target_job ||
          "Behavioral Interview"}
      </Text>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>
          Overall STAR Score
        </Text>

        <Text style={styles.overallScore}>
          {Math.round(session.interview.score || 0)}/100
        </Text>

        <Text style={styles.scoreCaption}>
          Average score across 5 questions
        </Text>
      </View>

      <Text style={styles.sectionTitle}>
        Strong STAR Answers
      </Text>

      <Text style={styles.sectionDescription}>
        Answers scoring {STRONG_STAR_THRESHOLD} or higher.
      </Text>

      {strongAnswers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No answers reached the strong STAR threshold
            in this interview.
          </Text>
        </View>
      ) : (
        strongAnswers.map((answer) => (
          <StrongAnswerCard
            key={answer.question_id}
            answer={answer}
          />
        ))
      )}

      <Text style={styles.sectionTitle}>
        Answers to Improve
      </Text>

      <Text style={styles.sectionDescription}>
        These answers would benefit from a stronger STAR
        structure or more specific details.
      </Text>

      {improvementAnswers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            All five answers met the strong STAR threshold.
          </Text>
        </View>
      ) : (
        improvementAnswers.map((answer) => (
          <ImprovementAnswerCard
            key={answer.question_id}
            answer={answer}
          />
        ))
      )}

      <Pressable
        style={styles.primaryButton}
        onPress={() =>
          router.replace("/mock-interview")
        }
      >
        <Text style={styles.primaryButtonText}>
          Start Another Interview
        </Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.replace("/home")}
      >
        <Text style={styles.secondaryButtonText}>
          Return Home
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function StrongAnswerCard({
  answer,
}: {
  answer: InterviewAnswerResult;
}) {
  return (
    <View style={styles.answerCard}>
      <View style={styles.answerHeader}>
        <Text style={styles.questionNumber}>
          Question {answer.question_order}
        </Text>

        <Text style={styles.strongScore}>
          {answer.total_score}/100
        </Text>
      </View>

      <Text style={styles.questionText}>
        {answer.question_text}
      </Text>

      <Text style={styles.feedbackHeading}>
        Your Answer
      </Text>

      <Text style={styles.bodyText}>
        {answer.response}
      </Text>

      <Text style={styles.feedbackHeading}>
        Why This Was Strong
      </Text>

      {answer.strengths?.length ? (
        answer.strengths.map((strength, index) => (
          <Text
            key={`${strength}-${index}`}
            style={styles.listItem}
          >
            • {strength}
          </Text>
        ))
      ) : (
        <Text style={styles.bodyText}>
          {answer.feedback_text}
        </Text>
      )}

      <StarBreakdown answer={answer} />
    </View>
  );
}

function ImprovementAnswerCard({
  answer,
}: {
  answer: InterviewAnswerResult;
}) {
  return (
    <View style={styles.answerCard}>
      <View style={styles.answerHeader}>
        <Text style={styles.questionNumber}>
          Question {answer.question_order}
        </Text>

        <Text style={styles.improvementScore}>
          {answer.total_score}/100
        </Text>
      </View>

      <Text style={styles.questionText}>
        {answer.question_text}
      </Text>

      <Text style={styles.feedbackHeading}>
        Your Answer
      </Text>

      <Text style={styles.bodyText}>
        {answer.response}
      </Text>

      <Text style={styles.feedbackHeading}>
        What to Improve
      </Text>

      {answer.improvements?.length ? (
        answer.improvements.map(
          (improvement, index) => (
            <Text
              key={`${improvement}-${index}`}
              style={styles.listItem}
            >
              • {improvement}
            </Text>
          )
        )
      ) : (
        <Text style={styles.bodyText}>
          {answer.feedback_text}
        </Text>
      )}

      <StarBreakdown answer={answer} />

      <Text style={styles.feedbackHeading}>
        Suggested STAR Answer
      </Text>

      <View style={styles.suggestedAnswerBox}>
        <Text style={styles.bodyText}>
          {answer.suggested_answer ||
            "No suggested answer was returned."}
        </Text>
      </View>
    </View>
  );
}

function StarBreakdown({
  answer,
}: {
  answer: InterviewAnswerResult;
}) {
  return (
    <View style={styles.starCard}>
      <Text style={styles.starTitle}>
        STAR Breakdown
      </Text>

      <ScoreRow
        label="Situation"
        value={answer.situation_score}
      />

      <ScoreRow
        label="Task"
        value={answer.task_score}
      />

      <ScoreRow
        label="Action"
        value={answer.action_score}
      />

      <ScoreRow
        label="Result"
        value={answer.results_score}
        isLast
      />
    </View>
  );
}

function ScoreRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: number;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.scoreRow,
        isLast && styles.lastScoreRow,
      ]}
    >
      <Text style={styles.scoreRowLabel}>
        {label}
      </Text>

      <Text style={styles.scoreRowValue}>
        {value}/25
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },

  container: {
    padding: 24,
    paddingBottom: 50,
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F7F8FC",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6E7185",
  },

  title: {
    marginTop: 18,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    color: "#27245C",
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 24,
    fontSize: 16,
    textAlign: "center",
    color: "#6E7185",
  },

  scoreCard: {
    marginBottom: 28,
    padding: 24,
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },

  scoreLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#6E7185",
  },

  overallScore: {
    marginTop: 6,
    fontSize: 44,
    fontWeight: "800",
    color: "#6C63FF",
  },

  scoreCaption: {
    marginTop: 4,
    fontSize: 13,
    color: "#8A8DA1",
  },

  sectionTitle: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 23,
    fontWeight: "800",
    color: "#27245C",
  },

  sectionDescription: {
    marginBottom: 14,
    fontSize: 14,
    lineHeight: 20,
    color: "#6E7185",
  },

  answerCard: {
    marginBottom: 18,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  answerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  questionNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6E7185",
  },

  strongScore: {
    fontSize: 18,
    fontWeight: "800",
    color: "#247A4A",
  },

  improvementScore: {
    fontSize: 18,
    fontWeight: "800",
    color: "#B15C00",
  },

  questionText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
    color: "#27245C",
  },

  feedbackHeading: {
    marginTop: 18,
    marginBottom: 7,
    fontSize: 16,
    fontWeight: "800",
    color: "#27245C",
  },

  bodyText: {
    fontSize: 15,
    lineHeight: 23,
    color: "#333344",
  },

  listItem: {
    marginBottom: 6,
    fontSize: 15,
    lineHeight: 22,
    color: "#333344",
  },

  starCard: {
    marginTop: 18,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#F7F8FC",
  },

  starTitle: {
    paddingTop: 14,
    paddingBottom: 6,
    fontSize: 16,
    fontWeight: "800",
    color: "#27245C",
  },

  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#DFE2EA",
  },

  lastScoreRow: {
    borderBottomWidth: 0,
  },

  scoreRowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#27245C",
  },

  scoreRowValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#6C63FF",
  },

  suggestedAnswerBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F7F8FC",
  },

  overallFeedbackCard: {
    marginBottom: 26,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  emptyCard: {
    marginBottom: 18,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6E7185",
  },

  primaryButton: {
    minHeight: 52,
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

  secondaryButton: {
    minHeight: 52,
    marginTop: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6C63FF",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6C63FF",
  },

  errorTitle: {
    marginBottom: 8,
    fontSize: 24,
    fontWeight: "800",
    color: "#27245C",
  },

  errorText: {
    marginBottom: 24,
    fontSize: 15,
    textAlign: "center",
    color: "#6E7185",
  },
});