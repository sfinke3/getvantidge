(function () {
    var $ = function (id) { return document.getElementById(id); };
    var enc = new TextEncoder();
    var norm = function (s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); };
    var unb64 = function (s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); };
    var b64 = function (buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))); };

    function mailto(company) {
      var co = company.trim() || 'my company';
      var subject = 'The password for ' + co + ', please';
      var body = 'Hi Sophie,\n\n' +
        "I'm at " + co + '. I hear you built us a finance function without asking. ' +
        "That's either very flattering or a little alarming, and I'd like to find out which.\n\n" +
        'Can I have the password?\n\n' +
        'For the record, our current finance team is: ______\n\n' +
        'Best,\n';
      return 'mailto:sophie@getvantidge.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    }
    function syncAsk() { $('ask').href = mailto($('co').value); }
    $('co').addEventListener('input', syncAsk);
    syncAsk();

    function say(text, cls) { var m = $('msg'); m.textContent = text; m.className = cls || ''; }

    $('f').addEventListener('submit', async function (e) {
      e.preventDefault();
      var company = $('co').value.trim(), pw = $('pw').value;
      if (!window.crypto || !crypto.subtle) { say('This only works over https. Try https://getvantidge.com.', 'bad'); return; }
      $('go').disabled = true; say('');
      try {
        var id = b64(await crypto.subtle.digest('SHA-256', enc.encode('vantidge:' + norm(company))));
        var entry = (window.SPECS || {})[id];
        if (!entry) {
          var m = $('msg'); m.className = ''; m.textContent = "I haven't built one for " + company + ' yet. ';
          var a = document.createElement('a');
          a.href = 'mailto:sophie@getvantidge.com?subject=' + encodeURIComponent('Build one for ' + company) +
            '&body=' + encodeURIComponent('Hi Sophie,\n\nI\'m at ' + company + ". I tried the door and there was nothing behind it. I'd like to see what you'd build for us.\n\nBest,\n");
          a.textContent = 'Want me to?';
          m.appendChild(a);
          return;
        }
        var base = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
        var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(entry.s), iterations: 150000, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        var plain;
        try {
          plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(entry.i) }, key, unb64(entry.c));
        } catch (err) {
          say("That password doesn't match.", 'bad');
          $('pw').select();
          return;
        }
        var spec = JSON.parse(new TextDecoder().decode(plain));
        say('Opening ' + spec.name + '.');
        location.href = spec.url + '?k=' + encodeURIComponent(spec.k);
      } catch (err) {
        say('Something broke on my end. Email me and I will send you the link.', 'bad');
      } finally {
        $('go').disabled = false;
      }
    });
  })();
