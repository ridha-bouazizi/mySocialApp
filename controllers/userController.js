const User = require('../models/User')
const Post = require('../models/Post')
const Follow = require('../models/Follow')
const { encrypt, decrypt } = require('../models/crypto')

exports.sharedProfileData = async function (req, res, next) {
    let isFollowing = false
    let isProfileOwner = false
    if (req.session.user) {
        isProfileOwner = req.profileUser._id.equals(req.session.user._id)
        isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorId)
    }
    req.isFollowing = isFollowing
    req.isProfileOwner = isProfileOwner

    //retrieve post, follower and following counts
    let postCountPromise = Post.countPostsByAuthor(req.profileUser._id)
    let followerCountPromise = Follow.countFollowersById(req.profileUser._id)
    let followingCountPromise = Follow.countFollowingByAuthor(req.profileUser._id)
    let [postCount, followerCount, followingCount] = await Promise.all([postCountPromise, followerCountPromise, followingCountPromise])
    req.postCount = postCount
    req.followerCount = followerCount
    req.followingCount = followingCount
    next()
}

exports.mustBeLoggedIn = function (req, res, next) {
    if (req.session.user) {
        next()
    } else {
        req.flash("errors", "You must be logged in to perform that action")
        req.session.save(function () {
            res.redirect('/')
        })
    }
}

exports.login = function (req, res) {
    let user = new User(req.body)
    user.login().then(function (result) {
        req.session.user = { avatar: user.avatar, username: user.data.username, _id: user.data._id, email: user.data.email, confirmationRequired: user.data.confirmationRequired }
        if (user.data.confirmationRequired) {
            req.flash("errors", "Please consider confirming your email address.")
        }
        req.session.save(function () {
            res.redirect('/')
        })

    }).catch(function (err) {
        req.flash('errors', err)
        req.session.save(function () {
            res.redirect('/')
        })
    })
}

exports.logout = function (req, res) {
    req.session.destroy(function () {
        res.redirect('/')
    })
}

exports.register = function (req, res, next) {
    let user = new User(req.body)
    user.register().then(() => {
        req.session.user = { username: user.data.username, email: user.data.email, avatar: user.avatar, _id: user.data._id, confirmationRequired: true }
        req.session.save(/* function () {
            res.redirect('/sendEmailConfirmation')
        } */)
        next()
    }).catch((regErrors) => {
        regErrors.forEach(function (error) {
            req.flash('regErrors', error)
        })
        req.session.save(function () {
            res.redirect('/')
        })
    })
}

exports.home = async function (req, res) {
    if (req.session.user) {
        if (req.session.user.confirmationRequired) {
            req.flash("errors", "Please consider confirming your email address.")
            req.session.save(function () {
                res.render('confirmation_code', { email: req.session.user.email })
            })
        } else {
            // fetch feed of posts for current user
            let posts = await Post.getFeed(req.session.user._id)
            res.render('home-dashboard', { posts: posts })
        }
    } else {
        res.render('home-guest', { regErrors: req.flash('regErrors') })
    }
}

exports.checkForEmailConfirmation = function (req, res, next) {
    if (req.session.user.confirmationRequired) {
        req.flash("errors", "Please consider confirming your email address.")
        req.session.save(function () {
            res.render('confirmation_code', { email: req.session.user.email })
        })
    } else {
        next()
    }
}

// try to confirm mail address
exports.tryConfirm = function (req, res) {
    let hash = {
        iv: req.params.iv,
        content: req.params.content
    }
    let user = new User()
    user.confirmEmail(decrypt(hash)).then(() => {
        req.flash("success", "Congratulations, you have just confirmed your email.")
        res.redirect('/')
        console.log("validation successful")
    }
    ).catch(() => {
        req.flash("errors", "Sorry, we were unable to confirm your account.")
        res.redirect('/')
        console.log("validation successful")
    }
    )
}


exports.ifUserExists = function (req, res, next) {
    User.findByUsername(req.params.username).then(function (userDocument) {
        req.profileUser = userDocument
        next()
    }).catch(function () {
        res.render('404')
    })
}

exports.profilePostsScreen = function (req, res) {
    //ask our post model for posts by a certain id
    Post.findByAuthorId(req.profileUser._id).then(function (posts) {
        res.render('profile', {
            currentPage: "posts",
            posts: posts,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isProfileOwner: req.isProfileOwner,
            counts: { postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount }
        })
    }).catch(function (params) {
        res.render("404")
    })
}

exports.profileFollowersScreen = async function (req, res) {
    try {
        let followers = await Follow.getFollowersById(req.profileUser._id)
        res.render('profile-followers', {
            currentPage: "followers",
            followers: followers,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isProfileOwner: req.isProfileOwner,
            counts: { postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount }
        })
    } catch {
        res.render("404")
    }
}

exports.profileFollowingScreen = async function (req, res) {
    try {
        let followings = await Follow.getFollowedById(req.profileUser._id)
        res.render('profile-following', {
            currentPage: "following",
            followings: followings,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isProfileOwner: req.isProfileOwner,
            counts: { postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount }
        })
    } catch {
        res.render("404")
    }
}