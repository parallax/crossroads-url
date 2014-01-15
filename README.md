crossroads-url
==============

Crossroads-based URL router

## Not Yet Documented

 1. Unload

## Installation

This is currently private, but when it's registered you should be able to do this.

    bower install crossroads-url --save

## Dependencies

Bower should handle dependencies for you, but if you wish to use this outside of bower, you will need the following

 1. Crossroads (obviously)
 2. Lodash (Must be lodash, not underscore)
 3. RequireJS
 4. [eventEmitter](https://github.com/Wolfy87/EventEmitter)

## Usage

```js

define('controllers/product', {
	edit: function(id) {
        // ...
    }
});

require(['crossroads-url'], function(Router) {

	var router = new Router(base); // The base URL, can just be an empty string

	router.controller('/products/{id}/edit', 'product');
});
```

Under the hood, this will require a module with the name `controllers/CONTROLLER NAME`.