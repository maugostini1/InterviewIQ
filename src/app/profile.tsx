import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { updateTargetJob } from "../api"; 

type StoredUser = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  career_field?: string | null;
  target_job?: string | null;
};

export default function ProfileScreen() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetJob, setTargetJob] = useState("");
  const [isSavingTarget, setIsSavingTarget] = useState(false);

  // loads current user from login.
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync("user");

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);

          setUser(parsedUser);
          setTargetJob(parsedUser.target_job ?? "");
        }
      } catch (error) {
        console.error("Unable to load stored user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadUser();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text>User information is unavailable.</Text>
      </View>
    );
  }

  // Allows for target job edits to be saved.
  const handleSaveTargetJob = async () => {
    const cleanedTargetJob = targetJob.trim();

    //checks to see if target job field has text.
    if (!cleanedTargetJob) {
      Alert.alert(
        "Target Job Required",
        "Enter the job you want to interview for."
      );
      return;
    }

    try {
      setIsSavingTarget(true);

      const result = await updateTargetJob(
        cleanedTargetJob
      );

      const updatedUser = {
        ...user,
        target_job: result.target_job,
      };

      setUser(updatedUser);

      await SecureStore.setItemAsync(
        "user",
        JSON.stringify(updatedUser)
      );

      setTargetJob(result.target_job);
      setIsEditingTarget(false);

      Alert.alert(
        "Profile Updated",
        "Your target job has been updated."
      );
    } catch (error) {
      console.error(
        "Unable to update target job:",
        error
      );

      Alert.alert(
        "Update Failed",
        error instanceof Error
          ? error.message
          : "Unable to update target job."
      );
    } finally {
      setIsSavingTarget(false);
    }
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("user");

      router.replace("/");
    } catch (error) {
      console.error("Unable to log out:", error);
    }
  };

return (
<SafeAreaView style={styles.page}>
    <View style={styles.header}>
    <Pressable
        style={styles.menuButton}
        onPress={() => setMenuOpen((current) => !current)}
        hitSlop={12}
    >
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
    </Pressable>

    <Text style={styles.headerTitle}>My Profile</Text>

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

    {/* Card view for each item in the profile*/}
    <ScrollView
    style={styles.scrollView}
    contentContainerStyle={styles.container}
    >
    <View style={styles.card}>
        <ProfileRow
        label="Name"
        value={`${user.first_name} ${user.last_name}`}
        />

        <ProfileRow label="Email" value={user.email} />

        <ProfileRow
        label="Career Field"
        value={user.career_field || "Not provided"}
        />

    <View style={[styles.row, styles.lastRow]}>
      <Text style={styles.label}>
        Target Job
      </Text>

      {/*Allows for editing target job to adjust Gemma's interview questions*/}
      {isEditingTarget ? (
        <>
          <TextInput
            style={styles.targetInput}
            value={targetJob}
            onChangeText={setTargetJob}
            placeholder="Enter target job"
            placeholderTextColor="#8A8DA1"
            autoCapitalize="words"
            editable={!isSavingTarget}
          />

          <View style={styles.editActions}>
            <Pressable
              style={styles.saveButton}
              onPress={handleSaveTargetJob}
              disabled={isSavingTarget}
            >
              {isSavingTarget ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Text style={styles.saveButtonText}>
                  Save
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setTargetJob(
                  user.target_job ?? ""
                );

                setIsEditingTarget(false);
              }}
              disabled={isSavingTarget}
            >
              <Text style={styles.cancelButtonText}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.targetDisplay}>
          <Text style={styles.value}>
            {user.target_job || "Not provided"}
          </Text>

          <Pressable
            onPress={() => {
              setTargetJob(
                user.target_job ?? ""
              );

              setIsEditingTarget(true);
            }}
          >
            <Text style={styles.editLink}>
              Edit
            </Text>
          </Pressable>
        </View>
      )}
    </View>
    </View>
    </ScrollView>
</SafeAreaView>
);
}

{/*Component generate by AI to help with checking dividers between fields. Avoid using divider for last field in the list*/}
function ProfileRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, isLast && styles.lastRow]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

// AI used to help with Styling Elements.
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },

  scrollView: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F8FC",
  },

  title: {
    marginTop: 28,
    marginBottom: 28,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    color: "#27245C",
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

  card: {
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  row: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#DFE2EA",
  },

  lastRow: {
    borderBottomWidth: 0,
  },

  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#6E7185",
  },

  value: {
    fontSize: 18,
    fontWeight: "600",
    color: "#27245C",
  },

  uploadLink: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6C63FF",
    textDecorationLine: "underline",
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

  menuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
    backgroundColor: "transparent",
  },

  targetDisplay: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

editLink: {
  fontSize: 15,
  fontWeight: "700",
  color: "#6C63FF",
},

targetInput: {
  height: 50,
  paddingHorizontal: 14,
  borderWidth: 1,
  borderColor: "#DFE2EA",
  borderRadius: 12,
  backgroundColor: "#F7F8FC",
  fontSize: 16,
  color: "#27245C",
},

editActions: {
  flexDirection: "row",
  marginTop: 12,
  gap: 10,
},

saveButton: {
  minWidth: 90,
  minHeight: 44,
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 10,
  backgroundColor: "#6C63FF",
},

saveButtonText: {
  fontSize: 15,
  fontWeight: "700",
  color: "#FFFFFF",
},

cancelButton: {
  minWidth: 90,
  minHeight: 44,
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#DFE2EA",
  borderRadius: 10,
  backgroundColor: "#FFFFFF",
},

cancelButtonText: {
  fontSize: 15,
  fontWeight: "700",
  color: "#27245C",
},
});
