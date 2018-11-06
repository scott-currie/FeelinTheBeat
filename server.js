'use strict';

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');
require('dotenv').config();
const PORT = process.env.PORT || 3000;
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('err', err => console.log(err));


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

function getData(req, res) {
  console.log(process.env.DATABASE_URL);
  const SQL = 'SELECT * FROM keywords';

  client.query(SQL)
    .then(results => {
      console.log(results.rows[0]);
      res.render('./', {item: results.rows});
    })
    .catch(err => console.log(err));

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
