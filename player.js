/* Simple prototype for an Audiobook Player based on <audio> */

(function() {

  if (navigator.serviceWorker) {
    //HINT: Make sure that the path to your Service Worker is correct
    navigator.serviceWorker.register('sw.js');
  
    navigator.serviceWorker.ready.then(function() {
      console.log('SW ready');
    }); 
  };
  
  var DEFAULT_MANIFEST = "https://hadriengardeur.github.io/audiobook-manifest/examples/flatland.audiobook/manifest.json";
  var current_url_params = new URLSearchParams(location.href);

  if (current_url_params.has("href")) {
    console.log("Found manifest in params")
    var manifest_url = current_url_params.get("href");
  } else {
    var manifest_url = DEFAULT_MANIFEST;
  };

  if (current_url_params.has("track")) {
    console.log("Found reference to a document in params")
    var track = current_url_params.get("track");
  } else {
    var track = undefined;
  };
  
  var audio = document.getElementById("audio-element");
  var audio_source = document.getElementById("audio-source");
  var cover = document.getElementById("cover");
  var next = document.getElementById("next");
  var previous = document.getElementById("previous");

  if (navigator.serviceWorker) verifyAndCacheManifest(manifest_url).catch(function() {});

  var saved_track = localStorage.getItem(manifest_url+"#track");
  var saved_position = localStorage.getItem(manifest_url+"#t");
  if (saved_position && saved_track)
  {
    console.log("Found previous position at: "+saved_track+"#t="+saved_position)
    initializeNavigation(manifest_url, saved_track).then(
      function() { audio.currentTime = saved_position }).catch(function() {});
  } else {
    initializeNavigation(manifest_url, track).catch(function() {});
  }

  audio.addEventListener("timeupdate", function() {
    if (Math.round(audio.currentTime)%10==1) {
      localStorage.setItem(manifest_url+"#t", audio.currentTime);
    }
  });

  audio.addEventListener("ended", function() {
    if (next.hasAttribute("href")) {
      updateTrack(manifest_url, next.href).then(function() {
        audio.play();
      });
    };Ò
  });

  next.addEventListener("click", function(event) {
    if (next.hasAttribute("href")) {
      updateTrack(manifest_url, next.href).then(function() {
        audio.play()
      });
    };
    event.preventDefault();
  });

  previous.addEventListener("click", function(event) {
    if ( previous.hasAttribute("href")) {
      updateTrack(manifest_url, previous.href).then(function() {
        audio.play()
      });
    };
    event.preventDefault();
  });

  function getManifest(url) {
    return fetch(url).catch(function() {
      return caches.match(url);
    }).then(function(response) {
      return response.json();
    })
  };

  function verifyAndCacheManifest(url) {
    return caches.open(url).then(function(cache) {
      return cache.match(url).then(function(response){
        if (!response) {
          console.log("No cache key found");
          console.log('Caching manifest at: '+url);
          return cacheManifest(url);
        } else {
          console.log("Found cache key");
        };
      })
    });
  };
  
  function cacheURL(data, manifest_url) {
    return caches.open(manifest_url).then(function(cache) {
      return cache.addAll(data.map(function(url) {
        console.log("Caching "+url);
        return new URL(url, manifest_url);
      }));
    });
  };

  function cacheManifest(url) {
    var manifestJSON = getManifest(url);
    return Promise.all([cacheSpine(manifestJSON, url), cacheResources(manifestJSON, url)])
  };

  function cacheSpine(manifestJSON, url) {
    return manifestJSON.then(function(manifest) {
      return manifest.spine.map(function(el) { return el.href});}).then(function(data) {
        data.push(url);
        return cacheURL(data, url);})
  };

  function cacheResources(manifestJSON, url) {
    return manifestJSON.then(function(manifest) {
      return manifest.resources.map(function(el) { return el.href});}).then(function(data) {return cacheURL(data, url);})
  };

  function initializeNavigation(url, track_url) {
    return getManifest(url).then(function(json) { 
      var title = json.metadata.title;
      console.log("Title of the publication: "+title);
      document.querySelector("title").textContent = title;

      //Search for cover and add it
      json.links.forEach(function(link) {
        if (link.rel) {
          if (link.rel=="cover") {
            console.log("Found cover: "+link.href);
            cover.src = new URL(link.href, url).href;
          }
        }
      }, this);
      
      return json.spine;
    }).then(function(spine) {
      
      //Set start track
      var start_url = new URL(spine[0].href, url).href;

      if (track_url) {
        updateTrack(url, track_url);
      } else {
        updateTrack(url, start_url);
      }

    });
  };

  function updateTrack(url, current) {
    console.log("Getting "+url)
    if (current) {
      var current_src = current;
    } else {
      var current_src = audio_source.src;
    }
    return getManifest(url).then(function(json) { return json.spine} ).then(function(spine) {

      var current_index = spine.findIndex(function(element) {
        var element_url = new URL(element.href, url);
        return element_url.href == current_src;
      })
      
      if (current_index >= 0) {

        audio_source.src = new URL(spine[current_index].href, url).href;
        localStorage.setItem(url+"#track", audio_source.src);
        audio_source.type = spine[current_index].type;
        audio.load();

        if (current_index > 0) {
          console.log("Previous track is: "+spine[current_index - 1].href);
          previous.href = new URL(spine[current_index - 1].href, url).href;
        } else {
          previous.removeAttribute("href");
        };
        
        if (current_index < (spine.length-1)) {
          console.log("Next track is: "+spine[current_index + 1].href);
          next.href = new URL(spine[current_index + 1].href, url).href;
        } else {
          next.removeAttribute("href");
        };
      }
    });
  };

}());