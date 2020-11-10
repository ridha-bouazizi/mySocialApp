const Post = require('../models/Post')
const User = require('../models/User')
const Search = require('../models/Search')

exports.search = function (req, res) {
    Search.search(req.body.searchTerm).then(results => {
        res.json(results)
    }).catch(() => {
        res.json([])
    })
}