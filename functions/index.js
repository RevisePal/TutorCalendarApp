const { setGlobalOptions } = require("firebase-functions");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { defineSecret } = require("firebase-functions/params");
const OneSignal = require("@onesignal/node-onesignal");

initializeApp();
setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

const ONESIGNAL_REST_API_KEY = defineSecret("ONESIGNAL_REST_API_KEY");
const ONESIGNAL_APP_ID = "d0351620-7a1c-4d27-ad70-06e26e40e1a2";

function getOneSignalClient(apiKey) {
  const config = OneSignal.createConfiguration({
    restApiKey: apiKey,
  });
  return new OneSignal.DefaultApi(config);
}

function formatTime(date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

exports.scheduleBookingReminder = onDocumentWritten(
  {
    document: "Tutor/{tutorId}/bookings/{docKey}",
    secrets: [ONESIGNAL_REST_API_KEY],
  },
  async (event) => {
    const db = getFirestore();
    const { tutorId, docKey } = event.params;
    const isManualTutee = docKey.startsWith("manual_");

    const afterData = event.data.after.exists ? event.data.after.data() : null;
    const beforeData = event.data.before.exists ? event.data.before.data() : null;

    const apiKey = ONESIGNAL_REST_API_KEY.value();
    const client = getOneSignalClient(apiKey);

    // --- Cancel notifications for removed or rescheduled bookings ---
    if (beforeData?.tuteeBookings) {
      for (const booking of beforeData.tuteeBookings) {
        if (booking.onesignalNotifId) {
          // Check if this booking still exists unchanged in the new data
          const stillExists = afterData?.tuteeBookings?.some(
            (b) =>
              b.bookingDates?.seconds === booking.bookingDates?.seconds &&
              b.onesignalNotifId === booking.onesignalNotifId
          );
          if (!stillExists) {
            try {
              await client.cancelNotification(ONESIGNAL_APP_ID, booking.onesignalNotifId);
            } catch (e) {
              // Notification may have already fired — safe to ignore
            }
          }
        }
      }
    }

    if (!afterData?.tuteeBookings) return;

    const now = new Date();
    const updatedBookings = [...afterData.tuteeBookings];
    let didUpdate = false;

    for (let i = 0; i < updatedBookings.length; i++) {
      const booking = updatedBookings[i];

      // Skip if already has a notification scheduled
      if (booking.onesignalNotifId) continue;

      const bookingStart = new Date(booking.bookingDates.seconds * 1000);
      const reminderTime = new Date(bookingStart.getTime() - 30 * 60 * 1000);

      // Skip if reminder time is in the past
      if (reminderTime <= now) continue;

      const tuteeName = afterData.tuteeName || "your student";
      const timeStr = formatTime(bookingStart);

      // Build list of External User IDs to notify
      const targetIds = [tutorId];
      if (!isManualTutee) targetIds.push(docKey); // docKey is tuteeId for linked tutees

      const notification = new OneSignal.Notification();
      notification.app_id = ONESIGNAL_APP_ID;
      notification.include_aliases = { external_id: targetIds };
      notification.target_channel = "push";
      notification.headings = { en: "Upcoming lesson in 30 minutes" };
      notification.contents = { en: `${tuteeName} at ${timeStr}` };
      notification.send_after = reminderTime.toISOString();
      notification.data = { screen: "Planner" };

      try {
        const response = await client.createNotification(notification);
        updatedBookings[i] = { ...booking, onesignalNotifId: response.id };
        didUpdate = true;
      } catch (e) {
        console.error("Failed to schedule OneSignal notification:", e);
      }
    }

    // Write notification IDs back to Firestore so we can cancel them later if needed
    if (didUpdate) {
      await db
        .doc(`Tutor/${tutorId}/bookings/${docKey}`)
        .update({ tuteeBookings: updatedBookings });
    }
  }
);
