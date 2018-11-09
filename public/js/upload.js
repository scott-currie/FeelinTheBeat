'use strict';

document.getElementById('chooseFileBtn').addEventListener('click', getFile);

function getFile() {
  document.getElementById('uploadFile').click();
  document.getElementById('uploadFileBtn').style.visibility = 'visible';
  document.getElementById('uploadFileBtn').addEventListener('click', uploadFile);
}

// document.getElementById('uploadFileBtn').addEventListener('click', uploadFile);

function uploadFile() {
  document.getElementById('submitUploadForm').click();
}

document.getElementById('getPlaylistBtn').addEventListener('click', getPlaylist);

function getPlaylist() {
  document.getElementById('submitGetPlaylistForm').click();
}
