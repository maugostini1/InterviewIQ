import { useState } from "react";
import { ScrollView, StyleSheet, Text, Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";

export default function InterviewScreen() {
    const [menuOpen, setMenuOpen] = useState(false);
  
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
      <View style={styles.buttonRow}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/mock-interview")}
        >
          <Text style={styles.secondaryButtonText}>Submit</Text>
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