import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

type AnswerFeedback = {
  answer_id: number;
  total_score: number;
  scores: {
    situation: number;
    task: number;
    action: number;
    result: number;
  };
  strengths: string[];
  improvements: string[];
  feedback: string;
  suggested_answer: string;
};

export default function FeedbackScreen() {
  const params = useLocalSearchParams<{
    feedback?: string;
  }>();

  let feedbackResults: AnswerFeedback[] = [];

  try {
    feedbackResults = params.feedback
      ? JSON.parse(params.feedback)
      : [];
  } catch {
    feedbackResults = [];
  }

  const averageScore =
    feedbackResults.length > 0
      ? Math.round(
          feedbackResults.reduce(
            (sum, item) => sum + item.total_score,
            0,
          ) / feedbackResults.length,
        )
      : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        Interview Feedback
      </Text>

      <Text style={styles.average}>
        Average score: {averageScore}/100
      </Text>

      {feedbackResults.map((item, index) => (
        <View key={item.answer_id} style={styles.card}>
          <Text style={styles.questionNumber}>
            Question {index + 1}
          </Text>

          <Text style={styles.score}>
            Score: {item.total_score}/100
          </Text>

          <Text style={styles.heading}>Feedback</Text>
          <Text>{item.feedback}</Text>

          <Text style={styles.heading}>Strengths</Text>
          {item.strengths.map((strength) => (
            <Text key={strength}>• {strength}</Text>
          ))}

          <Text style={styles.heading}>
            Areas to improve
          </Text>

          {item.improvements.map((improvement) => (
            <Text key={improvement}>• {improvement}</Text>
          ))}

          <Text style={styles.heading}>
            Suggested answer
          </Text>

          <Text>{item.suggested_answer}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  average: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 20,
    fontWeight: "600",
  },
  card: {
    marginBottom: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 12,
  },
  questionNumber: {
    fontSize: 20,
    fontWeight: "700",
  },
  score: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "600",
  },
  heading: {
    marginTop: 16,
    marginBottom: 4,
    fontSize: 16,
    fontWeight: "700",
  },
});