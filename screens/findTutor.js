import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore, collection, query, where,
  orderBy, startAt, endAt, getDocs, addDoc,
  serverTimestamp, doc, getDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import AvatarImage from "../components/AvatarImage";

export default function FindTutor() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState({}); // tutorId → true
  const navigation = useNavigation();

  const handleSearch = async (text) => {
    setSearchText(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const db = getFirestore();
      const term = text.trim();
      const q = query(
        collection(db, "Tutor"),
        orderBy("name"),
        startAt(term),
        endAt(term + "\uf8ff")
      );
      const snap = await getDocs(q);
      setResults(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (tutor) => {
    try {
      const auth = getAuth();
      const db = getFirestore();
      const tuteeId = auth.currentUser.uid;

      // Check not already linked
      const tuteeSnap = await getDoc(doc(db, "users", tuteeId));
      const myTutors = tuteeSnap.data()?.myTutors || [];
      if (myTutors.some((t) => t.id === tutor.id)) {
        setRequested((prev) => ({ ...prev, [tutor.id]: "linked" }));
        return;
      }

      // Check no duplicate pending request
      const existingQ = query(
        collection(db, "requests"),
        where("tuteeId", "==", tuteeId),
        where("tutorId", "==", tutor.id),
        where("status", "==", "pending")
      );
      const existingSnap = await getDocs(existingQ);
      if (!existingSnap.empty) {
        setRequested((prev) => ({ ...prev, [tutor.id]: "sent" }));
        return;
      }

      const tuteeData = tuteeSnap.data();
      await addDoc(collection(db, "requests"), {
        tuteeId,
        tuteeName: tuteeData.name || "Unknown",
        tuteeEmail: tuteeData.email || "",
        tuteePhotoUrl: tuteeData.photoUrl || null,
        tutorId: tutor.id,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setRequested((prev) => ({ ...prev, [tutor.id]: "sent" }));
    } catch (err) {
      console.error("Request error:", err);
    }
  };

  const renderResult = ({ item }) => {
    const state = requested[item.id];
    return (
      <View style={styles.card}>
        <View style={styles.cardAccent} />
        <AvatarImage
          photoUrl={item.photoUrl}
          style={styles.avatar}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          {item.subject ? <Text style={styles.cardSubject}>{item.subject}</Text> : null}
        </View>
        <TouchableOpacity
          style={[styles.requestBtn, state && styles.requestBtnSent]}
          onPress={() => sendRequest(item)}
          disabled={!!state}
          activeOpacity={0.8}
        >
          {state === "sent" ? (
            <><Ionicons name="checkmark" size={14} color="#0D9488" /><Text style={styles.requestBtnTextSent}>Sent</Text></>
          ) : state === "linked" ? (
            <Text style={styles.requestBtnTextSent}>Linked</Text>
          ) : (
            <Text style={styles.requestBtnText}>Request</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#0D9488" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Find a Tutor</Text>
          <Text style={styles.subtitle}>Search by name and send a request</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <TextInput
          mode="outlined"
          placeholder="Search tutor name..."
          value={searchText}
          onChangeText={handleSearch}
          left={<TextInput.Icon icon="magnify" color="#9CA3AF" />}
          textColor="#111827"
          outlineColor="#CCFBF1"
          activeOutlineColor="#0D9488"
          theme={{ colors: { placeholder: "#9CA3AF", background: "#FFFFFF" } }}
          style={styles.searchInput}
        />
      </View>

      {/* Results */}
      {loading ? (
        <ActivityIndicator color="#0D9488" style={{ marginTop: 40 }} />
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderResult}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : searchText.length >= 2 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={44} color="#CCFBF1" />
          <Text style={styles.emptyTitle}>No tutors found</Text>
          <Text style={styles.emptySubtitle}>Try a different name</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={44} color="#CCFBF1" />
          <Text style={styles.emptyTitle}>Search for your tutor</Text>
          <Text style={styles.emptySubtitle}>Type at least 2 characters</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E6FAF8" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  backButton: { marginRight: 12 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 1 },
  searchWrapper: { paddingHorizontal: 20, marginBottom: 12 },
  searchInput: { backgroundColor: "#FFFFFF" },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, marginBottom: 12, shadowColor: "#0D9488", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2, overflow: "hidden" },
  cardAccent: { width: 4, alignSelf: "stretch", backgroundColor: "#0D9488" },
  avatar: { width: 48, height: 48, borderRadius: 24, marginHorizontal: 12 },
  cardInfo: { flex: 1, paddingVertical: 16 },
  cardName: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 2 },
  cardSubject: { fontSize: 13, color: "#6B7280", fontStyle: "italic" },
  requestBtn: { marginRight: 14, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#0D9488", flexDirection: "row", alignItems: "center" },
  requestBtnSent: { backgroundColor: "#F0FDFA", borderWidth: 1, borderColor: "#CCFBF1" },
  requestBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  requestBtnTextSent: { color: "#0D9488", fontSize: 13, fontWeight: "600", marginLeft: 4 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 16, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: "#6B7280" },
});
