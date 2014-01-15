(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['lodash', 'crossroads', 'eventEmitter', 'q'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(
            require('lodash'),
            require('crossroads'),
            require('wolfy87-eventemitter'),
            require('q')
        );

    } else {
        root.Router = factory(
            root._,
            root.crossroads,
            root.EventEmitter
        );
    }
}(this, function(_, crossroads, EventEmitter, Q) {

    /**
     * Crossroads-based URL router
     *
     * @param {string}     base The base url. Defaults to ''
     * @param {Crossroads} cr   Pass in a custom crossroads instance
     * @param {Object} config Extra configuration
     */
    function Router(base, cr, config) {
        // Bind all methods so we don't need to worry
        // about context.
        _.bindAll.apply(_, [this].concat(_.functions(this)));

        // Create an instance of crossroads if one is not passed
        cr = cr || crossroads.create();

        // Assign cr to a property to use throughout.
        // Is hidden.
        // @see Router#getCrossroads
        this._cr = cr;

        // Assign the base as a property to use
        this.base = base || '';

        // If we're in the browser, use the default window object
        // otherwise it'll be mocked, but that's for the tests to do
        if (typeof window !== 'undefined') {
            this.window = window;
        }

        // Communicate outwards somehow
        this.messages = new EventEmitter();

        // Store the baseControllerUrl
        this.baseControllerUrl = 'controllers/';

        _.extend(this, config || {});
    }

    _.extend(Router.prototype, {

        /**
         * Normalise config for controller methods. 
         *
         * #1
         *
         * @param {Object} config {
         *     @param {string} controller Name of the controller
         *     @param {string} action     Name of the action.
         *                                Defaults to "init"
         * }
         *
         * @param {string} action Name of the action. Defaults to "init"
         *
         * or
         *
         * #2
         *
         * @param {string} controller Name of the controller
         * @param {action} action     Name of the action, defaults to "init"
         */
        normalise: function(config, action) {

            // If we've been passed a controller instead of a config
            // object, turn it into a config object.
            if (typeof config === 'string') {
                config = {
                    controller: config
                };
            }

            // Avoid mutating the passed object
            config = _.extend({}, config);

            // If we've been passed an action, add it to the config object
            if (action) {
                config.action = action;
            }

            // Add the default action to the config object
            config.action = config.action || 'init';

            return config;
        },

        /**
         * Get the fragment from the window location
         * @return {String}
         */
        getFragment: function() {

            // Throw an error if we haven't mocked the window object
            if (!this.window) {
                throw new Error('Need to mock window for node');
            }

            return this.window.location.pathname.substr(this.base.length);
        },

        /**
         * Return the passed instance of crossroads
         * @return {Crossroads}
         */
        getCrossroads: function() {
            return this._cr;
        },

        /**
         * This function takes an array of functions and returns a function
         * that calls them all with the correct context an arguments
         * @param  {Array}    callbacks The array of functions to call
         * @return {Function}           The function that will call them
         */
        callFunctions: function(callbacks) {
            return function callFunctionsClosure() {
                var _args = arguments;
                var _this = this;
                var res = [];

                _.each(callbacks, function(callback) {
                    res.push(callback.apply(_this, _args));
                });

                return res;
            }
        },

        /**
         * This function handles a route.
         * @param  {String}   url
         * @param  {Function} callback
         *
         * @todo Explain this a bit more
         * @todo Add test for this
         */
        handleRoute: function(url, callback) {

            var messages = this.messages;

            return function handleRouteClosure() {
                var val = callback.apply(this, arguments);

                messages.emit('route', url, val);

                return val;
            };
        },

        /**
         * This routes a simple URL or set of URLs to a callback or set
         * of callbacks.
         * @param  {Array|string}   urls      A single url or an array of
         *                                    URLs to route on
         * @param  {Array|Function} callbacks A single function or an array
         *                                    of functions to call for the
         *                                    passed URLs
         * @return {Router}                   this for chaining
         */
        on: function(urls, callbacks) {
            // Get the instance of crossroads
            var cr = this.getCrossroads();

            // Make sure we've dealing with arrays regardless of the 
            // passed arguments
            urls      = toArray(urls);
            callbacks = toArray(callbacks);

            // Generate a callback which will call all of our callbacks
            // as crossroads stops after the first match
            var callFunctions = this.callFunctions(callbacks);

            // Store reference to conrext
            var router = this;

            // Add each of our URls to crossroads
            _.each(urls, function(url) {
                cr.addRoute(url, router.handleRoute(url, callFunctions));
            });

            return this;
        },

        /**
         * This assigns a set of fallback functions when no route is matched
         * @param  {Array|Function} callbacks A single or set of functions
         *                                    to be called when no routes are
         *                                    matched
         * @return {Router}                   this for chaining
         *
         * @todo Move fallbackClosure to a separate function
         */
        fallback: function(callbacks) {
            var cr          = this.getCrossroads();
            var messages    = this.messages;

            callbacks = toArray(callbacks);

            cr.bypassed.add(function fallbackClosure(url) {

                var _this = this;
                var _args = arguments;

                var vals = _.map(callbacks, function(callback) {
                    return callback.apply(_this, _args);
                });

                messages.emit('bypassed', url, vals);
            });

            return this;
        },

        /**
         * This function generates a function that will handle a controller
         * @param  {Object} config Config for the
         *                         controller (controller, action)
         * @return {Function}      Function that handles the controller
         *
         * @todo Look at making location of controllers more configurable
         */
        controllerHandler: function(config) {
            // Store a safe reference to the router
            var router = this;

            var base = this.baseControllerUrl;

            return function controllerHandlerClosure() {
                // Store our arguments and convert them to an array
                // so that we can play with them
                var args = _.toArray(arguments);

                // Create a promise to represent the return value of the
                // controller
                var deferred = Q.defer();

                // Lets grab the controller from requirejs
                router.window.require(
                    [base + config.controller],
                    function(controller) {
                        // Grab some variables from the router
                        var oldFrag       = router.currentFragment;
                        var oldController = router.currentController;
                        var newFrag       = router.getFragment();

                        // Add the oldFrag and newFrag to start of the array
                        var args = _.merge([oldFrag, newFrag], args);

                        // If we have an old controller, try to unload it
                        if (oldController && oldController.unload) {
                            oldController.unload.apply(oldController, args);
                        }

                        // Grab the method from the controller
                        var method = controller[config.action];

                        // If we have no method, throw an error
                        if (!method) {
                            throw new Error(
                                'Cannot find action ' + config.action +
                                ' on controller ' + config.controller
                            );
                        }

                        var val = method.apply(controller, args);

                        // Do some post call stuff
                        router.messages.emit('controller', config);
                        router.currentController = controller;
                        router.currentFragment   = newFrag;

                        deferred.resolve(val);
                    }
                );
                
                return deferred.promise;
            }
        },

        /**
         * Assign a controller for a set of urls
         *
         * @see Router#normalise and Router#on for method signature
         */
        controller: function(urls, config, action) {
            config = this.normalise(config, action);

            this.on(urls, this.controllerHandler(config));

            return this;       
        },

        /**
         * Assign a fallback controller
         *
         * @see Router#normalise and Router#fallback for method signature
         */
        fallbackController: function(config, action) {
            config = this.normalise(config, action);

            this.fallback(this.controllerHandler(config));

            return this;
        },

        /**
         * Run the routes against a set of urls URL
         * @param  {string|array} urls URL to match again, default to
         *                             Router#getFragment
         */
        run: function(urls) {
            urls = toArray(urls || this.getFragment());

            var messages = this.messages;
            var cr       = this.getCrossroads();

            var promises = _.map(urls, function(url) {
                var deferred = Q.defer();

                messages.defineEvents(['bypassed', 'route']);

                // This won't always be the event for the current URL so
                // we'll use the one we're passed
                messages.once(/(bypassed)|(route)/, function(url, res) {

                    var promise = _.isArray(res) ? Q.all(res) : Q(res);

                    promise.then(function(res) {
                        deferred.resolve({
                            url     : url,
                            result  : res
                        });
                    });
                });

                cr.parse(url);

                return deferred.promise;
            });

            return Q.all(promises);
        }
    });

    /**
     * This function converts anything to an array by:
     *
     *  1. if it's a primitive, wrap it an array with the passed item
     *     as the only item.
     *  2. If it's not a primitive, delegate to _.toArray
     */
    function toArray(item) {

        if (typeof item === 'object') {
            return _.toArray(item);
        }

        return [item];
    };

    return Router;

}));