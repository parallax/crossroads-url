crossroads-url
==============

Crossroads-based URL router

## Not Yet Documented

 1. Unload
 2. Complex URLs

## Installation

This is currently private, but when it's registered you should be able to do this.

    bower install croassroads-url

For now, you must do this

    bower install git@github.com:parallax/crossroads-url.git

## Dependencies

Bower should handle dependencies for you, but if you wish to use this outside of bower, you will need the following

 1. Crossroads (obviously)
 2. Lodash (Must be lodash, not underscore)
 3. RequireJS
 4. [eventEmitter](https://github.com/Wolfy87/EventEmitter)

## Usage

```js
require(['crossroads-url'], function(Router) {

	var router = new Router(base); // The base URL, can just be an empty string

	router.controller('/url', 'Controller Name', 'Controller Action');

	// or

	route.controller('/url', {
		controller : 'Controller Name',
		action     : 'Controller Action'
	});

	// or

	router.controller(['/url1', '/url2'], {
		controller : 'Controller Name',
		action     : 'Controller Action'
	});

	// You can also specify a fallback controller

	router.fallbackController('/url', 'Controller Name', 'Controller Action');

});
```

Under the hood, this will require a module with the name "controllers/CONTROLLER NAME".