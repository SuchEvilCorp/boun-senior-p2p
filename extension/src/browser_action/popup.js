document.addEventListener('DOMContentLoaded', function () {
  const userData = localStorage.getItem('user');
  console.log(userData);

  if (!userData) {
    document.querySelector('#mainPopup').innerHTML = `
    <h2>Hello, Peery user!</h2>
    <p>To use the network, please register (or login) from the options page.</p>
    <button id="options" class="button-primary">Login / Register</button>`;
    document.querySelector('.system-info').classList.add('hidden');
    document.querySelector('#options').addEventListener('click', () => {
      chrome.tabs.create({url: "src/options_custom/index.html"});
    });
  } else {
    const user = JSON.parse(userData);
    document.querySelector('#mainPopup').innerHTML = `
    <h2>Hello, ${user.username}!</h2>
    Here's some information about your system while Peery is using your resources in the most efficient way:`;
    initSystemInfo();
  }
});
