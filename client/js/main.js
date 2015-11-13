// Require react and UI components
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux'
import App from './app.js';

// Require model
import { createStore, combineReducers } from 'redux';
import { gotoScreen, gotoEditScreen,
  gotoNextScreen, queueNextScreen,
  setUser, addActivity } from './actions.js';
import { screens, user, activities } from './reducers.js';

// Require core logic
import objectDB from './objectdb.js';
import models from './models.js';
import m from './m.js';

import { SCREEN } from './screens.js';

let store = createStore(combineReducers({screens, user, activities}));

store.subscribe(() => console.log(store.getState()));

// Give models hacky access while refactoring
models.setStore(store);

let db = objectDB.open('db-1');

// TODO: Ideally remove this by moving to a redux persistence library
// TODO: Handle the session token expiring
// Note objectDB does not use actual promises so we can't properly chain this
db.get().then((data) => {
  let sessionToken = data.sessionToken;
  let userName = data.userName;
  let userId = data.userId;
  let loggedIn = !(sessionToken == null || userId == null || userName == null);
  if (loggedIn) {
    store.dispatch(setUser(userId, userName, sessionToken));
    models.tryRefreshActivities(userId, sessionToken, () => {
      store.dispatch(gotoScreen(SCREEN.list));
    }, () => {});
  } else {
    store.dispatch(gotoScreen(SCREEN.loggedOut));
  }
});

render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('appShell')
);
