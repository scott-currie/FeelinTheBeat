'use strict';
// build dependencies, 
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');
const querystring = require('querystring');
require('dotenv').config();
const PORT = process.env.PORT || 3001;
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;

let spotify_token;

// const client = new pg.Client(process.env.DATABASE_URL);
// client.connect();
// client.on('err', err => console.log(err));


// Bring in Goolge Vision module
const vision = require('@google-cloud/vision');

const visionClient = new vision.ImageAnnotatorClient({
  projectId: '112671846952584603154',
  keyFilename: './.auth/Code301Final-3b92b5c2ad48.json',
});

const app = express();
app.use(cors());
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({extended:true}));

app.get('/', getData);
app.get('/vision', getGoogleVision);

//?: May not need long-term
app.get('/auth', getToken);

// app.get('/refreshToken', refreshToken)
// app.get('/gotToken', gotToken);
app.get('/seedSearch', getSeedRecs);


function getData(req, res) {
  const SQL = 'SELECT * FROM keywords';

}


function getToken(req, res) {
  return superagent
    .post('https://accounts.spotify.com/api/token')
    .send('grant_type=client_credentials')
    .set('Authorization', 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')))
    .then(results => {
      process.env.SPOTIFY_CLIENT_TOKEN = results.body.access_token;
      spotify_token = results.body.access_token;
    })
    .catch(err => res.send(err));
}


function getSeedRecs(req, res) {
  // TODO: take in user query track and return spotify recommendations for that track
  return getToken(req, res)
    .then(() => {
    let tempTrackId = '7ueISsrCCvLuA4KDs8ITzE';
    let tempQuery = 'Delay 808s from Asia';
    return superagent
      .get(`https://api.spotify.com/v1/search?q=${tempQuery}&type=track`)
      .set('Authorization', 'Bearer ' + spotify_token)
      .then(results => {
        res.send(results.body.tracks.items.map(track => `ID: ${track.id} name: ${track.name}`))
      })
      .catch(err => res.send(err));
    })
    .catch(err => console.log('rick is gr8'));
}

function AnnotatedImage(imageData) {
  this.img_url = imageData.img_url;
  this.img_name = imageData.img_url.slice(imageData.img_url.lastIndexOf('/') + 1);
  this.labels = imageData.labelAnnotations.map(la => la['description']);
}

function getGoogleVision(req, res) {
  // const img_url = 'public/images/scott_and_milo.jpg';
  const img_url = 'public/images/milo_ugh_face.jpg';
  // const img_url = 'https://i.imgur.com/KU3wt6U.jpg';
  const type = 'face';
  if (type === 'face') {
    visionClient.labelDetection(img_url)
      .then(results => {
        console.log(results);
        results[0]['img_url'] = img_url;
        res.send(new AnnotatedImage(results[0]));
      })
      .catch(err => {
        console.log(err);
      });
  } else {
    visionClient.faceDetection(img_url)
      .then(results => {
        console.log(results[0]);
        // console.log(results[0].faceAnnotations);
        console.log(results[0].faceAnnotations[0].landmarks);
        results[0]['img_url'] = img_url;
        res.send(new AnnotatedImage(results[0]));
      })
      .catch(err => {
        console.log(err);
      });
  }
}

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
