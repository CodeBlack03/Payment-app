// const mailgun = require("mailgun-js");
// const config = require('config');

// const sendEmail = async (to, subject, text) => {
  
// const mg = mailgun({apiKey: config.get('mailgunApiKey'), domain: config.get('mailgunDomain')});
// const data = {
// 	from: "Mailgun Sandbox <postmaster@sandboxac85f32b5212495c9c1cb964f7f26aaa.mailgun.org>",
// 	to: to,
// 	subject:subject,
// 	text: text
// };
// mg.messages().send(data, function (error, body) {
//     console.log
// 	console.log(body);
// });

  
// };
const config= require('config')
const AWS = require('aws-sdk');
const { Message } = require('twilio/lib/twiml/MessagingResponse');

AWS.config.update({
    accessKeyId: config.get('awsAccessKeyId'),
    secretAccessKey: config.get('awsSecretAccessKey'),
    region: config.get('awsRegion')
})

const ses = new AWS.SES({apiVersion:'2010-12-01'});

const sendEmail = async (to, subject, text) => {
  console.log(to)
  if(!Array.isArray(to)){
    to = [to]
  }
    const params = {
        Destination:{
            ToAddresses:to
        },
        Message:{
            Body:{
                Text:{
                    Data:text
                }
            },
            Subject:{
                Data:subject
            }
        },
        Source: 'harsh03121997@gmail.com'
        
    }
    ses.sendEmail(params,(err,data)=>{
        if(err){
            console.error('Error sending mail',err)
        }
        else{
            console.log('Email sent', data.MessageId);
        }
    })

}

module.exports = sendEmail;
