import { useState, useEffect } from "react";
import { LineChart } from "react-native-gifted-charts";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getInterviewHistory,
  type InterviewHistory,
} from "../api";

export default function HomeScreen() {
  console.log("Home.tsx loaded");
  const [menuOpen, setMenuOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [history, setHistory] = useState<InterviewHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userString = await SecureStore.getItemAsync("user");

        if (!userString) {
          console.log("No saved user found");
          return;
        }

        const savedUser = JSON.parse(userString);

        console.log("Saved user:", savedUser);

        setFirstName(savedUser.first_name ?? "");
      } catch (error) {
        console.error("Failed to load saved user:", error);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    const loadInterviewHistory = async () => {
      try {
        setHistoryLoading(true);

        const result =
          await getInterviewHistory();

        setHistory(result);
      } catch (error) {
        console.error(
          "Unable to load interview history:",
          error
        );
      } finally {
        setHistoryLoading(false);
      }
    };

    void loadInterviewHistory();
  }, []);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("user");

    router.replace("/");
  };  

  const scoreChartData =
  history?.interviews.map(
    (interview, index) => ({
      value: interview.score ?? 0,
      label: `${index + 1}`,
    })
  ) ?? [];

 return (
  <SafeAreaView style={styles.page}>
    <View style={styles.header}>
      <Pressable
        style={styles.menuButton}
        onPress={() => setMenuOpen(!menuOpen)}
      >
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
      </Pressable>

      <Text style={styles.headerTitle}>
        Welcome Back{firstName ? `, ${firstName}!` : "!"}
      </Text>

      <View style={styles.headerSpacer} />
    </View>
    
    {/*Allows menu to be closed after clicking another part of screen*/}
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
            setMenuOpen(false);
            router.push("/profile");
          }}
        >
          <Text style={styles.dropdownText}>Profile</Text>
        </Pressable>

        <Pressable
          style={styles.dropdownItem}
          onPress={() => {
            setMenuOpen(false);
            router.push("/mock-interview");
          }}
        >
          <Text style={styles.dropdownText}>
            Mock Interview
          </Text>
        </Pressable>

        <Pressable
          style={styles.dropdownItem}
          onPress={async () => {
            setMenuOpen(false);
            await handleLogout();
          }}
        >
          <Text style={styles.dropdownText}>Log Out</Text>
        </Pressable>
      </View>
    )}

    {/* Main page content*/}
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
    >

    <Text style={styles.subtitle}>
      Ready to ace your next interview?
    </Text>

    <View style={styles.metricsRow}>

      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>
          Interviews
        </Text>

        <Text style={styles.metricValue}>
          {historyLoading
            ? "-"
            : history?.total_interviews ?? 0}
        </Text>

        <Text style={styles.metricDescription}>
          Completed
        </Text>
      </View>

      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>
          Average Score
        </Text>

        <Text style={styles.metricValue}>
          {historyLoading
            ? "-"
            : `${Math.round(
                history?.average_score ?? 0
              )}%`}
        </Text>

        <Text style={styles.metricDescription}>
          STAR average
        </Text>
      </View>
    </View>

    <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>
          Interview Performance
        </Text>

        <Text style={styles.chartSubtitle}>
          STAR score by completed interview
        </Text>

        {historyLoading ? (
          <ActivityIndicator
            size="large"
            style={styles.chartLoading}
          />
        ) : scoreChartData.length === 0 ? (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              Complete your first interview to
              start tracking your progress.
            </Text>
          </View>
        ) : (
          <LineChart
            data={scoreChartData}
            height={200}
            maxValue={100}
            noOfSections={5}
            yAxisLabelSuffix="%"
            xAxisLabelTextStyle={{
              color: "#6E7185",
            }}
            yAxisTextStyle={{
              color: "#6E7185",
            }}
            dataPointsHeight={8}
            dataPointsWidth={8}
            thickness={3}
            curved
            isAnimated
            hideRules={false}
          />
        )}

        {scoreChartData.length > 0 && (
          <Text style={styles.chartAxisLabel}>
            Interview Number
          </Text>
        )}
      </View>
      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push("/mock-interview")}
      >
        <Text style={styles.secondaryButtonText}>
          Start Mock Interview
        </Text>
      </Pressable>
    </ScrollView>
  </SafeAreaView>
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
  scrollView: {
  flex: 1,
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
    minWidth: 180,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#DFE2EA",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    zIndex: 100,
    elevation: 30,
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
  subtitle: {
  fontSize: 18,
  color: "#666",
  textAlign: "center",
  marginBottom: 30,
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
    alignSelf: 'center',
    fontSize: 26,
    fontWeight: "800",
    color: "#27245C",
  },

  headerSpacer: {
    width: 44,
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
  metricsRow: {
  flexDirection: "row",
  gap: 14,
  marginBottom: 24,
},

metricCard: {
  flex: 1,
  minHeight: 125,
  padding: 18,
  justifyContent: "center",
  borderRadius: 18,
  backgroundColor: "#FFFFFF",

  shadowColor: "#000000",
  shadowOpacity: 0.06,
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowRadius: 12,

  elevation: 3,
},

metricLabel: {
  marginBottom: 7,
  fontSize: 14,
  fontWeight: "700",
  color: "#6E7185",
},

metricValue: {
  fontSize: 34,
  fontWeight: "800",
  color: "#27245C",
},

metricDescription: {
  marginTop: 4,
  fontSize: 13,
  color: "#8A8DA1",
},

chartCard: {
  marginBottom: 24,
  paddingVertical: 20,
  paddingHorizontal: 12,
  borderRadius: 20,
  backgroundColor: "#FFFFFF",
  overflow: "hidden",

  shadowColor: "#000000",
  shadowOpacity: 0.06,
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowRadius: 12,

  elevation: 3,
},

chartTitle: {
  paddingHorizontal: 10,
  fontSize: 20,
  fontWeight: "800",
  color: "#27245C",
},

chartSubtitle: {
  paddingHorizontal: 10,
  marginTop: 4,
  marginBottom: 18,
  fontSize: 14,
  color: "#6E7185",
},

chartLoading: {
  marginVertical: 70,
},

chartAxisLabel: {
  marginTop: 10,
  textAlign: "center",
  fontSize: 13,
  color: "#6E7185",
},

noDataContainer: {
  minHeight: 180,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 30,
},

noDataText: {
  textAlign: "center",
  fontSize: 15,
  lineHeight: 22,
  color: "#6E7185",
},
});
