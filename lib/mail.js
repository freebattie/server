import mail from "nodemailer";
const nodemailer = mail;
export const sendDeviceAlarm = async (device, text, value) => {
  let transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: true, // true for 465, false for other ports
    tls: {
      // must provide server name, otherwise TLS certificate check will fail
      servername: process.env.MAIL_SERVER_NAME,
    },
    auth: {
      user: process.env.MAIL_USER_USERNAME, // generated ethereal user
      pass: process.env.MAIL_USER_PASSWORD, // generated ethereal password
    },
  });

  let info = await transporter.sendMail({
    from: '"user" <user@nerland.io>', // sender address
    to: "bjartenerland5@hotmail.com, bjartenerland5@hotmail.com", // list of receivers
    subject: "ALALRM ✔", // Subject line
    text: ` ALARM in device: ${device} 
            Alarm text: ${text} 
            Error: ${value}`, // plain text body
  });
  console.log("Message sent: %s", info.messageId);
};
export const sendLocationAlarm = async (location, type, name) => {
  let transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: true, // true for 465, false for other ports
    tls: {
      // must provide server name, otherwise TLS certificate check will fail
      servername: process.env.MAIL_SERVER_NAME,
    },
    auth: {
      user: process.env.MAIL_USER_USERNAME, // generated ethereal user
      pass: process.env.MAIL_USER_PASSWORD, // generated ethereal password
    },
  });

  let info = await transporter.sendMail({
    from: '"user" <user@nerland.io>', // sender address
    to: "bjartenerland5@hotmail.com, bjartenerland5@hotmail.com", // list of receivers
    subject: "ALALRM ✔", // Subject line
    text: ` ALARM at Location: ${location} 
            Type: ${type} 
           Status: ${name}`, // plain text body
  });
  console.log("Message sent: %s", info.messageId);
};
