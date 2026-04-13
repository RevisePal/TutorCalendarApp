const { setGlobalOptions } = require("firebase-functions");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { defineSecret } = require("firebase-functions/params");

initializeApp();
setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

const ONESIGNAL_REST_API_KEY = defineSecret("ONESIGNAL_REST_API_KEY");
const ONESIGNAL_APP_ID = "d0351620-7a1c-4d27-ad70-06e26e40e1a2";

async function sendOneSignalNotification(apiKey, payload) {
  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OneSignal error ${response.status}: ${text}`);
  }
  return response.json();
}

async function cancelOneSignalNotification(apiKey, notifId) {
  await fetch(`https://onesignal.com/api/v1/notifications/${notifId}?app_id=${ONESIGNAL_APP_ID}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
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

    // --- Cancel notifications for removed or rescheduled bookings ---
    if (beforeData?.tuteeBookings) {
      for (const booking of beforeData.tuteeBookings) {
        if (booking.onesignalNotifId) {
          // Only cancel if the booking time itself was removed (not just a field update that stripped notifId)
          const stillExists = afterData?.tuteeBookings?.some(
            (b) => b.bookingDates?.seconds === booking.bookingDates?.seconds
          );
          if (!stillExists) {
            try {
              await cancelOneSignalNotification(apiKey, booking.onesignalNotifId);
            } catch (e) {
              // Notification may have already fired — safe to ignore
            }
          }
        }
      }
    }

    // --- Notify tutee when an existing booking is rescheduled ---
    if (beforeData?.tuteeBookings && afterData?.tuteeBookings && !isManualTutee) {
      const beforeTimestamps = new Set(beforeData.tuteeBookings.map((b) => b.bookingDates?.seconds));
      const afterTimestamps = new Set(afterData.tuteeBookings.map((b) => b.bookingDates?.seconds));

      const removedBookings = beforeData.tuteeBookings.filter((b) => !afterTimestamps.has(b.bookingDates?.seconds));
      const addedBookings = afterData.tuteeBookings.filter((b) => !beforeTimestamps.has(b.bookingDates?.seconds));

      // If bookings were both removed and added it's a reschedule, not a plain add/delete
      if (removedBookings.length > 0 && addedBookings.length > 0) {
        for (let i = 0; i < Math.min(removedBookings.length, addedBookings.length); i++) {
          const newStart = new Date(addedBookings[i].bookingDates.seconds * 1000);
          const newDateStr = newStart.toLocaleDateString("en-GB", {
            weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London",
          });
          const newTimeStr = formatTime(newStart);

          try {
            await sendOneSignalNotification(apiKey, {
              app_id: ONESIGNAL_APP_ID,
              include_aliases: { external_id: [docKey] },
              target_channel: "push",
              headings: { en: "Your lesson has been rescheduled" },
              contents: { en: `Moved to ${newDateStr} at ${newTimeStr}` },
              data: { screen: "Activity" },
            });
          } catch (e) {
            console.error("Failed to send reschedule notification:", e);
          }
        }
      }

      // If bookings were only added (no removals) it's a new booking
      if (addedBookings.length > 0 && removedBookings.length === 0) {
        for (const booking of addedBookings) {
          const start = new Date(booking.bookingDates.seconds * 1000);
          const dateStr = start.toLocaleDateString("en-GB", {
            weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London",
          });
          const timeStr = formatTime(start);

          try {
            await sendOneSignalNotification(apiKey, {
              app_id: ONESIGNAL_APP_ID,
              include_aliases: { external_id: [docKey] },
              target_channel: "push",
              headings: { en: "New lesson booked" },
              contents: { en: `${dateStr} at ${timeStr}` },
              data: { screen: "Activity" },
            });
          } catch (e) {
            console.error("Failed to send new booking notification:", e);
          }
        }
      }
    }

    if (!afterData?.tuteeBookings) {
      return;
    }

    const now = new Date();
    const updatedBookings = [...afterData.tuteeBookings];
    let didUpdate = false;

    for (let i = 0; i < updatedBookings.length; i++) {
      const booking = updatedBookings[i];

      // Restore notifId that was stripped by an app update (e.g. marking paid)
      const priorNotifId = beforeData?.tuteeBookings?.find(
        (b) => b.bookingDates?.seconds === booking.bookingDates?.seconds
      )?.onesignalNotifId;

      if (booking.onesignalNotifId || priorNotifId) {
        if (!booking.onesignalNotifId && priorNotifId) {
          updatedBookings[i] = { ...booking, onesignalNotifId: priorNotifId };
          didUpdate = true;
        }
        continue;
      }

      const bookingStart = new Date(booking.bookingDates.seconds * 1000);
      const reminderTime = new Date(bookingStart.getTime() - 30 * 60 * 1000);

      if (reminderTime <= now) continue;

      const tuteeName = afterData.tuteeName || "your student";
      const timeStr = formatTime(bookingStart);

      try {
        // Notify tutor
        const tutorResponse = await sendOneSignalNotification(apiKey, {
          app_id: ONESIGNAL_APP_ID,
          include_aliases: { external_id: [tutorId] },
          target_channel: "push",
          headings: { en: "Upcoming lesson in 30 minutes" },
          contents: { en: `${tuteeName} at ${timeStr}` },
          send_after: reminderTime.toISOString(),
          data: { screen: "Planner" },
        });

        // Notify linked tutee (manual tutees have no account)
        if (!isManualTutee) {
          await sendOneSignalNotification(apiKey, {
            app_id: ONESIGNAL_APP_ID,
            include_aliases: { external_id: [docKey] },
            target_channel: "push",
            headings: { en: "Upcoming lesson in 30 minutes" },
            contents: { en: `Your lesson at ${timeStr}` },
            send_after: reminderTime.toISOString(),
            data: { screen: "Activity" },
          });
        }

        updatedBookings[i] = { ...booking, onesignalNotifId: tutorResponse.id };
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
