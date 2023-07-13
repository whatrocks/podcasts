"use strict";

document.addEventListener("DOMContentLoaded", renderApp);

const COUNT_BY_PODCASTS = {};
const PODCASTS_BY_USER = {};

async function renderApp() {
  // fetch all replies to a given cast with searchcaster
  // each reply should be url to xml opml file
  // for now hardcoded
  const url = "https://gist.githubusercontent.com/whatrocks/916d0108280e2af24e56d174d51b7634/raw/b735763cebdb79ed2d267e4836e005954e4f7d20/podcast.opml"
  const response = await fetchSomething(url);
  const my_parser = new DOMParser();
  const pods = my_parser.parseFromString(response, "text/xml");
  const podsArray = Array.from(pods.querySelectorAll("outline"));
  const titles = podsArray.map(pod => pod.getAttribute("title"));
  
  // update user podcasts
  PODCASTS_BY_USER["whatrocks"] = titles;
  // update overall count
  for (let title of titles) {
    if (!COUNT_BY_PODCASTS[title]) {
      COUNT_BY_PODCASTS[title] = 1;
    } else {
      COUNT_BY_PODCASTS[title] += 1;
    }
  }
  // sort by count
  COUNT_BY_PODCASTS["Connected"] = 3;
  const sortedPods = Object.keys(COUNT_BY_PODCASTS).sort((a, b) => COUNT_BY_PODCASTS[b] - COUNT_BY_PODCASTS[a]);
  // render them again
  const podlist_el = document.getElementById("podlist");
  podlist_el.innerHTML = "";
  for (let pod of sortedPods) {
    const li = document.createElement("li");
    li.innerHTML = `${pod}: ${COUNT_BY_PODCASTS[pod]}`;
    podlist_el.appendChild(li);
  }
  
}

function fetchSomething(apiUrl) {
  return new Promise(function (resolve, reject) {
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", apiUrl);
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState === XMLHttpRequest.DONE) {
        const status = xmlhttp.status;
        if (status === 0 || (status >= 200 && status < 300)) {
          resolve(xmlhttp.responseText);
        } else {
          reject({
            status: status,
            statusText: xmlhttp.statusText
          });
        };
      }
    }
    xmlhttp.onerror = function () {
      const status = xmlhttp.status;
      reject({
        status: status,
        statusText: xmlhttp.statusText
      })
    };
    xmlhttp.send();
  });
}



