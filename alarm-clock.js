const alarmTimeInput = document.getElementById("alarmTime");
const citySelect = document.getElementById("citySelect");
const alarmTypeSelect = document.getElementById("alarmType");
const setAlarmButton = document.getElementById("setAlarm");
const snoozeAlarmButton = document.getElementById("snoozeAlarm");
const stopAlarmButton = document.getElementById("stopAlarm");
const currentTimeElement = document.getElementById("current-time");
const currentDateElement = document.getElementById("current-date");
const timezoneElement = document.getElementById("timezone");
const countdownElement = document.getElementById("countdown");
const todaySehriElement = document.getElementById("today-sehri");
const sehriRemainingElement = document.getElementById("sehri-remaining");
const todayIftarElement = document.getElementById("today-iftar");
const iftarRemainingElement = document.getElementById("iftar-remaining");
const cityNoteElement = document.getElementById("city-note");
const alarmStatusElement = document.getElementById("alarm-status");
const locationStatusElement = document.getElementById("location-status");

const cityPrayerTimes = {
  delhi: {
    label: "Delhi / NCR",
    sehri: ["05:12", "05:05", "04:46", "04:17", "03:50", "03:42", "03:57", "04:22", "04:43", "05:03", "05:28", "05:48"],
    iftar: ["17:58", "18:18", "18:37", "18:54", "19:07", "19:21", "19:26", "19:12", "18:41", "18:08", "17:42", "17:34"],
  },
  mumbai: {
    label: "Mumbai",
    sehri: ["05:42", "05:34", "05:17", "04:58", "04:42", "04:39", "04:48", "05:03", "05:17", "05:30", "05:46", "06:01"],
    iftar: ["18:18", "18:36", "18:48", "18:54", "19:01", "19:12", "19:15", "19:03", "18:37", "18:09", "17:51", "17:55"],
  },
  kolkata: {
    label: "Kolkata",
    sehri: ["04:59", "04:49", "04:28", "04:00", "03:35", "03:31", "03:45", "04:05", "04:24", "04:43", "05:04", "05:22"],
    iftar: ["17:08", "17:27", "17:43", "17:56", "18:10", "18:23", "18:26", "18:11", "17:44", "17:16", "16:54", "16:52"],
  },
  chennai: {
    label: "Chennai",
    sehri: ["05:22", "05:14", "05:00", "04:44", "04:34", "04:35", "04:43", "04:52", "04:56", "05:02", "05:10", "05:20"],
    iftar: ["18:03", "18:17", "18:24", "18:27", "18:31", "18:39", "18:42", "18:35", "18:16", "17:53", "17:43", "17:47"],
  },
  hyderabad: {
    label: "Hyderabad",
    sehri: ["05:30", "05:21", "05:04", "04:43", "04:27", "04:25", "04:35", "04:50", "05:01", "05:14", "05:28", "05:42"],
    iftar: ["17:58", "18:14", "18:25", "18:32", "18:40", "18:50", "18:53", "18:43", "18:20", "17:54", "17:41", "17:42"],
  },
  srinagar: {
    label: "Srinagar",
    sehri: ["05:45", "05:33", "05:09", "04:29", "03:49", "03:21", "03:24", "03:56", "04:23", "04:50", "05:20", "05:42"],
    iftar: ["17:41", "18:02", "18:25", "18:50", "19:14", "19:34", "19:30", "19:03", "18:26", "17:45", "17:21", "17:17"],
  },
};

let alarmTimeoutId = null;
let ringIntervalId = null;
let nextAlarm = null;
let audioCtx = null;
let currentLocation = null;

const twoDigits = (value) => String(value).padStart(2, "0");

const formatTime = (date) => {
  let hours = date.getHours();
  const minutes = twoDigits(date.getMinutes());
  const seconds = twoDigits(date.getSeconds());
  const zone = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes}:${seconds} ${zone}`;
};

const formatDate = (date) =>
  date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`;
};

const parseTodayTime = (timeValue) => {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
};

const getRemainingLabel = (targetDate) => {
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) {
    return "Time passed for today";
  }
  return `${formatCountdown(diff)} remaining`;
};

const setStatus = (message, mode = "") => {
  alarmStatusElement.textContent = message;
  alarmStatusElement.classList.toggle("active", mode === "active");
  alarmStatusElement.classList.toggle("ringing", mode === "ringing");
};

const updateTodayPrayerInfo = () => {
  const month = new Date().getMonth();
  const cityData = cityPrayerTimes[citySelect.value];
  const sehriTime = cityData.sehri[month];
  const iftarTime = cityData.iftar[month];

  todaySehriElement.textContent = sehriTime;
  todayIftarElement.textContent = iftarTime;

  sehriRemainingElement.textContent = getRemainingLabel(parseTodayTime(sehriTime));
  iftarRemainingElement.textContent = getRemainingLabel(parseTodayTime(iftarTime));
};

const renderClock = () => {
  const now = new Date();
  currentTimeElement.textContent = formatTime(now);
  currentDateElement.textContent = formatDate(now);
  timezoneElement.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (nextAlarm) {
    countdownElement.textContent = formatCountdown(nextAlarm.getTime() - now.getTime());
  } else {
    countdownElement.textContent = "--";
  }

  updateTodayPrayerInfo();
};


const locationStorageKey = "alarmClockLocationSession";

const saveLocationSession = (payload) => {
  localStorage.setItem(locationStorageKey, JSON.stringify(payload));
};

const loadLocationSession = () => {
  try {
    const storedValue = localStorage.getItem(locationStorageKey);
    return storedValue ? JSON.parse(storedValue) : null;
  } catch (_error) {
    return null;
  }
};

const renderLocationStatus = (payload) => {
  if (!payload) {
    locationStatusElement.textContent = "Location access not enabled.";
    return;
  }

  locationStatusElement.textContent = `Device location: ${payload.latitude.toFixed(4)}, ${payload.longitude.toFixed(4)} (saved ${new Date(payload.savedAt).toLocaleTimeString()}).`;
};

const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    return "unsupported";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  return Notification.requestPermission();
};

const sendAlarmNotification = () => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const locationSnippet = currentLocation
    ? `\nLocation: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
    : "";

  new Notification("Alarm Clock Pro", {
    body: `Alarm is ringing on this device.${locationSnippet}`,
    tag: "alarm-clock-pro-ring",
    renotify: true,
  });
};

const triggerDeviceAlert = () => {
  if ("vibrate" in navigator) {
    navigator.vibrate([280, 120, 280, 120, 280]);
  }
};

const requestLocationAndPersist = () => {
  const savedLocation = loadLocationSession();
  if (savedLocation) {
    currentLocation = savedLocation;
    renderLocationStatus(savedLocation);
  }

  if (!("geolocation" in navigator)) {
    locationStatusElement.textContent = "Geolocation is not supported in this browser.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const payload = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        savedAt: Date.now(),
      };

      currentLocation = payload;
      saveLocationSession(payload);
      renderLocationStatus(payload);
    },
    () => {
      if (!savedLocation) {
        locationStatusElement.textContent = "Location permission denied. Please enable it from browser settings.";
      }
    },
    { enableHighAccuracy: true, maximumAge: 300000, timeout: 10000 }
  );
};

const beepPattern = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    audioCtx = new AudioContextClass();
  }

  const now = audioCtx.currentTime;
  [0, 0.24, 0.48].forEach((offset) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 850;
    gainNode.gain.setValueAtTime(0.0001, now + offset);
    gainNode.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.18);
  });
};

const stopAllTimers = () => {
  clearTimeout(alarmTimeoutId);
  clearInterval(ringIntervalId);
  alarmTimeoutId = null;
  ringIntervalId = null;
};

const stopAlarm = () => {
  stopAllTimers();
  nextAlarm = null;
  setAlarmButton.disabled = false;
  snoozeAlarmButton.disabled = true;
  stopAlarmButton.disabled = true;
  document.title = "Alarm Clock Pro";
  setStatus("No alarm set.");
  renderClock();
};

const beginRinging = () => {
  setStatus("Alarm ringing now. Snooze or stop.", "ringing");
  sendAlarmNotification();
  triggerDeviceAlert();
  snoozeAlarmButton.disabled = false;
  stopAlarmButton.disabled = false;

  const ring = () => {
    beepPattern();
    document.title = document.title === "⏰ Alarm ringing" ? "Alarm Clock Pro" : "⏰ Alarm ringing";
  };

  ring();
  ringIntervalId = setInterval(ring, 1200);
};

const scheduleAlarmAt = (targetDate, label) => {
  stopAllTimers();
  nextAlarm = targetDate;

  alarmTimeoutId = setTimeout(beginRinging, Math.max(0, targetDate.getTime() - Date.now()));
  setAlarmButton.disabled = true;
  snoozeAlarmButton.disabled = true;
  stopAlarmButton.disabled = false;
  setStatus(`${label} alarm set for ${formatTime(targetDate)} on ${formatDate(targetDate)}.`, "active");
  renderClock();
};

const updatePresetTime = () => {
  const type = alarmTypeSelect.value;
  const cityKey = citySelect.value;
  const month = new Date().getMonth();

  if (type === "custom") {
    alarmTimeInput.disabled = false;
    cityNoteElement.textContent = "Custom mode: choose any time manually.";
    return;
  }

  const cityData = cityPrayerTimes[cityKey];
  const timeValue = cityData[type][month];
  alarmTimeInput.value = timeValue;
  alarmTimeInput.disabled = true;
  cityNoteElement.textContent = `Using approximate ${type} time for ${cityData.label} in ${new Date().toLocaleString(undefined, { month: "long" })}.`;
};

setAlarmButton.addEventListener("click", () => {
  const alarmTime = alarmTimeInput.value;
  if (!alarmTime) {
    alert("Please choose an alarm time first.");
    return;
  }

  const now = new Date();
  const [hours, minutes] = alarmTime.split(":").map(Number);
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  if (targetDate <= now) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const mode = alarmTypeSelect.value;
  const cityLabel = cityPrayerTimes[citySelect.value].label;
  const alarmLabel = mode === "custom" ? "Custom" : `${mode === "sehri" ? "Sehri" : "Iftar"} (${cityLabel})`;
  scheduleAlarmAt(targetDate, alarmLabel);
});

snoozeAlarmButton.addEventListener("click", () => {
  scheduleAlarmAt(new Date(Date.now() + 5 * 60 * 1000), "Snooze");
});

stopAlarmButton.addEventListener("click", stopAlarm);
citySelect.addEventListener("change", () => {
  updatePresetTime();
  updateTodayPrayerInfo();
});
alarmTypeSelect.addEventListener("change", updatePresetTime);

Object.entries(cityPrayerTimes).forEach(([key, data]) => {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = data.label;
  citySelect.appendChild(option);
});

citySelect.value = "delhi";
requestLocationAndPersist();
requestNotificationPermission();
updatePresetTime();
updateTodayPrayerInfo();
renderClock();
setInterval(renderClock, 1000);
