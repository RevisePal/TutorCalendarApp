import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { auth, db } from "../firebase"; // Import Firebase auth and db from firebase config
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc, deleteDoc } from "firebase/firestore"; // Firestore imports
import { useNavigation } from "@react-navigation/native"; // Navigation hook for log out
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons for the back button

export default function ProfileScreen() {
  const [userData, setUserData] = useState({ email: "", fname: "" });
  const navigation = useNavigation();
  const currentUser = auth.currentUser;

  // Fetch user data from Firestore
  const fetchUserData = async () => {
    try {
      const docRef = doc(db, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData({ email: data.email, fname: data.fname });
      } else {
        Alert.alert("Error", "No user data found!");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      console.log('User signed out');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const deleteUserAccount = async () => {
    const currentUser = auth.currentUser;
  
    if (!currentUser) {
      Alert.alert("Error", "No user is currently signed in.");
      return;
    }
  
    try {
      // Reference to the user document in Firestore
      const userDocRef = doc(db, "users", currentUser.uid);
  
      // Check if the document exists and delete it
      const userDocSnap = await getDoc(userDocRef);
  
      if (userDocSnap.exists()) {
        await deleteDoc(userDocRef);  // Correct way to delete the document
        console.log("User document deleted.");
      } else {
        console.log("User document does not exist.");
      }
  
      // Delete the Firebase Authentication account
      await currentUser.delete();
  
      // Sign out the user
      await signOut(auth);
  
      // Redirect or inform the user after deletion
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
      'Delete Account',
      'Are you sure you want to delete your account?',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel Pressed'),
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            try {
              deleteUserAccount();
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert(
                'Error',
                'An error occurred while deleting your account. Please try again later.',
              );
            }
          },
        },
      ],
      { cancelable: false },
    );
  };


  return (
    <View style={styles.container}>
         <View style={styles.header}>
            <View
              style={{
                position: 'absolute',
                left: 20,
              }}
            >
              <Ionicons name="chevron-back" size={30} color="gold" onPress={() => navigation.goBack()} />
            </View>
            <Text
              style={styles.textProfile}
            >
              Profile
            </Text>
          </View>
      <View style={styles.profileContainer}>
        <View style={styles.dataContainer}>
          <Text style={styles.label}>First Name</Text>
          <Text style={styles.value}>{userData.fname}</Text>

          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{userData.email}</Text>
        </View>
      </View>
      {/* Logout button at the bottom */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleDeleteAccount}>
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
    textAlign:"center"
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
    paddingBottom: 40, // Add some space from the bottom
  },
  logoutButton: {
    padding: 15,
    backgroundColor: "gold",
    borderRadius: 10,
    width: "90%",
    alignItems: "center",
    marginBottom:20,
  },
  logoutButtonText: {
    fontSize: 22,
    color: "black",
    fontWeight: "bold",
  },
  header: {
    display: 'flex',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'center',
    justifyContent: 'center',
    marginTop:"15%"
  },
  textProfile: {
    fontWeight: 'bold',
    fontSize: 30,
    color: 'gold',
  }
});