function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' Bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(3) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(3) + ' MB';
  else return (bytes / 1073741824).toFixed(3) + ' GB';
}

function formatSeconds(seconds) {
  if (seconds < 60) return seconds + ' s';
  else if (seconds < 3600) {
    var minutes = Math.floor(seconds / 60).toFixed(0);
    return '00:' + ((minutes > 9) ? minutes : '0' + minutes);
  } else {
    var hours = Math.floor(seconds / 3600).toFixed(0);
    var minutes = Math.floor((seconds - (hours * 3600)) / 60).toFixed(0);
    return hours + ':' + ((minutes > 9) ? minutes : '0' + minutes);
  }
};

var timeoutId;
var previousCpuInfo;

function initInfo() {
  document.querySelector('#peer-id').textContent = localStorage.getItem('peerId');
  var operatingSystem = document.querySelector('#operating-system');
  if (/CrOS/.test(navigator.userAgent)) {
    operatingSystem.textContent = 'Chrome OS';
  } else if (/Mac/.test(navigator.platform)) {
    operatingSystem.textContent = 'Mac OS';
  } else if (/Win/.test(navigator.platform)) {
    operatingSystem.textContent = 'Windows';
  } else if (/Android/.test(navigator.userAgent)) {
    operatingSystem.textContent = 'Android';
  } else if (/Linux/.test(navigator.userAgent)) {
    operatingSystem.textContent = 'Linux';
  } else {
    operatingSystem.textContent = '-';
  }

  var chromeVersion = document.querySelector('#chrome-version');
  chromeVersion.textContent = navigator.userAgent.match('Chrome/([0-9]*\.[0-9]*\.[0-9]*\.[0-9]*)')[1];

  var platform = document.querySelector('#platform');
  platform.textContent = navigator.platform.replace(/_/g, '-');
}

function initBattery() {
  if (!navigator.getBattery) {
    return;
  }
  document.querySelector('#battery').classList.remove('hidden');

  navigator.getBattery().then(function(batteryManager) {
    updateBattery(batteryManager);
    function update(event) {
      updateBattery(event.target);
    }

    batteryManager.onchargingchange = update;
    batteryManager.ondischargingtimechange = update;
    batteryManager.onchargingtimechange = update;
    batteryManager.onlevelchange = update;
  });
}

function updateBattery(batteryManager) {
    var batteryStatus = document.querySelector('#battery-status');
    if (batteryManager.charging) {
      batteryStatus.textContent = 'Charging';
    } else {
      batteryStatus.textContent = 'Not charging';
    }

    var batteryTime = document.querySelector('#battery-time');
    if (batteryManager.charging) {
      batteryTime.textContent = (batteryManager.chargingTime !== Infinity) ?
          formatSeconds(batteryManager.chargingTime) +
          chrome.i18n.getMessage('untilFullText') : '-';
    } else {
      batteryTime.textContent = (batteryManager.dischargingTime !== Infinity) ?
          formatSeconds(batteryManager.dischargingTime) +
          chrome.i18n.getMessage('leftText') : '-';
    }

    var batteryLevel = document.querySelector('#battery-level');
    var batteryUsed = batteryManager.level.toFixed(2) * 100;
    batteryLevel.querySelector('.used').style.width = batteryUsed + '%';
}

function updateStorage() {
  chrome.system.storage.getInfo(function(storageInfo) {
    if (storageInfo.length === 0) {
      document.querySelector('#storage').classList.add('hidden');
      return;
    }

    document.querySelector('#storage').classList.remove('hidden');

    var internalStorageUnits = document.querySelector('#internal-storage-units');
    var externalStorageUnits = document.querySelector('#external-storage-units');
    internalStorageUnits.innerHTML = '';
    externalStorageUnits.innerHTML = '';
    for (var i = 0; i < storageInfo.length; i++) {
      var storageUnitHtml = '<div>' + storageInfo[i].name +
          (storageInfo[i].capacity ? ' - ' + formatBytes(storageInfo[i].capacity) : '') + '</div>';
      if (storageInfo[i].type === 'removable') {
        externalStorageUnits.innerHTML += storageUnitHtml;
      } else {
        internalStorageUnits.innerHTML += storageUnitHtml;
      }
    }

    var internalStorage = document.querySelector('#internal-storage');
    if (internalStorageUnits.textContent === '') {
      internalStorage.classList.add('hidden');
    } else {
      internalStorage.classList.remove('hidden');
    }
    var externalStorage = document.querySelector('#external-storage');
    if (externalStorageUnits.textContent === '') {
      externalStorage.classList.add('hidden');
    } else {
      externalStorage.classList.remove('hidden');
    }
  });
}

function initCpu() {
  chrome.system.cpu.getInfo(function(cpuInfo) {

    var cpuName = cpuInfo.modelName;
    document.querySelector('#cpu-name').textContent = cpuName;

    var cpuArch = cpuInfo.archName.replace(/_/g, '-');
    document.querySelector('#cpu-arch').textContent = cpuArch;

    var cpuFeatures = cpuInfo.features.join(', ').toUpperCase().replace(/_/g, '.') || '-';
    document.querySelector('#cpu-features').textContent = cpuFeatures;

    var cpuUsage = document.querySelector('#cpu-usage');
    var width = parseInt(window.getComputedStyle(cpuUsage).width.replace(/px/g, ''));
    for (var i = 0; i < cpuInfo.numOfProcessors; i++) {
      var bar = document.createElement('div');
      bar.classList.add('bar');
      var usedSection = document.createElement('span');
      usedSection.classList.add('bar-section', 'used');
      usedSection.style.transform = 'translate(-' + width + 'px, 0px)';
      bar.appendChild(usedSection);
      cpuUsage.appendChild(bar);
    }
  });
}

function updateCpuUsage() {
  chrome.system.cpu.getInfo(function(cpuInfo) {

    var cpuUsage = document.querySelector('#cpu-usage');
    var width = parseInt(window.getComputedStyle(cpuUsage).width.replace(/px/g, ''));
    for (var i = 0; i < cpuInfo.numOfProcessors; i++) {
        var usage = cpuInfo.processors[i].usage;
        var usedSectionWidth = 0;
      if (previousCpuInfo) {
        var oldUsage = previousCpuInfo.processors[i].usage;
        usedSectionWidth = Math.floor((usage.kernel + usage.user - oldUsage.kernel - oldUsage.user) / (usage.total - oldUsage.total) * 100);
      } else {
        usedSectionWidth = Math.floor((usage.kernel + usage.user) / usage.total * 100);
      }
      var bar = cpuUsage.querySelector('.bar:nth-child(' + (i + 1) + ')');
      bar.querySelector('.used').style.transform = 'translate(' + parseInt(usedSectionWidth * width / 100 - width) + 'px, 0px)';
    }
    previousCpuInfo = cpuInfo;
  });
}


function initMemory() {
  chrome.system.memory.getInfo(function(memoryInfo) {

    document.querySelector('#memory-capacity').textContent = formatBytes(memoryInfo.capacity);

    var memoryUsage = document.querySelector('#memory-usage');
    var bar = document.createElement('div');
    bar.classList.add('bar');
    var usedSection = document.createElement('span');
    usedSection.classList.add('bar-section', 'used');
    bar.appendChild(usedSection);
    memoryUsage.appendChild(bar);
  });
}

function updateMemoryUsage() {
  chrome.system.memory.getInfo(function(memoryInfo) {

    var memoryUsage = document.querySelector('#memory-usage');
    var usedMemory = 100 - Math.round(memoryInfo.availableCapacity / memoryInfo.capacity * 100);
    memoryUsage.querySelector('.used').style.width = usedMemory + '%';
  });
};


function updateAll() {
  updateCpuUsage();
  updateMemoryUsage();
  updateStorage();

  timeoutId = setTimeout(updateAll, 500);
}

chrome.runtime.onSuspend.addListener(function() {
  clearTimeout(timeoutId);
});

chrome.runtime.onSuspendCanceled.addListener(function() {
  updateAll();
});

window.initSystemInfo = () => {
  initInfo();
  initBattery();
  initCpu();
  initMemory();
  updateAll();
}