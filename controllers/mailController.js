const Mail = require('../models/Mail')

exports.sendConfirmationEmail = function (req, res) {
    let mail = new Mail(req, res, "confirmation")

    if (req.session.trial) {
        req.session.trial++
    } else {
        req.session.trial = 1
    }
    if (req.session.trial <= 3) {
        mail.sendEmail(mail)
        req.flash("success", "The confirmation link was sent to your inbox, if you don't seem to find it, please consider checking your spam folder or click RESEND.")
        res.render('confirmation_code.ejs', { email: req.session.user.email })
    } else {
        req.session.user = undefined
        req.flash("errors", "Too many requests from the same user.")
        res.redirect('/')
    }
    //mail.sendEmail(mail)

    //res.render('confirmation_code.ejs', { email: req.session.user.email })
}