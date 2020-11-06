const apiRouter = require('express').Router()
const userController = require('./controllers/userController')
const postController = require('./controllers/postController')
const followController = require('./controllers/followController')
const mailController = require('./controllers/mailController')

apiRouter.post('/login', userController.apiLogin)

module.exports = apiRouter