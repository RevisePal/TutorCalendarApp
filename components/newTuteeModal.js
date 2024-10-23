import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";

export default function NewTuteeModal({ visible, onClose }) {
  // const addTutee = async (email) => {
  //   try {
  //     const auth = getAuth();
  //     const currentUser = auth.currentUser;

  //     if (!currentUser) {
  //       console.log("No tutor is currently logged in.");
  //       return;
  //     }

  //     const db = getFirestore();
  //     const tutorId = currentUser.uid; // Assuming current user is the tutor

  //     // Reference to the tutor's document in the Tutor collection
  //     const tutorDocRef = doc(db, "Tutor", tutorId);
  //     const tutorDoc = await getDoc(tutorDocRef);

  //     if (!tutorDoc.exists()) {
  //       console.log("Tutor document does not exist.");
  //       return;
  //     }

  //     // Search for the tutee in the 'users' collection by their email
  //     const userQuery = query(
  //       collection(db, "users"),
  //       where("email", "==", email)
  //     );
  //     const querySnapshot = await getDocs(userQuery);

  //     if (querySnapshot.empty) {
  //       console.log("No tutee found with the provided email.");
  //       return;
  //     }

  //     // Assuming the email is unique and there's only one match
  //     const tuteeDoc = querySnapshot.docs[0];
  //     const tuteeData = tuteeDoc.data();

  //     const newTutee = {
  //       name: tuteeData.fname, // Fetching fname from 'users' collection
  //       userId: tuteeDoc.id, // The document ID of the tutee from 'users' collection
  //       email: tuteeData.email, // Fetching email from 'users' collection
  //       photoUrl: tuteeData.photoUrl, // Fetching photoUrl from 'users' collection
  //     };

  //     // Get current tutees or initialize an empty array
  //     const currentTutees = tutorDoc.data().tutees || [];

  //     // Check if the tutee is already added
  //     const isAlreadyAdded = currentTutees.some(
  //       (tutee) => tutee.userId === newTutee.userId
  //     );

  //     if (isAlreadyAdded) {
  //       console.log("Tutee is already added.");
  //       return;
  //     }

  //     // Add the new tutee to the tutees array
  //     const updatedTutees = [...currentTutees, newTutee];

  //     // Update the tutor's document with the new tutees array
  //     await updateDoc(tutorDocRef, { tutees: updatedTutees });

  //     console.log("New tutee added successfully:", newTutee);
  //   } catch (error) {
  //     console.error("Error adding tutee:", error);
  //   }
  // };

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
