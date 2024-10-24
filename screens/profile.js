import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  Linking,
} from "react-native";
import { auth, db } from "../firebase";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native"; // Navigation hook for log out
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const [userData, setUserData] = useState({
    email: "",
    name: "",
    website: "",
    photoUrl: "",
  });
  const [isTutor, setIsTutor] = useState(false); // Track if the current user is a tutor
  const navigation = useNavigation();
  const currentUser = auth.currentUser;

  const fetchUserData = async () => {
    console.log("Fetching user data...");
    const userId = currentUser.uid; // Get the current user's UID
    console.log("Current User Data:", {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL,
    });

    try {
      // Check in the 'users' collection
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData({
          email: data.email,
          name: data.fname,
          website: "",
          photoUrl: data.photoUrl,
        }); // Regular users don't have website or photoUrl
        console.log("User data found in users collection:", data);
        setIsTutor(false); // Set isTutor to false if the user is found in 'users'
      } else {
        console.log(
          "User document does not exist in users collection. Checking Tutor collection..."
        );

        // If user document doesn't exist in 'users', check the 'Tutor' collection
        const tutorDocRef = doc(db, "Tutor", userId);
        const tutorDocSnap = await getDoc(tutorDocRef);

        if (tutorDocSnap.exists()) {
          const tutorData = tutorDocSnap.data();
          setUserData({
            email: tutorData.email,
            name: tutorData.name,
            website: tutorData.website || "",
            photoUrl: tutorData.photoUrl || "",
          });
          console.log("Tutor data found in Tutor collection:", tutorData);
          setIsTutor(true);
        } else {
          Alert.alert("Error", "No user data found in both collections!");
        }
      }
    } catch (error) {
      Alert.alert("Error", error.message);
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleOpenWebsite = (url) => {
    if (url !== "" && url) {
      Linking.openURL(url).catch((err) => {
        console.error("Failed to open link: ", err);
        Alert.alert("Error", "Failed to open website.");
      });
    }
  };

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      console.log("User signed out");
      navigation.navigate("Start"); // Navigate to 'Start' screen after logout
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  const deleteUserAccount = async () => {
    const userId = currentUser.uid; // Get current user's UID

    try {
      // Determine if the user is in 'users' or 'Tutor' collection and delete the document
      let userDocRef;
      if (isTutor) {
        userDocRef = doc(db, "Tutor", userId); // Tutor document reference
      } else {
        userDocRef = doc(db, "users", userId); // User document reference
      }

      // Check if the document exists before deletion
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        await deleteDoc(userDocRef); // Delete document
        console.log("User document deleted from Firestore.");
      } else {
        console.log("User document does not exist in Firestore.");
      }

      // Delete Firebase Authentication account
      await currentUser.delete();
      console.log("Firebase Authentication account deleted.");

      // Sign out the user and navigate to the SignUp screen
      await signOut(auth);
      navigation.navigate("SignUp");

      Alert.alert("Success", "Account deleted successfully.");
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert(
        "Error",
        "An error occurred while deleting your account. Please try again later."
      );
    }
  };
  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account?",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel",
        },
        {
          text: "OK",
          onPress: deleteUserAccount,
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View
          style={{
            position: "absolute",
            left: 20,
          }}
        >
          <Ionicons
            name="chevron-back"
            size={30}
            color="gold"
            onPress={() => navigation.goBack()}
          />
        </View>
        <Text style={styles.textProfile}>Profile</Text>
      </View>
      <View style={styles.profileContainer}>
        {userData.photoUrl ? (
          <Image
            source={{ uri: userData.photoUrl }}
            style={styles.profileImage}
          />
        ) : (
          <Image
            source={require("../assets/profilepic.jpg")}
            style={styles.profileImage}
          />
        )}
        <View style={styles.dataContainer}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{userData.name}</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{userData.email}</Text>

          {/* Conditionally render website and photo if the user is a tutor */}
          {isTutor && (
            <>
              <Text style={styles.label}>Website</Text>
              <TouchableOpacity
                onPress={() => handleOpenWebsite(userData.website)}
              >
                <Text style={[styles.value, styles.link]}>
                  {userData.website}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      {/* Logout button at the bottom */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.logoutButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "space-between",
  },
  profileContainer: {
    padding: 20,
    alignItems: "center",
    marginTop: 20,
  },
  dataContainer: {
    backgroundColor: "#1c1c1c",
    borderRadius: 10,
    marginHorizontal: 10,
    padding: 20,
    width: "100%",
  },
  title: {
    fontSize: 28,
    color: "gold",
    marginLeft: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  label: {
    fontSize: 18,
    color: "white",
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: "gold",
    marginBottom: 20,
  },
  logoutContainer: {
    alignItems: "center",
    paddingBottom: 40,
  },
  logoutButton: {
    padding: 15,
    backgroundColor: "gold",
    borderRadius: 10,
    width: "90%",
    alignItems: "center",
    marginBottom: 20,
  },
  logoutButtonText: {
    fontSize: 22,
    color: "black",
    fontWeight: "bold",
  },
  header: {
    display: "flex",
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    textAlign: "center",
    justifyContent: "center",
    marginTop: "15%",
  },
  textProfile: {
    fontWeight: "bold",
    fontSize: 30,
    color: "gold",
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 80,
    marginBottom: 30,
    alignSelf: "center",
  },
  link: {
    textDecorationLine: "underline",
    color: "blue",
  },
});
