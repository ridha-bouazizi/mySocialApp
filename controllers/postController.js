const Post = require('../models/Post')
const { post } = require('../mySocialApp')

exports.viewCreateScreen = function (req, res) {
    res.render('create-post')
}

exports.create = function (req, res) {
    let post = new Post(req.body, req.session.user._id)
    post.create().then(function (newId) {
        req.flash("success", "New post successfully created.")
        req.session.save(() => res.redirect(`/post/${newId}`))
        console.log(newId)
    }).catch(function (errors) {
        errors.forEach(errors => req.flash("errors", error))
        req.session.save(() => res.redirect("/create-post"))
    })
}

exports.viewSingle = async function (req, res) {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        res.render('single-post-screen', { post: post })
    } catch {
        res.render('404')
    }
}

exports.viewEditScreen = async function (req, res) {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        if (post.isVisitorOwner) {
            res.render('edit-post', { post: post })
        } else {
            req.flash("errors", "External users don't have permission to edit other users' posts")
            req.session.save(() => res.redirect("/"))
        }
    } catch {
        res.render("404")
    }
}

exports.edit = function (req, res) {
    let post = new Post(req.body, req.visitorId, req.params.id)
    post.update().then((status) => {
        // if the post is successfully updated or the user did have permission and the req did not go through
        if (status == "success") {
            // post was updated in database
            req.flash("success", "Post succesfully updated")
            req.session.save(function () {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        } else {
            post.errors.forEach(function (error) {
                req.flash("errors", error)
            })
            req.session.save(function () {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
    }).catch(() => {
        //if a post with the requested id does not exist or the current visitor is not the owner
        req.flash("errors", "You are not authorized to perform that action !")
        req.session.save(function () {
            res.redirect("/")
        })
    })
}

exports.delete = function (req, res) {
    Post.delete(req.params.id, req.visitorId).then(() => {
        // if the post is successfully updated or the user did have permission and the req did not go through
        req.flash("success", "deleted!")
        req.session.save(() => { res.redirect(`/profile/${req.session.user.username}`) })
    }).catch(() => {
        //if a post with the requested id does not exist or the current visitor is not the owner
        req.flash("errors", "You are not authorized to perform that action !")
        req.session.save(() => res.redirect("/"))
    })
}

exports.search = function (req, res) {
    Post.search(req.body.searchTerm).then(posts => {
        res.json(posts)
    }).catch(() => {
        res.json([])
    })
}