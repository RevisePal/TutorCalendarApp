import React, { useState, useCallback, useRef } from "react";
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
  Modal,
  Animated,
} from "react-native";
import { Calendar } from "react-native-calendars";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  addDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AvatarImage from "../components/AvatarImage";
import useDraggableSheet from "../components/useDraggableSheet";

const db = getFirestore();

export default function Activity({ route, navigation }) {
  const { tutorId } = route.params;
  const insets = useSafeAreaInsets();
  const auth = getAuth();

  // Profile state
  const [tutorData, setTutorData] = useState(null);
  const [tutorPhotoUrl, setTutorPhotoUrl] = useState(null);
  const [subject, setSubject] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Calendar / booking state
  const [markedDates, setMarkedDates] = useState({});
  const [allBookings, setAllBookings] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);

  // Day modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);

  // Profile info modal
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Upcoming section expansion
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  // Detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [viewedBooking, setViewedBooking] = useState(null);
  const [bookingFiles, setBookingFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [generalFiles, setGeneralFiles] = useState([]);
  const [loadingGeneralFiles, setLoadingGeneralFiles] = useState(false);
  const [filesExpanded, setFilesExpanded] = useState(false);

  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [pendingUploadType, setPendingUploadType] = useState(null);
  const isPickingRef = useRef(false);

  // ── Draggable sheet hooks ──────────────────────────────────────────────────
  const daySheet = useDraggableSheet(() => setModalVisible(false));
  const profileSheet = useDraggableSheet(() => setProfileModalVisible(false));
  const detailSheet = useDraggableSheet(() => setDetailModalVisible(false));
  const sourceSheet = useDraggableSheet(() => setSourcePickerVisible(false));

  // ── Profile fetch ──────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    if (!tutorId) return;
    setProfileLoading(true);
    try {
      const tutorDocRef = doc(db, "Tutor", tutorId);
      const tutorDoc = await getDoc(tutorDocRef);
      if (tutorDoc.exists()) {
        const data = tutorDoc.data();
        setTutorData(data);
        if (data.photoUrl) setTutorPhotoUrl(data.photoUrl);
      }

      const userId = auth.currentUser.uid;
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const matched = (userDoc.data().myTutors || []).find((t) => t.id === tutorId);
        if (matched) setSubject(matched.subject);
      }
    } catch (error) {
      console.error("Error fetching tutor profile:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Bookings fetch ─────────────────────────────────────────────────────────
  const fetchBookings = async () => {
    if (!tutorId) return;
    setCalendarLoading(true);
    try {
      const userId = auth.currentUser.uid;
      const bookingDocRef = doc(db, `Tutor/${tutorId}/bookings/${userId}`);
      const docSnap = await getDoc(bookingDocRef);

      const collected = [];
      if (docSnap.exists()) {
        (docSnap.data().tuteeBookings || []).forEach((booking) => {
          const start = new Date(booking.bookingDates.seconds * 1000);
          const end = new Date(booking.endTime.seconds * 1000);
          collected.push({
            tuteeId: userId,
            start,
            end,
            description: booking.description || null,
            paid: booking.paid || false,
            dateString: start.toISOString().split("T")[0],
          });
        });
      }

      setAllBookings(collected);

      const now = new Date();
      const unpaidDates = new Set(collected.filter((b) => !b.paid).map((b) => b.dateString));
      const marks = {};
      collected.forEach((b) => {
        const isPast = b.end < now;
        marks[b.dateString] = {
          customStyles: {
            container: {
              backgroundColor: isPast ? "#E5E7EB" : "#0D9488",
              borderRadius: 8,
            },
            text: {
              color: isPast ? "#6B7280" : "#fff",
              fontWeight: "bold",
            },
          },
          ...(unpaidDates.has(b.dateString) && { marked: true, dotColor: "#EF4444" }),
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
      fetchGeneralFiles();
    }, [tutorId])
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setDayBookings(allBookings.filter((b) => b.dateString === day.dateString));
    daySheet.reset();
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
    fetchBookingFiles(booking.start.getTime());
    setViewedBooking(booking);
    detailSheet.reset();
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

  const fetchGeneralFiles = async () => {
    setLoadingGeneralFiles(true);
    try {
      const userId = auth.currentUser.uid;
      const [snap1, snap2] = await Promise.all([
        getDocs(query(collection(db, "files"), where("uploadedBy", "==", userId), where("sharedWith", "==", tutorId))),
        getDocs(query(collection(db, "files"), where("uploadedBy", "==", tutorId), where("sharedWith", "==", userId))),
      ]);
      const all = [
        ...snap1.docs.map((d) => ({ id: d.id, ...d.data() })),
        ...snap2.docs.map((d) => ({ id: d.id, ...d.data() })),
      ];
      const seen = new Set();
      const deduped = all.filter((f) => { if (seen.has(f.filePath)) return false; seen.add(f.filePath); return true; });
      deduped.sort((a, b) => { const ta = a.uploadDate?.toDate?.() ?? a.uploadDate ?? 0; const tb = b.uploadDate?.toDate?.() ?? b.uploadDate ?? 0; return tb - ta; });
      setGeneralFiles(deduped.filter((f) => !f.type || f.type === "general"));
    } catch (err) {
      console.error("Error fetching general files:", err);
    } finally {
      setLoadingGeneralFiles(false);
    }
  };

  const fetchBookingFiles = async (bookingTimestamp) => {
    setLoadingFiles(true);
    try {
      const userId = auth.currentUser.uid;
      const [snap1, snap2] = await Promise.all([
        getDocs(query(collection(db, "files"), where("uploadedBy", "==", userId), where("sharedWith", "==", tutorId))),
        getDocs(query(collection(db, "files"), where("uploadedBy", "==", tutorId), where("sharedWith", "==", userId))),
      ]);
      const all = [
        ...snap1.docs.map((d) => ({ id: d.id, ...d.data() })),
        ...snap2.docs.map((d) => ({ id: d.id, ...d.data() })),
      ];
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

  const handleDeleteFile = (file, setter) => {
    Alert.alert("Remove file", "Remove this file from shared files?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          try {
            await deleteDoc(doc(db, "files", file.id));
            setter((prev) => prev.filter((f) => f.id !== file.id));
          } catch (err) {
            console.error("Error deleting file:", err);
            Alert.alert("Error", "Failed to remove file.");
          }
        },
      },
    ]);
  };

  const pickFromGallery = async () => {
    if (isPickingRef.current) return null;
    isPickingRef.current = true;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo access in Settings.");
        return null;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return null;
      const asset = result.assets[0];
      return { uri: asset.uri, fileName: asset.fileName || asset.uri.split("/").pop() };
    } finally {
      isPickingRef.current = false;
    }
  };

  const pickFromFiles = async () => {
    if (isPickingRef.current) return null;
    isPickingRef.current = true;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (result.canceled) return null;
      const asset = result.assets[0];
      if (asset.size > 5242880) {
        Alert.alert("File too large", "Please select a file smaller than 5MB.");
        return null;
      }
      return { uri: asset.uri, fileName: asset.name || asset.uri.split("/").pop() };
    } finally {
      isPickingRef.current = false;
    }
  };

  const doUpload = async (uri, fileName, firestoreFields, stateUpdater) => {
    setUploadingFile(true);
    try {
      const userId = auth.currentUser.uid;
      const fetchResp = await fetch(uri);
      const blob = await fetchResp.blob();
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
            ...firestoreFields,
          });
          stateUpdater({ id: newDoc.id, filePath: url, ...firestoreFields });
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

  const handleUploadGeneralFile = () => {
    setPendingUploadType("general");
    sourceSheet.reset();
    setSourcePickerVisible(true);
  };

  const handleUploadBookingFile = () => {
    setPendingUploadType("booking");
    sourceSheet.reset();
    setSourcePickerVisible(true);
  };

  const handleSourceSelect = async (source) => {
    setSourcePickerVisible(false);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const asset = source === "gallery" ? await pickFromGallery() : await pickFromFiles();
    if (!asset) return;
    if (pendingUploadType === "general") {
      await doUpload(asset.uri, asset.fileName,
        { type: "general" },
        (file) => setGeneralFiles((prev) => [...prev, file])
      );
    } else {
      const bookingTimestamp = viewedBooking.start.getTime();
      await doUpload(asset.uri, asset.fileName,
        { type: "booking", bookingTimestamp },
        (file) => setBookingFiles((prev) => [...prev, file])
      );
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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

  const sortedUpcoming = allBookings
    .filter((b) => b.start >= new Date())
    .sort((a, b) => a.start - b.start);
  const upcomingBookings = showAllUpcoming ? sortedUpcoming : sortedUpcoming.slice(0, 3);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Hero banner */}
        <View style={[styles.heroBanner, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroBack}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Action buttons */}
          <View style={styles.heroActions}>
            {tutorData?.email && (
              <TouchableOpacity
                style={styles.heroActionBtn}
                onPress={() => Linking.openURL(`mailto:${tutorData.email}`).catch(() =>
                  Alert.alert("Error", "Unable to open the mail app.")
                )}
              >
                <Ionicons name="mail-outline" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            {tutorData?.phone && (
              <TouchableOpacity
                style={styles.heroActionBtn}
                onPress={() => Linking.openURL(`tel:${tutorData.phone}`).catch(() =>
                  Alert.alert("Error", "Unable to open the phone app.")
                )}
              >
                <Ionicons name="call-outline" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            {tutorData?.website && (
              <TouchableOpacity
                style={styles.heroActionBtn}
                onPress={() => {
                  const url = tutorData.website.startsWith("http")
                    ? tutorData.website
                    : `http://${tutorData.website}`;
                  Linking.openURL(url).catch(() => Alert.alert("Error", "Unable to open the website."));
                }}
              >
                <Ionicons name="globe-outline" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.heroActionBtn}
              onPress={handleUploadGeneralFile}
              disabled={uploadingFile}
            >
              {uploadingFile
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="add" size={22} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Avatar + name */}
        <View style={styles.heroProfile}>
          <TouchableOpacity
            style={styles.avatarTouchable}
            onPress={() => { if (!profileLoading) { profileSheet.reset(); setProfileModalVisible(true); } }}
            activeOpacity={0.85}
          >
            <View style={styles.avatarWrap}>
              {profileLoading ? (
                <ActivityIndicator size="large" color="#0D9488" />
              ) : (
                <AvatarImage photoUrl={tutorPhotoUrl} style={styles.avatar} />
              )}
            </View>
            {!profileLoading && (
              <View style={styles.avatarInfoBadge}>
                <Ionicons name="information-circle" size={20} color="#0D9488" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.heroName}>{tutorData?.name || "Tutor"}</Text>
          {subject && (
            <View style={styles.heroPill}>
              <Ionicons name="book-outline" size={12} color="#0D9488" />
              <Text style={styles.heroPillText}>{subject}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {calendarLoading ? (
          <ActivityIndicator size="large" color="#0D9488" style={styles.loader} />
        ) : (
          <>
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
                  ))}
                  {sortedUpcoming.length > 3 && (
                    <TouchableOpacity
                      style={styles.showAllRow}
                      onPress={() => setShowAllUpcoming((v) => !v)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.showAllText}>
                        {showAllUpcoming
                          ? "Show less"
                          : `Show all (${sortedUpcoming.length})`}
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

            {/* Files */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="attach-outline" size={16} color="#0D9488" />
                <Text style={styles.sectionTitle}>Files</Text>
                {generalFiles.length > 3 && (
                  <TouchableOpacity onPress={() => setFilesExpanded((v) => !v)} style={{ marginLeft: "auto" }}>
                    <Ionicons
                      name={filesExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#0D9488"
                    />
                  </TouchableOpacity>
                )}
              </View>
              {loadingGeneralFiles ? (
                <ActivityIndicator size="small" color="#0D9488" style={{ marginTop: 8 }} />
              ) : generalFiles.length === 0 ? (
                <Text style={styles.emptyText}>No files uploaded</Text>
              ) : (
                (filesExpanded ? generalFiles : generalFiles.slice(0, 3)).map((file) => (
                  <View key={file.id} style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                    <TouchableOpacity style={[styles.fileRow, { flex: 1, marginTop: 0 }]} onPress={() => Linking.openURL(file.filePath)}>
                      <Ionicons name="document-outline" size={14} color="#0D9488" />
                      <Text style={styles.fileName} numberOfLines={1}>
                        {getFileName(file.filePath)}
                      </Text>
                      <Ionicons name="open-outline" size={13} color="#9CA3AF" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteFile(file, setGeneralFiles)} style={{ marginLeft: 10 }}>
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
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
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={closeDayModal}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          {selectedDate ? (
            <Animated.View style={[styles.modalSheet, daySheet.animatedStyle]} {...daySheet.panHandlers}>
              <View style={styles.handleBar} />
              <Text style={styles.modalTitle}>{formatDisplayDate(selectedDate)}</Text>

              {dayBookings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={36} color="#CCFBF1" />
                  <Text style={styles.emptyText}>No bookings on this day</Text>
                </View>
              ) : (
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
                        {b.description ? (
                          <Text style={styles.dayBookingDesc} numberOfLines={1}>
                            {b.description}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#0D9488" style={{ marginRight: 14, alignSelf: "center" }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>
          ) : <View />}
        </View>
      </Modal>

      {/* Tutor profile info modal */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={() => setProfileModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.modalSheet, profileSheet.animatedStyle]} {...profileSheet.panHandlers}>
            <View style={styles.handleBar} />

            {/* Profile header */}
            <View style={styles.profileModalHeader}>
              <AvatarImage photoUrl={tutorPhotoUrl} style={styles.profileModalAvatar} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.detailName}>{tutorData?.name || "Tutor"}</Text>
                {subject ? (
                  <View style={styles.heroPill}>
                    <Ionicons name="book-outline" size={12} color="#0D9488" />
                    <Text style={styles.heroPillText}>{subject}</Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Phone */}
              {tutorData?.phone ? (
                <TouchableOpacity
                  style={styles.detailRow}
                  onPress={() => Linking.openURL(`tel:${tutorData.phone}`).catch(() => {})}
                  activeOpacity={0.7}
                >
                  <View style={styles.detailIconWrap}>
                    <Ionicons name="call-outline" size={18} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailRowLabel}>Phone</Text>
                    <Text style={[styles.detailRowValue, styles.linkValue]}>{tutorData.phone}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ alignSelf: "center" }} />
                </TouchableOpacity>
              ) : null}

              {/* Website */}
              {tutorData?.website ? (
                <TouchableOpacity
                  style={styles.detailRow}
                  onPress={() => {
                    const url = tutorData.website.startsWith("http")
                      ? tutorData.website
                      : `http://${tutorData.website}`;
                    Linking.openURL(url).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.detailIconWrap}>
                    <Ionicons name="globe-outline" size={18} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailRowLabel}>Website</Text>
                    <Text style={[styles.detailRowValue, styles.linkValue]} numberOfLines={1}>
                      {tutorData.website}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ alignSelf: "center" }} />
                </TouchableOpacity>
              ) : null}

              {/* Email */}
              {tutorData?.email ? (
                <TouchableOpacity
                  style={styles.detailRow}
                  onPress={() => Linking.openURL(`mailto:${tutorData.email}`).catch(() => {})}
                  activeOpacity={0.7}
                >
                  <View style={styles.detailIconWrap}>
                    <Ionicons name="mail-outline" size={18} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailRowLabel}>Email</Text>
                    <Text style={[styles.detailRowValue, styles.linkValue]} numberOfLines={1}>
                      {tutorData.email}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ alignSelf: "center" }} />
                </TouchableOpacity>
              ) : null}

              {/* Bio */}
              {tutorData?.bio ? (
                <View style={styles.detailRow}>
                  <View style={styles.detailIconWrap}>
                    <Ionicons name="document-text-outline" size={18} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailRowLabel}>About</Text>
                    <Text style={styles.detailRowValue}>{tutorData.bio}</Text>
                  </View>
                </View>
              ) : null}

              {/* Empty state */}
              {!tutorData?.phone && !tutorData?.website && !tutorData?.email && !tutorData?.bio && (
                <View style={styles.emptyState}>
                  <Ionicons name="person-outline" size={36} color="#CCFBF1" />
                  <Text style={styles.emptyText}>No contact info available</Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
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
            <Animated.View style={[styles.modalSheet, detailSheet.animatedStyle]} {...detailSheet.panHandlers}>
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.detailHeader}>
                <View>
                  <Text style={styles.detailName}>{tutorData?.name || "Tutor"}</Text>
                  <Text style={styles.detailSubject}>{formatDate(viewedBooking.start)}</Text>
                </View>
                <TouchableOpacity onPress={closeDetailModal}>
                  <Ionicons name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalDivider} />

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Time */}
                <View style={styles.detailRow}>
                  <View style={styles.detailIconWrap}>
                    <Ionicons name="time-outline" size={18} color="#0D9488" />
                  </View>
                  <View>
                    <Text style={styles.detailRowLabel}>Time</Text>
                    <Text style={styles.detailRowValue}>
                      {formatTime(viewedBooking.start)} – {formatTime(viewedBooking.end)}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                {viewedBooking.description ? (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconWrap}>
                      <Ionicons name="document-text-outline" size={18} color="#0D9488" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailRowLabel}>Description</Text>
                      <Text style={styles.detailRowValue}>{viewedBooking.description}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Paid */}
                <View style={styles.detailRow}>
                  <View style={styles.detailIconWrap}>
                    <Ionicons name="card-outline" size={18} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailRowLabel}>Payment</Text>
                    <Text style={[styles.detailRowValue, viewedBooking.paid ? styles.paidText : styles.unpaidText]}>
                      {viewedBooking.paid ? "Paid" : "Unpaid"}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, viewedBooking.paid && styles.checkboxChecked]}>
                    {viewedBooking.paid && <Ionicons name="checkmark" size={14} color="#fff" />}
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
                        onPress={handleUploadBookingFile}
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
                          <TouchableOpacity onPress={() => handleDeleteFile(file, setBookingFiles)} style={{ marginLeft: 10 }}>
                            <Ionicons name="trash-outline" size={15} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              </ScrollView>
            </Animated.View>
          ) : <View />}
        </View>
      </Modal>

      {/* Source picker modal */}
      <Modal
        visible={sourcePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSourcePickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSourcePickerVisible(false)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.sourcePickerSheet, sourceSheet.animatedStyle]} {...sourceSheet.panHandlers}>
          <View style={styles.handleBar} />
          <Text style={styles.sourcePickerTitle}>
            {pendingUploadType === "general" ? "Share File" : "Attach File"}
          </Text>

          <TouchableOpacity style={styles.sourceOption} onPress={() => handleSourceSelect("gallery")} activeOpacity={0.7}>
            <View style={[styles.sourceOptionIcon, { backgroundColor: "#F0FDFA" }]}>
              <Ionicons name="images-outline" size={22} color="#0D9488" />
            </View>
            <View style={styles.sourceOptionText}>
              <Text style={styles.sourceOptionLabel}>Photo Gallery</Text>
              <Text style={styles.sourceOptionSub}>Share an image from your library</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.sourceOptionDivider} />

          <TouchableOpacity style={styles.sourceOption} onPress={() => handleSourceSelect("files")} activeOpacity={0.7}>
            <View style={[styles.sourceOptionIcon, { backgroundColor: "#EEF2FF" }]}>
              <Ionicons name="document-outline" size={22} color="#6366F1" />
            </View>
            <View style={styles.sourceOptionText}>
              <Text style={styles.sourceOptionLabel}>Browse Files</Text>
              <Text style={styles.sourceOptionSub}>Share a document or any file</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sourceCancel} onPress={() => setSourcePickerVisible(false)} activeOpacity={0.7}>
            <Text style={styles.sourceCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
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
  heroActions: { flexDirection: "row", gap: 8 },
  heroActionBtn: {
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
  },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  heroName: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8 },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroPillText: { fontSize: 12, fontWeight: "600", color: "#0D9488", marginLeft: 4 },
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
  dayBookingDesc: { fontSize: 13, color: "#6B7280", marginTop: 4, fontStyle: "italic" },
  modalDivider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 16 },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  detailName: { fontSize: 20, fontWeight: "800", color: "#111827" },
  detailSubject: { fontSize: 13, color: "#6B7280", fontStyle: "italic", marginTop: 2 },
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
  showAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  showAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0D9488",
  },
  avatarTouchable: {
    position: "relative",
    marginBottom: 12,
  },
  avatarInfoBadge: {
    position: "absolute",
    bottom: 10,
    right: 0,
    backgroundColor: "#E6FAF8",
    borderRadius: 10,
    padding: 1,
  },
  profileModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  profileModalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#CCFBF1",
  },
  linkValue: {
    color: "#0D9488",
    textDecorationLine: "underline",
  },
  sourcePickerSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  sourcePickerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
  },
  sourceOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  sourceOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  sourceOptionText: {
    flex: 1,
  },
  sourceOptionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  sourceOptionSub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  sourceOptionDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  sourceCancel: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  sourceCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
});
