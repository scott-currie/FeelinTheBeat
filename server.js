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

const app = express();
app.use(cors());
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({extended:true}));

app.get('/', getData);

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

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
