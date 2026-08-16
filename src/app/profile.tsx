import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync("user");

        if (storedUser) {
          setUser(JSON.parse(storedUser));
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

        <ProfileRow
        label="Target Job"
        value={user.target_job || "Not provided"}
        isLast
        />
    </View>
    </ScrollView>
</SafeAreaView>
);
}

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
});
