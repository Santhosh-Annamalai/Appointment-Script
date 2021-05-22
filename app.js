// "use strict"

const dateObject = new Date();
const date = dateObject.toLocaleString("en-GB", { timeZone: "Asia/Kolkata" }).split(",")[0];
console.log(date, dateObject.toLocaleString());
let trialCounter = 0;
let errorCounter = 0;
const generalQueue = new Map();
const superagent = require("superagent");
const player = require("play-sound")();
const { inspect } = require("util");
const { dosageProperty, vaccineName, fee, age, districtID, cooldownTime } = require("./config.json");
console.log("Version 2.1.1", dosageProperty, vaccineName, fee, age, districtID, cooldownTime);

async function cooldown() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve("");
    }, cooldownTime);
  });
}

async function playerFinal() {
  return new Promise((resolve, reject) => {
    player.play("./Audio.mp3", (err) => {
      resolve("");
      /** 
       * Callback function is always executed even if there is no error, fundamentals of node.js / callback hell.
       * Always, a function / method either has a callback to be executed after its eventual completion or returns a promise.
       * When a function is defined inside an object, it is called a method.
       * It is quite literally called a callback function for that reason.
       * A function that executes after the eventual completion of the initial (child) function is called a callback (parent) function.
       * For resolving something, Empty string is used in this case.
       * ^^ Otherwise the entire script terminates prematurely, because of indefinite waiting to resolve something.
       * Processes get terminated when there is nothing more to execute in node.js!
       * typeof operator resolves even promises to check its type (not strict equality operator).
       * Just a few observations and verbose comments.
       */
      if (err) {
        reject(err);
        console.log(`Could not play sound: ${inspect(err)}`);
      }
    });
  });
}

async function request() {
  const response = superagent.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${districtID}&date=${date}`);
  await cooldown();
  return response;
}

async function serializer(nameOfProperty) {
  /**
   * Serializer Function, only works with asynchronous functions that return Promises.
   * Does not work with synchronous functions.
   * Player requests are serialized otherwise the same audio starts playing before one request could finish playing,
   * Thereby creating high levels of noise as the same file gets played simultaneously by two different requests at different intervals.
   */
  const queue = generalQueue.get(nameOfProperty) || Promise.resolve();
  const chain = queue.then(() => {
    switch (nameOfProperty) {
      case "playerChain": {
        return playerFinal();
      }
      case "endpoint": {
        return request();
      }
    }
  });
  /**
   * playAudio constant becomes the return value of playerFinal function.
   * playAudio is wrapped (by then, queue being child & playAudio being parent) in a single layer of promise, which is awaitable.
   * When a promise gets wrapped by another promise, it is not like there are two layers of promise,
   * There is only a single layer of promise which is awaitable.
   * Catch method has an empty function to make sure there is no unhandled exception error.
   * Empty function propagates the error (if there is any) along the queue / chain, so there is nothing to worry about.
   * I believe catch method returns an empty object literal instead of it being an empty function.
   * Errors / Exceptions are propagated anyway regardless of whether it is an empty object literal or a function.
   */
  const tail = chain.catch(() => {});
  generalQueue.set(nameOfProperty, tail);
    
  try {
    return await chain; // awaited to make sure errors are "thrown", also used for waiting purposes.
  }
  finally {
    if (generalQueue.get(nameOfProperty) === tail) {
      /**
       * I guess equality operator converts promises to verify when one is a promise and one is not a promise.
       * Seems like promises are indeed resolved by strict equality operator for verification.
       * Both sides turn out to be the return value of playerFinal function, being an empty string (When "finally" gets executed).
       */
      generalQueue.delete(nameOfProperty);
    }
  }
}

async function getAppointmentDetails(date) {
  try {
    const availableCenters = [];
    const response = await serializer("endpoint");
    
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
    serializer("playerChain");
    
    if (errorCounter <= 8) {
      const finalRes = new Promise((resolve, reject) => {
        process.nextTick(() => getAppointmentDetails(date).then(res => resolve(res)).catch(err => reject(err))); // https://stackoverflow.com/a/20999077/10901309
      });
      return finalRes;
      /**
       * Removed await because errors are gonna get caught in the next function anyway, when finalRes is resolved (redundant).
       */
    }
    else {
      throw error;
    }
  }
}

async function loopQuery() {
  try {
    const response = await getAppointmentDetails(date);
    if (response.availability === true) {
      response.findingTime = new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata" });
      console.log(`Slots are available. Kindly Proceed for Booking Appointment.\nfindingTime: ${response.findingTime}\n\n`, inspect(response.availableCenters, { depth: 4 }));
      serializer("playerChain");
      return "";
    }
    else {
      trialCounter = trialCounter + 1;
      console.log(`Trial ${trialCounter}`);
      const finalResponse = new Promise((resolve, reject) => process.nextTick(() => loopQuery().then(res => resolve(res)).catch(err => reject(err))));
      return await finalResponse;
    }
  }
  catch (error) {
    console.log(inspect(error));
    serializer("playerChain");
  }
}

module.exports = loopQuery();