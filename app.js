"use strict";

document.addEventListener("DOMContentLoaded", renderApp);

function renderApp() {
  console.log("app!"); 
}

function fetchSomething(apiUrl, cb) {
  const xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function () {
    if (xmlhttp.readyState === XMLHttpRequest.DONE) {
      const status = xmlhttp.status;
      if (status === 0 || (status >= 200 && status < 400)) {
        const results = JSON.parse(xmlhttp.responseText);
        cb(results);
      } else {
        cb("error!");
      }
    }
  };
  xmlhttp.open("GET", apiUrl);
  xmlhttp.onerror = (err) => cb(err);
  xmlhttp.send();
}
