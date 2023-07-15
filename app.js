"use strict";

document.addEventListener("DOMContentLoaded", renderApp);

// constants
const POCKET_CASTS = "Pocket Casts Feeds";
const OVERCAST = "Overcast Podcast Subscriptions";

// state
const COUNT_BY_PODCASTS = {};
const USER_DICT = {};
const PODCAST_DICT = {};

function parseOPML(opml) {
  return Array.from(opml.querySelectorAll("outline")).map((outline) => {
    const opml_type = opml.getElementsByTagName("title")[0].innerHTML;
    const parsed = {
      title:
        opml_type === POCKET_CASTS
          ? outline.getAttribute("text")
          : outline.getAttribute("title"),
      rss_url: outline.getAttribute("xmlUrl"),
    };
    if (opml_type === OVERCAST) {
      parsed["site_url"] = outline.getAttribute("htmlUrl");
    }
    return parsed;
  });
}
function parsePlist(plist) {
  return Array.from(plist.querySelectorAll("dict"))
    .filter((d) => !Array.from(d.children).some((c) => c.localName === "array"))
    .reduce((acc, next) => {
      const podcast = {};
      for (let i = 0; i < next.children.length; i++) {
        const el = next.children[i];
        if (el.localName === "key") {
          let key = el.innerHTML;
          const val = next.children[i + 1].innerHTML;
          if (key === "feedUrl") {
            key === "rss_url";
          }
          podcast[key] = val;
        }
      }
      if (podcast["feedUrl"]) {
        acc.push(podcast);
      }
      return acc;
    }, []);
}

function parseXML(xml) {
  const my_parser = new DOMParser();
  const xml_obj = my_parser.parseFromString(xml, "text/xml");
  const doc_type = xml_obj.documentElement.localName;
  return doc_type === "opml" ? parseOPML(xml_obj) : parsePlist(xml_obj);
}

async function renderApp() {
  // fetch all replies to a given cast with searchcaster
  const loading_el = document.getElementById("loading-status");
  loading_el.innerHTML =
    "Loading Farcaster data from Searchcaster (this takes ~20 seconds)...";
  const parentCastURL = `https://searchcaster.xyz/api/search?merkleRoot=0x7bd4ceb2843cfe73060d1d4e729119de96a40f78`;
  const resp = await fetchSomething(parentCastURL);
  loading_el.innerHTML = "Grabbing podcast data...";
  const parentCast = JSON.parse(resp);
  // for each reply, fetch the user's raw xml file
  for (let cast of parentCast.casts) {
    if (
      !cast.body.data.replyParentMerkleRoot ||
      !cast.body.data.text.startsWith("https://gist.githubusercontent")
    ) {
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
  loading_el.innerHTML = "";

  for (let caster of Object.keys(USER_DICT)) {
    const user = USER_DICT[caster];
    const url = user.opml_url;
    try {
      const response = await fetchSomething(url);
      const podcasts = parseXML(response);
      const titles = podcasts.map((pod) => pod.title);

      // update user podcasts (not used right now, but could be useful later)
      USER_DICT[user.username].podcasts = titles;

      for (let podcast of podcasts) {
        // update overall count
        if (!COUNT_BY_PODCASTS[podcast.title]) {
          COUNT_BY_PODCASTS[podcast.title] = {
            count: 1,
            users: [user.username],
          };
        } else if (
          COUNT_BY_PODCASTS[podcast.title].users.indexOf(user.username) === -1
        ) {
          COUNT_BY_PODCASTS[podcast.title] = {
            count: COUNT_BY_PODCASTS[podcast.title].count + 1,
            users: [...COUNT_BY_PODCASTS[podcast.title].users, user.username],
          };
        }
        // update podcast directory details
        if (!PODCAST_DICT[podcast.title]) {
          PODCAST_DICT[podcast.title] = {
            rss_url: podcast.rss_url,
            site_url: podcast.site_url,
          };
        } else {
          if (podcast.rss_url && !PODCAST_DICT[podcast.title].rss_url) {
            PODCAST_DICT[podcast.title].rss_url = podcast.rss_url;
          }
          if (podcast.site_url && !PODCAST_DICT[podcast.title].site_url) {
            PODCAST_DICT[podcast.title].site_url = podcast.site_url;
          }
        }
      }
      // sort by count
      const sortedPods = Object.keys(COUNT_BY_PODCASTS).sort(
        (a, b) => COUNT_BY_PODCASTS[b].count - COUNT_BY_PODCASTS[a].count
      );
      // render them again
      const podlist_el = document.getElementById("podlist");
      podlist_el.innerHTML = "";
      for (let pod of sortedPods) {
        const li = document.createElement("li");
        li.classList =
          "flex flex-row items-center space-x-2 p-3 bg-white shadow rounded-lg group-hover:text-blue-200";
        const user_images = COUNT_BY_PODCASTS[pod].users
          .map(
            (user) =>
              `<img class="w-5 h-5 rounded-full" src="${USER_DICT[user].avatar_url}" />`
          )
          .join("");
        const rss_link = PODCAST_DICT[pod].rss_url
          ? `<a target="_blank" href="${PODCAST_DICT[pod].rss_url}" class="bg-yellow-100 text-yellow-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">RSS</a>`
          : "";
        const site_link = PODCAST_DICT[pod].site_url
          ? `<a target="_blank" href="${PODCAST_DICT[pod].site_url}" class="bg-purple-100 text-purple-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-purple-900 dark:text-purple-300">Website</a>`
          : "";
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
            statusText: xmlhttp.statusText,
          });
        }
      }
    };
    xmlhttp.onerror = function () {
      const status = xmlhttp.status;
      reject({
        status: status,
        statusText: xmlhttp.statusText,
      });
    };
    xmlhttp.send();
  });
}
