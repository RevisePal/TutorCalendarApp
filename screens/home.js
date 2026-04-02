import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  SafeAreaView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { Ionicons } from "@expo/vector-icons"; // Import Ionicons for the profile icon
import NewTuteeModal from "../components/newTuteeModal";
import InviteCodeModal from "../components/inviteCodeModal";
import PendingRequestsSection from "../components/pendingRequestsSection";

export default function Home() {
  const navigation = useNavigation();
  const [tutors, setTutors] = useState([]);
  const [tutees, setTutees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTutor, setIsTutor] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [newTuteeModalVisible, setNewTuteeModalVisible] = useState(false);
  const [inviteCodeModalVisible, setInviteCodeModalVisible] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const currentUser = auth.currentUser;

  const toggleNewTuteeModal = () => {
    setNewTuteeModalVisible(!newTuteeModalVisible);
  };

  const handleTutorClick = (tutorId) => {
    console.log("Selected tutor:", tutorId);
    navigation.navigate("Activity", { tutorId });
  };

  const handleTuteeClick = (tutee) => {
    navigation.navigate("TuteeDetails", { userId: tutee.userId, tuteeName: tutee.name });
  };

  const generateInviteCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const fetchUserData = async () => {
    const userId = currentUser.uid;
    try {
      const tutorDocRef = doc(db, "Tutor", userId);
      const tutorDocSnap = await getDoc(tutorDocRef);

      if (tutorDocSnap.exists() && tutorDocSnap.data().isActive !== false) {
        setIsTutor(true);
        let code = tutorDocSnap.data().inviteCode;
        if (!code) {
          code = generateInviteCode();
          await updateDoc(tutorDocRef, { inviteCode: code });
        }
        setInviteCode(code);
      } else {
        setIsTutor(false);
        setInviteCode(null);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
      console.error("Error fetching user data:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserData();

      const fetchTutorsOrTutees = async () => {
        try {
          setLoading(true);

          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (!currentUser) return;

          const userId = currentUser.uid;
          const db = getFirestore();

          const tutorDocRef = doc(db, "Tutor", userId);
          const tutorDoc = await getDoc(tutorDocRef);

          if (tutorDoc.exists() && tutorDoc.data().isActive !== false) {
            // User is a tutor — fetch their tutees
            setIsTutor(true);
            const tuteesArray = Array.isArray(tutorDoc.data().tutees)
              ? tutorDoc.data().tutees
              : [];
            setTutors(tuteesArray.map((tutee) => ({
              userId: tutee.userId,
              name: tutee.name,
              photoUrl: tutee.photoUrl,
              subject: tutee.subject,
              notes: tutee.notes || null,
            })));
          } else {
            // User is a tutee — fetch their tutors
            setIsTutor(false);
            const userDocRef = doc(db, "users", userId);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) return;

            const myTutorsArray = Array.isArray(userDoc.data().myTutors)
              ? userDoc.data().myTutors
              : [];

            const fetchedTutors = await Promise.all(
              myTutorsArray.map(async (tutor) => {
                const tDocRef = doc(db, "Tutor", tutor.id);
                const tDoc = await getDoc(tDocRef);
                return {
                  tutorId: tutor.id,
                  name: tutor.name,
                  subject: tutor.subject,
                  photoUrl: tDoc.exists() ? (tDoc.data().photoUrl || null) : null,
                };
              })
            );
            setTutors(fetchedTutors);
          }
        } catch (error) {
          console.error("Error fetching tutors/tutees:", error);
        } finally {
          setLoading(false);
          setShouldFetch(false);
        }
      };

      fetchTutorsOrTutees();

      return () => setLoading(true); // Reset loading state on cleanup
    }, [shouldFetch]) // Depend on shouldFetch to trigger re-fetching
  );

  const handleAddTutee = (newTutee) => {
    setTutees((prevTutees) => [...prevTutees, newTutee]); // Add the new tutee to the list
    setShouldFetch(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View>
          <View style={styles.roleBadgeRow}>
            <View style={[styles.roleBadge, isTutor ? styles.roleBadgeTutor : styles.roleBadgeTutee]}>
              <Ionicons
                name={isTutor ? "school-outline" : "book-outline"}
                size={12}
                color={isTutor ? "#0D9488" : "#6366F1"}
              />
              <Text style={[styles.roleBadgeText, isTutor ? styles.roleBadgeTextTutor : styles.roleBadgeTextTutee]}>
                {isTutor ? "Tutor" : "Student"}
              </Text>
            </View>
          </View>
          <Text style={styles.header}>{isTutor ? "My Tutees" : "My Tutors"}</Text>
          <Text style={styles.headerSub}>
            {isTutor ? "Manage and track your students" : "View your upcoming lessons"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.profileButton}>
          <Ionicons name="person-circle" size={46} color="#0D9488" />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Section */}
      <View style={styles.sectionContainer}>

        {/* Tutor: pending requests */}
        {isTutor && (
          <>
            <PendingRequestsSection
              tutorId={currentUser.uid}
              onAccepted={() => setShouldFetch(true)}
            />
          </>
        )}

        {/* Tutee: find tutor buttons */}
        {!isTutor && (
          <View style={styles.findRow}>
            <TouchableOpacity
              style={styles.findButton}
              onPress={() => navigation.navigate("FindTutor")}
              activeOpacity={0.85}
            >
              <Ionicons name="search-outline" size={16} color="#0D9488" />
              <Text style={styles.findButtonText}>Find a Tutor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.findButton}
              onPress={() => setInviteCodeModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="keypad-outline" size={16} color="#0D9488" />
              <Text style={styles.findButtonText}>Enter Code</Text>
            </TouchableOpacity>
            <InviteCodeModal
              visible={inviteCodeModalVisible}
              onClose={() => setInviteCodeModalVisible(false)}
              onLinked={() => setShouldFetch(true)}
            />
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {tutors.length} {isTutor ? (tutors.length === 1 ? "tutee" : "tutees") : (tutors.length === 1 ? "tutor" : "tutors")}
          </Text>
          {isTutor && (
            <>
              <TouchableOpacity style={styles.addButton} onPress={toggleNewTuteeModal}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add Tutee</Text>
              </TouchableOpacity>
              <NewTuteeModal
                visible={newTuteeModalVisible}
                onClose={toggleNewTuteeModal}
                onAddTutee={handleAddTutee}
                inviteCode={inviteCode}
              />
            </>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {tutors.length > 0 ? (
            (isTutor ? tutors : tutors).map((person) => (
              <TouchableOpacity
                key={person.userId || person.tutorId || person.name}
                onPress={() => isTutor ? handleTuteeClick(person) : handleTutorClick(person.tutorId)}
                style={styles.card}
                activeOpacity={0.75}
              >
                <View style={styles.cardAccent} />
                <Image
                  source={person.photoUrl ? { uri: person.photoUrl } : require("../assets/profilepic.jpg")}
                  style={styles.profileImage}
                />
                <View style={styles.cardInfo}>
                  <View style={styles.cardNameRow}>
                    <Text style={styles.cardName}>{person.name}</Text>
                    {(!isTutor || person.userId) && (
                      <View style={styles.linkedBadge}>
                        <Ionicons name="link-outline" size={11} color="#0D9488" />
                      </View>
                    )}
                  </View>
                  {(isTutor ? person.notes : person.subject) ? (
                    <Text style={styles.cardSubject} numberOfLines={1}>
                      {isTutor ? person.notes : person.subject}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#0D9488" style={styles.cardArrow} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#CCFBF1" />
              <Text style={styles.emptyTitle}>No {isTutor ? "tutees" : "tutors"} yet</Text>
              <Text style={styles.emptySubtitle}>
                {isTutor ? "Add a tutee to get started" : "Your tutors will appear here"}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6FAF8",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  roleBadgeRow: {
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleBadgeTutor: {
    backgroundColor: "#CCFBF1",
    borderColor: "#0D9488",
  },
  roleBadgeTutee: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  roleBadgeTextTutor: {
    color: "#0D9488",
  },
  roleBadgeTextTutee: {
    color: "#6366F1",
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  headerSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#CCFBF1",
    marginHorizontal: 24,
  },
  sectionContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  findRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  findButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 10,
  },
  findButtonText: {
    color: "#0D9488",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D9488",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  cardAccent: {
    width: 4,
    alignSelf: "stretch",
    backgroundColor: "#0D9488",
  },
  profileImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginHorizontal: 14,
  },
  cardInfo: {
    flex: 1,
    paddingVertical: 18,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  cardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  linkedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
    marginLeft: 8,
  },
  linkedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#0D9488",
    marginLeft: 3,
  },
  cardSubject: {
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
  },
  cardArrow: {
    marginRight: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
