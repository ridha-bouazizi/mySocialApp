const { ObjectID } = require('mongodb').ObjectID

const usersCollection = require('../db').db().collection("users")
const followsCollection = require('../db').db().collection("follows")
const User = require('./User')

let Follow = function (followedUsername, authorId) {
    this.followedUsername = followedUsername
    this.authorId = authorId
    this.errors = []
}

Follow.prototype.cleanUp = function () {
    console.log(typeof (this.followedUsername))
    if (typeof (this.followedUsername) != "string") { this.followedUsername = "" }
}

Follow.prototype.validate = async function (action) {
    // followed username must exist in database
    let followedAccount = await usersCollection.findOne({ username: this.followedUsername })
    if (followedAccount) {
        this.followedId = followedAccount._id
    } else {
        this.errors.push("Sorry, you cannot follow a non existent username.")
    }

    let doesFollowerExist = await followsCollection.findOne({ followedId: this.followedId, authorId: new ObjectID(this.authorId) })
    if (action == "create") {
        if (doesFollowerExist) {
            this.errors.push("You are already following this user.")
        }
    }
    if (action == "remove") {
        if (!doesFollowerExist) {
            this.errors.push("You are not following this user.")
        }
    }
    if (action == "create") {
        if (this.followedId == this.authorId) {
            this.errors.push("You cannot be following yourself.")
        }
    }
    if (action == "remove") {
        if (this.followedId == this.authorId) {
            this.errors.push("You cannot unfollow yourself.")
        }
    }
}

Follow.prototype.create = function () {
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        await this.validate("create")
        if (!this.errors.length) {
            await followsCollection.insertOne({ followedId: this.followedId, authorId: new ObjectID(this.authorId) })
            resolve()
        } else {
            reject(this.errors)
        }
    })
}

Follow.prototype.remove = function () {
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        await this.validate("delete")
        if (!this.errors.length) {
            await followsCollection.deleteOne({ followedId: this.followedId, authorId: new ObjectID(this.authorId) })
            resolve()
        } else {
            reject(this.errors)
        }
    })
}

Follow.isVisitorFollowing = async function (followedId, visitorId) {
    let followDoc = await followsCollection.findOne({ followedId: followedId, authorId: new ObjectID(visitorId) })
    if (followDoc) {
        return true
    } else {
        return false
    }
}

Follow.getFollowersById = function (id) {
    return new Promise(async (resolve, reject) => {
        try {
            let followers = await followsCollection.aggregate([
                { $match: { followedId: id } },
                { $lookup: { from: "users", localField: "authorId", foreignField: "_id", as: "userDoc" } },
                {
                    $project: {
                        username: { $arrayElemAt: ["$userDoc.username", 0] },
                        email: { $arrayElemAt: ["$userDoc.email", 0] }
                    }
                }
            ]).toArray()
            followers = followers.map(function (follower) {
                let user = new User(follower, true)
                return { username: follower.username, avatar: user.avatar }
            })
            resolve(followers)
        } catch {
            reject()
        }
    })
}

Follow.getFollowedById = function (id) {
    return new Promise(async (resolve, reject) => {
        try {
            let followings = await followsCollection.aggregate([
                { $match: { authorId: id } },
                { $lookup: { from: "users", localField: "followedId", foreignField: "_id", as: "userDoc" } },
                {
                    $project: {
                        username: { $arrayElemAt: ["$userDoc.username", 0] },
                        email: { $arrayElemAt: ["$userDoc.email", 0] }
                    }
                }
            ]).toArray()
            followings = followings.map(function (following) {
                let user = new User(following, true)
                return { username: following.username, avatar: user.avatar }
            })
            resolve(followings)
        } catch {
            reject()
        }
    })
}

module.exports = Follow