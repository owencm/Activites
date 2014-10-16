var ListenerModule = function () {
  return (function () {
    var listeners = [];
    var change = function () {
      listeners.map(function (listener){
        listener();
      });
    };
    var addListener = function (listener) {
      listeners.push(listener);
    };
    return {
      addListener: addListener,
      change: change
    };
  })();
};

var models = (function () {
  var userId;
  var setUserId = function (newUserId) {
    userId = newUserId;
  };
  var getUserId = function () {
    return userId;
  }
  var setSessionToken = function (sessionToken) {
    network.setSessionToken(sessionToken);
  };
  var startLogin = function (fbToken, success, failure) {
    network.login(fbToken, success, failure);
  };

  var activities = (function () {
    var activities = [];
    var listenerModule = ListenerModule();
    var addActivity = function (activity) {
      if (!validate(activity)) {
        throw Error('Invalid activity attempted to be added');
      }
      activities.push(activity);
      // TODO(owen): insert at the right point to maintain date sort rather than this hack
      fixActivitiesOrder();
      listenerModule.change();
    };
    var removeActivity = function (activity_id) {
      activities = activities.filter(function(activity) {
        return (activity.activity_id !== activity_id);
      });
      listenerModule.change();
    };
    var getActivity = function (activity_id) { 
      return activities.filter(function (activity) { return activity.activity_id == activity_id; } )[0];
    };
    var getActivities = function () {
      return activities;
    };
    var setActivities = function (newActivities) {
      activities = newActivities;
      listenerModule.change();
    };
    var tryCreateActivity = function (newActivity, success, failure) {
      var validity = validate(newActivity);
      if (validity.isValid) {
        network.requestCreateActivity(newActivity, success, failure);
      } else {
        failure();
      }
    };
    var tryUpdateActivity = function (activity_id, activityChanges, success, failure) {
      network.requestUpdateActivity(activity_id, activityChanges, success, failure);
    };
    var trySetAttending = function (activity_id, attending, success, failure) {
      network.requestSetAttending(activity_id, attending, success, failure);
    };
    var setAttending = function (activity_id, attending) {
      throw('Should not be changing is_attending on client side');
      var activity = getActivity(activity_id);
      activity.is_attending = !activity.is_attending;
      listenerModule.change();
    };
    // TODO: Make me much more efficient plz!
    var fixActivitiesOrder = function () {
      activities.sort(function(activityA, activityB) {
        a = new Date(activityA.start_time).getTime();
        b = new Date(activityB.start_time).getTime();
        if (a < b) {
          return -1;
        } else if (b < a) {
          return 1;
        } else {
          return (activityA.activity_id < activityB.activity_id) ? -1 : 1;
        }
      });
      activities.reverse();
    };
    var validate = function (activity) {
      // TODO: Validate values of the properties
      // TODO: Validate client generated ones separately to server given ones
      var properties = ['max_attendees', 'description', 'start_time', 'title', 'location'];
      var hasProperties = properties.reduce(function(previous, property) { 
        return (previous && activity.hasOwnProperty(property)); 
      }, true);
      return {isValid: hasProperties};
    };
    var tryRefreshActivities = function (success, failure) {
      network.getActivitiesFromServer(success, failure);
    }
    return {
      tryRefreshActivities: tryRefreshActivities,
      tryCreateActivity: tryCreateActivity,
      tryUpdateActivity: tryUpdateActivity,
      trySetAttending: trySetAttending,
      setAttending: setAttending,
      setActivities: setActivities,
      getActivities: getActivities,
      getActivity: getActivity,
      addActivity: addActivity,
      removeActivity: removeActivity,
      addListener: listenerModule.addListener,
    }
  })();
  return {
    activities: activities,
    getUserId: getUserId,
    setUserId: setUserId,
    setSessionToken: setSessionToken,
    startLogin: startLogin
  }
})();