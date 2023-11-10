import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getAuth, signOut, updateEmail, updatePassword } from "firebase/auth";
import { collection, addDoc, getFirestore } from "firebase/firestore"; // Ensure Firestore is properly initialized

export default function Profile() {
  const navigation = useNavigation();
  const db = getFirestore();
  const auth = getAuth();
  const [email, setEmail] = useState(auth.currentUser.email);
  const [password, setPassword] = useState("");
  const [deletionMessageVisible, setDeletionMessageVisible] = useState(false);
  const deletionRequestsRef = collection(db, "deletionRequests");

  const handleDeleteRequest = async () => {
    try {
      await addDoc(deletionRequestsRef, { email: auth.currentUser.email });
      console.log("Deletion request sent successfully");
      setDeletionMessageVisible(true);
    } catch (error) {
      console.error("Error sending deletion request: ", error);
      setDeletionMessageVisible(false);
    }
  };

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
        <TouchableOpacity style={styles.deletion} onPress={handleDeleteRequest}>
          <Text style={styles.signOutText}>Request account deletion</Text>
        </TouchableOpacity>
          {deletionMessageVisible && (
        <Text style={styles.deletionMessage}>
          Your account will be deleted within 24 hours
        </Text>
      )}
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
  deletionMessage: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
    fontSize: 16,
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
  deletion: {
    backgroundColor: "transparent",
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
    padding: 20,
    marginBottom: 20,
    // borderWidth: 2,
    // borderColor: "black",
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
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
  },
});
