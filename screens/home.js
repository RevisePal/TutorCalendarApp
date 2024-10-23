import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { Ionicons } from "@expo/vector-icons"; // Import Ionicons for the profile icon
import NewTuteeModal from "../components/newTuteeModal";

export default function Home() {
  const navigation = useNavigation();
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTutor, setIsTutor] = useState(false);
  const [newTuteeModalVisible, setNewTuteeModalVisible] = useState(false);
  const currentUser = auth.currentUser;

  const toggleNewTuteeModal = () => {
    setNewTuteeModalVisible(!newTuteeModalVisible);
  };

  const handleTutorClick = (tutorId) => {
    console.log("Selected tutor:", tutorId);
    navigation.navigate("activity", { tutorId });
  };

  const fetchUserData = async () => {
    const userId = currentUser.uid;
    try {
      const tutorDocRef = doc(db, "Tutor", userId);
      const tutorDocSnap = await getDoc(tutorDocRef);

      if (tutorDocSnap.exists()) {
        setIsTutor(true); // Set isTutor to true
      } else {
        Alert.alert("Error", "No user data found in both collections!");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchTutorsOrTutees = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (currentUser) {
          const userId = currentUser.uid;
          const db = getFirestore();

          // Check if the user is a tutor (i.e., present in the Tutor collection)
          const tutorDocRef = doc(db, "Tutor", userId);
          const tutorDoc = await getDoc(tutorDocRef);

          if (tutorDoc.exists()) {
            // The current user is a tutor, so fetch their tutees
            const tutorData = tutorDoc.data();
            const tuteesArray = Array.isArray(tutorData.tutees)
              ? tutorData.tutees
              : [];

            console.log("Fetched tutees:", tuteesArray);

            const fetchedTutees = tuteesArray.map((tutee) => ({
              userId: tutee.userId,
              name: tutee.name,
              photoUrl: tutee.photoUrl,
              subject: tutee.subject,
            }));

            console.log("Formatted tutees:", fetchedTutees);
            setTutors(fetchedTutees); // Store the tutees in the same state (setTutors can be renamed)
          } else {
            // The current user is not a tutor, fetch their tutors from the 'users' collection
            const userDocRef = doc(db, "users", userId);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              const data = userDoc.data();
              const myTutorsArray = Array.isArray(data.myTutors)
                ? data.myTutors
                : [];

              console.log("Fetched tutors:", myTutorsArray);

              const fetchedTutors = await Promise.all(
                myTutorsArray.map(async (tutor) => {
                  // Fetch the tutor's document from the Tutor collection to get the photoUrl
                  const tutorDocRef = doc(db, "Tutor", tutor.id);
                  const tutorDoc = await getDoc(tutorDocRef);

                  let photoUrl = null;
                  if (tutorDoc.exists()) {
                    const tutorData = tutorDoc.data();
                    photoUrl = tutorData.photoUrl || null;
                  }

                  return {
                    tutorId: tutor.id,
                    name: tutor.name,
                    subject: tutor.subject,
                    photoUrl,
                  };
                })
              );

              console.log("Formatted tutors with photoUrls:", fetchedTutors);

              setTutors(fetchedTutors);
            } else {
              console.log("User document does not exist");
            }
          }
        } else {
          console.log("No user is currently logged in.");
        }
      } catch (error) {
        console.error("Error fetching tutors/tutees:", error);
      } finally {
        setLoading(false); // Stop loading when data fetch is complete
      }
    };

    fetchTutorsOrTutees();
  }, []);

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
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Home</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <Ionicons name="person-circle" size={50} color="gold" />
        </TouchableOpacity>
      </View>
      <View style={styles.sectionContainer}>
        <View flexDirection="row">
          <Text style={styles.sectionTitle}>
            {isTutor ? "My Tutees" : "My Tutors"}
          </Text>
          {isTutor && (
            <>
              <Ionicons
                name="add-outline"
                size={30}
                color="#fff"
                onPress={toggleNewTuteeModal}
              />
              <NewTuteeModal
                visible={newTuteeModalVisible}
                onClose={toggleNewTuteeModal}
              />
            </>
          )}
        </View>
        {isTutor ? (
          <ScrollView>
            {tutors.length > 0 ? (
              tutors.map((tutor) => (
                <TouchableOpacity
                  key={tutor.tutorId}
                  onPress={() => handleTutorClick(tutor.tutorId)}
                  style={{
                    flexDirection: "row",
                    height: 80,
                    backgroundColor: "gold",
                    marginTop: 10,
                    alignItems: "center",
                    borderColor: "black",
                    borderWidth: 2,
                    borderRadius: 15,
                    shadowColor: "transparent",
                  }}
                >
                  {tutor.photoUrl ? (
                    <Image
                      source={{ uri: tutor.photoUrl }}
                      style={[styles.profileImage, { flex: 1 }]}
                    />
                  ) : (
                    <Image
                      source={require("../assets/profilepic.jpg")}
                      style={[styles.profileImage, { flex: 1 }]}
                    />
                  )}

                  <Text style={[styles.boxTitle, { flex: 1 }]}>
                    {tutor.name}
                  </Text>
                  <Text style={[styles.boxTitle, styles.italic, { flex: 2 }]}>
                    {tutor.subject}
                  </Text>
                  <Ionicons
                    name="arrow-forward-circle-sharp"
                    size={30}
                    color="black"
                    marginHorizontal={10}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <TouchableOpacity style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>
                  No Current {"\n"}Tutees
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : (
          // Render UI for Non-Tutors (Tutees)
          <ScrollView>
            {tutors.length > 0 ? (
              tutors.map((tutor) => (
                <TouchableOpacity
                  key={tutor.tutorId}
                  onPress={() => handleTutorClick(tutor.tutorId)}
                  style={{
                    flexDirection: "row",
                    height: 80,
                    backgroundColor: "gold",
                    marginTop: 10,
                    alignItems: "center",
                    borderColor: "black",
                    borderWidth: 2,
                    borderRadius: 15,
                    shadowColor: "transparent",
                  }}
                >
                  {tutor.photoUrl ? (
                    <Image
                      source={{ uri: tutor.photoUrl }}
                      style={[styles.profileImage, { flex: 1 }]}
                    />
                  ) : (
                    <Image
                      source={require("../assets/profilepic.jpg")}
                      style={[styles.profileImage, { flex: 1 }]}
                    />
                  )}
                  <Text style={[styles.boxTitle, { flex: 1 }]}>
                    {tutor.name}
                  </Text>
                  <Text style={[styles.boxTitle, styles.italic, { flex: 2 }]}>
                    {tutor.subject}
                  </Text>
                  <Ionicons
                    name="arrow-forward-circle-sharp"
                    size={30}
                    color="black"
                    marginHorizontal={10}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <TouchableOpacity style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>
                  No Current {"\n"}Tutors
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Favourites</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tutors
            .filter((activity) => activity.recommended)
            .map((activity, index) => (
              <TouchableOpacity
                key={index}
                style={styles.activityBox}
                onPress={() => handleActivityClick(activity.id)}
              >
                <Text style={styles.boxTitle}>{activity.tutorName}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "flex-start",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: "10%",
  },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    color: "gold",
  },
  sectionContainer: {
    marginTop: 40,
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginRight: 10,
  },
  signOutButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "red",
    padding: 10,
    borderRadius: 5,
  },
  boxTitle: {
    textAlign: "center",
    fontSize: 18,
    alignContent: "center",
    paddingVertical: 5,
    color: "black",
    fontWeight: "700",
  },
  emptyButton: {
    width: "100%",
    height: 80,
    backgroundColor: "gray",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginTop: 20,
    width: 150,
    height: 100,
  },
  emptyButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    padding: 10,
    textAlign: "center",
  },
  italic: {
    fontStyle: "italic",
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 50,
    marginHorizontal: 10,
    marginVertical: 5,
  },
});
