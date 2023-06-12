require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
app.use(cors())

const mySecret = process.env.MONGO_URI
mongoose.connect( mySecret, { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new mongoose.Schema({
  username: String
});

const ExerciseSchema = new mongoose.Schema({
  user_id: { type: String, required: true},
  description: String,
  duration: Number,
  date: Date
})

let User = mongoose.model('User', UserSchema);
let Exercise = mongoose.model('Exercise', ExerciseSchema);

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({}).select("_id username");
  if (!users) {
    res.send("No users");
  } else {
    res.json(users);
  }
})

app.post('/api/users', (req, res) => {
  let userObj = new User({
    username: req.body.username
  })
  userObj.save((err, data) => {
    if (err) {
      console.log(err);
    } else {
      res.json(data)
    }
  })
});

app.post('/api/users/:_id/exercises', (req, res) => {
  let id = req.params._id;
  const { description, duration, date } = req.body;
  User.findById(id, (err, user) => {
    if(!user) {
      res.send("user could not found")
    } else {
      const exerciseObj = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      })
      exerciseObj.save((err, exercise) => {
        if (err) {
          console.log(err)
        } else {
          res.json({
            _id: user._id,
            username: user.username,
            description: exercise.description,
            duration: exercise.duration,
            date: new Date(exercise.date).toDateString()
          })
        }
      })
    }
  })
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  User.findById(id, async (err, user) => {
    if(!user){
      res.send("Could not find user")
    } else {
      let dateObj = {}
      if(from) {
        dateObj["$gte"] = new Date(from)
      }
      if(to) {
        dateObj["$lte"] = new Date(to)
      }
      let filter = {
        user_id: id
      }
      if(from || to) {
        filter.date = dateObj;
      }
      const exercises = await Exercise.find(filter).limit(+limit ?? 500)
      const log = exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString()
      }))
      res.json({
        username: user.username,
        count: exercises.length,
        _id: user._id,
        log
      })
    }
  })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
