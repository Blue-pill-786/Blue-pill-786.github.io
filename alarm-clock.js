const alarmTimeInput = document.getElementById("alarmTime");
const setAlarmButton = document.getElementById("setAlarm");
const snoozeAlarmButton = document.getElementById("snoozeAlarm");
const stopAlarmButton = document.getElementById("stopAlarm");
const currentTimeElement = document.getElementById("current-time");
const currentDateElement = document.getElementById("current-date");
const timezoneElement = document.getElementById("timezone");
const countdownElement = document.getElementById("countdown");
const alarmStatusElement = document.getElementById("alarm-status");

let alarmTimeoutId = null;
let ringIntervalId = null;
let nextAlarm = null;
let audioCtx = null;

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

const setStatus = (message, mode = "") => {
  alarmStatusElement.textContent = message;
  alarmStatusElement.classList.toggle("active", mode === "active");
  alarmStatusElement.classList.toggle("ringing", mode === "ringing");
};

const renderClock = () => {
  const now = new Date();
  currentTimeElement.textContent = formatTime(now);
  currentDateElement.textContent = formatDate(now);
  timezoneElement.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (nextAlarm) {
    const remaining = nextAlarm.getTime() - now.getTime();
    countdownElement.textContent = formatCountdown(remaining);
  } else {
    countdownElement.textContent = "--";
  }
};

const beepPattern = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    audioCtx = new AudioContextClass();
  }

  const duration = 0.18;
  const now = audioCtx.currentTime;

  [0, 0.24, 0.48].forEach((offset) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gainNode.gain.setValueAtTime(0.0001, now + offset);
    gainNode.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + duration);
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
};

const beginRinging = () => {
  setStatus("Alarm ringing now. Snooze or stop.", "ringing");
  snoozeAlarmButton.disabled = false;
  stopAlarmButton.disabled = false;
  setAlarmButton.disabled = true;

  const ring = () => {
    beepPattern();
    document.title = document.title === "⏰ Alarm ringing" ? "Alarm Clock Pro" : "⏰ Alarm ringing";
  };

  ring();
  ringIntervalId = setInterval(ring, 1200);
};

const scheduleAlarmAt = (targetDate) => {
  stopAllTimers();
  nextAlarm = targetDate;

  const msUntilAlarm = Math.max(0, targetDate.getTime() - Date.now());
  alarmTimeoutId = setTimeout(beginRinging, msUntilAlarm);

  setAlarmButton.disabled = true;
  snoozeAlarmButton.disabled = true;
  stopAlarmButton.disabled = false;
  setStatus(`Alarm set for ${formatTime(targetDate)} on ${formatDate(targetDate)}.`, "active");
  renderClock();
};

setAlarmButton.addEventListener("click", () => {
  const alarmTime = alarmTimeInput.value;
  if (!alarmTime) {
    alert("Please choose an alarm time first.");
    return;
  }

  const now = new Date();
  const [hours, minutes] = alarmTime.split(":").map(Number);
  const targetDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0,
    0
  );

  if (targetDate <= now) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  scheduleAlarmAt(targetDate);
});

snoozeAlarmButton.addEventListener("click", () => {
  const snoozeDate = new Date(Date.now() + 5 * 60 * 1000);
  scheduleAlarmAt(snoozeDate);
});

stopAlarmButton.addEventListener("click", stopAlarm);

renderClock();
setInterval(renderClock, 1000);
