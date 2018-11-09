'use strict';

document.getElementById('chooseFileBtn').addEventListener('click', getFile);
document.getElementById('uploadFile').addEventListener('change', uploadFile);

function getFile() {
  document.getElementById('uploadFile').click();
}

function uploadFile() {
  document.getElementById('submitUploadForm').click();
}

document.getElementById('getPlaylistBtn').addEventListener('click', getPlaylist);

function getPlaylist() {
  document.getElementById('submitGetPlaylistForm').click();
}
