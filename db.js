const dotenv = require('dotenv')
dotenv.config()
const mongodb = require('mongodb')

mongodb.connect(process.env.CONNECTIONSTRING, { useNewUrlParser: true }, { useUnifiedTopology: true }, function (err, client) {
    module.exports = client
    const app = require('./mySocialApp')
    app.listen(process.env.PORT)
})