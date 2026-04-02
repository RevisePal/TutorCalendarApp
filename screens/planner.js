import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
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
  arrayUnion,
  collection,
  query,
  where,
  addDoc,
} from "firebase/firestore";
import { Linking } from "react-native";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { launchImageLibrary } from "react-native-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export default function Planner() {
  const [markedDates, setMarkedDates] = useState({});
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [tutees, setTutees] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Booking detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [viewedBooking, setViewedBooking] = useState(null);
  const [bookingFiles, setBookingFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
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
      const tutorId = auth.currentUser.uid;

      // Fetch tutees list for name lookup
      const tutorDocRef = doc(db, "Tutor", tutorId);
      const tutorDocSnap = await getDoc(tutorDocRef);
      const fetchedTutees = tutorDocSnap.exists()
        ? tutorDocSnap.data().tutees || []
        : [];
      setTutees(fetchedTutees);

      const tuteeMap = {};
      fetchedTutees.forEach((t) => { tuteeMap[t.userId] = t; });

      // Fetch ALL booking docs in the subcollection (covers manual entries too)
      const bookingsCol = collection(db, `Tutor/${tutorId}/bookings`);
      const snapshot = await getDocs(bookingsCol);

      const collected = [];
      snapshot.forEach((bookingDoc) => {
        const docId = bookingDoc.id;
        const data = bookingDoc.data();
        // Name: prefer stored tuteeName, fall back to tutees map, then docId
        const tuteeName =
          data.tuteeName ||
          tuteeMap[docId]?.name ||
          docId;
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
            dateString: start.toISOString().split("T")[0],
          });
        });
      });

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

      const now = new Date();
      const upcoming = collected
        .filter((b) => b.start >= now)
        .sort((a, b) => a.start - b.start)
        .slice(0, 3);
      setUpcomingBookings(upcoming);
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
    setModalVisible(true);
  };

  const fetchBookingFiles = async (tuteeId) => {
    // Manual tutees have no real userId — skip
    if (!tuteeId || tuteeId.startsWith("manual_")) {
      setBookingFiles([]);
      return;
    }
    setLoadingFiles(true);
    try {
      const db = getFirestore();
      const auth = getAuth();
      const tutorId = auth.currentUser.uid;
      const q = query(
        collection(db, "files"),
        where("uploadedBy", "==", tuteeId),
        where("sharedWith", "==", tutorId)
      );
      const snap = await getDocs(q);
      const files = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBookingFiles(files);
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
    fetchBookingFiles(booking.tuteeId);
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

    setSaving(true);
    try {
      const auth = getAuth();
      const db = getFirestore();
      const tutorId = auth.currentUser.uid;

      const bookingData = {
        bookingDates: new Date(`${selectedDate}T${startTime}:00`),
        endTime: new Date(`${selectedDate}T${endTime}:00`),
        ...(description.trim() && { description: description.trim() }),
      };

      // For manual tutees use a sanitized name as the doc key
      const docKey = selectedTutee.isManual
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
          tuteeBookings: arrayUnion(bookingData),
          tuteeName: selectedTutee.name,
        });
      } else {
        await setDoc(bookingDocRef, {
          tuteeBookings: [bookingData],
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
      const dateStr = viewedBooking.dateString;

      const updatedBookings = docSnap.data().tuteeBookings.map((b) => {
        if (b.bookingDates.seconds === originalSeconds) {
          const updated = {
            bookingDates: new Date(`${dateStr}T${editStartTime}:00`),
            endTime: new Date(`${dateStr}T${editEndTime}:00`),
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
        const fetchResp = await fetch(asset.uri);
        const blob = await fetchResp.blob();
        const fileName = asset.uri.split("/").pop();
        const storage = getStorage();
        const auth = getAuth();
        const tutorId = auth.currentUser.uid;
        const storageRef = ref(storage, `uploads/${viewedBooking.tuteeId}/${fileName}`);
        const task = uploadBytesResumable(storageRef, blob);

        await new Promise((resolve, reject) => {
          task.on("state_changed", null, reject, async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            const db = getFirestore();
            const newDoc = await addDoc(collection(db, "files"), {
              filePath: url,
              uploadedBy: viewedBooking.tuteeId,
              sharedWith: tutorId,
              uploadDate: new Date(),
            });
            setBookingFiles((prev) => [
              ...prev,
              { id: newDoc.id, filePath: url },
            ]);
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
                upcomingBookings.map((booking, index) => (
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
                        <Ionicons
                          name="time-outline"
                          size={13}
                          color="#6B7280"
                          style={{ marginLeft: 10 }}
                        />
                        <Text style={styles.dateText}>
                          {formatTime(booking.start)} – {formatTime(booking.end)}
                        </Text>
                      </View>
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
                <Text style={styles.sectionTitle}>Calendar</Text>
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
                    {b.tuteeName} · {formatTime(b.start)} – {formatTime(b.end)}
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color="#9CA3AF" style={{ marginLeft: "auto" }} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.modalDivider} />

          <Text style={styles.modalLabel}>Add a booking</Text>

          {/* Tutee search */}
          <Text style={styles.inputLabel}>Tutee</Text>
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

            {/* Header row */}
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.detailName}>{viewedBooking.tuteeName}</Text>
                {viewedBooking.subject ? (
                  <Text style={styles.detailSubject}>{viewedBooking.subject}</Text>
                ) : null}
              </View>
              <View style={styles.detailHeaderActions}>
                <TouchableOpacity
                  onPress={() => setEditMode((v) => !v)}
                  style={[styles.pencilButton, editMode && styles.pencilButtonActive]}
                >
                  <Ionicons name="pencil-outline" size={17} color={editMode ? "#fff" : "#0D9488"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={closeDetailModal} style={{ marginLeft: 10 }}>
                  <Ionicons name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalDivider} />

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Date — read only */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="calendar-outline" size={18} color="#0D9488" />
                </View>
                <View>
                  <Text style={styles.detailRowLabel}>Date</Text>
                  <Text style={styles.detailRowValue}>{formatDate(viewedBooking.start)}</Text>
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
        </View>
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
  dayBookingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0D9488",
    marginRight: 8,
  },
  dayBookingText: { fontSize: 13, color: "#374151" },
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
