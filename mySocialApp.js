const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const flash = require('connect-flash')
const markdown = require('marked')
const app = express()
const sanitizeHTML = require('sanitize-html')

let sessionOptions = session({
    secret: "JavaScript is soooooooooooo cooooool",
    store: new MongoStore({ client: require('./db') }),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true }
})

app.use(sessionOptions)
app.use(flash())

app.use(function (req, res, next) {
    //make our makdown available from within ejs templates
    res.locals.filterUserHTML = function (content) {
        return sanitizeHTML(markdown(content), { allowedTags: false, allowedAttributes: false })
    }

    //make all error and success flash messages available from all templates
    res.locals.errors = req.flash("errors")
    res.locals.success = req.flash("success")
    //make current user id available from current request
    if (req.session.user) {
        req.visitorId = req.session.user._id
    } else {
        req.visitorId = 0
    }

    // Making user session data available to view templates
    res.locals.user = req.session.user
    next()
})

const router = require('./router')

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

app.use(express.static('public'))
app.set('views', 'views')
app.set('view engine', 'ejs')

app.use('/', router)

const server = require('http').createServer(app)
const io = require('socket.io')(server)

io.use(function (socket, next) {
    sessionOptions(socket.request, socket.request.res, next)
})

io.on('connection', function (socket) {
    if (socket.request.session.user) {
        let user = socket.request.session.user

        socket.emit('welcome', { username: user.username, avatar: user.avatar })

        socket.on('chatMessageFromBrowser', function (data) {
            socket.broadcast.emit('chatMessageFromServer', { message: data.message, username: user.username, avatar: user.avatar })
        })
    }
})

module.exports = server