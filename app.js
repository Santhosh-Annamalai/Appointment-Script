const dateObject = new Date();
const date = dateObject.toLocaleString("en-GB", { timeZone: "Asia/Kolkata" }).split(",")[0];
console.log(date, dateObject.toLocaleString());
let trialCounter = 0;
const superagent = require("superagent");
const player = require("play-sound")();
const { inspect } = require("util");
const { dosageProperty, vaccineName, fee, age, districtID } = require("./config.json");
console.log("Version 1.3", dosageProperty, vaccineName, fee, age, districtID);

function playAlert() {
  player.play("./Audio.mp3", (err) => {
    if (err) {
      console.log(`Could not play sound: ${inspect(err)}`);
    }
  });
}

async function getAppointmentDetails(date) {
  try {
    const availableCenters = [];
    const response = await superagent.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${districtID}&date=${date}`);
    
    response.body.centers.forEach((arrayElement) => {
      if ((fee === "Both") || (arrayElement.fee_type === fee)) {
        const possibleSessions = arrayElement.sessions.filter(({ min_age_limit, vaccine, available_capacity_dose1, available_capacity_dose2 }) => ((min_age_limit === age) && (vaccine === vaccineName) && ((dosageProperty === "dose2") ? (available_capacity_dose2 > 0) : (available_capacity_dose1 > 0))));
        
        if (possibleSessions.length > 0) {
          const availableCenter = arrayElement;
          availableCenter.availableSessions = possibleSessions;
          availableCenters.push(availableCenter);
        }
      }
    });
    
    if (availableCenters.length > 0) {
      const responseObject = {
        availability: true,
        availableCenters: filteredResponse
      };
      return responseObject;
    }
    else {
      const responseObject = {
        availability: false
      };
      return responseObject;
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
      }, 4000); // https://stackoverflow.com/a/20999077/10901309
    });
    return finalRes;
  }
}

async function loopQuery() {
  try {
    const response = await getAppointmentDetails(date);
    if (response.availability === true) {
      response.findingTime = new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata" });
      console.log("Slots are available. Kindly Proceed for Booking Appointment.\n\n", inspect(response.availableCenters, { depth: 4 }));
      playAlert();
      return "";
    }
    else {
      trialCounter = trialCounter + 1;
      // (trialCounter === 1) ? playAlert() : false;
      console.log(trialCounter);
      const finalResponse = new Promise((resolve, reject) => {
        setTimeout(() => {
          loopQuery().then(res => resolve(res)).catch(err => {
            console.log(inspect(err));
            playAlert();
            reject(err);
          });
        }, 4000);
      });
      return finalResponse;
    }
  }
  catch (error) {
    console.log(inspect(error));
    playAlert();
    return error;
  }
}

module.exports = loopQuery();