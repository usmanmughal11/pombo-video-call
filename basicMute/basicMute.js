// create Agora client
var client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
const paramToken = localStorage.getItem('token');
var localTracks = {
  videoTrack: null,
  audioTrack: null
};

var localTrackState = {
  videoTrackEnabled: true,
  audioTrackEnabled: true
}

var remoteUsers = {};
var options = {

  appid: '1f8a8fc62e154378b9aa4315a6977233',
  channel: 'channel',
  uid: null,
  token: paramToken
};

// the demo can auto join channel with params in url
$(document).ready(function(){

  // $("#join-form").submit();
})
$(() => {
  // var urlParams = new URL(location.href).searchParams;
  // options.appid = urlParams.get("appid");
  // options.channel = urlParams.get("channel");
  // options.token = urlParams.get("token");
  // options.uid = urlParams.get("uid");
  // if (options.appid && options.channel) {
    // $("#uid").val(options.uid);
    // $("#appid").val(options.appid);
    // $("#token").val(options.token);
    // $("#channel").val(options.channel);
  // }

})


function joinCall(){
  // e.preventDefault();
  // $("#join").attr("disabled", true);
  try {
    // options.appid = $("#appid").val();
    // options.token = $("#token").val();
    // options.channel = $("#channel").val();
    // options.uid = $("#uid").val();
     join();
    if(options.token) {
      // $("#success-alert-with-token").css("display", "block");
    } else {
      // $("#success-alert a").attr("href", `index.html?appid=${options.appid}&channel=${options.channel}&token=${options.token}`);
      // $("#success-alert").css("display", "block");
    }
  } catch (error) {
    console.error(error);
  } finally {
    $("#leave").attr("disabled", false);
  }
};

joinCall();
$("#leave").click(function (e) {
  leave();
});

$(".mute-remote-audio").click(function (e) {
  muteRemoteAudio();
  // if (localTrackState.audioTrackEnabled) {
  // } else {
  //   unmuteAudio();
  // }
});

$("#mute-audio").click(function (e) {
  if (localTrackState.audioTrackEnabled) {
    muteAudio();
  } else {
    unmuteAudio();
  }
});

$("#mute-video").click(function (e) {
  if (localTrackState.videoTrackEnabled) {
    muteVideo();
  } else {
    unmuteVideo();
  }
})


async function join() {
  // add event listener to play remote tracks when remote users join, publish and leave.
  client.on("user-published", handleUserPublished);
  client.on("user-joined", handleUserJoined);
  client.on("user-left", handleUserLeft);

  // join a channel and create local tracks, we can use Promise.all to run them concurrently
  [ options.uid, localTracks.audioTrack, localTracks.videoTrack ] = await Promise.all([
    // join the channel
    client.join(options.appid, options.channel, options.token || null, options.uid || null),
    // create local tracks, using microphone and camera
    AgoraRTC.createMicrophoneAudioTrack(),
    AgoraRTC.createCameraVideoTrack()
  ]);

  showMuteButton();
  
  // play local video track
  localTracks.videoTrack.play("local-player");
  $("#local-player-name").text(`localVideo(${options.uid})`);

  // publish local tracks to channel
  await client.publish(Object.values(localTracks));
  console.log("publish success");
}

async function leave() {
  for (trackName in localTracks) {
    var track = localTracks[trackName];
    if(track) {
      track.stop();
      track.close();
      localTracks[trackName] = undefined;
      localStorage.clear();
      window.location.href = 'home-test.html';
    }
  }

  // remove remote users and player views
  remoteUsers = {};
  $("#remote-playerlist").html("");

  // leave the channel
  await client.leave();

  $("#local-player-name").text("");
  // $("#join").attr("disabled", false);
  $("#leave").attr("disabled", true);
  hideMuteButton();
  console.log("client leaves channel success");
}

async function subscribe(user, mediaType) {
  const uid = user.uid;
  const userObj = user;
  // subscribe to a remote user
  await client.subscribe(user, mediaType);
  console.log("subscribe success");


  // if the video wrapper element is not exist, create it.
  if (mediaType === 'video') {
    if ($(`#player-wrapper-${uid}`).length === 0) {
      const player = $(`
        <div class="vid-col" id="player-wrapper-${uid}">
          <p class="player-name">remoteUser(${uid})</p>
          <a href="javascript:;" class="dots" id="showRemoteControls-${uid}">
            <i></i>
            <i></i>
            <i></i>
          </a>
          <div class='remote-user-controls hide' id="remoteUserControls-${uid}">
            <a href='javascript:;' class="video-mute-remote" id="videoMuteRemote-${uid}"><img src="../assets/imgs/video.png" alt=""></a>
            <a href='javascript:;' class="mute-remote" id="muteRemote-${uid}"><img src="../assets/imgs/mic.png" alt=""></a>
            <a href='javascript:;'><img src="../assets/imgs/chat.png" alt=""></a>
            <a href='javascript:;' class="hide-remote-controls" id="hideRemoteControls-${uid}">...</a>
          </div>
          <div id="player-${uid}" class="player"></div>
        </div>
      `);
      $("#remote-playerlist").append(player);
    }
    $(document).on('click',`#muteRemote-${uid}`, function(){
      if($(this).hasClass('active')){
        
        unmuteRemoteAudio(userObj);
      } else {
        
        muteRemoteAudio(userObj);
      }
      $(this).toggleClass('active');
    })

    $(document).on('click',`#videoMuteRemote-${uid}`, function(){
      if($(this).hasClass('active')){
        
        unmuteRemoteVideo(userObj);
      } else {
        
        muteRemoteVideo(userObj);
      }
      $(this).toggleClass('active');
    })
    
   
    $(document).on('click',`#showRemoteControls-${uid}`, function(){
      $(`#remoteUserControls-${uid}`).removeClass('hide');
      $(`#showRemoteControls-${uid}`).addClass('hide')
    })

    $(document).on('click',`#hideRemoteControls-${uid}`, function(){
      $(`#remoteUserControls-${uid}`).addClass('hide');
      $(`#showRemoteControls-${uid}`).removeClass('hide')


    })
    
    // play the remote video.
    user.videoTrack.play(`player-${uid}`);
  }
  if (mediaType === 'audio') {
    user.audioTrack.play();
  }
}



function handleUserJoined(user) {
  const id = user.uid;
  remoteUsers[id] = user;
}

function handleUserLeft(user) {
  const id = user.uid;
  delete remoteUsers[id];
  $(`#player-wrapper-${id}`).remove();
}

function handleUserPublished(user, mediaType) {
  subscribe(user, mediaType);
}

function hideMuteButton() {
  $("#mute-video").css("display", "none");
  $("#mute-audio").css("display", "none");
}

function showMuteButton() {
  $("#mute-video").css("display", "inline-block");
  $("#mute-audio").css("display", "inline-block");
}

async function muteAudio() {
  if (!localTracks.audioTrack) return;
  await localTracks.audioTrack.setEnabled(false);
  localTrackState.audioTrackEnabled = false;
  // MuteRemoteVideoStream();
  $("#mute-audio").addClass("active");
}

function muteOther(user){
  alert(user)
  console.log(user);
}

async function muteRemoteAudio(remoteTracks) {
  console.log(remoteTracks);
  // MuteRemoteAudioStream (remoteTracks, true)
  await remoteTracks.audioTrack.stop(`player-${remoteTracks.uid}`);
  console.log(remoteTracks);
  // remoteTracks.audioTrackEnabled = false;
  // if (!remoteTracks.audioTrack) return;
  // MuteRemoteVideoStream();
  // $("#mute-audio").addClass("active");
}

async function unmuteRemoteAudio(remoteTracks) {
  console.log(remoteTracks);
  // MuteRemoteAudioStream (remoteTracks, true)
  await remoteTracks.audioTrack.play(`player-${remoteTracks.uid}`);
  console.log(remoteTracks);
}
async function muteRemoteVideo(remoteTracks) {
  await remoteTracks.videoTrack.stop(`player-${remoteTracks.uid}`);
}
async function unmuteRemoteVideo(remoteTracks) {
  await remoteTracks.videoTrack.play(`player-${remoteTracks.uid}`);
}
async function muteVideo() {
  if (!localTracks.videoTrack) return;
  await localTracks.videoTrack.setEnabled(false);
  localTrackState.videoTrackEnabled = false;
  $("#mute-video").addClass("active");
}

async function unmuteAudio() {
  if (!localTracks.audioTrack) return;
  await localTracks.audioTrack.setEnabled(true);
  localTrackState.audioTrackEnabled = true;
  $("#mute-audio").removeClass("active");
}

async function unmuteVideo() {
  if (!localTracks.videoTrack) return;
  await localTracks.videoTrack.setEnabled(true);
  localTrackState.videoTrackEnabled = true;
  $("#mute-video").removeClass("active");
}
$('.minimize').on('click',function(){
  if($(this).hasClass('active')){
    $(this).removeClass('active');
    $('.call-controls').removeClass('minimized');
  } else {
    $(this).addClass('active');
    $('.call-controls').addClass('minimized');
  }
})