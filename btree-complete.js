/**
 * BehaviorTree.js
 * https://github.com/Calamari/BehaviorTree.js
 *
 * Copyright 2013, Georg Tavonius
 * Licensed under the MIT license.
 *
 * Includes Dean Edward's Base.js, version 1.1a
 * Copyright 2006-2010, Dean Edwards
 * License: http://www.opensource.org/licenses/mit-license.php
 *
 * Version: 0.7
 */
/*
  Base.js, version 1.1a
  Copyright 2006-2010, Dean Edwards
  License: http://www.opensource.org/licenses/mit-license.php
*/

var Base = function() {
  // dummy
};

Base.extend = function(_instance, _static) { // subclass
  var extend = Base.prototype.extend;

  // build the prototype
  Base._prototyping = true;
  var proto = new this;
  extend.call(proto, _instance);
  proto.base = function() {
    // call this method from any other method to invoke that method's ancestor
  };
  delete Base._prototyping;

  // create the wrapper for the constructor function
  //var constructor = proto.constructor.valueOf(); //-dean
  var constructor = proto.constructor;
  var klass = proto.constructor = function() {
    if (!Base._prototyping) {
      if (this._constructing || this.constructor == klass) { // instantiation
        this._constructing = true;
        constructor.apply(this, arguments);
        delete this._constructing;
      } else if (arguments[0] != null) { // casting
        return (arguments[0].extend || extend).call(arguments[0], proto);
      }
    }
  };

  // build the class interface
  klass.ancestor = this;
  klass.extend = this.extend;
  klass.forEach = this.forEach;
  klass.implement = this.implement;
  klass.prototype = proto;
  klass.toString = this.toString;
  klass.valueOf = function(type) {
    //return (type == "object") ? klass : constructor; //-dean
    return (type == "object") ? klass : constructor.valueOf();
  };
  extend.call(klass, _static);
  // class initialisation
  if (typeof klass.init == "function") klass.init();
  return klass;
};

Base.prototype = {
  extend: function(source, value) {
    if (arguments.length > 1) { // extending with a name/value pair
      var ancestor = this[source];
      if (ancestor && (typeof value == "function") && // overriding a method?
        // the valueOf() comparison is to avoid circular references
        (!ancestor.valueOf || ancestor.valueOf() != value.valueOf()) &&
        /\bbase\b/.test(value)) {
        // get the underlying method
        var method = value.valueOf();
        // override
        value = function() {
          var previous = this.base || Base.prototype.base;
          this.base = ancestor;
          var returnValue = method.apply(this, arguments);
          this.base = previous;
          return returnValue;
        };
        // point to the underlying method
        value.valueOf = function(type) {
          return (type == "object") ? value : method;
        };
        value.toString = Base.toString;
      }
      this[source] = value;
    } else if (source) { // extending with an object literal
      var extend = Base.prototype.extend;
      // if this object has a customised extend method then use it
      if (!Base._prototyping && typeof this != "function") {
        extend = this.extend || extend;
      }
      var proto = {toSource: null};
      // do the "toString" and other methods manually
      var hidden = ["constructor", "toString", "valueOf"];
      // if we are prototyping then include the constructor
      var i = Base._prototyping ? 0 : 1;
      while (key = hidden[i++]) {
        if (source[key] != proto[key]) {
          extend.call(this, key, source[key]);

        }
      }
      // copy each of the source object's properties to this object
      for (var key in source) {
        if (!proto[key]) extend.call(this, key, source[key]);
      }
    }
    return this;
  }
};

// initialise
Base = Base.extend({
  constructor: function() {
    this.extend(arguments[0]);
  }
}, {
  ancestor: Object,
  version: "1.1",

  forEach: function(object, block, context) {
    for (var key in object) {
      if (this.prototype[key] === undefined) {
        block.call(context, object[key], key, object);
      }
    }
  },

  implement: function() {
    for (var i = 0; i < arguments.length; i++) {
      if (typeof arguments[i] == "function") {
        // if it's a function, call it
        arguments[i](this.prototype);
      } else {
        // add the interface using the extend method
        this.prototype.extend(arguments[i]);
      }
    }
    return this;
  },

  toString: function() {
    return String(this.valueOf());
  }
});

(function(exports) {
  /*globals Base */
  

  /**
    TODO next things:
      - random selector
      - decorator node
      - condition node
      - make/script for minifying and compiling
  */

  var countUnnamed = 0;
  var BehaviorTree = Base.extend({
    constructor: function(config) {
      this.title = config.title || 'btree' + (++countUnnamed);
      this._rootNode = config.tree;
      this._object = config.object;
    },
    setObject: function(obj) {
      this._object = obj;
    },
    step: function() {
      if (this._started) {
        console.log('the BehaviorTree "' + this.title + '" did call step but one Task did not finish on last call of step.');
      }
      this._started = true;
      var node = BehaviorTree.getNode(this._rootNode);
      this._actualNode = node;
      node.setControl(this);
      node.start(this._object);
      node.run(this._object);
    },
    running: function(runningNode) {
      this._started = false;
    },
    success: function() {
      this._actualNode.end(this._object);
      this._started = false;
    },
    fail: function() {
      this._actualNode.end(this._object);
      this._started = false;
    }
  });
  BehaviorTree._registeredNodes = {};
  BehaviorTree.register = function(name, node) {
    if (typeof name === 'string') {
      this._registeredNodes[name] = node;
    } else {
      // name is the node
      this._registeredNodes[name.title] = name;
    }
  };
  BehaviorTree.getNode = function(name) {
    var node = name instanceof BehaviorTree.Node ? name : this._registeredNodes[name];
    if (!node) {
      console.log('The node "' + name + '" could not be looked up. Maybe it was never registered?');
    }
    return node;
  };

  exports.BehaviorTree = BehaviorTree;
}(window));
(function(exports) {/*globals Base */


  
  var Node = Base.extend({
    constructor: function(config) {
      // let config override instance properties
      this.base(config);
    },
    start: function() {},
    end: function() {},
    run: function() { console.log("Warning: run of " + this.title + " not implemented!"); this.fail(); },
    setControl: function(control) {
      this._control = control;
    },
    running: function() {
      this._control.running(this);
    },
    success: function() {
      this._control.success();
    },
    fail: function() {
      this._control.fail();
    }
  });

  exports.Node = Node;

/*globals Base */


  
  var BranchNode = exports.Node.extend({
    constructor: function(config) {
      this.base(config);
      this.children = this.nodes || [];
    },
    start: function() {
      this._actualTask = 0;
    },
    run: function(object) {
      this._object = object;
      this.start();
      if (this._actualTask < this.children.length) {
        this._run(object);
      }
      this.end();
    },
    _run: function() {
      var node = exports.getNode(this.children[this._actualTask]);
      this._runningNode = node;
      node.setControl(this);
      node.start(this._object);
      node.run(this._object);
    },
    running: function(node) {
      this._nodeRunning = node;
      this._control.running(node);
    },
    success: function() {
      this._runningNode.end(this._object);
    },
    fail: function() {
      this._runningNode.end(this._object);
    }
  });

  exports.BranchNode = BranchNode;

/*globals Base */


  
  var Priority = exports.BranchNode.extend({
    success: function() {
      this.base();
      this._control.success();
    },
    fail: function() {
      this.base();
      ++this._actualTask;
      if (this._actualTask < this.children.length) {
        this._run(this._object);
      } else {
        this._control.fail();
      }
    }
  });

  exports.Priority = Priority;

/*globals Base */


  
  var Sequence = exports.BranchNode.extend({
    _run: function() {
      if (this._nodeRunning) {
        this._nodeRunning.run(this._object);
        this._nodeRunning = null;
      } else {
        this.base();
      }
    },
    success: function() {
      this.base();
      ++this._actualTask;
      if (this._actualTask < this.children.length) {
        this._run(this._object);
      } else {
        this._control.success();
      }
    },
    fail: function() {
      this.base();
      this._control.fail();
    }
  });

  exports.Sequence = Sequence;

/*globals Base */


  
  var Task = exports.Node.extend({
  });

  exports.Task = Task;

}(BehaviorTree));