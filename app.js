const dateObject = new Date();
const date = dateObject.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }).split(",")[0];
console.log(date);
let trialCounter = 0;
const superagent = require("superagent");
const player = require('play-sound')();
const util = require("util");

async function getAppointmentDetails(date) {
  try {
    const response = await superagent.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=571&date=${date}`);
  
    const responseObject = response.body.centers;
    const filteredResponse = responseObject.filter((arrayElement) => {
        const possibleSessions = arrayElement.sessions.filter((sessionElement) => (sessionElement.min_age_limit < 45) && (sessionElement.vaccine === "COVAXIN") && (sessionElement.available_capacity > 0));
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
    console.log(util.inspect(error));
    getAppointmentDetails(date);
  }
}

async function loopQuery() {
  const responseBoolean = await getAppointmentDetails(date);
  if (responseBoolean[0] === true) {
    console.log(util.inspect(responseBoolean[1]));
    player.play('./Audio.mp3', (err) => {
      if (err) {
        console.log(`Could not play sound: ${err}`);
      }
    });
    return "Slots are available. Kindly Proceed for Booking."
  }
  else {
    trialCounter = trialCounter + 1;
    console.log(trialCounter);
    const finalResponse = new Promise((resolve, reject) => {
      setTimeout(() => {
        loopQuery().then(res => resolve(res)).catch(err => reject(err));
      }, 4000);
    });
    return finalResponse;
  }
}

module.exports = loopQuery();