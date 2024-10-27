import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";

export default function NewTuteeModal({ visible, onClose, onAddTutee }) {
  const [email, setEmail] = useState(""); // State to capture email input
  const [error, setError] = useState(null); // State to capture any errors
  const [shouldFetch, setShouldFetch] = useState(false);

  const addTutee = async (email) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError("No tutor is currently logged in.");
        return;
      }

      const db = getFirestore();
      const tutorId = currentUser.uid; // Assuming current user is the tutor

      // Reference to the tutor's document in the Tutor collection
      const tutorDocRef = doc(db, "Tutor", tutorId);
      const tutorDoc = await getDoc(tutorDocRef);

      if (!tutorDoc.exists()) {
        setError("Tutee does not exist.");
        return;
      }

      // Search for the tutee in the 'users' collection by their email
      const userQuery = query(
        collection(db, "users"),
        where("email", "==", email)
      );
      const querySnapshot = await getDocs(userQuery);

      if (querySnapshot.empty) {
        setError("No tutee found with the provided email.");
        return;
      }

      // Assuming the email is unique and there's only one match
      const tuteeDoc = querySnapshot.docs[0];
      const tuteeData = tuteeDoc.data();

      // Construct the new tutee object with only compulsory fields and optional ones
      const newTutee = {
        name: tuteeData.fname || "Unknown", // Default to "Unknown" if fname is missing
        userId: tuteeDoc.id || null, // Default to null if userId is missing
        email: tuteeData.email, // Must be present
        photoUrl: tuteeData.photoUrl || null, // Use null if photoUrl is not available
      };

      // Get current tutees or initialize an empty array
      const currentTutees = tutorDoc.data().tutees || [];

      // Check if the tutee is already added
      const isAlreadyAdded = currentTutees.some(
        (tutee) => tutee.email === newTutee.email // Check by email for uniqueness
      );

      if (isAlreadyAdded) {
        setError("Tutee is already added.");
        return;
      }

      // Add the new tutee to the tutees array
      const updatedTutees = [...currentTutees, newTutee];

      // Update the tutor's document with the new tutees array
      await updateDoc(tutorDocRef, { tutees: updatedTutees });

      console.log("New tutee added successfully:", newTutee);
      setEmail(""); // Clear the email input after success
      setError(null); // Clear any error message
      onAddTutee(newTutee); // Call the callback to add the new tutee in the parent
      setShouldFetch(true);
      onClose(); // Close the modal after successful operation
    } catch (error) {
      console.error("Error adding tutee:", error);
      setError("An error occurred while adding the tutee.");
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add a New Tutee</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter Tutee's Email"
            value={email}
            onChangeText={(text) => setEmail(text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addTutee(email)}
          >
            <Text style={styles.addButtonText}>Add Tutee</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 10,
  },
  errorText: {
    color: "red",
    marginBottom: 10,
  },
  addButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "green",
    borderRadius: 5,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "gold",
    borderRadius: 5,
  },
  closeButtonText: {
    color: "black",
    fontSize: 16,
  },
});
