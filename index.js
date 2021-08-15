const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const http = require('http');
const OpenTok = require('opentok');
const mongoose = require('mongoose');

const stripe_secret_test = "sk_test_51JOX0yGBUpznK6SDov78W8Jv2Xu2CH6rd1veljrt3gD3ynQXrRwq9zRKFzgc9hcWyG9yDyL01a7xE7KOC3nw2dXE000irc4x0X";
const stripe_secret_live = "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";

const stripe = require('stripe')(stripe_secret_test);

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

	}],
	isPremium: String,
	meetings: [{
		url: String,
		members: [{
			username: String
		}],
		date: Date,
		time: String
	}]
});

let user = mongoose.model('user', UserSchema);

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
	user.findOne({ "email": req.body.email }, function (err, userFromDB) {
		if (err) {
			res.json(err);
		} else {
			let videos = userFromDB['videos'];
			videos.push(newVideo);
			userFromDB.save();
			res.json("Update completed!")
		}
	});
});

app.get('/getAllVideoIntros', function(req, res) {
	user.find({}, (err, response) => {
		if (err) {
			res.json(err);
		} else {
			console.log(response);
			res.json(response);
		}
	})
});

app.post('/create-subscription', async function(req, res) {
	const customer = await stripe.customers.create({
		email: req.body.email
	});
	const customerId = customer.id;
	const priceId = req.body.priceId;
	const date = new Date();
	date.setDate(date.getDate() + 1);
	try {
		const subscription = await stripe.subscriptions.create({
			customer: customerId,
			items: [{
				price: priceId
			}],
			payment_behavior: 'default_incomplete',
			expand: ['latest_invoice.payment_intent'],
			trial_end: date
		});
		res.json({
			subscriptionId: subscription.id,
			clientSecret: subscription.latest_invoice.payment_intent.client_secret
		});
	} catch (error) {
		return res.status(400).send({ error: { message: error.message }});
	}
});

app.post('/book-meeting', function(req, res) {
	let mentorId = req.body.mentorId;
	let date = req.body.date;
	let time = req.body.time;
	let payeeEmail = req.body.payeeEmail;
	let url = req.body.url;
	user.findOne({ "email": payeeEmail }, function(err, payeeFromDB) {
		user.findOne({ "_id": mentorId }, function(err, mentorFromDB) {
			let newEvent = {
				"url": url,
				"members": [{
					"_id": mongoose.Schema.ObjectId(payeeFromDB['_id']),
					"username": payeeFromDB['username']
				}, {
					"_id": mentorFromDB['_id'],
					"username": mentorFromDB['username']
				}],
				"date": date,
				"time": time
			};
			let mentorMeetings = mentorFromDB['meetings'];
			let payeeMeetings = payeeFromDB['meetings'];
			mentorMeetings.push(newEvent);
			payeeMeetings.push(newEvent);
			mentorFromDB.save();
			payeeFromDB.save();
			res.json({ "event creation": "success!" });
		});
	});
});

app.post('/add-new-user', function(req, res) {
	user.create({ 
		"email": req.body.email, 
		username: null, 
		"teams": [], 
		isPremium: false,
		videos: [],
		meetings: []
	}).then(response => {
		res.json(response);
	});
});

http.createServer(app).listen(process.env.PORT || 8080, function () {
	console.log("Server Started on Port 8080.");
})