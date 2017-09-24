// This is all UI rendering logic.  Should probably have used react...
var bgpage = chrome.extension.getBackgroundPage();

document.getElementById('mergebutton').onclick = function() {
  bgpage.addAllContacts();
  bgpage.all_done=false;
  bgpage.update_fn();
}

bgpage.update_fn = function() {

  document.getElementById('mergebutton').disabled = !bgpage.all_done;
  document.getElementById('errorbox').innerText = bgpage.errortext;

  var contacts = bgpage.contacts;
  
  // Custom filtering rule
  contacts = contacts.filter(c => c.birthdays && !c.cardReady && !c.lastContacted && c.addresses);
    
  var output = document.getElementById('contacts');
  output.innerHTML='';
  for (var i = 0, contact; contact = contacts[i]; i++) {
    var div = document.createElement('div');

    var pName = document.createElement('a');
    pName.href = (contact.facebook || "").replace("facebook.com", "m.me");
    pName.innerText = (contact.names || [{}])[0].displayName;
    pName.title = JSON.stringify(contact);
    div.appendChild(pName);

    var pA = document.createElement('a');
    pA.href = 'https://www.google.com/contacts/u/0/?cplus=1#contact/'+contact.metadata.sources[0].id;
    pA.innerText="(google)";
    div.appendChild(pA);
    

    var ulEmails = document.createElement('ul');
    
    var pMessage = document.createElement('p');
    pMessage.innerText = 
    `Hi ${contact.names[0].givenName},
Haven't heard from you for years, and thought I'd at least send a christmas card, but having '${contact.addresses[0].formattedValue}' in my address book isn't so helpful!  Do you have a more specific location...?`;
    div.appendChild(pMessage);
    

    for (var j = 0, email; email = (contact['emailAddresses'] || [])[j]; j++) {
      var liEmail = document.createElement('li');
      liEmail.innerText = email['value'];
      ulEmails.appendChild(liEmail);
    }

    for (var j = 0, email; email = (contact['phoneNumbers'] || [])[j]; j++) {
      var liEmail = document.createElement('li');
      liEmail.innerText = email['value'];
      ulEmails.appendChild(liEmail);
    }
    
    div.appendChild(ulEmails);
    output.appendChild(div);
  }

  var contacts = bgpage.friends;
  var output = document.getElementById('friends');
  output.innerHTML='';
  for (var i = 0, contact; contact = contacts[i]; i++) {
    var div = document.createElement('div');
    var pName = document.createElement('h3');
    
    pName.innerText = contact['text'];
    if (contact['merged']) pName.className = "merged";
    if (!contact['loaded']) pName.className = "loading";
    
    div.appendChild(pName);
    
    ['Mobile Phones', 'Email', 'Address', 'Birthday'].forEach(item => {
      var p = document.createElement('p');
      if (contact[item]) {
        p.innerText = contact[item];
        div.appendChild(p);
      }
    });
    
    output.appendChild(div);
  }

};

bgpage.update_fn();
