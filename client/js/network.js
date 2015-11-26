require('datejs');

let requestLogin = function (fbToken) {
  return new Promise((resolve, reject) => {
    sendRequest('/../v1/login/', 'post', JSON.stringify({fb_token: fbToken}), undefined, function() {
      if(this.status >= 200 && this.status < 400) {
        let response = JSON.parse(this.responseText);
        resolve({userId: response.user_id, userName: response.user_name, sessionToken: response.session_token});
      } else {
        reject();
        throw ('login request failed');
      }
    });
  })
};

let requestActivitiesFromServer = function (user, success, failure) {
  let parseActivitiesFromJSON = function (responseText) {
    // Strip activity label for each item
    let activities = JSON.parse(responseText).map(function (activity) {
      // Note the list looks like [{activity: {...}}, ...]
      // Parse the datetimes into actual objects.
      activity.activity.start_time = new Date(activity.activity.start_time);
      return activity.activity;
    });
    return activities;
  };

  sendRequest('/../v1/activities/visible_to_user/', 'get', '', user, function() {
    if (this.status >= 200 && this.status < 400) {
      // TODO: Check this actually succeeded
      let activities = parseActivitiesFromJSON(this.responseText);
      success(activities);
    } else {
      failure();
    }
  });
};

let requestCreateActivity = function (user, activity, success, failure) {
  sendRequest('/../v1/activities/visible_to_user/', 'post', JSON.stringify(activity), user, function() {
    if(this.status >= 200 && this.status < 400) {
      let activity = JSON.parse(this.responseText).activity;
      activity.start_time = new Date(activity.start_time);
      success(activity);
    } else {
      console.log('Server error: ', this.responseText)
      failure();
    }
  });
};

let requestSetAttending = function (user, activity, attending, success, failure) {
  sendRequest('/../v1/activities/'+activity.activity_id+'/attend/', 'post', JSON.stringify({attending: attending}), user, function () {
    if(this.status >= 200 && this.status < 400) {
      let updatedActivity = JSON.parse(this.responseText).activity;
      updatedActivity.start_time = new Date(updatedActivity.start_time);
      updatedActivity.id = activity.id;
      success(updatedActivity);
    } else {
      failure();
    }
  });
};

let requestUpdateActivity = function(user, activity, activityChanges, success, failure) {
  sendRequest('/../v1/activities/'+activity.activity_id+'/', 'post', JSON.stringify(activityChanges), user, function () {
    if(this.status >= 200 && this.status < 400) {
      let updatedActivity = JSON.parse(this.responseText).activity;
      updatedActivity.start_time = new Date(updatedActivity.start_time);
      updatedActivity.id = activity.id;
      success(updatedActivity);
    } else {
      failure();
    }
  });
};

let requestCancelActivity = function (user, activity, success, failure) {
  sendRequest('/../v1/activities/'+activity.activity_id+'/cancel/', 'post', '', user, function () {
    if(this.status >= 200 && this.status < 400) {
      success(activity);
    } else {
      failure();
    }
  })
};

let requestCreatePushNotificationsSubscription = function (user, subscription) {
  console.log(subscription, JSON.stringify(subscription));
  sendRequest('/../v1/push_subscriptions/', 'post', JSON.stringify(subscription), user, function () {});
};

let sendRequest = function (url, method, body, user, onload) {
  let req = new XMLHttpRequest();
  req.onload = onload;
  req.open(method, url, true);
  // The user isn't logged in when they are logging in
  if (user) {
    req.setRequestHeader('Session-Token', user.sessionToken);
    req.setRequestHeader('User-Id', user.userId);
  }
  req.setRequestHeader('Content-Type', 'application/json');
  req.send(body);
}

let sendToServiceWorker = function (data) {
  navigator.serviceWorker.controller.postMessage(data);
}

module.exports = {
  requestActivitiesFromServer,
  requestCreateActivity,
  requestSetAttending,
  requestUpdateActivity,
  requestCancelActivity,
  requestCreatePushNotificationsSubscription,
  requestLogin
};
