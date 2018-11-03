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

const app = express();
app.use(cors());
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({extended:true}));

app.get('/', getData);

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

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
