import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { auth, db } from "../firebase"; // Import Firebase auth and db from firebase config
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // Firestore imports
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

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={30} color="gold" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "space-between", // Ensure the logout button is placed at the bottom
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 50,
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
  },
  logoutButtonText: {
    fontSize: 22,
    color: "black",
    fontWeight: "bold",
  },
});