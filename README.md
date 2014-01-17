crossroads-url
==============

Crossroads-based URL router

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

	router.controller('/products/{id}/edit', 'product', 'edit');
	router.run();
});
```

Under the hood, this will require a module with the name `controllers/product`, and then trigger the edit method on the controller with the passed id.

You can also define a fallback controller/action, which will be triggered if there not route is matched

```js

define('controllers/default', {
	alert: function() {
        console.warn('No route found!');
    }
})

router.fallbackController('default', 'alert');
```

You can also use the router more traditionally (passing a function)

```js
router.on('/products/{id}/edit', function(id) {
	// ...
});
```

Again, you can specify a fallback if no routes are found

```js
router.fallback(function() {
	console.warn('No route found!');
});
```

## Unloading

This router is designed to work with both tranditional sites (rendered on the server), and more advanced SPA-based sites.

For a more traditional site, you don't need to worry about cleaning up after yourself. However, with SPA sites, you have to worry about detaching events and whatnot. This router provides a method to do this. Unfortunately, this is only supported within the controller usage, not the `on` and `fallback` methods. 

If you define a controller and it has an `unload` method, it'll be triggered when you move away from the route.

### Example

```js
define('controllers/product_edit', {
	init: function(id) {
	    app.attachSomeEventListener(); // Just an example
    },

    unload: function() {
   		app.removeSomeEventListener(); // Again, just an example 	
    }
});

router.controller('/products/{id}/edit', 'product_edit');
```

### Todo

The unloading system needs a lot of work right now. For example, the unload method is controller-specific, not action-specific. Ideally, you'd be able to specific an unload method per action. 