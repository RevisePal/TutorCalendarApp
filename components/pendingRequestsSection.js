import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import {
  getFirestore, collection, query, where,
  onSnapshot, doc, updateDoc, getDoc, writeBatch,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../firebase";

export default function PendingRequestsSection({ tutorId, onAccepted }) {
  const [requests, setRequests] = useState([]);
  const [actionLoading, setActionLoading] = useState(null); // requestId being actioned

  useEffect(() => {
    const db = getFirestore();
    const q = query(
      collection(db, "requests"),
      where("tutorId", "==", tutorId),
      where("status", "==", "pending")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [tutorId]);

  const handleAccept = async (request) => {
    setActionLoading(request.id);
    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      // Mark request accepted
      batch.update(doc(db, "requests", request.id), { status: "accepted" });

      // Link tutee into tutor's list
      const tutorDocRef = doc(db, "Tutor", tutorId);
      const tutorSnap = await getDoc(tutorDocRef);
      const currentTutees = tutorSnap.data().tutees || [];
      if (!currentTutees.some((t) => t.userId === request.tuteeId)) {
        batch.update(tutorDocRef, {
          tutees: [...currentTutees, {
            userId: request.tuteeId,
            name: request.tuteeName,
            email: request.tuteeEmail,
            photoUrl: request.tuteePhotoUrl || null,
          }],
        });
      }

      // Link tutor into tutee's list
      const tuteeDocRef = doc(db, "users", request.tuteeId);
      const tuteeSnap = await getDoc(tuteeDocRef);
      const tutorData = tutorSnap.data();
      const currentTutors = tuteeSnap.data().myTutors || [];
      if (!currentTutors.some((t) => t.id === tutorId)) {
        batch.update(tuteeDocRef, {
          myTutors: [...currentTutors, { id: tutorId, name: tutorData.name || "Unknown", subject: "" }],
        });
      }

      await batch.commit();
      onAccepted();
    } catch (err) {
      console.error("Accept error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (requestId) => {
    setActionLoading(requestId);
    try {
      const db = getFirestore();
      await updateDoc(doc(db, "requests", requestId), { status: "declined" });
    } catch (err) {
      console.error("Decline error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (requests.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{requests.length} pending {requests.length === 1 ? "request" : "requests"}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{requests.length}</Text>
        </View>
      </View>

      {requests.map((req) => (
        <View key={req.id} style={styles.card}>
          <Image
            source={req.tuteePhotoUrl ? { uri: req.tuteePhotoUrl } : require("../assets/profilepic.jpg")}
            style={styles.avatar}
          />
          <View style={styles.info}>
            <Text style={styles.name}>{req.tuteeName}</Text>
            <Text style={styles.email}>{req.tuteeEmail}</Text>
          </View>
          {actionLoading === req.id ? (
            <ActivityIndicator color="#0D9488" style={{ marginRight: 12 }} />
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(req.id)}>
                <Ionicons name="close" size={18} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(req)}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#6B7280", letterSpacing: 0.8, textTransform: "uppercase", marginRight: 8 },
  badge: { backgroundColor: "#EF4444", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, marginBottom: 10, padding: 12, borderWidth: 1.5, borderColor: "#FEE2E2" },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 2 },
  email: { fontSize: 12, color: "#6B7280" },
  actions: { flexDirection: "row" },
  declineBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: "#FCA5A5", alignItems: "center", justifyContent: "center", marginRight: 8 },
  acceptBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#0D9488", alignItems: "center", justifyContent: "center" },
  divider: { height: 1, backgroundColor: "#CCFBF1", marginBottom: 16 },
});
