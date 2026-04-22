import React, { useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Calendar } from "react-native-calendars";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  deleteDoc,
  arrayUnion,
  collection,
  query,
  where,
  addDoc,
} from "firebase/firestore";
import { Linking } from "react-native";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export default function Planner() {
  const [markedDates, setMarkedDates] = useState({});
  const [allBookings, setAllBookings] = useState([]);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [tutees, setTutees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTutor, setIsTutor] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);
  const [selectedTutee, setSelectedTutee] = useState(null); // { name, userId?, isManual }
  const [tuteeSearch, setTuteeSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState("4");

  // Booking detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [viewedBooking, setViewedBooking] = useState(null);
  const [bookingFiles, setBookingFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const fetchAllBookings = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      const db = getFirestore();
      const userId = auth.currentUser.uid;

      const tutorDocRef = doc(db, "Tutor", userId);
      const tutorDocSnap = await getDoc(tutorDocRef);
      const collected = [];

      if (tutorDocSnap.exists() && tutorDocSnap.data().isActive !== false) {
        // ── Tutor view ──────────────────────────────────────────────────────
        setIsTutor(true);
        const fetchedTutees = tutorDocSnap.data().tutees || [];
        setTutees(fetchedTutees);

        const tuteeMap = {};
        fetchedTutees.forEach((t) => { if (t.userId) tuteeMap[t.userId] = t; });

        const bookingsCol = collection(db, `Tutor/${userId}/bookings`);
        const snapshot = await getDocs(bookingsCol);

        snapshot.forEach((bookingDoc) => {
          const docId = bookingDoc.id;
          const data = bookingDoc.data();
          const tuteeName = data.tuteeName || tuteeMap[docId]?.name || docId;
          const subject = tuteeMap[docId]?.subject || "";

          (data.tuteeBookings || []).forEach((booking) => {
            const start = new Date(booking.bookingDates.seconds * 1000);
            const end = new Date(booking.endTime.seconds * 1000);
            collected.push({
              tuteeId: docId,
              tuteeName,
              subject,
              start,
              end,
              description: booking.description || null,
              paid: booking.paid || false,
              dateString: start.toISOString().split("T")[0],
            });
          });
        });
      } else {
        // ── Tutee view ──────────────────────────────────────────────────────
        setIsTutor(false);
        setTutees([]);

        const userDocRef = doc(db, "users", userId);
        const userDocSnap = await getDoc(userDocRef);
        const myTutors = userDocSnap.exists() ? (userDocSnap.data().myTutors || []) : [];

        for (const tutor of myTutors) {
          const bookingDocRef = doc(db, `Tutor/${tutor.id}/bookings/${userId}`);
          const bookingSnap = await getDoc(bookingDocRef);
          if (!bookingSnap.exists()) continue;

          (bookingSnap.data().tuteeBookings || []).forEach((booking) => {
            const start = new Date(booking.bookingDates.seconds * 1000);
            const end = new Date(booking.endTime.seconds * 1000);
            collected.push({
              tuteeId: userId,
              tutorId: tutor.id,
              tuteeName: tutor.name,
              subject: tutor.subject || "",
              start,
              end,
              description: booking.description || null,
              paid: booking.paid || false,
              dateString: start.toISOString().split("T")[0],
            });
          });
        }
      }

      setAllBookings(collected);

      // First pass: count bookings per date and track whether any are future
      const now = new Date();
      const dateInfo = {};
      collected.forEach((b) => {
        if (!dateInfo[b.dateString]) {
          dateInfo[b.dateString] = { count: 0, hasFuture: false, hasUnpaid: false };
        }
        dateInfo[b.dateString].count++;
        if (b.end >= now) dateInfo[b.dateString].hasFuture = true;
        if (!b.paid) dateInfo[b.dateString].hasUnpaid = true;
      });

      // Second pass: colour by count + future/past
      const marks = {};
      Object.entries(dateInfo).forEach(([dateString, { count, hasFuture, hasUnpaid }]) => {
        let bg, fg;
        if (!hasFuture) {
          bg = "#E5E7EB"; fg = "#6B7280"; // past — grey
        } else if (count > 1) {
          bg = "#6366F1"; fg = "#fff";    // multiple future bookings — indigo
        } else {
          bg = "#0D9488"; fg = "#fff";    // single future booking — teal
        }
        marks[dateString] = {
          customStyles: {
            container: { backgroundColor: bg, borderRadius: 8 },
            text: { color: fg, fontWeight: "bold" },
          },
          ...(hasUnpaid && { marked: true, dotColor: "#EF4444" }),
        };
      });
      setMarkedDates(marks);
    } catch (error) {
      console.error("Error fetching planner bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllBookings();
    }, [])
  );

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setDayBookings(allBookings.filter((b) => b.dateString === day.dateString));
    setSelectedTutee(null);
    setTuteeSearch("");
    setDropdownOpen(false);
    setStartTime("");
    setEndTime("");
    setDescription("");
    setRepeatEnabled(false);
    setRepeatWeeks("4");
    setModalVisible(true);
  };

  const fetchBookingFiles = async (tuteeId, tutorId, bookingTimestamp) => {
    if (!tuteeId || tuteeId.startsWith("manual_")) {
      setBookingFiles([]);
      return;
    }
    setLoadingFiles(true);
    try {
      const db = getFirestore();
      const [snapA, snapB] = await Promise.all([
        getDocs(query(collection(db, "files"), where("uploadedBy", "==", tuteeId), where("sharedWith", "==", tutorId))),
        getDocs(query(collection(db, "files"), where("uploadedBy", "==", tutorId), where("sharedWith", "==", tuteeId))),
      ]);
      const all = [...snapA.docs, ...snapB.docs].map((d) => ({ id: d.id, ...d.data() }));
      const seen = new Set();
      const deduped = all.filter((f) => { if (seen.has(f.filePath)) return false; seen.add(f.filePath); return true; });
      deduped.sort((a, b) => { const ta = a.uploadDate?.toDate?.() ?? a.uploadDate ?? 0; const tb = b.uploadDate?.toDate?.() ?? b.uploadDate ?? 0; return tb - ta; });
      setBookingFiles(deduped.filter((f) => f.type === "booking" && f.bookingTimestamp === bookingTimestamp));
    } catch (err) {
      console.error("Error fetching booking files:", err);
      setBookingFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const getFileName = (url) => {
    try {
      const decoded = decodeURIComponent(url);
      const withoutQuery = decoded.split("?")[0];
      return withoutQuery.split("/").pop();
    } catch {
      return "File";
    }
  };

  const openBookingDetail = (booking) => {
    setBookingFiles([]);
    fetchBookingFiles(booking.tuteeId, booking.tutorId, booking.start.getTime());
    setEditDate(booking.dateString);
    setEditStartTime(formatTime(booking.start));
    setEditEndTime(formatTime(booking.end));
    setEditDescription(booking.description || "");
    setEditMode(false);
    setViewedBooking(booking);
    if (modalVisible) {
      setModalVisible(false);
      setTimeout(() => {
        setSelectedDate(null);
        setDetailModalVisible(true);
      }, 300);
    } else {
      setDetailModalVisible(true);
    }
  };

  const closeDayModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedDate(null), 300);
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setTimeout(() => setViewedBooking(null), 300);
  };

  const handleSelectTutee = (tutee) => {
    setSelectedTutee({ name: tutee.name, userId: tutee.userId, isManual: false });
    setTuteeSearch(tutee.name);
    setDropdownOpen(false);
  };

  const handleSelectManual = () => {
    const name = tuteeSearch.trim();
    if (!name) return;
    setSelectedTutee({ name, isManual: true });
    setDropdownOpen(false);
  };

  const handleCreateBooking = async () => {
    if (!selectedTutee) {
      Alert.alert("Select a tutee first.");
      return;
    }
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      Alert.alert("Invalid time", "Enter times in HH:MM format (e.g. 14:30).");
      return;
    }
    if (startTime >= endTime) {
      Alert.alert("Invalid time", "End time must be after start time.");
      return;
    }

    if (repeatEnabled && (isNaN(parseInt(repeatWeeks, 10)) || parseInt(repeatWeeks, 10) < 1)) {
      Alert.alert("Invalid weeks", "Enter a number of weeks greater than 0.");
      return;
    }
    const weeks = repeatEnabled ? (parseInt(repeatWeeks, 10) || 1) : 1;
    setSaving(true);
    try {
      const auth = getAuth();
      const db = getFirestore();
      const tutorId = auth.currentUser.uid;

      const baseStart = new Date(`${selectedDate}T${startTime}:00`);
      const baseEnd = new Date(`${selectedDate}T${endTime}:00`);
      const bookingsToCreate = Array.from({ length: weeks }, (_, i) => {
        const start = new Date(baseStart);
        const end = new Date(baseEnd);
        start.setDate(start.getDate() + i * 7);
        end.setDate(end.getDate() + i * 7);
        return {
          bookingDates: start,
          endTime: end,
          ...(description.trim() && { description: description.trim() }),
        };
      });

      // For manual tutees use a sanitized name as the doc key
      const docKey = (selectedTutee.isManual || !selectedTutee.userId)
        ? "manual_" +
          selectedTutee.name
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "")
        : selectedTutee.userId;

      const bookingDocRef = doc(db, `Tutor/${tutorId}/bookings/${docKey}`);
      const docSnap = await getDoc(bookingDocRef);

      if (docSnap.exists()) {
        await updateDoc(bookingDocRef, {
          tuteeBookings: arrayUnion(...bookingsToCreate),
          tuteeName: selectedTutee.name,
        });
      } else {
        await setDoc(bookingDocRef, {
          tuteeBookings: bookingsToCreate,
          tuteeName: selectedTutee.name,
        });
      }

      setModalVisible(false);
      await fetchAllBookings();
    } catch (error) {
      console.error("Error creating booking:", error);
      Alert.alert("Error", "Failed to create booking. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(editStartTime) || !timeRegex.test(editEndTime)) {
      Alert.alert("Invalid time", "Enter times in HH:MM format (e.g. 14:30).");
      return;
    }
    if (editStartTime >= editEndTime) {
      Alert.alert("Invalid time", "End time must be after start time.");
      return;
    }
    setSavingEdit(true);
    try {
      const db = getFirestore();
      const auth = getAuth();
      const tutorId = auth.currentUser.uid;
      const docRef = doc(db, `Tutor/${tutorId}/bookings/${viewedBooking.tuteeId}`);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;

      const originalSeconds = Math.floor(viewedBooking.start.getTime() / 1000);

      const updatedBookings = docSnap.data().tuteeBookings.map((b) => {
        if (b.bookingDates.seconds === originalSeconds) {
          const updated = {
            bookingDates: new Date(`${editDate}T${editStartTime}:00`),
            endTime: new Date(`${editDate}T${editEndTime}:00`),
            paid: b.paid || false,
          };
          if (editDescription.trim()) updated.description = editDescription.trim();
          return updated;
        }
        return b;
      });

      await updateDoc(docRef, { tuteeBookings: updatedBookings });
      setEditMode(false);
      closeDetailModal();
      await fetchAllBookings();
    } catch (err) {
      console.error("Error saving edit:", err);
      Alert.alert("Error", "Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteBooking = () => {
    Alert.alert("Delete booking", "Are you sure you want to delete this booking?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const db = getFirestore();
            const auth = getAuth();
            const tutorId = auth.currentUser.uid;
            const docRef = doc(db, `Tutor/${tutorId}/bookings/${viewedBooking.tuteeId}`);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) return;
            const originalSeconds = Math.floor(viewedBooking.start.getTime() / 1000);
            const remaining = docSnap.data().tuteeBookings.filter(
              (b) => b.bookingDates.seconds !== originalSeconds
            );
            await updateDoc(docRef, { tuteeBookings: remaining });
            closeDetailModal();
            await fetchAllBookings();
          } catch (err) {
            console.error("Error deleting booking:", err);
            Alert.alert("Error", "Failed to delete booking.");
          }
        },
      },
    ]);
  };

  const handleTogglePaid = async () => {
    try {
      const db = getFirestore();
      const auth = getAuth();
      const tutorId = auth.currentUser.uid;
      const docRef = doc(db, `Tutor/${tutorId}/bookings/${viewedBooking.tuteeId}`);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;
      const originalSeconds = Math.floor(viewedBooking.start.getTime() / 1000);
      const newPaid = !viewedBooking.paid;
      const updatedBookings = docSnap.data().tuteeBookings.map((b) =>
        b.bookingDates.seconds === originalSeconds ? { ...b, paid: newPaid } : b
      );
      await updateDoc(docRef, { tuteeBookings: updatedBookings });
      setViewedBooking((prev) => ({ ...prev, paid: newPaid }));
      setAllBookings((prev) =>
        prev.map((b) =>
          b.tuteeId === viewedBooking.tuteeId &&
          Math.floor(b.start.getTime() / 1000) === originalSeconds
            ? { ...b, paid: newPaid }
            : b
        )
      );
    } catch (err) {
      console.error("Error toggling paid:", err);
      Alert.alert("Error", "Failed to update payment status.");
    }
  };

  const handleDeleteFile = (file) => {
    Alert.alert("Remove file", "Remove this file from shared files?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          try {
            const db = getFirestore();
            await deleteDoc(doc(db, "files", file.id));
            setBookingFiles((prev) => prev.filter((f) => f.id !== file.id));
          } catch (err) {
            console.error("Error deleting file:", err);
            Alert.alert("Error", "Failed to remove file.");
          }
        },
      },
    ]);
  };

  const handleUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.size > 5242880) {
        Alert.alert("File too large", "Please select a file smaller than 5MB.");
        return;
      }
      setUploadingFile(true);
      const auth = getAuth();
      const userId = auth.currentUser.uid;
      const sharedWith = isTutor ? viewedBooking.tuteeId : viewedBooking.tutorId;
      const fetchResp = await fetch(asset.uri);
      const blob = await fetchResp.blob();
      const fileName = asset.name || asset.uri.split("/").pop();
      const storage = getStorage();
      const storageRef = ref(storage, `uploads/${userId}/${fileName}`);
      const task = uploadBytesResumable(storageRef, blob);
      const bookingTimestamp = viewedBooking.start.getTime();
      await new Promise((resolve, reject) => {
        task.on("state_changed", null, reject, async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          const db = getFirestore();
          const newDoc = await addDoc(collection(db, "files"), {
            filePath: url,
            uploadedBy: userId,
            sharedWith,
            uploadDate: new Date(),
            type: "booking",
            bookingTimestamp,
          });
          setBookingFiles((prev) => [...prev, { id: newDoc.id, filePath: url, type: "booking", bookingTimestamp }]);
          resolve();
        });
      });
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Upload failed", "Could not upload the file.");
    } finally {
      setUploadingFile(false);
    }
  };

  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatTimeInput = (_prev, next) => {
    // Strip everything except digits
    const digits = next.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + ":" + digits.slice(2, 4);
  };

  const formatDate = (date) =>
    date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "";
    const [y, m, d] = dateString.split("-");
    return `${d}/${m}/${y}`;
  };

  const now = new Date();
  const sortedUpcoming = allBookings
    .filter((b) => b.start >= now)
    .sort((a, b) => a.start - b.start);
  const upcomingBookings = showAllUpcoming ? sortedUpcoming : sortedUpcoming.slice(0, 3);

  const filteredTutees = tuteeSearch.trim()
    ? tutees.filter((t) =>
        t.name.toLowerCase().includes(tuteeSearch.toLowerCase())
      )
    : tutees;

  const showManualOption =
    tuteeSearch.trim().length > 0 &&
    !tutees.some(
      (t) => t.name.toLowerCase() === tuteeSearch.trim().toLowerCase()
    );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Planner</Text>
          <Text style={styles.headerSub}>Your schedule at a glance</Text>
        </View>

        <View style={styles.divider} />

        {loading ? (
          <ActivityIndicator size="large" color="#0D9488" style={styles.loader} />
        ) : (
          <>
            {/* Upcoming section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="time-outline" size={16} color="#0D9488" />
                <Text style={styles.sectionTitle}>Upcoming</Text>
              </View>

              {upcomingBookings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={40} color="#CCFBF1" />
                  <Text style={styles.emptyText}>No upcoming bookings</Text>
                </View>
              ) : (
                <>
                  {upcomingBookings.map((booking, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.bookingCard}
                      onPress={() => openBookingDetail(booking)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.cardAccent} />
                      <View style={styles.cardBody}>
                        <View style={styles.cardTop}>
                          <Text style={styles.tuteeName}>{booking.tuteeName}</Text>
                          {booking.subject ? (
                            <Text style={styles.subject}>{booking.subject}</Text>
                          ) : null}
                        </View>
                        <View style={styles.cardBottom}>
                          <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                          <Text style={styles.dateText}>{formatDate(booking.start)}</Text>
                          <Ionicons name="time-outline" size={13} color="#6B7280" style={{ marginLeft: 10 }} />
                          <Text style={styles.dateText}>
                            {formatTime(booking.start)} – {formatTime(booking.end)}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#0D9488" style={{ marginRight: 14, alignSelf: "center" }} />
                    </TouchableOpacity>
                  ))}
                  {sortedUpcoming.length > 3 && (
                    <TouchableOpacity
                      style={styles.showAllRow}
                      onPress={() => setShowAllUpcoming((v) => !v)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.showAllText}>
                        {showAllUpcoming ? "Show less" : `Show all (${sortedUpcoming.length})`}
                      </Text>
                      <Ionicons
                        name={showAllUpcoming ? "chevron-up" : "chevron-down"}
                        size={14}
                        color="#0D9488"
                        style={{ marginLeft: 4 }}
                      />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            {/* Calendar */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="calendar-outline" size={16} color="#0D9488" />
                <Text style={styles.sectionTitle}>Calendar</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#0D9488" }]} />
                  <Text style={styles.legendLabel}>1 booking</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#6366F1" }]} />
                  <Text style={styles.legendLabel}>Multiple bookings</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#E5E7EB", borderWidth: 1, borderColor: "#D1D5DB" }]} />
                  <Text style={styles.legendLabel}>Past</Text>
                </View>
              </View>
              <Calendar
                onDayPress={handleDayPress}
                markingType="custom"
                markedDates={markedDates}
                monthFormat="MMMM yyyy"
                theme={{
                  backgroundColor: "#ffffff",
                  calendarBackground: "#ffffff",
                  selectedDayBackgroundColor: "#0D9488",
                  selectedDayTextColor: "#ffffff",
                  todayTextColor: "#0D9488",
                  dayTextColor: "#111827",
                  textDisabledColor: "#D1D5DB",
                  monthTextColor: "#111827",
                  arrowColor: "#0D9488",
                  textMonthFontWeight: "700",
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                }}
                style={styles.calendar}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Day modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDayModal}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={closeDayModal}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
        {selectedDate ? (
        <View style={styles.modalSheet}>
          <View style={styles.handleBar} />

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.modalTitle}>{formatDisplayDate(selectedDate)}</Text>

          {/* Existing bookings on this day */}
          {dayBookings.length > 0 && (
            <View style={styles.dayBookingsContainer}>
              {dayBookings.map((b, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.dayBookingCard}
                  onPress={() => openBookingDetail(b)}
                  activeOpacity={0.75}
                >
                  <View style={styles.dayBookingAccent} />
                  <View style={styles.dayBookingBody}>
                    <View style={styles.dayBookingTimeRow}>
                      <Ionicons name="time-outline" size={15} color="#0D9488" />
                      <Text style={styles.dayBookingTime}>
                        {formatTime(b.start)} – {formatTime(b.end)}
                      </Text>
                    </View>
                    <Text style={styles.dayBookingName}>{b.tuteeName}</Text>
                    {b.description ? (
                      <Text style={styles.dayBookingDesc} numberOfLines={1}>{b.description}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#0D9488" style={{ marginRight: 14, alignSelf: "center" }} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {isTutor && <View style={styles.modalDivider} />}

          {isTutor && <Text style={styles.modalLabel}>Add a booking</Text>}

          {/* Tutee search */}
          {isTutor && <Text style={styles.inputLabel}>Tutee</Text>}
          {isTutor && (
            <>
              <View style={styles.searchWrapper}>
                <View style={styles.searchInputRow}>
                  <Ionicons name="search-outline" size={16} color="#9CA3AF" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search tutees..."
                    placeholderTextColor="#9CA3AF"
                    value={tuteeSearch}
                    onChangeText={(text) => {
                      setTuteeSearch(text);
                      setSelectedTutee(null);
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                  />
                  {tuteeSearch.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setTuteeSearch("");
                        setSelectedTutee(null);
                        setDropdownOpen(false);
                      }}
                    >
                      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Dropdown */}
                {dropdownOpen && (filteredTutees.length > 0 || showManualOption) && (
                  <View style={styles.dropdown}>
                    {filteredTutees.map((t) => (
                      <TouchableOpacity
                        key={t.userId}
                        style={styles.dropdownItem}
                        onPress={() => handleSelectTutee(t)}
                      >
                        <Ionicons name="person-outline" size={15} color="#0D9488" style={{ marginRight: 8 }} />
                        <View>
                          <Text style={styles.dropdownName}>{t.name}</Text>
                          {t.subject ? (
                            <Text style={styles.dropdownSub}>{t.subject}</Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    ))}
                    {showManualOption && (
                      <TouchableOpacity
                        style={[styles.dropdownItem, styles.dropdownManual]}
                        onPress={handleSelectManual}
                      >
                        <Ionicons name="add-circle-outline" size={15} color="#6366F1" style={{ marginRight: 8 }} />
                        <Text style={styles.dropdownManualText}>
                          Book for "{tuteeSearch.trim()}"
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Selected tutee pill */}
              {selectedTutee && (
                <View style={styles.selectedPill}>
                  <Ionicons
                    name={selectedTutee.isManual ? "person-add-outline" : "checkmark-circle"}
                    size={14}
                    color={selectedTutee.isManual ? "#6366F1" : "#0D9488"}
                  />
                  <Text style={[styles.selectedPillText, selectedTutee.isManual && styles.selectedPillManual]}>
                    {selectedTutee.name}
                    {selectedTutee.isManual ? " (not linked)" : ""}
                  </Text>
                </View>
              )}

              {/* Description */}
              <Text style={styles.inputLabel}>Description <Text style={styles.optionalLabel}>(optional)</Text></Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="e.g. Algebra revision, exam prep..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
              />

              {/* Time inputs */}
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={styles.inputLabel}>Start</Text>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="HH:MM"
                    placeholderTextColor="#9CA3AF"
                    value={startTime}
                    onChangeText={(v) => setStartTime(formatTimeInput(startTime, v))}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={styles.timeSeparator}>
                  <Text style={styles.timeSeparatorText}>–</Text>
                </View>
                <View style={styles.timeField}>
                  <Text style={styles.inputLabel}>End</Text>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="HH:MM"
                    placeholderTextColor="#9CA3AF"
                    value={endTime}
                    onChangeText={(v) => setEndTime(formatTimeInput(endTime, v))}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </View>

              {/* Repeat */}
              <View style={styles.repeatRow}>
                <View>
                  <Text style={styles.inputLabel}>Repeat weekly</Text>
                  <Text style={styles.repeatSubLabel}>Same time, every week</Text>
                </View>
                <TouchableOpacity
                  style={[styles.repeatToggle, repeatEnabled && styles.repeatToggleOn]}
                  onPress={() => setRepeatEnabled((v) => !v)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.repeatToggleText, repeatEnabled && styles.repeatToggleTextOn]}>
                    {repeatEnabled ? "On" : "Off"}
                  </Text>
                </TouchableOpacity>
              </View>

              {repeatEnabled && (
                <View style={styles.repeatWeeksRow}>
                  <Text style={styles.repeatWeeksLabel}>Repeat for</Text>
                  <TextInput
                    style={styles.repeatWeeksInput}
                    value={repeatWeeks}
                    onChangeText={(v) => setRepeatWeeks(v.replace(/\D/g, ""))}
                    keyboardType="numeric"
                    maxLength={2}
                    placeholder="4"
                    placeholderTextColor="#9CA3AF"
                    selectTextOnFocus
                  />
                  <Text style={styles.repeatWeeksLabel}>weeks</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
                onPress={handleCreateBooking}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {repeatEnabled ? `Book ${parseInt(repeatWeeks, 10) || 1} weeks` : "Confirm Booking"}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
          </ScrollView>
        </View>
        ) : <View />}
        </KeyboardAvoidingView>
      </Modal>

      {/* Booking detail modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDetailModal}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={closeDetailModal}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
        {viewedBooking ? (
          <View style={styles.modalSheet}>
            <View style={styles.handleBar} />

            {/* Header row */}
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.detailName}>{viewedBooking.tuteeName}</Text>
                {viewedBooking.subject ? (
                  <Text style={styles.detailSubject}>{viewedBooking.subject}</Text>
                ) : null}
              </View>
              <View style={styles.detailHeaderActions}>
                {isTutor && (
                  <>
                    <TouchableOpacity
                      onPress={() => setEditMode((v) => !v)}
                      style={[styles.pencilButton, editMode && styles.pencilButtonActive]}
                    >
                      <Ionicons name="pencil-outline" size={17} color={editMode ? "#fff" : "#0D9488"} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDeleteBooking} style={styles.deleteButton}>
                      <Ionicons name="trash-outline" size={17} color="#EF4444" />
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity onPress={closeDetailModal} style={{ marginLeft: 10 }}>
                  <Ionicons name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalDivider} />

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Date */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="calendar-outline" size={18} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailRowLabel}>Date</Text>
                  {editMode ? (
                    <Calendar
                      current={editDate}
                      onDayPress={(day) => setEditDate(day.dateString)}
                      markedDates={{ [editDate]: { selected: true, selectedColor: "#0D9488" } }}
                      monthFormat="MMMM yyyy"
                      theme={{
                        calendarBackground: "#F9FAFB",
                        todayTextColor: "#0D9488",
                        selectedDayBackgroundColor: "#0D9488",
                        arrowColor: "#0D9488",
                        textMonthFontWeight: "700",
                        textDayFontSize: 13,
                        textMonthFontSize: 14,
                      }}
                      style={{ borderRadius: 10, marginTop: 6 }}
                    />
                  ) : (
                    <Text style={styles.detailRowValue}>{formatDate(viewedBooking.start)}</Text>
                  )}
                </View>
              </View>

              {/* Time */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="time-outline" size={18} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailRowLabel}>Time</Text>
                  {editMode ? (
                    <View style={styles.editTimeRow}>
                      <TextInput
                        style={styles.editTimeInput}
                        value={editStartTime}
                        onChangeText={(v) => setEditStartTime(formatTimeInput(editStartTime, v))}
                        placeholder="HH:MM"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        maxLength={5}
                      />
                      <Text style={styles.editTimeSep}>–</Text>
                      <TextInput
                        style={styles.editTimeInput}
                        value={editEndTime}
                        onChangeText={(v) => setEditEndTime(formatTimeInput(editEndTime, v))}
                        placeholder="HH:MM"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                  ) : (
                    <Text style={styles.detailRowValue}>
                      {editStartTime} – {editEndTime}
                    </Text>
                  )}
                </View>
              </View>

              {/* Description */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="document-text-outline" size={18} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailRowLabel}>Description</Text>
                  {editMode ? (
                    <TextInput
                      style={styles.editDescInput}
                      value={editDescription}
                      onChangeText={setEditDescription}
                      placeholder="Add a description..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                    />
                  ) : (
                    <Text style={[styles.detailRowValue, !editDescription && styles.detailEmpty]}>
                      {editDescription || "No description"}
                    </Text>
                  )}
                </View>
              </View>

              {/* Paid */}
              <TouchableOpacity
                style={styles.detailRow}
                onPress={isTutor ? handleTogglePaid : undefined}
                activeOpacity={isTutor ? 0.7 : 1}
              >
                <View style={styles.detailIconWrap}>
                  <Ionicons name="card-outline" size={18} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailRowLabel}>Payment</Text>
                  <Text style={[styles.detailRowValue, viewedBooking?.paid ? styles.paidText : styles.unpaidText]}>
                    {viewedBooking?.paid ? "Paid" : "Unpaid"}
                  </Text>
                </View>
                <View style={[styles.checkbox, viewedBooking?.paid && styles.checkboxChecked]}>
                  {viewedBooking?.paid && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>

              {/* Files */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="attach-outline" size={18} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.filesLabelRow}>
                    <Text style={styles.detailRowLabel}>Attached files</Text>
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={handleUploadFile}
                      disabled={uploadingFile}
                    >
                      {uploadingFile
                        ? <ActivityIndicator size="small" color="#0D9488" />
                        : <Ionicons name="add" size={18} color="#0D9488" />}
                    </TouchableOpacity>
                  </View>
                  {loadingFiles ? (
                    <ActivityIndicator size="small" color="#0D9488" style={{ marginTop: 4 }} />
                  ) : bookingFiles.length === 0 ? (
                    <Text style={styles.detailEmpty}>No files attached</Text>
                  ) : (
                    bookingFiles.map((file) => (
                      <View key={file.id} style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                        <TouchableOpacity style={[styles.fileRow, { flex: 1, marginTop: 0 }]} onPress={() => Linking.openURL(file.filePath)}>
                          <Ionicons name="document-outline" size={14} color="#0D9488" />
                          <Text style={styles.fileName} numberOfLines={1}>
                            {getFileName(file.filePath)}
                          </Text>
                          <Ionicons name="open-outline" size={13} color="#9CA3AF" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteFile(file)} style={{ marginLeft: 10 }}>
                          <Ionicons name="trash-outline" size={15} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              </View>

              {/* Save button — only in edit mode */}
              {editMode && (
                <TouchableOpacity
                  style={[styles.confirmButton, savingEdit && styles.confirmButtonDisabled]}
                  onPress={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.confirmButtonText}>Save changes</Text>}
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        ) : <View />}
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E6FAF8" },
  headerContainer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
  header: { fontSize: 28, fontWeight: "800", color: "#111827" },
  headerSub: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: "#CCFBF1",
    marginHorizontal: 24,
    marginBottom: 20,
  },
  loader: { marginTop: 60 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginLeft: 6,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
  },
  emptyText: { marginTop: 10, color: "#9CA3AF", fontSize: 14 },
  bookingCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
    overflow: "hidden",
  },
  cardAccent: { width: 4, backgroundColor: "#0D9488", alignSelf: "stretch" },
  cardBody: { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  tuteeName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  subject: { fontSize: 12, color: "#6B7280", fontStyle: "italic" },
  cardBottom: { flexDirection: "row", alignItems: "center" },
  dateText: { fontSize: 12, color: "#6B7280", marginLeft: 4 },
  calendar: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
  },
  // Modal
  modalContainer: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: "85%",
  },
  handleBar: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 14 },
  dayBookingsContainer: { marginBottom: 12 },
  dayBookingCard: {
    flexDirection: "row",
    backgroundColor: "#F0FDFA",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  dayBookingAccent: { width: 4, backgroundColor: "#0D9488", alignSelf: "stretch" },
  dayBookingBody: { flex: 1, paddingVertical: 14, paddingHorizontal: 12 },
  dayBookingTimeRow: { flexDirection: "row", alignItems: "center" },
  dayBookingTime: { fontSize: 16, fontWeight: "700", color: "#111827", marginLeft: 6 },
  dayBookingName: { fontSize: 13, fontWeight: "600", color: "#0D9488", marginTop: 3 },
  dayBookingDesc: { fontSize: 13, color: "#6B7280", marginTop: 2, fontStyle: "italic" },
  showAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  showAllText: { fontSize: 13, fontWeight: "600", color: "#0D9488" },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 5 },
  legendLabel: { fontSize: 11, color: "#6B7280", fontWeight: "500" },
  repeatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  repeatSubLabel: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  repeatToggle: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  repeatToggleOn: { backgroundColor: "#CCFBF1", borderColor: "#0D9488" },
  repeatToggleText: { fontSize: 13, fontWeight: "700", color: "#9CA3AF" },
  repeatToggleTextOn: { color: "#0D9488" },
  repeatWeeksRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDFA",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#CCFBF1",
    marginBottom: 20,
  },
  repeatWeeksInput: {
    borderWidth: 1.5,
    borderColor: "#0D9488",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 18,
    fontWeight: "700",
    color: "#0D9488",
    backgroundColor: "#fff",
    width: 58,
    textAlign: "center",
    marginHorizontal: 10,
  },
  repeatWeeksLabel: { fontSize: 14, color: "#374151", fontWeight: "500" },
  modalDivider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 14 },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Search
  searchWrapper: { marginBottom: 8, zIndex: 10 },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 15, color: "#111827" },
  dropdown: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#fff",
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    maxHeight: 180,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  dropdownSub: { fontSize: 12, color: "#9CA3AF", marginTop: 1 },
  dropdownManual: { borderBottomWidth: 0 },
  dropdownManualText: { fontSize: 14, color: "#6366F1", fontWeight: "600" },
  selectedPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  selectedPillText: {
    fontSize: 13,
    color: "#0D9488",
    fontWeight: "600",
    marginLeft: 5,
  },
  selectedPillManual: { color: "#6366F1" },
  optionalLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "400", textTransform: "none", letterSpacing: 0 },
  descriptionInput: {
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    marginBottom: 16,
    minHeight: 60,
    textAlignVertical: "top",
  },
  // Time
  timeRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 20 },
  timeField: { flex: 1 },
  timeSeparator: { paddingHorizontal: 10, paddingBottom: 10 },
  timeSeparatorText: { fontSize: 18, color: "#9CA3AF" },
  timeInput: {
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  confirmButton: {
    backgroundColor: "#0D9488",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmButtonDisabled: { backgroundColor: "#9CA3AF" },
  confirmButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  // Detail modal
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  detailName: { fontSize: 20, fontWeight: "800", color: "#111827" },
  detailHeaderActions: { flexDirection: "row", alignItems: "center" },
  pencilButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#0D9488",
    alignItems: "center",
    justifyContent: "center",
  },
  pencilButtonActive: { backgroundColor: "#0D9488" },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  detailSubject: { fontSize: 13, color: "#6B7280", fontStyle: "italic", marginTop: 2 },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  detailRowLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailRowValue: { fontSize: 15, color: "#111827", fontWeight: "500" },
  detailEmpty: { fontSize: 14, color: "#9CA3AF", fontStyle: "italic" },
  paidText: { color: "#0D9488", fontWeight: "700" },
  unpaidText: { color: "#EF4444", fontWeight: "600" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    alignSelf: "center",
  },
  checkboxChecked: {
    backgroundColor: "#0D9488",
    borderColor: "#0D9488",
  },
  editTimeRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  editTimeInput: {
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    width: 72,
  },
  editTimeSep: { fontSize: 16, color: "#9CA3AF", marginHorizontal: 8 },
  editDescInput: {
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    minHeight: 60,
    textAlignVertical: "top",
    marginTop: 4,
  },
  filesLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  uploadButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#0D9488",
    alignItems: "center",
    justifyContent: "center",
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    color: "#0D9488",
    fontWeight: "500",
    marginLeft: 6,
  },
});
