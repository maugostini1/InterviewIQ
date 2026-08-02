import { useState, useEffect } from "react";
import { router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";

export default function HomeScreen() {
  console.log("Home.tsx loaded");
  const [menuOpen, setMenuOpen] = useState(false);
  const [firstName, setFirstName] = useState("");

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

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("user");

    router.replace("/");
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
              router.push("/profile");
            }}
          >
            <Text style={styles.dropdownText}>Profile</Text>
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
    
    
    <ScrollView style={styles.page}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome Back{firstName ? `, ${firstName}!` : "!"}</Text>
        
        <Text style={styles.subtitle}>
          Ready to ace your next interview?
        </Text>

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
  subtitle: {
  fontSize: 18,
  color: "#666",
  textAlign: "center",
  marginBottom: 30,
},
});
