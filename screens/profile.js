import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getAuth, signOut } from "firebase/auth";

export default function Profile() {
  const navigation = useNavigation();
  const auth = getAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.navigate("start");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  signOutButton: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "black",
  },
  container: {
    flex: 1,
    paddingTop: 50, // Adjust as needed
  },
  signOutText: {
    color: "black",
    fontWeight: "bold",
  },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#2C2C2C",
    paddingHorizontal: 20, // Adjust as needed
    marginBottom: 20,
  },
});
