let request = obj => {
  return new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();
      xhr.open(obj.method || "GET", obj.url);
      if (obj.headers) {
          Object.keys(obj.headers).forEach(key => {
              xhr.setRequestHeader(key, obj.headers[key]);
          });
      }
      xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.response);
          } else {
              reject(xhr.statusText);
          }
      };
      xhr.onerror = () => reject(xhr.statusText);
      xhr.send(obj.body);
  });
};

window.addEvent("domready", function () {
    // Option 1: Use the manifest:
    new FancySettings.initWithManifest(function (settings) {
      settings.manifest.loginButton.addEvent('action', function () {
        const username = settings.manifest.username.element.value;
        const password = settings.manifest.password.element.value;
        request({url: "http://localhost:3140/login", method: 'POST', body: JSON.stringify({ username, password }), headers: { 'Content-Type': 'application/json' }})
          .then(data => {
              localStorage.setItem('user', JSON.stringify({ username, password }));
              alert('Successfully logged in!');
          })
          .catch(error => {
            request({url: "http://localhost:3140/register", method: 'POST', body: JSON.stringify({ username, password }), headers: { 'Content-Type': 'application/json' } })
              .then(data => {
                localStorage.setItem('user', JSON.stringify({ username, password }));
                alert('Successfully registered!');
              })
              .catch(err => {
                alert('Something went wrong while registering.');
              })
          });
      });
      settings.manifest.logoutButton.addEvent('action', function () {
        localStorage.removeItem('user');
        alert('Successfully logged out!');
      });
    });

    // Option 2: Do everything manually:
    /*
    var settings = new FancySettings("My Extension", "icon.png");

    var username = settings.create({
        "tab": i18n.get("information"),
        "group": i18n.get("login"),
        "name": "username",
        "type": "text",
        "label": i18n.get("username"),
        "text": i18n.get("x-characters")
    });

    var password = settings.create({
        "tab": i18n.get("information"),
        "group": i18n.get("login"),
        "name": "password",
        "type": "text",
        "label": i18n.get("password"),
        "text": i18n.get("x-characters-pw"),
        "masked": true
    });

    var myDescription = settings.create({
        "tab": i18n.get("information"),
        "group": i18n.get("login"),
        "name": "myDescription",
        "type": "description",
        "text": i18n.get("description")
    });

    var myButton = settings.create({
        "tab": "Information",
        "group": "Logout",
        "name": "myButton",
        "type": "button",
        "label": "Disconnect:",
        "text": "Logout"
    });

    // ...

    myButton.addEvent("action", function () {
        alert("You clicked me!");
    });

    settings.align([
        username,
        password
    ]);
    */
});
