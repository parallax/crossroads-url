var assert     = require('assert');
var Router     = require('../crossroads-url');
var crossroads = require('crossroads');
var Window     = require('window-location');

var testUrl =
	'http://localhost:8080/things/0/stuff/0?whatsits=1#majiggers';

describe('Router', function() {

	function getRouter() {
		return new Router();
	}

	/**
	 * Mock for requirejs
	 *
	 * Should probably improve this
	 */
	function getRequire(controllers) {
		return function require(modules, cb) {
			var name       = modules[0];
			var controller = name.substr('controllers/'.length);
			var module     = controllers[controller];

			setTimeout(function() {
				cb(module);
			});
		}
	}

	function getRouterWithRequire(controllers) {
		var router = new Router();
		var window = new Window();

		window.require = getRequire(controllers);

		router.window = window;
		router.window.location = testUrl;

		return router;
	}

	describe('#normalise()', function() {
		it('should not mutate objects', function() {
			var obj  = {};
			var json = JSON.stringify(obj);

			getRouter().normalise(obj);

			assert.equal(json, JSON.stringify(obj));
		});

		it(
			'should turn a controller an action into correct object',
			function() {
				assert.equal(JSON.stringify({
					controller : 'Foo',
					action     : 'bar'
				}), JSON.stringify(getRouter().normalise('Foo', 'bar')));
			}
		);

		it('should turn a controller into correct object', function() {
			assert.equal(JSON.stringify({
				controller : 'Foo',
				action     : 'init'
			}), JSON.stringify(
				getRouter().normalise('Foo')
			));
		});

		it('should add an action to config object', function() {
			assert.equal(JSON.stringify({
				controller : 'Foo',
				action     : 'init'
			}), JSON.stringify(
				getRouter().normalise({
					controller: 'Foo'
				})
			));
		});

		it('should do nothing to a valid config object', function() {
			assert.equal(JSON.stringify({
				controller : 'Foo',
				action     : 'bar'
			}), JSON.stringify(
				getRouter().normalise({
					controller : 'Foo',
					action     : 'bar'
				})
			));
		});
	});

	describe('#getCrossroads()', function() {

		it('should return the passed instance of crossroads', function() {
			var cr     = crossroads.create();
			var router = new Router(undefined, cr);

			assert.equal(cr, router.getCrossroads());
		});
	});

	describe('#getFragment()', function() {
		function getWindow() {
			var window = new Window();

			// Magic going on under the hood here
			window.location = testUrl;

			return window;
		}

		it('should error if we have not mocked window', function() {
			var msg;

			try {
				getRouter().getFragment();
			} catch (e) {
				msg = e.message;
			}

			assert.equal('Need to mock window for node', msg);
		});

		it('should extract fragment from URL', function() {
			var router = new Router();
			router.window = getWindow();

			assert('/things/0/stuff/0', router.getFragment());
		});

		it('should remove base URL from fragmnt', function() {
			var router = new Router('/things/0');
			router.window = getWindow();

			assert('/stuff/0', router.getFragment());
		});
	});

	describe('#on()', function() {

		it('should work with a url and callback', function() {
			var val = 0;

			var router = getRouter()
				.on('/a', function() {
					val += 1;
				})
				.on('/b', function() {
					val += 2;
				})
				.on('/c', function() {
					val -= 1;
				})

			
			router.run('/a');

			assert.equal(val, 1);

			router.run('/b');

			assert.equal(val, 3);

			router.run('/c');

			assert.equal(val, 2);
		});

		it('should not failing when running routes with no callbacks', function() {
			getRouter().run('/a');
		});

		it('should work with multiple URLs and a callback', function() {

			var val = 0;

			getRouter()
				.on(['/a', '/b'], function() {
					val += 1;
				})
			.run(['/a', '/b']);

			assert.equal(val, 2);
		});

		it('should work with one URL and multiple callbacks', function() {
			var val = 0;

			getRouter()
				.on('/a', [
					function() { val += 1; },
					function() { val += 2; }
				])
			.run('/a');

			assert.equal(val, 3);
		});

		it('should work with multiple URLs and multiple callbacks', function() {
			var val = 0;

			getRouter()
				.on(['/a', '/b'], [
					function() { val += 2; },
					function() { val += 1; }
				])
			.run(['/a', '/b'])

			assert.equal(val, 6);
		});
	});

	describe('#callFunctions()', function() {
		it('should pass all arguments to called functions', function() {
			var i = 0;

			var fns = [function(j) {
				i += j;
			}, function(k) {
				i += k - 1;
			}];

			var router = new Router();
			var cb     = router.callFunctions(fns);

			cb(3);

			assert(5, i);
		});
	});

	describe('#fallback()', function() {
		it('should call a function when no routes are found', function() {

			var val = 0;

			getRouter().fallback(function() {
				val += 2;
			}).run('/a');

			assert.equal(2, val);
		});

		it('should work with multiple fallback urls', function() {

			var val = 0;

			getRouter().fallback([function() {
				val += 2;
			}, function() {
				val += 3;
			}]).run('/a');

			assert.equal(5, val);
		});

		it(
			'should work with multiple fallback urls as multiple calls',
			function() {

				var val = 0;

				getRouter().fallback(function() {
					val += 2;
				}).fallback(function() {
					val += 3;
				}).run('/a');

				assert.equal(5, val);
			}
		);

		it('should work when there are assigned routes', function() {
			var val = 0;

			getRouter()
				.fallback(function() { val += 2; })
				.on('/a', function() { val -= 1; })
			.run('/b');

			assert.equal(2, val);
		});

		it('should not call the fallback if a route is matched', function() {
			var val = 0;

			getRouter()
				.fallback(function() { val += 2; })
				.on('/a', function() { val -= 1; })
			.run('/a');

			assert.equal(-1, val);
		});
	});

	describe('#controllerHandler()', function() {
		it('should call a method on an object', function(done) {

			var val = 0;

			var router = getRouterWithRequire({
				Foo: {
					init: function() {
						val = val + 1;
					}
				}
			});

			var fn = router.controllerHandler({
				controller : 'Foo',
				action     : 'init'
			});

			fn().then(function() {
				assert.equal(1, val);
				done();
			}).done();
		});

		it('should pass the old fragment and new frag along', function(done) {
			var val = 0;
			var frag;
			var cFrag;

			var router = getRouterWithRequire({
				Foo: {
					init: function(oldFrag, currentFrag) {
						cFrag = currentFrag;
						val   = val + 1;
					},

					second: function(oldFrag) {
						frag = oldFrag;
					}
				}
			});

			var fn = router.controllerHandler({
				controller : 'Foo',
				action     : 'init'
			});

			var fn2 = router.controllerHandler({
				controller : 'Foo',
				action     : 'second'
			})

			fn().then(function() {
				assert.equal(1, val);

				return fn2();
			}).then(function() {
				assert.equal('/things/0/stuff/0', frag);
				assert.equal('/things/0/stuff/0', cFrag);
				done();
			}).done();
		});

		it('should unload old controllers', function(done) {
			var val = 0;

			var router = getRouterWithRequire({
				Foo: {
					init: function(oldFrag, currentFrag) {
						val = val + 1;
					},

					second: function(oldFrag) {
						
					},

					unload: function() {
						val = val - 1;
					}
				}
			});

			var fn = router.controllerHandler({
				controller : 'Foo',
				action     : 'init'
			});

			var fn2 = router.controllerHandler({
				controller : 'Foo',
				action     : 'second'
			});


			fn().then(function() {
				assert.equal(1, val);

				return fn2();
			}).then(function() {
				assert.equal(0, val);
				done();
			}).done();
		});
	});

	describe('#controller()', function() {
		it('should work with a URL and controller name', function(done) {

			var val = 0;

			var router = getRouterWithRequire({
				Foo: {
					init: function() {
						val = val + 1;
					}
				}
			});
			
			router.controller('/a', 'Foo');

			router.run('/a').then(function() {
				assert.equal(1, val);

				done();
			}).done();
		});

		it(
			'should work with a URL and controller+action name',
			function(done) {

				var val = 0;

				var router = getRouterWithRequire({
					Foo: {
						bar: function() {
							val = val + 1;
						}
					}
				});
				
				router.controller('/a', 'Foo', 'bar');			

				router.run('/a').then(function() {
					assert.equal(1, val);

					done();
				}).done();
			}
		);

		it(
			'should work with a URL config object',
			function(done) {

				var val = 0;

				var router = getRouterWithRequire({
					Foo: {
						init: function() {
							val = val + 1;
						}
					}
				});
				
				router.controller('/a', { controller: 'Foo' });

				router.run('/a').then(function() {
					assert.equal(1, val);

					done();
				}).done();
			}
		);

		it(
			'should work with a URL config object + action',
			function(done) {

				var val = 0;

				var router = getRouterWithRequire({
					Foo: {
						bar: function() {
							val = val + 1;
						}
					}
				});
				
				router.controller('/a', { controller: 'Foo', action: 'bar' });			

				router.run('/a').then(function() {
					assert.equal(1, val);

					done();
				}).done();
			}
		);

		it('should work with multiple URLs', function(done) {

			var val = 0;

			var router = getRouterWithRequire({
				Foo: {
					init: function() {
						val = val + 1;
					}
				}
			});
			
			router.controller(['/a', '/b'], 'Foo');			

			router.run('/a').then(function() {
				assert.equal(1, val);

				return router.run('/b');
			}).then(function() {
				assert.equal(2, val);

				done();
			}).done();
		});
	});
	
	describe('#fallback()', function() {
		it('should work when there are no routes', function(done) {

			var val = 0;

			var router = getRouterWithRequire({
				Foo: {
					init: function() {
						val = val + 1;
					}
				}
			});
			
			router.fallbackController('Foo');

			router.run('/a').then(function() {
				assert.equal(1, val);

				done();
			}).done();
		});

		it(
			'should work when there are routes but route is not matched',
			function(done) {

				var val = 0;

				var router = getRouterWithRequire({
					Foo: {
						init: function() {
							val = val + 1;
						}
					}
				});
				
				router.controller('/a', 'Foo');			
				router.fallbackController('Foo');

				router.run('/b').then(function() {
					assert.equal(1, val);
					done();
				}).done();
			}
		);
	});
});