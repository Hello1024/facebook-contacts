// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


chrome.extension.getBackgroundPage().update_fn = function() {

var contacts = chrome.extension.getBackgroundPage().contacts;
var output = document.getElementById('contacts');
output.innerHTML='';
for (var i = 0, contact; contact = contacts[i]; i++) {
  var div = document.createElement('div');
  var pName = document.createElement('h3');
  var ulEmails = document.createElement('ul');

  pName.innerText = contact['name'];
  div.appendChild(pName);

  for (var j = 0, email; email = contact['emails'][j]; j++) {
    var liEmail = document.createElement('li');
    liEmail.innerText = email;
    ulEmails.appendChild(liEmail);
  }

  div.appendChild(ulEmails);
  output.appendChild(div);
}

var contacts = chrome.extension.getBackgroundPage().friends;
var output = document.getElementById('friends');
output.innerHTML='';
for (var i = 0, contact; contact = contacts[i]; i++) {
  var div = document.createElement('div');
  var pName = document.createElement('h3');
  var pBirthday = document.createElement('p');
  var pAddress = document.createElement('p');
  
  pName.innerText = contact['text'];
  div.appendChild(pName);
  pBirthday.innerText = contact['Birthday'];
  div.appendChild(pBirthday);
  pAddress.innerText = contact['Address'];
  div.appendChild(pAddress);

  
  output.appendChild(div);
}

};

chrome.extension.getBackgroundPage().update_fn();