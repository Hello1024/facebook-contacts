// This is all UI rendering logic.  Should probably have used react...
var bgpage = chrome.extension.getBackgroundPage();

document.getElementById('mergebutton').onclick = function() {
  bgpage.addAllContacts();
  bgpage.all_done=false;
  bgpage.update_fn();
}

bgpage.update_fn = function() {

  document.getElementById('mergebutton').disabled = !bgpage.all_done;

  var contacts = bgpage.contacts;
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
