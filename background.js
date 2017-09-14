// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// callback = function (error, httpStatus, responseText);
function authenticatedXhr(method, url, callback) {
  var retry = true;
  function getTokenAndXhr() {
    chrome.identity.getAuthToken({ 'interactive': true },
                                 function (access_token) {
      if (chrome.runtime.lastError) {
        callback(chrome.runtime.lastError);
        return;
      }

      var xhr = new XMLHttpRequest();
      xhr.open(method, url);
      xhr.setRequestHeader('Authorization',
                           'Bearer ' + access_token);

      xhr.onload = function () {
        if (this.status === 401 && retry) {
          // This status may indicate that the cached
          // access token was invalid. Retry once with
          // a fresh token.
          retry = false;
          chrome.identity.removeCachedAuthToken(
              { 'token': access_token },
              getTokenAndXhr);
          return;
        }

        callback(null, this.status, this.responseText);
      };
      xhr.send();
    });
  }
  getTokenAndXhr();
}

var contacts = null;
var friends = null;
var update_fn = function() {};

function getFBFriendsList() {
  // First get my own user id
  var my_id = fetch('https://www.facebook.com/me/friends', {  
        credentials: 'include'  
      }).then(function(response){
    return response.text();
  }).then(function(txt){
    return txt.match(/entity_id":"([0-9]+)"/)[1];
  });
  
  var saved_id
  
  // Use that to download friends list.
  var friends_list = my_id.then(function(id){
    saved_id = id;
    return fetch('https://www.facebook.com/ajax/typeahead/first_degree.php?viewer='+id+'&__a=1', {  
        credentials: 'include'  
      })
  }).then(function(response){
    return response.text()
  }).then(function(txt){    
    return JSON.parse(txt.substring(9)).payload.entries;
  }).then(flist => flist.filter(f => (f['uid'] != saved_id) && (f['type'] == 'user')));
  
  return friends_list;
}

function onContacts(err, status, text) {
  contacts = [];/*
  console.log(err);
  console.log(status);
  console.log(text);
  var data = JSON.parse(text);
  for (var i = 0, entry; entry = data.feed.entry[i]; i++) {
    var contact = {
      'name' : entry['title']['$t'],
      'id' : entry['id']['$t'],
      'emails' : []
    };

    if (entry['gd$email']) {
      var emails = entry['gd$email'];
      for (var j = 0, email; email = emails[j]; j++) {
        contact['emails'].push(email['address']);
      }
    }

    if (!contact['name']) {
      contact['name'] = contact['emails'][0] || "<Unknown>";
    }
    contacts.push(contact);
  }*/

  getFBFriendsList().then(function(new_friends) {
    friends = new_friends;
    //friends.splice(3);
    
    friends.forEach(function(friend) {
      var uid = friend['uid'];
      var profilepage = sleep(Math.random()*1000*friends.length).then(
      () => fetch('https://www.facebook.com/'+uid+'/about?section=contact-info', { credentials: 'include' })).then(function(response){
        return response.text();
      }).then(function(txt) {
        var parser = new DOMParser();
        var htmlDoc = parser.parseFromString(txt, "text/html");
        var code_blocks = htmlDoc.evaluate('/html/body/div/code', htmlDoc);
        
        
        var code;
        while(code=code_blocks.iterateNext()) {
          var innerDoc = parser.parseFromString(code.innerHTML.substr(4), "text/html");
          // todo:  This might match too much.
          var headings = innerDoc.evaluate('//*[@role="heading"][@aria-level="6"]', innerDoc);
          
          var heading;
          while(heading=headings.iterateNext()) {
            // todo: Key will be locale specific.
            // Todo:  if multiple of an item are listed, they get concatinated.
            friend[heading.innerText] = heading.parentElement.nextSibling.innerText;
          }
        }
        console.log(friend);
        update_fn();
      });
      
    });
  
  
  });
  
  chrome.tabs.create({ 'url' : 'contacts.html'});
}

function getContacts() {

  var url = "http://www.google.com/m8/feeds/contacts/default/full?alt=json&max-results=100";
  authenticatedXhr("GET", url, onContacts);
  

}

chrome.browserAction.onClicked.addListener(getContacts);
