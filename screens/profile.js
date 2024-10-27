import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
} from "react-native";
import { auth, db } from "../firebase";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { TextInput } from "react-native-paper";

export default function ProfileScreen() {
  const [userData, setUserData] = useState({
    email: "",
    name: "",
    website: "",
    photoUrl: "",
  });
  const [isTutor, setIsTutor] = useState(false);
  const [website, setWebsite] = useState(""); // State to track website changes
  const [isEditingWebsite, setIsEditingWebsite] = useState(false);
  const navigation = useNavigation();
  const currentUser = auth.currentUser;

  const fetchUserData = async () => {
    console.log("Fetching user data...");
    const userId = currentUser.uid;

    try {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData({
          email: data.email,
          name: data.name,
          website: "",
          photoUrl: data.photoUrl,
        });
        console.log("User data found in users collection:", data);
        setIsTutor(false);
      } else {
        console.log("Checking Tutor collection...");

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
          setWebsite(tutorData.website || "");
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

  const handleUpdateWebsite = async () => {
    if (!isTutor || website === userData.website) return;

    const userId = currentUser.uid;
    const tutorDocRef = doc(db, "Tutor", userId);

    try {
      await updateDoc(tutorDocRef, { website });
      console.log("Website updated in Tutor collection.");
      setUserData((prev) => ({ ...prev, website }));
      setIsEditingWebsite(false); // Exit edit mode after saving
    } catch (error) {
      console.error("Error updating website:", error);
      Alert.alert("Error", "Failed to update website. Please try again.");
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      console.log("User signed out");
      navigation.navigate("Start");
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  const deleteUserAccount = async () => {
    const userId = currentUser.uid;

    try {
      let userDocRef;
      if (isTutor) {
        userDocRef = doc(db, "Tutor", userId);
      } else {
        userDocRef = doc(db, "users", userId);
      }

      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        await deleteDoc(userDocRef);
        console.log("User document deleted from Firestore.");
      } else {
        console.log("User document does not exist in Firestore.");
      }

      await currentUser.delete();
      console.log("Firebase Authentication account deleted.");

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

          {isTutor && (
            <>
              <Text style={styles.label}>Website</Text>
              {isEditingWebsite ? (
                <TextInput
                  value={website}
                  onChangeText={(text) => setWebsite(text)}
                  onBlur={handleUpdateWebsite} // Save changes when input loses focus
                  autoFocus
                  textColor="gold"
                  theme={{
                    colors: {
                      placeholder: "white",
                      text: "gold",
                      primary: "white",
                    },
                  }}
                  style={[styles.value, styles.editableInput]}
                />
              ) : (
                <TouchableOpacity onPress={() => setIsEditingWebsite(true)}>
                  <Text style={styles.value}>
                    {website || "Tap to add website"}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
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
  editableInput: {
    backgroundColor: "transparent",
    fontWeight: "700",
    padding: 0,
  },
});
