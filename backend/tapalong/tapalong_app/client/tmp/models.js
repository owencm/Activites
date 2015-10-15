'use strict';

var Date = require('datejs');
var ListenerModule = require('./listener.js');
var network = require('./network.js');
var objectDB = require('./objectdb.js');

var startLogin = function startLogin(fbToken, success, failure) {
  network.login(fbToken, success, failure);
};
var hasNotificationPermission = function hasNotificationPermission(success, failure) {
  return hasPushPermission(success, failure);
};

var user = (function () {
  var userId;
  var userName;
  var sessionToken;
  var listenerModule = ListenerModule();
  var setUserId = function setUserId(newUserId) {
    userId = newUserId;
    var db = objectDB.open('db-1');
    db.put('userId', userId);
    listenerModule.change();
  };
  var getUserId = function getUserId() {
    return userId;
  };
  var setUserName = function setUserName(newUserName) {
    userName = newUserName;
    listenerModule.change();
  };
  var getUserName = function getUserName() {
    return userName;
  };
  var setSessionToken = function setSessionToken(newSessionToken) {
    sessionToken = newSessionToken;
    var db = objectDB.open('db-1');
    db.put('sessionToken', sessionToken);
    listenerModule.change();
  };
  var getSessionToken = function getSessionToken() {
    return sessionToken;
  };
  return {
    setUserId: setUserId,
    getUserId: getUserId,
    setUserName: setUserName,
    getUserName: getUserName,
    setSessionToken: setSessionToken,
    getSessionToken: getSessionToken,
    addListener: listenerModule.addListener
  };
})();

// TODO: Check that all the activities are still valid with an interval
var activities = (function () {
  var activities = [];
  var listenerModule = ListenerModule();
  var maxActivityId = 0;
  var addActivity = function addActivity(activity) {
    var validity = validateNewActivity(activity);
    if (!validity.isValid) {
      throw Error('Invalid activity attempted to be added: ' + validity.reason);
    }
    activity.id = maxActivityId++;
    activities.push(activity);
    // TODO(owen): insert at the right point to maintain date sort rather than this hack
    fixActivitiesOrder();
    listenerModule.change();
  };
  // Use this so we don't trigger two change events when we remove and readd
  var updateActivity = function updateActivity(id, newActivity) {
    var validity = validateNewActivity(newActivity);
    if (!validity.isValid) {
      throw Error('Invalid activity attempted to be updated: ' + validity.reason);
    }
    if (newActivity.id !== id) {
      throw new Error('Tried to update an activity to a new activity whose id didn\'t match');
    }
    for (var i = 0; i < activities.length; i++) {
      if (activities[i].id == id) {
        // Instead of modifying the one activity, maybe just splice the array and replace it?
        activities[i] = newActivity;
      };
    }
    fixActivitiesOrder();
    listenerModule.change();
  };
  var removeActivity = function removeActivity(id) {
    activities = activities.filter(function (activity) {
      return activity.id !== id;
    });
    listenerModule.change();
  };
  var getActivity = function getActivity(id) {
    return activities.filter(function (activity) {
      return activity.id == id;
    })[0];
  };
  var getActivities = function getActivities() {
    return activities;
  };
  var getActivitiesCount = function getActivitiesCount() {
    return activities.length;
  };
  var setActivities = function setActivities(newActivities) {
    activities = newActivities.filter(function (activity) {
      var validity = validateNewActivity(activity);
      if (!validity.isValid) {
        console.log('Not showing activity ' + activity.activity_id + ' from server because ' + validity.reason);
      } else {
        activity.id = maxActivityId++;
      }
      return validity.isValid;
    });
    fixActivitiesOrder();
    listenerModule.change();
  };
  var tryCreateActivity = function tryCreateActivity(newActivity, success, failure) {
    var validity = validateNewActivity(newActivity);
    if (validity.isValid) {
      console.log(newActivity);
      network.requestCreateActivity(newActivity, success, failure);
    } else {
      console.log('activity wasn\'t valid because ' + validity.reason, newActivity);
      failure();
    }
  };
  var tryUpdateActivity = function tryUpdateActivity(activity, activityChanges, success, failure) {
    network.requestUpdateActivity(activity, activityChanges, success, failure);
  };
  var trySetAttending = function trySetAttending(activity, attending, optimistic, success, failure) {
    network.requestSetAttending(activity, attending, optimistic, success, failure);
  };
  var setAttending = function setAttending(id, attending) {
    throw 'Should not be changing is_attending on client side';
    var activity = getActivity(id);
    activity.is_attending = !activity.is_attending;
    listenerModule.change();
  };
  var tryCancelActivity = function tryCancelActivity(activity, success, failure) {
    network.requestCancelActivity(activity, success, failure);
  };
  // TODO: Make me much more efficient plz!
  var fixActivitiesOrder = function fixActivitiesOrder() {
    activities.sort(function (activityA, activityB) {
      a = new Date(activityA.start_time).getTime();
      b = new Date(activityB.start_time).getTime();
      if (a > b) {
        return -1;
      } else if (b > a) {
        return 1;
      } else {
        return activityA.id < activityB.id ? -1 : 1;
      }
    });
    activities.reverse();
  };
  var validateNewActivity = function validateNewActivity(activity) {
    // TODO: Validate values of the properties
    // TODO: Validate client generated ones separately to server given ones
    var properties = ['max_attendees', 'description', 'start_time', 'title', 'location'];
    var hasProperties = properties.reduce(function (previous, property) {
      return previous && activity.hasOwnProperty(property);
    }, true);
    if (!hasProperties) {
      return { isValid: false, reason: 'some properties were missing' };
    }
    if (activity.title == '') {
      return { isValid: false, reason: 'missing title' };
    }
    if (!activity.start_time || !(activity.start_time instanceof Date)) {
      return { isValid: false, reason: 'start_time wasnt a date object or was missing' };
    }
    if (activity.start_time && activity.start_time instanceof Date) {
      // Allow users to see and edit events up to 2 hours in the past
      console.log(activity.start_time);
      var now = new Date();
      now = now.add(-2).hours();
      if (activity.start_time < now) {
        return { isValid: false, reason: 'date (' + activity.start_time.toString() + ') was in the past' };
      }
    }
    return { isValid: true };
  };
  var tryRefreshActivities = function tryRefreshActivities(success, failure) {
    network.getActivitiesFromServer(success, failure);
  };
  return {
    tryRefreshActivities: tryRefreshActivities,
    tryCreateActivity: tryCreateActivity,
    tryUpdateActivity: tryUpdateActivity,
    trySetAttending: trySetAttending,
    tryCancelActivity: tryCancelActivity,
    setAttending: setAttending,
    setActivities: setActivities,
    getActivities: getActivities,
    getActivitiesCount: getActivitiesCount,
    getActivity: getActivity,
    addActivity: addActivity,
    removeActivity: removeActivity,
    updateActivity: updateActivity,
    addListener: listenerModule.addListener
  };
})();

// hasActivitiesFromFriends: hasActivitiesFromFriends
module.exports = {
  activities: activities,
  user: user,
  startLogin: startLogin,
  hasNotificationPermission: hasNotificationPermission
};
//# sourceMappingURL=models.js.map
