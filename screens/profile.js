import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Button } from "react-native";
import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getAuth, signOut, updateEmail, updatePassword } from "firebase/auth";

export default function Profile() {
  const navigation = useNavigation();
  const auth = getAuth();
  const [email, setEmail] = useState(auth.currentUser.email);
  const [password, setPassword] = useState("");

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.navigate("start");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleSaveEmail = async () => {
    try {
      await updateEmail(auth.currentUser, email);
      alert("Email updated successfully");
    } catch (error) {
      alert("Failed to update email: ", error.message);
    }
  };

  const handleSavePassword = async () => {
    try {
      await updatePassword(auth.currentUser, password);
      alert("Password updated successfully");
    } catch (error) {
      alert("Failed to update password: ", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Update Profile</Text>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
          />
          <Button title="Save" onPress={handleSaveEmail} />
        </View>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
          />
          <Button title="Save" onPress={handleSavePassword} />
        </View>
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "grey",
    marginBottom: 10,
  },
  sectionContainer: {
    marginVertical: 10, // Adjust as needed
    paddingHorizontal: 20, // Adjust as needed
  },
  input: {
    flex: 1,
    borderWidth: 1,
    marginRight: 10,
    borderRadius: 10,
    backgroundColor: "white",
    padding: 20,
  },
  signOutButton: {
    backgroundColor: "white",
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
  buttons: {
    flex: 1,
    alignItems: "center",
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
