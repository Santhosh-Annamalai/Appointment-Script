const dateObject = new Date();
const date = dateObject.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }).split(",")[0];
console.log(date, dateObject.toLocaleString());
let trialCounter = 0;
const superagent = require("superagent");
const player = require('play-sound')();
const { inspect } = require("util");

function playAlert() {
  player.play('./Audio.mp3', (err) => {
    if (err) {
      console.log(`Could not play sound: ${err}`);
    }
  });
}

async function getAppointmentDetails(date) {
  try {
    const response = await superagent.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=571&date=${date}`);
  
    const responseObject = response.body.centers;
    const filteredResponse = responseObject.filter((arrayElement) => {
        const possibleSessions = arrayElement.sessions.filter((sessionElement) => ((sessionElement.min_age_limit < 45) && (sessionElement.vaccine === "COVAXIN") && (sessionElement.available_capacity > 0)));
        if (possibleSessions.length > 0) {
          return true;
        }
        else {
          return false;
        }
    });
    if (filteredResponse.length > 0) {
      return [true, filteredResponse];
    }
    else {
      return false;
    }
  }
  catch (error) {
    console.log(inspect(error));
    playAlert();
    const finalRes = new Promise((resolve, reject) => {
        setTimeout(() => {
        getAppointmentDetails(date).then(res => resolve(res)).catch(err => {
            console.log(inspect(err));
            playAlert();
            reject(err);
        });
      }, 0); // https://stackoverflow.com/a/20999077/10901309
    });
    return finalRes;
  }
}

async function loopQuery() {
  try {
    const responseBoolean = await getAppointmentDetails(date);
    if (responseBoolean[0] === true) {
      console.log(inspect(responseBoolean[1]));
      playAlert();
      return "Slots are available. Kindly Proceed for Booking Appointment.";
    }
    else {
      trialCounter = trialCounter + 1;
      // (trialCounter === 1) ? playAlert() : false;
      console.log(trialCounter);
      const finalResponse = new Promise((resolve, reject) => {
        setTimeout(() => {
          loopQuery().then(res => resolve(res)).catch(err => {
            playAlert();
            console.log(inspect(err));
            reject(err);
          });
        }, 4000);
      });
      return finalResponse;
    }
  }
  catch (error) {
    playAlert();
    console.log(inspect(error));
    return error;
  }
}

module.exports = loopQuery();
