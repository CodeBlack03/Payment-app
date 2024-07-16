
// // utils/sendSMS.js
// const twilio = require('twilio');
// const config = require('config');

// const accountSid = config.get('twilioAccountSid');
// const authToken = config.get('twilioAuthToken');
// const twilioPhoneNumber = config.get('twilioPhoneNumber');

// const client = new twilio(accountSid, authToken);

// const sendSMS = async (message, to) => {
//   try {
//     await client.messages.create({
//       body: message,
//       from: twilioPhoneNumber,
//       to
//     });
//     console.log('SMS sent successfully');
//   } catch (error) {
//     console.error('Error sending SMS:', error.message);
//   }
// };

// module.exports = sendSMS;
