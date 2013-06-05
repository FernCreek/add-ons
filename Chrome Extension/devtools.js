// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// The function below is executed in the context of the inspected page.
var view_getProperties = function () {
  var view = window.SC && $0 ? SC.View.views[$0.id] : null,
    data = {};

  if (!view && window.SC && $0) {
    var node = $0,
      parentNode;

    while (parentNode = node.parentNode) {
      // Keep trying.
      view = SC.View.views[parentNode.id];
      if (view) { break; }
      node = parentNode;
    }
  }

  if (view) {
    var keys,
        localObservers = {},
        observers = {},
        bindingObservers = {},
        bindings = [],
        foundLayerIds = [],
        innerNode,
        innerParentNode,
        innerView;

    // Assign variables for easy access.
    window.$0v = view;
    window.$0pv = view.get('parentView');

    // Default information for all views.
    data = {
      classNames: view.get('classNames'),
      layerId: view.get('layerId'),
      '  Class': SC._object_className(view.constructor),
      layout: SC.stringFromLayout(view.get('layout')),
      frame: SC.stringFromRect(view.get('frame')),
      isEnabled: view.get('isEnabled')
      // theme: view.get('theme').name
    };
    
    // Dig even deeper and construct layerids up the chain
    innerNode = $0;
    while (innerParentNode = innerNode.parentNode) {
      // Keep trying.
      innerView = SC.View.views[innerParentNode.id];
      if (innerView) {
        foundLayerIds.push('//' + innerView.get('tagName') + '[@id=' + innerView.get('layerId') + '] ... (' + innerView.get('constructor') + ')');
      }
      innerNode = innerParentNode;
    }

    if (foundLayerIds.length) {
      data['xPathsUpTheChain'] = foundLayerIds;
    }
    
    // If the view wants accelerated layer, indicate if it got it.
    if (view.get('wantsAcceleratedLayer')) {
      data.hasAcceleratedLayer = view.get('hasAcceleratedLayer');
    }

    // If there are no display properties, don't show it
    if (view.get('displayProperties').length) {
      data.displayProperties = view.get('displayProperties');
    }

    // Pull out observers.
    keys = view._kvo_observed_keys;
    keys.forEach(function(key) {
      var kvoKey = '_kvo_local_' + key,
          observer = view[kvoKey],
          observerTarget,
          observerFn,
          bindingPath;

      if (observer !== undefined) {
        if (!localObservers[key]) {
          localObservers[key] = [];
        }
        observer.forEach(function(o) {
          localObservers[key].push(o);
        });
      } else {
        kvoKey = '_kvo_observers_' + key;
        observer = view[kvoKey];

        if (observer !== undefined) {
          observer.members.forEach(function(o) {
            observerTarget = o[0];
            observerFn = o[1];

            if (observerTarget instanceof SC.Binding.constructor) {
              if (!bindingObservers[key]) {
                bindingObservers[key] = [];
              }
              bindingPath = observerTarget._toRoot !== view ?
                  '--> <%@>:%@'.fmt(observerTarget._toRoot, observerTarget._toPropertyPath) :
                  '--> %@'.fmt(observerTarget._toPropertyPath);
              bindingObservers[key].push({ binding: bindingPath, rawBinding: observerTarget });
            } else if (observerFn === view.displayDidChange) {
              // This is a display property. No-op.
            } else {
              if (!observers[key]) {
                observers[key] = [];
              }
              observers[key].push({ target: observerTarget, method: observerFn.toString() });
            }
          });
        }
      }
    });

    keys = Object.keys(localObservers);
    if (keys.length) {
      data['Local Observers (' + keys.length + ')'] = localObservers;
    }
    keys = Object.keys(observers);
    if (keys.length) {
      data['Observers (' + keys.length + ')'] = observers;
    }
    keys = Object.keys(bindingObservers);
    if (keys.length) {
      data['Binding Observers (' + keys.length + ')'] = bindingObservers;
    }

    // Pull out bindings.
    for (var i = 0, len = view._bindings.length; i < len; i++) {
      var binding = view[view._bindings[i]],
        from = binding._fromRoot ? "<%@>:%@".fmt(binding._fromRoot,binding._fromPropertyPath) : binding._fromPropertyPath,
        to = binding._toPropertyPath,
        oneWay = binding._oneWay ? '-' : '>';

      bindings.push("%@ <-%@ %@ (SC.Binding#%@)".fmt(to, oneWay, from, SC.guidFor(binding)));
    }

    if (bindings.length) {
      data[' Bindings'] = bindings;
    }

    // Show the currentState if on 1.10+
    if (view.get('currentState')) {
      var stateName;

      switch (view.get('currentState')) {
      case SC.CoreView.ATTACHED_SHOWING:
        stateName = "ATTACHED_SHOWING";
        break;
      case SC.CoreView.ATTACHED_HIDING:
        stateName = "ATTACHED_HIDING";
        break;
      case SC.CoreView.ATTACHED_HIDDEN:
        stateName = "ATTACHED_HIDDEN";
        break;
      case SC.CoreView.ATTACHED_HIDDEN_BY_PARENT:
        stateName = "ATTACHED_HIDDEN_BY_PARENT";
        break;
      case SC.CoreView.ATTACHED_BUILDING_IN:
        stateName = "ATTACHED_BUILDING_IN";
        break;
      case SC.CoreView.ATTACHED_BUILDING_OUT:
        stateName = "ATTACHED_BUILDING_OUT";
        break;
      case SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT:
        stateName = "ATTACHED_BUILDING_OUT_BY_PARENT";
        break;
      case SC.CoreView.ATTACHED_SHOWN:
        stateName = "ATTACHED_SHOWN";
        break;
      default:
        stateName = "";
      }

      data.currentState = stateName;
    }

    // Show action/target if supported.
    if (view.get('action')) {
      data.action = view.get('action');
      data.target = view.get('target');
    }

    if (view.get('title')) {
      data.title = view.get('title');
      data.displayTitle = view.get('displayTitle');
    }

    if (view.get('length')) {
      data.length = view.get('length');
    }

    if (view.get('icon')) {
      data.icon = view.get('icon');
    }

    if (view.get('tooltip')) {
      data.tooltip = view.get('tooltip');
    }

    if (view.get('value')) {
      data.value = view.get('value');
    }
  } else {
    // Clean up.
    delete window.$0v;
    delete window.$0pv;
  }

  return data;
};


// Create the sidebar
chrome.devtools.panels.elements.createSidebarPane( "SC.View Properties",
  function(sidebar) {
    function updateElementProperties() {
      sidebar.setExpression("(" + view_getProperties.toString() + ")()");
    }

    updateElementProperties();

    chrome.devtools.panels.elements.onSelectionChanged.addListener(updateElementProperties);
  }
);
