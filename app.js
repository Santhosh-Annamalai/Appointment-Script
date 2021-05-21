const dateObject = new Date();
const date = dateObject.toLocaleString("en-GB", { timeZone: "Asia/Kolkata" }).split(",")[0];
console.log(date, dateObject.toLocaleString());
let trialCounter = 0;
let errorCounter = 0;
let playerActive = false;
const playerQueue = new Map();
const superagent = require("superagent");
const player = require("play-sound")();
const { inspect } = require("util");
const { dosageProperty, vaccineName, fee, age, districtID } = require("./config.json");
console.log("Version 1.5", dosageProperty, vaccineName, fee, age, districtID);

async ionction playerFinal() {
  player.play("./Audio.mp3", (err) => {
    if (err) {
      console.log(`Could not play sound: ${inspect(err)}`);
    }
  });
}

async function playAlert() {
  const queue = playerQueue.get("playerChain") || Promise.resolve();
  const playAudio = queue.then(() => playerFinal());
  const tail = playAudio.catch(() => {});
  playerQueue.set("playerChain", tail);
  
  try {
    return await playAudio;
  }
  finally {
    if (playerQueue.get("playerChain") === tail) {
      playerQueue.delete("playerChain");
    }
  }
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
        availableCenters
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
    errorCounter = errorCounter + 1;
    console.log(`Error ${errorCounter}`, inspect(error));
    playAlert();
    
    if (errorCounter <= 8) {
      const finalRes = new Promise((resolve, reject) => {
        setTimeout(() => {
          getAppointmentDetails(date).then(res => resolve(res)).catch(err => reject(err));
        }, 4000); // https://stackoverflow.com/a/20999077/10901309
      });
      return await finalRes;
    }
  }
}

async function loopQuery() {
  try {
    const response = await getAppointmentDetails(date);
    if (response.availability === true) {
      response.findingTime = new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata" });
      console.log(`Slots are available. Kindly Proceed for Booking Appointment.\nfindingTime: ${response.findingTime}\n\n`, inspect(response.availableCenters, { depth: 4 }));
      playAlert();
      return "";
    }
    else {
      trialCounter = trialCounter + 1;
      console.log(`Trial ${trialCounter}`);
      const finalResponse = new Promise((resolve, reject) => {
        setTimeout(() => {
          loopQuery().then(res => resolve(res)).catch(err => reject(err));
        }, 4000);
      });
      return await finalResponse;
    }
  }
  catch (error) {
    console.log(inspect(error));
    playAlert();
    return error;
  }
}

module.exports = loopQuery();