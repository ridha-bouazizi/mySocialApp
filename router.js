const express = require('express')
const router = express.Router()
const userController = require('./controllers/userController')
const postController = require('./controllers/postController')
const followController = require('./controllers/followController')
const mailController = require('./controllers/mailController')
const searchController = require('./controllers/searchController')

//user related routes
router.get('/', userController.home)
router.post('/register', userController.register, mailController.sendConfirmationEmail)
router.get('/confirm/:iv/:content', userController.tryConfirm)
router.post('/confirm/resend', mailController.sendConfirmationEmail)
router.post('/login', userController.login)
router.post('/logout', userController.logout)

//post related routes
router.get('/create-post', userController.checkForEmailConfirmation, userController.mustBeLoggedIn, postController.viewCreateScreen)
router.post('/create-post', userController.checkForEmailConfirmation, userController.mustBeLoggedIn, postController.create)
router.get('/post/:id', userController.checkForEmailConfirmation, postController.viewSingle)
router.get('/post/:id/edit', userController.checkForEmailConfirmation, userController.mustBeLoggedIn, postController.viewEditScreen)
router.post('/post/:id/edit', userController.checkForEmailConfirmation, userController.mustBeLoggedIn, postController.edit)
router.post('/post/:id/delete', userController.checkForEmailConfirmation, userController.mustBeLoggedIn, postController.delete)
router.post('/search', userController.checkForEmailConfirmation, searchController.search)

//profile related routes
router.get('/profile/:username', userController.checkForEmailConfirmation, userController.ifUserExists, userController.sharedProfileData, userController.profilePostsScreen)
router.get('/profile/:username/followers', userController.checkForEmailConfirmation, userController.ifUserExists, userController.sharedProfileData, userController.profileFollowersScreen)
router.get('/profile/:username/following', userController.checkForEmailConfirmation, userController.ifUserExists, userController.sharedProfileData, userController.profileFollowingScreen)

//follow related routes
router.post('/addFollow/:username', userController.checkForEmailConfirmation, userController.mustBeLoggedIn, followController.addFollow)
router.post('/removeFollow/:username', userController.checkForEmailConfirmation, userController.mustBeLoggedIn, followController.removeFollow)

module.exports = router