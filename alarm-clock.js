// Get references to the HTML elements we need to interact with
const alarmTimeInput = document.getElementById('alarmTime');
const setAlarmButton = document.getElementById('setAlarm');
const stopAlarmButton = document.getElementById('stopAlarm');

let alarmTimeoutId; // Keep track of the setTimeout ID
//get time string
const getTimeString = ({ hours, minutes, seconds, zone }) => {
    if (minutes / 10 < 1) {
      minutes = "0" + minutes;
    }
    if (seconds / 10 < 1) {
      seconds = "0" + seconds;
    }
    return `${hours}:${minutes}:${seconds} ${zone}`;
  };




  const renderTime = () => {
    var currentTime = document.getElementById("current-time");
   
  const currentDate = new Date();
  var hours = currentDate.getHours();
  var minutes = currentDate.getMinutes();
  var seconds = currentDate.getSeconds();
  var zone = hours >= 12 ? "PM" : "AM";
  if (hours > 12) {
    hours = hours % 12;
  }
  const timeString = getTimeString({ hours, minutes, seconds, zone });
  currentTime.innerHTML = timeString;
  

};




// Update time every second
setInterval(renderTime, 1000);

// Add a click event listener to the "Set Alarm" button
setAlarmButton.addEventListener('click', function() {
  const alarmTime = alarmTimeInput.value;

  // Check if the user has entered a valid alarm time
  if (alarmTime === '') {
    alert('Please enter a valid alarm time!');
    return;
  }

  // Disable the "Set Alarm" button and enable the "Stop Alarm" button
  setAlarmButton.disabled = true;
  stopAlarmButton.disabled = false;

  // Calculate the number of milliseconds until the alarm should go off
  const now = new Date();

//   const time = new time();
  const [hours, minutes] = alarmTime.split(':');
  const alarmTimeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  let timeUntilAlarm = alarmTimeDate - now;

  // If the alarm time is already in the past, add 1 day to the timeUntilAlarm value to schedule the alarm for tomorrow
  if (timeUntilAlarm < 0) {
    timeUntilAlarm += 24 * 60 * 60 * 1000;
  }

  // Set a timeout to trigger the alarm
  alarmTimeoutId = setTimeout(function() {
    alert('Wake up!');
    setAlarmButton.disabled = false;
    stopAlarmButton.disabled = true;
  }, timeUntilAlarm);
});

// Add a click event listener to the "Stop Alarm" button
stopAlarmButton.addEventListener('click', function() {
  // Stop the currently scheduled timeout
  clearTimeout(alarmTimeoutId);

  // Disable the "Stop Alarm" button and enable the "Set Alarm" button
  stopAlarmButton.disabled = true;
  setAlarmButton.disabled = false;
});

//javascript for timetoalarm
var time = new Date();
var hours = time.getHours();
var minutes = time.getMinutes();



