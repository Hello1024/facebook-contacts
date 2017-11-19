// This is all UI rendering logic.  Should probably have used react...
var bgpage = chrome.extension.getBackgroundPage();

document.getElementById('mergebutton').onclick = function() {
  bgpage.addAllContacts();
  bgpage.all_done=false;
  bgpage.update_fn();
}

function markContactedButton(contact, tag){
  bgpage.markContacted(contact, tag);
  return false;
}

function formatNumber(x) {
  x = x%100;
  if (x>10 && x<19) return '' + x + 'th';
  if (x%10 == 1) return '' + x + 'st';
  if (x%10 == 2) return '' + x + 'nd';
  if (x%10 == 3) return '' + x + 'rd';
  return '' + x + 'th';
}
bgpage.update_fn = function() {

  document.getElementById('mergebutton').disabled = !bgpage.all_done;
  document.getElementById('errorbox').innerText = bgpage.errortext;

  var contacts = bgpage.contacts;
  
  // Custom filtering rule
  //contacts = contacts.filter(c => c.birthdays && !c.card && !c.lastContacted && !c.addresses);
  contacts = contacts.filter(c => c.card && !c.card2007printed);

  function dateval(contact) {
    if (contact.birthdays) return ((contact.birthdays[0].date.month-1 -1 +6-(new Date()).getUTCMonth()+24)%12) *100 + contact.birthdays[0].date.day;
    return 0
  }
  //contacts.sort( (a, b) => dateval(a) - dateval(b) );
  contacts.sort( (a, b) => {  if (a.addresses[0].formattedValue.trim() < b.addresses[0].formattedValue.trim()) return -1; if (a.addresses[0].formattedValue.trim() > b.addresses[0].formattedValue.trim()) return 1; return 0;} );
  
    
  var output = document.getElementById('contacts');
  output.innerHTML=''+contacts.length+" people";
  
  
  var div = document.createElement('textarea');
  output.appendChild(div);
  outlines = []
  for (var i = 0, contact; (contact = contacts[i]) && i<20; i++) {
    outlines.push(contact.names[0].givenName);
    outlines.push(contact.names[0].familyName);
    var addr = contact.addresses[0].formattedValue.trim();
    if (addr.includes('\n')) {
      addr = addr.split('\n');
    } else {
      addr = addr.split(',');    
    }
    if (addr.length <= 1) throw Error('Invalid address?!');
    while (addr.length<5) {
      addr.push('');
    }
    if (addr.length != 5) throw Error('Invalid address (too long)?!');
    outlines=outlines.concat(addr);
    //var m = (contact.birthdays[0].date.month -1 + 6) % 12;
    //var months = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
    
    //outlines.push(formatNumber(contact.birthdays[0].date.day) + ' ' + months[m]);
    if (contact.nicknames)
      outlines.push(contact.nicknames[0].value)
    else
      outlines.push(contact.names[0].givenName)
  }
  
  div.value = outlines.map(a => a.replace(/(\r\n|\n|\r)/gm,"").trim()).join('\n');
  
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

    var pA = document.createElement('a');
    pA.onclick = markContactedButton.bind(null, contact, "contacted: "+(new Date().toISOString().slice(0,10)));
    pA.innerText="(mark contacted)";
    pA.href='#';
    div.appendChild(pA);

    var pA = document.createElement('a');
    pA.onclick = markContactedButton.bind(null, contact, "cardprinted: true");
    pA.innerText="(mark card done)";
    pA.href='#';
    div.appendChild(pA);

    var ulEmails = document.createElement('ul');
    
    var pMessage = document.createElement('p');
/*    pMessage.innerText = 
    `Hi ${contact.names[0].givenName},
Haven't heard from you for years, and thought I'd at least send a christmas card, but addressing it to '${contact.addresses[0].formattedValue}' might leave the postman quizical!  Do you have a more specific location...?
*/
    pMessage.innerText = 
    `Morning ${contact.names[0].givenName}, It seems I haven't heard from you for aaaaages!  The least I could do is send a Christmas card - Where should I send it?

We should catch up sometime too!
`;
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
