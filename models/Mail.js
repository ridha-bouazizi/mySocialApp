const session = require('express-session')
const nodemailer = require('nodemailer')
const Mailgen = require('mailgen');
const dotenv = require('dotenv')
dotenv.config()

let Mail = function (req, res, operation) {

    // smtp configuration for the email service
    this.transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        }
    });

    // email header and footer using mailgen
    this.mailGenerator = new Mailgen({
        theme: 'default',
        product: {
            name: 'Ridha BOUAZIZI from mySocialApp',
            link: 'https://github.com/ridha-bouazizi'
            // Optional product logo
            // logo: 'https://mailgen.js/img/logo.png'
        }
    });

    this.recepUsername = req.session.user.username
    this.recepId = req.session.user._id
    this.recepAddress = req.session.user.email

    this.email = this.prepareEmail(this.recepUsername, this.recepId, operation)

    this.emailBody = this.mailGenerator.generate(this.email);

    this.emailText = this.mailGenerator.generatePlaintext(this.email);
}

Mail.prototype.prepareEmail = function (username, id, operation) {
    if (operation === "confirmation") {
        return {
            body: {
                name: username,
                intro: 'Welcome to mySocialApp! We\'re very excited to have you on board.',
                action: {
                    instructions: 'To get started with mySocialApp, you need to confirm your email address, please click here:',
                    button: {
                        color: '#22BC66', // Optional action button color
                        text: 'Confirm your account',
                        link: process.env.APP_PATH.concat('confirm/', id)
                    }
                },
                outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
            }
        }
    } else {
        return {
            body: {
                name: username,
                intro: 'Welcome to mySocialApp! We\'re very excited to have you on board.',
                action: {
                    instructions: 'Unfortunately we were not able to generate a token for you'
                },
                outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
            }
        }
    }

}

Mail.prototype.sendEmail = function (mail) {
    const message = {
        from: 'r08041994b@gmail.com',
        to: mail.recepAddress,
        subject: 'Please confirm your account.',
        html: mail.emailBody,
        text: mail.emailText
    };

    console.log(message)

    mail.transport.sendMail(message, function (err, info) {
        if (err) {
            console.log(err)
        } else {
            console.log(info);
        }
    });
}

module.exports = Mail