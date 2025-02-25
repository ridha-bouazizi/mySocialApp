const bcrypt = require('bcryptjs')
const usersCollection = require('../db').db().collection("users")
const validator = require("validator");
const md5 = require('md5')
const ObjectID = require('mongodb').ObjectID

let User = function (data, getAvatar) {
    this.data = data;
    this.errors = [];
    if (getAvatar == undefined) {
        getAvatar = false
    }
    if (getAvatar) {
        this.getAvatar()
    }
};

User.prototype.cleanUp = function () {
    if (typeof (this.data.username) != "string") {
        this.data.username = "";
    }
    if (typeof (this.data.email) != "string") {
        this.data.email = "";
    }
    if (typeof (this.data.password) != "string") {
        this.data.password = "";
    }

    // get rid of any irregular properties
    this.data = {
        username: this.data.username.trim().toLowerCase(),
        email: this.data.email.trim().toLowerCase(),
        password: this.data.password,
        passwordConfirmation: this.data.passwordConfirmation
    }
};

User.prototype.validate = function () {
    return new Promise(async (resolve, reject) => {
        if (this.data.username == "") {
            this.errors.push("You must provide a username.");
        }
        if (this.data.username != "" && !validator.isAlphanumeric(this.data.username)) {
            this.errors.push("Username must be alphanumeric.");
        }
        if (!validator.isEmail(this.data.email)) {
            this.errors.push("You must provide a valid email.");
        }
        if (this.data.password == "") {
            this.errors.push("You must provide a password.");
        }
        if (this.data.password.length > 0 && this.data.password.length < 12) {
            this.errors.push("Password must be at least 12 caracters");
        }
        if (this.data.password.length > 50) {
            this.errors.push("Password can't exceed 50 caracters");
        }
        if (this.data.password !== this.data.passwordConfirmation) {
            this.errors.push("invalid password confirmation")
        }
        if (this.data.username.length > 0 && this.data.username.length < 3) {
            this.errors.push("Username must be at least 3 caracters");
        }
        if (this.data.username.length > 30) {
            this.errors.push("Password can't exceed 30 caracters");
        }

        //OnlyIf username is valid then check to see if it's already taken
        if (this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
            let usernameExists = await usersCollection.findOne({ username: this.data.username })
            if (usernameExists) {
                this.errors.push("That username is already taken.")
            }
        }

        //OnlyIf email is valid then check to see if it's already taken
        if (validator.isEmail(this.data.email)) {
            let emailExists = await usersCollection.findOne({ email: this.data.email })
            if (emailExists) {
                this.errors.push("That email address is already being used.")
            }
        }
        resolve()
    })
}

User.prototype.login = function () {
    return new Promise((resolve, reject) => {
        this.cleanUp()
        usersCollection.findOne({ username: this.data.username }).then((attemptedUser) => {
            if (attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
                this.data = attemptedUser
                this.getAvatar()
                resolve("congrats")
            } else {
                reject("Wrong password and/or username")
            }
        }).catch(function () {
            reject("please try again later")
        })
    })
}

User.prototype.register = function () {
    return new Promise(async (resolve, reject) => {
        // step 1 validate user data
        this.cleanUp();
        await this.validate();
        // step 2 only if there are no validation errors,
        // save the user data into a database
        if (!this.errors.length) {
            //hash user password
            let salt = bcrypt.genSaltSync(10)
            this.data.password = bcrypt.hashSync(this.data.password, salt)
            //store the data
            this.data.confirmationRequired = true
            this.data.dateAdded = new Date()
            this.data = {
                username: this.data.username,
                email: this.data.email,
                password: this.data.password,
                dateAdded: this.data.dateAdded,
                confirmationRequired: this.data.confirmationRequired
            }
            await usersCollection.insertOne(this.data)
            this.getAvatar()
            resolve()
        } else {
            reject(this.errors)
        }
    })
}

User.prototype.getAvatar = function () {
    this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

User.findByUsername = function (username) {
    return new Promise(function (resolve, reject) {
        if (typeof (username) != "string") {
            reject()
            return
        }
        usersCollection.findOne({ username: username }).then(function (userDoc) {
            if (userDoc) {
                userDoc = new User(userDoc, true)
                userDoc = {
                    _id: userDoc.data._id,
                    username: userDoc.data.username,
                    avatar: userDoc.avatar
                }
                resolve(userDoc)
            } else {
                reject()
            }
        }).catch(function () {
            reject()
        })
    })
}

User.prototype.confirmEmail = function (id) {
    return new Promise(async (resolve, reject) => {
        try {
            await usersCollection.findOneAndUpdate({ _id: new ObjectID(id) }, { $set: { confirmationRequired: false } })
            resolve("success")
        } catch {
            reject("failure")
        }
    })
}

module.exports = User;
