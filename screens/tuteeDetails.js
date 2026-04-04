import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Share,
} from "react-native";
import { Calendar } from "react-native-calendars";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  arrayUnion,
  collection,
  query,
  where,
  addDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { launchImageLibrary } from "react-native-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const db = getFirestore();

export default function TuteeDetails({ route, navigation }) {
  const { userId, tuteeName } = route.params;

  // Booking doc key: linked tutees use their userId; manual tutees use sanitised name
  const docKey = userId
    ? userId
    : "manual_" + (tuteeName || "unknown").toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  // Profile state
  const [tuteeData, setTuteeData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [photoSource, setPhotoSource] = useState(require("../assets/profilepic.jpg"));
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [tuteeCode, setTuteeCode] = useState(null);

  // Calendar / booking state
  const [markedDates, setMarkedDates] = useState({});
  const [allBookings, setAllBookings] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);

  // Day modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Detail modal
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

  const auth = getAuth();
  const insets = useSafeAreaInsets();

  // ── Profile fetch ──────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const tutorDocRef = doc(db, "Tutor", auth.currentUser.uid);
      const tutorDocSnap = await getDoc(tutorDocRef);
      if (tutorDocSnap.exists()) {
        const data = tutorDocSnap.data();
        setInviteCode(data.inviteCode || null);
        const tuteesArray = data.tutees || [];
        const selected = tuteesArray.find((t) =>
          userId ? t.userId === userId : t.name === tuteeName
        );
        if (selected) {
          setTuteeData(selected);
          if (selected.photoUrl) setPhotoSource({ uri: selected.photoUrl });
          setNotes(selected.notes || "");
          setEditingNotes(!selected.notes);
          setTuteeCode(selected.tuteeCode || null);
        }
      }
    } catch (error) {
      console.error("Error fetching tutee profile:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  const saveNotes = async (value) => {
    setSavingNotes(true);
    try {
      const tutorId = auth.currentUser.uid;
      const tutorDocRef = doc(db, "Tutor", tutorId);
      const tutorDocSnap = await getDoc(tutorDocRef);
      if (!tutorDocSnap.exists()) return;
      const tuteesArray = tutorDocSnap.data().tutees || [];
      const updated = tuteesArray.map((t) => {
        const match = userId ? t.userId === userId : t.name === tuteeName;
        return match ? { ...t, notes: value } : t;
      });
      await updateDoc(tutorDocRef, { tutees: updated });
      setEditingNotes(false);
    } catch (err) {
      console.error("Error saving notes:", err);
    } finally {
      setSavingNotes(false);
    }
  };

  // ── Bookings fetch ─────────────────────────────────────────────────────────
  const fetchBookings = async () => {
    setCalendarLoading(true);
    try {
      const tutorId = auth.currentUser.uid;
      const bookingDocRef = doc(db, `Tutor/${tutorId}/bookings/${docKey}`);
      const docSnap = await getDoc(bookingDocRef);

      const collected = [];
      if (docSnap.exists()) {
        const data = docSnap.data();
        (data.tuteeBookings || []).forEach((booking) => {
          const start = new Date(booking.bookingDates.seconds * 1000);
          const end = new Date(booking.endTime.seconds * 1000);
          collected.push({
            tuteeId: docKey,
            tuteeName: tuteeName || data.tuteeName || docKey,
            start,
            end,
            description: booking.description || null,
            paid: booking.paid || false,
            dateString: start.toISOString().split("T")[0],
          });
        });
      }

      setAllBookings(collected);

      const marks = {};
      collected.forEach((b) => {
        marks[b.dateString] = {
          customStyles: {
            container: { backgroundColor: "#0D9488", borderRadius: 8 },
            text: { color: "#fff", fontWeight: "bold" },
          },
        };
      });
      setMarkedDates(marks);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setCalendarLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchBookings();
    }, [])
  );

  // ── Calendar handlers ──────────────────────────────────────────────────────
  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setDayBookings(allBookings.filter((b) => b.dateString === day.dateString));
    setStartTime("");
    setEndTime("");
    setDescription("");
    setModalVisible(true);
  };

  const closeDayModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedDate(null), 300);
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setTimeout(() => setViewedBooking(null), 300);
  };

  const openBookingDetail = (booking) => {
    setBookingFiles([]);
    fetchBookingFiles(booking.tuteeId);
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

  const fetchBookingFiles = async (tuteeDocKey) => {
    if (!userId || tuteeDocKey.startsWith("manual_")) {
      setBookingFiles([]);
      return;
    }
    setLoadingFiles(true);
    try {
      const tutorId = auth.currentUser.uid;
      const q = query(
        collection(db, "files"),
        where("uploadedBy", "==", userId),
        where("sharedWith", "==", tutorId)
      );
      const snap = await getDocs(q);
      setBookingFiles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching files:", err);
      setBookingFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleCreateBooking = async () => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      Alert.alert("Invalid time", "Enter times in HH:MM format (e.g. 14:30).");
      return;
    }
    if (startTime >= endTime) {
      Alert.alert("Invalid time", "End time must be after start time.");
      return;
    }
    setSaving(true);
    try {
      const tutorId = auth.currentUser.uid;
      const bookingData = {
        bookingDates: new Date(`${selectedDate}T${startTime}:00`),
        endTime: new Date(`${selectedDate}T${endTime}:00`),
        ...(description.trim() && { description: description.trim() }),
      };
      const bookingDocRef = doc(db, `Tutor/${tutorId}/bookings/${docKey}`);
      const docSnap = await getDoc(bookingDocRef);
      if (docSnap.exists()) {
        await updateDoc(bookingDocRef, {
          tuteeBookings: arrayUnion(bookingData),
          tuteeName: tuteeName,
        });
      } else {
        await setDoc(bookingDocRef, {
          tuteeBookings: [bookingData],
          tuteeName: tuteeName,
        });
      }
      setModalVisible(false);
      await fetchBookings();
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
      const tutorId = auth.currentUser.uid;
      const docRef = doc(db, `Tutor/${tutorId}/bookings/${docKey}`);
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
      await fetchBookings();
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
            const tutorId = auth.currentUser.uid;
            const docRef = doc(db, `Tutor/${tutorId}/bookings/${docKey}`);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) return;
            const originalSeconds = Math.floor(viewedBooking.start.getTime() / 1000);
            const remaining = docSnap.data().tuteeBookings.filter(
              (b) => b.bookingDates.seconds !== originalSeconds
            );
            await updateDoc(docRef, { tuteeBookings: remaining });
            closeDetailModal();
            await fetchBookings();
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

  const handleUploadFile = () => {
    launchImageLibrary({ mediaType: "mixed" }, async (response) => {
      if (response.didCancel || response.errorMessage) return;
      const asset = response.assets?.[0];
      if (!asset) return;
      if (asset.fileSize > 5242880) {
        Alert.alert("File too large", "Please select a file smaller than 5MB.");
        return;
      }
      setUploadingFile(true);
      try {
        const tutorId = auth.currentUser.uid;
        const fetchResp = await fetch(asset.uri);
        const blob = await fetchResp.blob();
        const fileName = asset.uri.split("/").pop();
        const storage = getStorage();
        const storageRef = ref(storage, `uploads/${userId}/${fileName}`);
        const task = uploadBytesResumable(storageRef, blob);
        await new Promise((resolve, reject) => {
          task.on("state_changed", null, reject, async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            const newDoc = await addDoc(collection(db, "files"), {
              filePath: url,
              uploadedBy: userId,
              sharedWith: tutorId,
              uploadDate: new Date(),
            });
            setBookingFiles((prev) => [...prev, { id: newDoc.id, filePath: url }]);
            resolve();
          });
        });
      } catch (err) {
        console.error("Upload error:", err);
        Alert.alert("Upload failed", "Could not upload the file.");
      } finally {
        setUploadingFile(false);
      }
    });
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatTimeInput = (_prev, next) => {
    const digits = next.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + ":" + digits.slice(2, 4);
  };

  const formatDate = (date) =>
    date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "";
    const [y, m, d] = dateString.split("-");
    return `${d}/${m}/${y}`;
  };

  const getFileName = (url) => {
    try {
      return decodeURIComponent(url).split("?")[0].split("/").pop();
    } catch {
      return "File";
    }
  };

  const now = new Date();

  const unpaidPastBookings = allBookings
    .filter((b) => b.start < now && !b.paid)
    .sort((a, b) => b.start - a.start); // most recent first

  const upcomingBookings = allBookings
    .filter((b) => b.start >= now)
    .sort((a, b) => a.start - b.start)
    .slice(0, 3);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Hero banner */}
        <View style={[styles.heroBanner, { paddingTop: insets.top + 12 }]}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.heroBack}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Mail button */}
          {tuteeData?.email && (
            <TouchableOpacity
              style={styles.heroMail}
              onPress={() => Linking.openURL(`mailto:${tuteeData.email}`).catch(() =>
                Alert.alert("Error", "Unable to open the mail app.")
              )}
            >
              <Ionicons name="mail-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Avatar + name — overlaps banner */}
        <View style={styles.heroProfile}>
          <View style={styles.avatarWrap}>
            {profileLoading ? (
              <ActivityIndicator size="large" color="#0D9488" />
            ) : (
              <Image source={photoSource} style={styles.avatar} />
            )}
          </View>
          <Text style={styles.heroName}>{tuteeData?.name || tuteeName || "Tutee"}</Text>
          {tuteeData?.email ? (
            <View style={styles.heroPill}>
              <Ionicons name="link-outline" size={12} color="#0D9488" />
              <Text style={styles.heroPillText}>Linked account</Text>
            </View>
          ) : (
            <View style={styles.tuteeCodeCard}>
              {tuteeCode && (
                <>
                  <Text style={styles.tuteeCodeLabel}>PERSONAL CODE</Text>
                  <Text style={styles.tuteeCodeText}>{tuteeCode}</Text>
                </>
              )}
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => Share.share({
                  message: tuteeCode
                    ? `Hi ${tuteeName || "there"}! I'd like to connect with you on BookingBuddy. Download the app and enter your personal code: ${tuteeCode}\n\nDownload the app: https://apps.apple.com/us/app/bookingbuddy/id1635777567`
                    : `Hi ${tuteeName || "there"}! I'd like to connect with you on BookingBuddy. Download the app and enter my invite code: ${inviteCode}\n\nDownload the app: https://apps.apple.com/us/app/bookingbuddy/id1635777567`,
                  url: "https://apps.apple.com/us/app/bookingbuddy/id1635777567",
                })}
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={13} color="#fff" />
                <Text style={styles.inviteButtonText}>Share Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <View style={styles.notesSectionHeader}>
            <Ionicons name="create-outline" size={15} color="#0D9488" />
            <Text style={styles.notesSectionTitle}>Notes</Text>
          </View>
          <View style={styles.notesInputRow}>
            {editingNotes ? (
              <TextInput
                style={styles.notesInput}
                placeholder="Add a description or notes about this tutee..."
                placeholderTextColor="#9CA3AF"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            ) : (
              <Text style={[styles.notesText, !notes && styles.notesEmpty]}>
                {notes || "No notes"}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.notesSaveBtn, savingNotes && styles.notesSaveBtnDisabled]}
              onPress={() => editingNotes ? saveNotes(notes) : setEditingNotes(true)}
              disabled={savingNotes}
            >
              {savingNotes
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name={editingNotes ? "checkmark" : "pencil-outline"} size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {calendarLoading ? (
          <ActivityIndicator size="large" color="#0D9488" style={styles.loader} />
        ) : (
          <>
            {/* Unpaid past lessons */}
            {unpaidPastBookings.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                  <Text style={[styles.sectionTitle, styles.unpaidSectionTitle]}>
                    Unpaid ({unpaidPastBookings.length})
                  </Text>
                </View>
                {unpaidPastBookings.map((booking, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.unpaidCard}
                    onPress={() => openBookingDetail(booking)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.unpaidCardAccent} />
                    <View style={styles.cardBody}>
                      <View style={styles.cardBottom}>
                        <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                        <Text style={styles.dateText}>{formatDate(booking.start)}</Text>
                        <Ionicons name="time-outline" size={13} color="#6B7280" style={{ marginLeft: 10 }} />
                        <Text style={styles.dateText}>
                          {formatTime(booking.start)} – {formatTime(booking.end)}
                        </Text>
                      </View>
                      {booking.description ? (
                        <Text style={styles.cardDesc} numberOfLines={1}>{booking.description}</Text>
                      ) : null}
                    </View>
                    <View style={styles.unpaidBadge}>
                      <Text style={styles.unpaidBadgeText}>Unpaid</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Upcoming */}
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
                upcomingBookings.map((booking, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.bookingCard}
                    onPress={() => openBookingDetail(booking)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.cardAccent} />
                    <View style={styles.cardBody}>
                      <View style={styles.cardBottom}>
                        <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                        <Text style={styles.dateText}>{formatDate(booking.start)}</Text>
                        <Ionicons name="time-outline" size={13} color="#6B7280" style={{ marginLeft: 10 }} />
                        <Text style={styles.dateText}>
                          {formatTime(booking.start)} – {formatTime(booking.end)}
                        </Text>
                      </View>
                      {booking.description ? (
                        <Text style={styles.cardDesc} numberOfLines={1}>{booking.description}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#0D9488" style={{ marginRight: 14, alignSelf: "center" }} />
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Calendar */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="calendar-outline" size={16} color="#0D9488" />
                <Text style={styles.sectionTitle}>Bookings</Text>
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
              <Text style={styles.modalTitle}>{formatDisplayDate(selectedDate)}</Text>

              {/* Existing bookings on this day */}
              {dayBookings.length > 0 && (
                <View style={styles.dayBookingsContainer}>
                  {dayBookings.map((b, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.dayBookingRow}
                      onPress={() => openBookingDetail(b)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dayBookingDot} />
                      <Text style={styles.dayBookingText}>
                        {formatTime(b.start)} – {formatTime(b.end)}
                        {b.description ? `  ·  ${b.description}` : ""}
                      </Text>
                      <Ionicons name="chevron-forward" size={13} color="#9CA3AF" style={{ marginLeft: "auto" }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.modalDivider} />
              <Text style={styles.modalLabel}>Add a booking</Text>

              {/* Description */}
              <Text style={styles.inputLabel}>
                Description <Text style={styles.optionalLabel}>(optional)</Text>
              </Text>
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

              <TouchableOpacity
                style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
                onPress={handleCreateBooking}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                )}
              </TouchableOpacity>
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
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={closeDetailModal}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          {viewedBooking ? (
            <View style={styles.modalSheet}>
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.detailHeader}>
                <View>
                  <Text style={styles.detailName}>{tuteeData?.name || tuteeName}</Text>
                  <Text style={styles.detailSubject}>{formatDate(viewedBooking.start)}</Text>
                </View>
                <View style={styles.detailHeaderActions}>
                  <TouchableOpacity
                    onPress={() => setEditMode((v) => !v)}
                    style={[styles.pencilButton, editMode && styles.pencilButtonActive]}
                  >
                    <Ionicons name="pencil-outline" size={17} color={editMode ? "#fff" : "#0D9488"} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeleteBooking} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={17} color="#EF4444" />
                  </TouchableOpacity>
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
                      <Text style={styles.detailRowValue}>{editStartTime} – {editEndTime}</Text>
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
                  onPress={handleTogglePaid}
                  activeOpacity={0.7}
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

                {/* Files — only for linked tutees */}
                {userId && !docKey.startsWith("manual_") && (
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
                          <TouchableOpacity
                            key={file.id}
                            style={styles.fileRow}
                            onPress={() => Linking.openURL(file.filePath)}
                          >
                            <Ionicons name="document-outline" size={14} color="#0D9488" />
                            <Text style={styles.fileName} numberOfLines={1}>
                              {getFileName(file.filePath)}
                            </Text>
                            <Ionicons name="open-outline" size={13} color="#9CA3AF" style={{ marginLeft: 8 }} />
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </View>
                )}

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
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E6FAF8" },
  heroBanner: {
    backgroundColor: "#0D9488",
    height: 160,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  heroBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroMail: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroProfile: {
    alignItems: "center",
    marginTop: -52,
    marginBottom: 16,
  },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#E6FAF8",
    backgroundColor: "#fff",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0D9488",
    marginLeft: 4,
  },
  heroPillUnlinked: { backgroundColor: "#F3F4F6" },
  heroPillTextUnlinked: { color: "#9CA3AF" },
  tuteeCodeCard: {
    alignItems: "center",
    backgroundColor: "#F0FDFA",
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tuteeCodeLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 1,
    marginBottom: 4,
  },
  tuteeCodeText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0D9488",
    letterSpacing: 6,
    marginBottom: 12,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D9488",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  inviteButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 6,
  },
  notesSection: { paddingHorizontal: 24, paddingBottom: 16 },
  notesSectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  notesSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginLeft: 6,
  },
  notesInputRow: { flexDirection: "row", alignItems: "flex-end" },
  notesInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
    minHeight: 72,
    textAlignVertical: "top",
    marginRight: 10,
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
    marginRight: 10,
    paddingVertical: 4,
  },
  notesEmpty: { color: "#9CA3AF", fontStyle: "italic" },
  notesSaveBtn: {
    backgroundColor: "#0D9488",
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notesSaveBtnDisabled: { backgroundColor: "#9CA3AF" },
  divider: { height: 1, backgroundColor: "#CCFBF1", marginHorizontal: 24, marginBottom: 20 },
  loader: { marginTop: 40 },
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
  emptyState: { alignItems: "center", paddingVertical: 24, backgroundColor: "#fff", borderRadius: 16 },
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
  cardBottom: { flexDirection: "row", alignItems: "center" },
  dateText: { fontSize: 12, color: "#6B7280", marginLeft: 4 },
  cardDesc: { fontSize: 12, color: "#9CA3AF", marginTop: 4, fontStyle: "italic" },
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
  dayBookingRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  dayBookingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#0D9488", marginRight: 8 },
  dayBookingText: { fontSize: 13, color: "#374151", flex: 1 },
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
  detailSubject: { fontSize: 13, color: "#6B7280", fontStyle: "italic", marginTop: 2 },
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
  detailRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
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
  fileName: { flex: 1, fontSize: 13, color: "#0D9488", fontWeight: "500", marginLeft: 6 },
  unpaidSectionTitle: { color: "#EF4444" },
  unpaidCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    overflow: "hidden",
  },
  unpaidCardAccent: { width: 4, backgroundColor: "#EF4444", alignSelf: "stretch" },
  unpaidBadge: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 12,
    alignSelf: "center",
  },
  unpaidBadgeText: { fontSize: 11, fontWeight: "700", color: "#EF4444" },
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
});
