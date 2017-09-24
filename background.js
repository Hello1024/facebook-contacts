// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function authenticatedXhr(method, url, data) {
  return new Promise(function(resolve, reject) {
    
    var retry = true;
    function getTokenAndXhr() {
      chrome.identity.getAuthToken({ 'interactive': true },
                                   function (access_token) {
        if (chrome.runtime.lastError) {
          reject(Error(chrome.runtime.lastError));
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
          if (this.status == 200) {
            // Resolve the promise with the response text
            resolve(this.responseText);
          }
          else {
            // Otherwise reject with the status text
            // which will hopefully be a meaningful error
            reject(Error(this.statusText));
          }
        };
        xhr.send(data);
      });
    }
    getTokenAndXhr();
  });
}

var contacts = [];
var friends = [];
var all_done = false;
var errortext = '';
var update_fn = function() {};

function getFBFriendsList() {
  // First get my own user id
  var my_id = fetch('https://www.facebook.com/me/friends', {  
        credentials: 'include'  
      }).then(function(response){
    return response.text();
  }).then(function(txt){
    var match = txt.match(/fb:\/\/profile\/([0-9]+)/)
    
    //  We expect our own id at least 20 times, else we probably aren't logged in.
    if (!match || txt.match(new RegExp(match[1], 'g')).length < 30) throw "You need to login to facebook first!";
    
    return match[1];
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

async function populateFriends() {
  friends = await getFBFriendsList();
  
  // Safety...
  //friends.splice(3);
    
  return Promise.all(friends.map(function(friend) {
    var uid = friend['uid'];
    return sleep(Math.random()*1000*friends.length).then(
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
      };
      friend['loaded'] = true;
      console.log(friend);
      update_fn();
      return friend;
    });
    
  }));

  
}

async function createContactGroupInternal() {
  var data = {
    "contactGroup": {
      "name": "Facebook " + new Date().toLocaleString()
    }
  };

  var response = await authenticatedXhr("POST", "https://people.googleapis.com/v1/contactGroups", JSON.stringify(data));
  
  return JSON.parse(response).resourceName

}

createContactGroup.value = null;
function createContactGroup(){
    if(createContactGroup.value) return createContactGroup.value;
    return (createContactGroup.value = createContactGroupInternal());
}

async function addContact(friend) {
  data = {
	    "names": [
	    {
	      "familyName": friend['lastname'],
	      "givenName": friend['firstname']
	    }
	  ],
	  "userDefined": [],
	  "phoneNumbers": []
	  
	};
  if (friend['Mobile Phones'])
    data.phoneNumbers.push( { "value": friend['Mobile Phones'], "type": 'mobile' });

  if (friend['Other Phones'])
    data.phoneNumbers.push( { "value": friend['Other Phones'], "type": 'other' });
  
  if (friend['Gender'])
    data.genders = [ { "value": friend['Gender'].toLowerCase() } ];
  
  if (friend['Birthday']) {
    var matches = friend['Birthday'].match(/(\w+) (\d+)(, (\d+))?/);
    if (matches) {
	    var date_obj = {'year': 0};
	    if (matches[4]) date_obj.year = parseInt(matches[4]);
	    date_obj.day = parseInt(matches[2]);
	    date_obj.month =  [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ].indexOf(matches[1]) + 1;
	    
	    data.birthdays = [ { "date": date_obj } ];
    }
    
  }
  if (friend['Email'])
    data.emailAddresses = [ { "value": friend['Email'] } ];
  
  if (friend['Facebook']) {
    data.userDefined.push({"key": "facebook", "value": friend['Facebook'] } );
  } else {
    data.userDefined.push({"key": "facebook", "value": "http://facebook.com/"+friend['uid'] } );
  }
  
   if (friend['Websites'])
     data.userDefined.push({"key": "website", "value": friend['Websites'] } );

   if (friend['Social Links'])
     data.userDefined.push({"key": "social", "value": friend['Social Links'] } );
  
   if (friend['PGP Public Key'])
     data.userDefined.push({"key": "pgp", "value": friend['PGP Public Key'] } );
 
   if (friend['Address'])
     data.addresses = [{"formattedValue": friend['Address'] } ];
    
  var response = await authenticatedXhr("POST", "https://people.googleapis.com/v1/people:createContact", JSON.stringify(data));
  // TODO:  Upload photo in subsequent request: https://developers.google.com/google-apps/contacts/v3/#addingupdating_a_photo_for_a_contact
  
  var id = JSON.parse(response).resourceName;

  
  var addgroupurl = "https://people.googleapis.com/v1/"+ await createContactGroup() +"/members:modify";
  data = {
    "resourceNamesToAdd": [
      id
    ]
  };
  
  await authenticatedXhr("POST", addgroupurl, JSON.stringify(data));
  
  friend['merged'] = true;
  update_fn();
  return friend;
}

async function addAllContacts() {
  return Promise.all(friends.map(async function(friend) {
    // Google API limit is 20 per 100 seconds.  We do 2 requests per contact, so one every 18 seconds to be safe.
    await sleep(friends.length*18000*Math.random());
    return addContact(friend);
  }));
}

async function populateContacts() {
/*  var text = await authenticatedXhr("GET", "https://people.googleapis.com/v1/contactGroups");
  var data = JSON.parse(text);
  var facebookgroups = data['contactGroups'].filter(g => g[name].includes("Facebook"));
  if (facebookgroups.length==0) return;
  if (facebookgroups.length>1) throw Error("More than one facebook group found!  Rename some before syncing.");
  */
  var fields = "addresses,ageRanges,biographies,birthdays,braggingRights,coverPhotos,emailAddresses,events,genders,imClients,interests,locales,memberships,metadata,names,nicknames,occupations,organizations,phoneNumbers,photos,relations,relationshipInterests,relationshipStatuses,residences,skills,taglines,urls,userDefined";
  var data = JSON.parse(await authenticatedXhr("GET", ' https://people.googleapis.com/v1/people/me/connections?pageSize=2000&personFields='+fields));
  
  contacts = data.connections;
  
  // map key value pairs to contacts
  contacts.forEach(c => { (c.userDefined || []).forEach(u => {c[u.key] = u.value }); } );
   
  // map special notes to values too
  contacts.forEach(c => { (c.biographies || []).forEach(b => {b.value.split("\n").forEach(b_line => {
    var kv = b_line.split(":");
    if (kv.length==2) {
      c[kv[0]] = (c[kv[0]] || []).push(kv[1]);
    }
  })})});

  // find last contacted date
  contacts.forEach(c => { 
    var dates = (c.contacted || []).map(d => new Date(d.split(' '))).sort();
    c.lastContacted = dates[dates.length-1];
  });

  update_fn();  
}

async function main() {
  all_done=false;
  errortext = '';
  chrome.tabs.create({ 'url' : 'contacts.html'});
  try {
    await Promise.all([populateContacts(), populateFriends()])
  } catch (err) {
    console.error(err);
    errortext = "Error occurred.  Proceed at your own risk, data may be incomplete: " + err.toString();
  }
  all_done = true;
  update_fn();

}

chrome.browserAction.onClicked.addListener(main);
