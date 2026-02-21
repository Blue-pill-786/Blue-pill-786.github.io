const alarmTimeInput = document.getElementById("alarmTime");
const dailyModeInput = document.getElementById("dailyMode");
const setAlarmButton = document.getElementById("setAlarm");
const stopAlarmButton = document.getElementById("stopAlarm");
const snoozeAlarmButton = document.getElementById("snoozeAlarm");
const currentTimeElement = document.getElementById("current-time");
const currentDateElement = document.getElementById("current-date");
const alarmStatusElement = document.getElementById("alarm-status");
const countdownElement = document.getElementById("countdown");
const timezoneElement = document.getElementById("timezone");

const STORAGE_KEY = "alarm-clock-settings";
const SNOOZE_MINUTES = 5;

let alarmTimeoutId = null;
let nextAlarmDate = null;
let isDaily = false;
let isRinging = false;
let oscillator = null;
let audioContext = null;

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
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatDuration = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`;
};

const setStatus = (message, mode = "") => {
  alarmStatusElement.textContent = message;
  alarmStatusElement.classList.remove("active", "ringing");
  if (mode) {
    alarmStatusElement.classList.add(mode);
  }
};

const saveSettings = () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      alarmTime: alarmTimeInput.value,
      dailyMode: dailyModeInput.checked,
    })
  );
};

const loadSettings = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    alarmTimeInput.value = parsed.alarmTime || "";
    dailyModeInput.checked = Boolean(parsed.dailyMode);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
};

const renderClock = () => {
  const now = new Date();
  currentTimeElement.textContent = formatTime(now);
  currentDateElement.textContent = formatDate(now);

  if (nextAlarmDate) {
    countdownElement.textContent = formatDuration(nextAlarmDate - now);
  } else {
    countdownElement.textContent = "No active alarm";
  }
};

const stopSound = () => {
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
    oscillator = null;
  }
};

const startSound = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.05;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
};

const nextOccurrence = (hours, minutes) => {
  const now = new Date();
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0,
    0
  );

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
};

const scheduleAlarm = (alarmDate) => {
  clearTimeout(alarmTimeoutId);
  nextAlarmDate = alarmDate;
  isRinging = false;

  const delay = alarmDate.getTime() - Date.now();
  alarmTimeoutId = setTimeout(() => {
    isRinging = true;
    startSound();
    document.title = "⏰ Alarm Ringing";
    setStatus("Alarm is ringing. Stop or snooze it.", "ringing");
    snoozeAlarmButton.disabled = false;
  }, Math.max(0, delay));

  stopAlarmButton.disabled = false;
  setAlarmButton.disabled = true;
  snoozeAlarmButton.disabled = true;
  setStatus(`Alarm set for ${formatTime(alarmDate)} • ${formatDate(alarmDate)}`, "active");
};

const cancelAlarm = (message = "No alarm set.") => {
  clearTimeout(alarmTimeoutId);
  alarmTimeoutId = null;
  nextAlarmDate = null;
  isRinging = false;
  stopSound();

  if (!document.hidden) {
    document.title = "Alarm Clock";
  }

  stopAlarmButton.disabled = true;
  snoozeAlarmButton.disabled = true;
  setAlarmButton.disabled = false;
  setStatus(message);
};

setAlarmButton.addEventListener("click", () => {
  if (!alarmTimeInput.value) {
    alert("Please choose an alarm time first.");
    return;
  }

  const [hours, minutes] = alarmTimeInput.value.split(":").map(Number);
  isDaily = dailyModeInput.checked;
  saveSettings();
  scheduleAlarm(nextOccurrence(hours, minutes));
});

stopAlarmButton.addEventListener("click", () => {
  if (isRinging && isDaily && alarmTimeInput.value) {
    stopSound();
    const [hours, minutes] = alarmTimeInput.value.split(":").map(Number);
    scheduleAlarm(nextOccurrence(hours, minutes));
    setStatus("Daily alarm re-armed for the next occurrence.", "active");
    document.title = "Alarm Clock";
    return;
  }

  cancelAlarm("Alarm cancelled.");
});

snoozeAlarmButton.addEventListener("click", () => {
  if (!isRinging) {
    return;
  }

  stopSound();
  const snoozeDate = new Date(Date.now() + SNOOZE_MINUTES * 60 * 1000);
  scheduleAlarm(snoozeDate);
  setStatus(`Snoozed for ${SNOOZE_MINUTES} minutes.`, "active");
  document.title = "Alarm Clock";
});

document.addEventListener("visibilitychange", () => {
  if (!isRinging && !document.hidden) {
    document.title = "Alarm Clock";
  }
});

timezoneElement.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
loadSettings();
renderClock();
setInterval(renderClock, 1000);
