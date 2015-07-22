var User = require('../models/user');
//var Story = require('../models/story');
var Task = require('../models/task');
var config = require('../config');
var secretKey = config.SECRET_KEY;
var jsonwebtoken = require('jsonwebtoken');

function createToken(user) {
    var token = jsonwebtoken.sign({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        userName: user.username
    }, secretKey, {
        expirtesInMinute: 1440
    });

    return token;
};

module.exports = function (app, express) {
    var api = express.Router();
    api.post('/signup', function (req, res) {
        var user = new User({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            userName: req.body.userName,
            password: req.body.password
        });

        user.save(function (err) {
            if (err) {
                res.send(err);
                return;
            }

            res.json({
                message: 'User has been Created .. !',
                token: createToken(user)
            });
        });
    });



    api.post('/login', function (req, res) {
        User.findOne({
            userName: req.body.userName
        }).select('password').exec(function (err, user) {
            if (err) throw err;

            if (!user) {
                res.send({
                    message: "User does not exist"
                });
            } else if (user) {
                var validPassword = user.comparePassword(req.body.password);

                if (!validPassword) {
                    res.send({
                        message: "Invalid Password"
                    });
                } else {
                    var token = createToken(user);
                    res.json({
                        success: true,
                        message: 'Successfuly login!',
                        token: token
                    });

                }
            }

        })
    });


    api.use(function (req, res, next) {
        console.log("now validating token.");

        var token = req.body.token || req.param('token') || req.headers['x-access-token'];
        if (token) {
            jsonwebtoken.verify(token, secretKey, function (err, decoded) {
                if (err) {
                    res.status(403).send({
                        success: false,
                        message: "failed to authenticate user"
                    });
                } else {
                    req.decoded = decoded;
                    next();
                }
            });
        } else {
            res.status(403).send({
                success: false,
                message: "No token provided"
            });
        }


    });

    api.get('/users', function (req, res) {
        User.find({}, function (err, users) {
            if (err) {
                res.send(err);
                return;
            }
            res.json(users);
        });
    });

    api.route('/task')
        .post(function (req, res) {
            var task = new Task({
                creator: req.decoded.id,
                title: req.body.title,
                content: req.body.content
            });

            task.save(function (err) {
                if (err) {
                    res.send(err);
                    return;
                }
                res.json({
                    message: "New Task Created"
                });
            });
        })
        .get(function (req, res) {
            Task.find({
                creator: req.decoded.id
            }, function (err, tasks) {
                if (err) {
                    res.send(err);
                    return;
                }
                res.json(tasks);

            });
        });


    api.get('/loggedInUser', function (req, res) {
        res.json(req.decoded);
    });


    return api;

}