const postsCollection = require('../db').db().collection("posts")
const ObjectID = require('mongodb').ObjectID
const User = require('./User')
const sanitizeHTML = require('sanitize-html')

let Post = function (data, userId, requestedPostId) {
    this.data = data
    this.errors = []
    this.userId = userId
    this.requestedPostId = requestedPostId
}

Post.prototype.cleanUp = function () {
    if (typeof (this.data.title) != "string") { this.data.title = "" }

    if (typeof (this.data.body) != "string") {
        this.data.body = ""
    }

    //get rid of malicious properties

    this.data = {
        title: sanitizeHTML(this.data.title.trim(), { allowedTags: [], allowedAttributes: {} }),
        body: sanitizeHTML(this.data.body.trim(), { allowedTags: [], allowedAttributes: {} }),
        createdDate: new Date(),
        author: ObjectID(this.userId)
    }
}

Post.prototype.validate = function () {
    if (this.data.title == "") {
        this.errors.push("You must provide a title")
    }

    if (this.data.body == "") {
        this.errors.push("You must provide post content")
    }
}

Post.prototype.create = function () {
    return new Promise((resolve, reject) => {
        this.cleanUp()
        this.validate()
        if (!this.errors.length) {
            //save post to the database
            postsCollection.insertOne(this.data).then((info) => {
                resolve(info.ops[0]._id)
            }).catch(() => {
                this.errors.push("Please try again later")
                reject(this.errors)
            })
        } else {
            reject(this.errors)
        }
    })
}

Post.prototype.update = function () {
    return new Promise(async (resolve, reject) => {
        try {
            let post = await Post.findSingleById(this.requestedPostId, this.userId)
            if (post.isVisitorOwner) {
                let status = await this.performUpdate()
                resolve(status)
            } else {
                reject()
            }
        } catch {
            reject()
        }
    })
}

Post.prototype.performUpdate = function () {
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        this.validate()
        if (!this.errors.length) {
            await postsCollection.findOneAndUpdate({ _id: new ObjectID(this.requestedPostId) }, { $set: { title: this.data.title, body: this.data.body } })
            resolve("success")
        } else {
            resolve("failure")
        }
    })
}

Post.reusablePostQuery = function (uniqueOperations, visitorId) {
    return new Promise(async function (resolve, reject) {
        let aggOperations = uniqueOperations.concat([
            { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "authorDocument" } },
            {
                $project: {
                    title: 1,
                    body: 1,
                    createdDate: 1,
                    authorId: "$author",
                    author: { $arrayElemAt: ["$authorDocument", 0] }
                }
            }
        ])

        let posts = await postsCollection.aggregate(aggOperations).toArray()

        // clean up author property in each post object
        posts = posts.map(function (post) {
            post.isVisitorOwner = post.authorId.equals(visitorId)
            post.authorId = undefined

            post.author = {
                username: post.author.username,
                avatar: new User(post.author, true).avatar
            }
            return post
        })
        resolve(posts)
    })
}
//
Post.findSingleById = function (id, visitorId) {
    return new Promise(async function (resolve, reject) {
        if (typeof (id) != "string" || !ObjectID.isValid(id)) {
            reject()
            return
        }
        let posts = await Post.reusablePostQuery([
            { $match: { _id: new ObjectID(id) } }
        ], visitorId)

        if (posts.length) {
            console.log(posts[0])
            resolve(posts[0])
        } else {
            reject()
        }
    })
}

Post.findByAuthorId = function (authorId) {
    return Post.reusablePostQuery([
        { $match: { author: authorId } },
        { $sort: { createdDate: -1 } }
    ])
}

Post.delete = function (postId, currentUserId) {
    return new Promise(async (resolve, reject) => {
        try {
            let post = await Post.findSingleById(postId, currentUserId)
            if (post.isVisitorOwner) {
                await postsCollection.deleteOne({ _id: new ObjectID(postId) })
                resolve()
            } else {
                reject()
            }
        } catch {
            reject()
        }
    })
}

Post.search = function (searchTerm) {
    return new Promise(async (resolve, reject) => {
        if (typeof (searchTerm) == "string") {
            let posts = await Post.reusablePostQuery([
                { $match: { $text: { $search: searchTerm } } },
                { $sort: { score: { $meta: "textScore" } } }
            ])
            resolve(posts)
        } else {
            reject()
        }
    })
}
module.exports = Post