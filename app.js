"use strict";

document.addEventListener("DOMContentLoaded", renderApp);

const COUNT_BY_PODCASTS = {};
const USER_DICT = {};
const PODCAST_DICT = {}

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
      const podcasts = Array.from(pods.querySelectorAll("outline"));
      const titles = podcasts.map(pod => pod.getAttribute("title"));

      // update user podcasts (not used right now, but could be useful later)
      USER_DICT[user.username].podcasts = titles;

      for (let podcast of podcasts) {
        const title = podcast.getAttribute("title");
        // update overall count
        if (!COUNT_BY_PODCASTS[title]) {
          COUNT_BY_PODCASTS[title] = {
            count: 1,
            users: [user.username],
          };
        } else {
          COUNT_BY_PODCASTS[title] = {
            count: COUNT_BY_PODCASTS[title].count + 1,
            users: [...COUNT_BY_PODCASTS[title].users, user.username],
          };
        }
        // update podcast directory details
        PODCAST_DICT[title] = {
          rss_url: podcast.getAttribute("xmlUrl"),
          site_url: podcast.getAttribute("htmlUrl"),
        }
      }
      // sort by count
      const sortedPods = Object.keys(COUNT_BY_PODCASTS).sort((a, b) => COUNT_BY_PODCASTS[b].count - COUNT_BY_PODCASTS[a].count);
      // render them again
      const podlist_el = document.getElementById("podlist");
      podlist_el.innerHTML = "";
      for (let pod of sortedPods) {
        const li = document.createElement("li");
        li.classList = "flex flex-row space-x-2 p-3 bg-white shadow rounded-lg group-hover:text-blue-200"
        const user_images = COUNT_BY_PODCASTS[pod].users.map(user => `<img class="w-5 h-5 rounded-full" src="${USER_DICT[user].avatar_url}" />`).join("");
        const rss_link = `<a target="_blank" href="${PODCAST_DICT[pod].rss_url}" class="bg-yellow-100 text-yellow-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">RSS</a>`
        const site_link = `<a target="_blank" href="${PODCAST_DICT[pod].site_url}" class="bg-purple-100 text-purple-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-purple-900 dark:text-purple-300">Website</a>`
        li.innerHTML = `<span>${pod}: ${COUNT_BY_PODCASTS[pod].count} </span>${rss_link}${site_link}${user_images}`;
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



