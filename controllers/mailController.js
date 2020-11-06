const Mail = require('../models/Mail')

exports.sendConfirmationEmail = function (req, res) {
    console.log(req.session.user)

    let mail = new Mail(req, res, "confirmation")

    mail.sendEmail(mail)

    res.render('confirmation_code.ejs')
}