"use strict";

document.addEventListener("DOMContentLoaded", renderApp);

const COUNT_BY_PODCASTS = {};
const USER_DICT = {};

async function renderApp() {
  // fetch all replies to a given cast with searchcaster
  const loading_el = document.getElementById("loading-status");
  loading_el.innerHTML = "Loading Farcaster data from Searchcaster (this takes ~20 seconds)...";
  const parentCastURL = `https://searchcaster.xyz/api/search?merkleRoot=0x7bd4ceb2843cfe73060d1d4e729119de96a40f78`;
  const resp = await fetchSomething(parentCastURL);
  loading_el.innerHTML = "Grabbing podcast data..."
  const parentCast = JSON.parse(resp);
  // for each reply, fetch the user's raw xml opml file
  for (let cast of parentCast.casts) {
    if (!cast.body.data.replyParentMerkleRoot || !cast.body.data.text.startsWith("https://gist.githubusercontent")) {
      continue;
    }
    const username = cast.body.username;
    const avatar_url = cast.meta.avatar;
    const opml_url = cast.body.data.text;
    USER_DICT[username] = {
      avatar_url,
      opml_url,
      username,
      podcasts: [],
    };
  }
  loading_el.innerHTML = ""

  for (let caster of Object.keys(USER_DICT)) {
    const user = USER_DICT[caster];
    const url = user.opml_url;
    try {
      const response = await fetchSomething(url);
      const my_parser = new DOMParser();
      const pods = my_parser.parseFromString(response, "text/xml");
      const podsArray = Array.from(pods.querySelectorAll("outline"));
      const titles = podsArray.map(pod => pod.getAttribute("title"));

      // update user podcasts
      USER_DICT[user.username].podcasts = titles;
      console.log(USER_DICT)
      // update overall count
      for (let title of titles) {
        if (!COUNT_BY_PODCASTS[title]) {
          COUNT_BY_PODCASTS[title] = {
            count: 1,
            users: [user.username],
          };
        } else {
          COUNT_BY_PODCASTS[title]  = {
            count: COUNT_BY_PODCASTS[title].count + 1,
            users: [...COUNT_BY_PODCASTS[title].users, user.username],
          };
        }
      }
      // sort by count
      const sortedPods = Object.keys(COUNT_BY_PODCASTS).sort((a, b) => COUNT_BY_PODCASTS[b].count - COUNT_BY_PODCASTS[a].count);
      // render them again
      const podlist_el = document.getElementById("podlist");
      podlist_el.innerHTML = "";
      for (let pod of sortedPods) {
        const li = document.createElement("li");
        li.classList = "flex flex-row space-x-2"
        const user_images = COUNT_BY_PODCASTS[pod].users.map(user => `<img class="w-5 h-5 rounded-full" src="${USER_DICT[user].avatar_url}" />`).join("");
        li.innerHTML = `<span>${pod}: ${COUNT_BY_PODCASTS[pod].count} </span>${user_images}`;
        podlist_el.appendChild(li);
      }
    } catch (err) {
      console.error(err);
    }
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



