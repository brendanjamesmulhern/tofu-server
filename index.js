const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const http = require('http');
const OpenTok = require('opentok');
const mongoose = require('mongoose');

const apiKey = "47306554";
const secret = "fb557b9b880c278439a508c66dbb85be03552739";

mongoose.connect('mongodb+srv://bmulhern2:Bmole22%21%21@cluster0.eopst.mongodb.net/tofu?retryWrites=true&w=majority', { useNewUrlParser: true , useUnifiedTopology: true }, function () {
	console.log("MongoDB Connected.");
})

let UserSchema = new mongoose.Schema({
	username: String,
	email: String,
	teams: [{
		members: [String],
		name: String,
		messages: [{
			date: Date,
			text: String,
			owner: String
		}]
	}],
	videos: [{
		date: Date,
		url: String,

	}]
});

let users = mongoose.model('users', UserSchema);

var opentok = new OpenTok(apiKey, secret);

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(helmet());
app.use(cors());

app.get('/getSessionAndToken', function(req, res) {
	opentok.createSession(function(err, session) {
		if (err) return console.error(err);
		const sessionId = session.sessionId;
		var token = session.generateToken();
		res.json({ "sessionId": sessionId, "token": token });
	})
});

app.post('/updateVideoUrls', function(req, res) {
	let newVideo = req.body.newVideo;
	users.findOne({ "email": req.body.email }, function (err, userFromDB) {
		if (err) {
			res.json(err);
		} else {
			let videos = userFromDB['videos'];
			videos.push(newVideo);
			videos.save();
			res.json("Update completed!")
		}
	});

});

http.createServer(app).listen(process.env.PORT || 8080, function () {
	console.log("Server Started on Port 8080.");
})