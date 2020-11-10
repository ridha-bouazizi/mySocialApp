const postsCollection = require("../db").db().collection("posts");
const usersCollection = require("../db").db().collection("users");
const ObjectID = require("mongodb").ObjectID;
const User = require("./User");
const Post = require("./Post");

let Search = function () {

}

Search.search = function (searchTerm) {
    return new Promise(async (resolve, reject) => {
        if (typeof searchTerm == "string") {
            let posts = await Post.reusablePostQuery([
                { $match: { $text: { $search: searchTerm } } },
                { $sort: { score: { $meta: "textScore" } } },
            ]);

            let usersQuery = { $text: { $search: searchTerm } }
            let users = await usersCollection.find(usersQuery).toArray()
            users = users.map(function (user) {
                user = {
                    avatar: new User(user, true).avatar,
                    username: user.username
                }
                return user
            })
            let results = { posts: posts, users: users }
            resolve(results);
        } else {
            reject();
        }
    });
}

module.exports = Search