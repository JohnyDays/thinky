var thinky = require('../lib/index.js');
var should = require('should');
var assert = require('assert');
var r = require('rethinkdb');
var _ = require('underscore');

thinky.init({})

describe('Document', function(){
    var Cat = thinky.createModel('Cat', { id: String, name: String, age: 20});
    var catou, minou;
    var listener;

    describe('getDocument', function(){
        it('should return different objects', function(){
            catou = new Cat({name: 'Catou'});
            minou = new Cat({name: 'Minou'});
            should.exist(catou.getDocument());
            catou.getDocument().should.not.equal(minou.getDocument());
        });
    });
    describe('getModel', function() {
        it('should return a model shared by all instances of the model', function(){
            should.exist(catou.getModel());
            should.equal(catou.getModel(), minou.getModel());
        });
    });


    // Test define
    describe('definePrivate', function() {
        it('should save a method', function() {
            Cat = thinky.createModel('Cat', { id: String, name: String });
            catou = new Cat({name: 'Catou'});
            minou = new Cat({name: 'Minou'});
            catou.definePrivate('helloDoc', function() { return 'hello, my name is '+this.name; })
            should.equal(catou.helloDoc(), 'hello, my name is Catou');
        });
    });
    describe('define', function(){
        it('should not add the function for other documents', function(){
            should.not.exist(minou.helloDoc);
        });
    });
    describe('define', function(){
        it('should not add the function for new documents', function(){
            minou = new Cat({name: 'Minou'});
            should.not.exist(minou.helloDoc);
        });
    });

    // Test merge 
    describe('merge', function() {
        it('should merge all fields', function(){
            Cat = thinky.createModel('Cat', { id: Number, name: String }, {enforce: true});
            catou = new Cat({id: 1, name: 'Catou'});
            catou.merge({id: 2, name: 'CatouBis'});
            should.equal(catou.id, 2);
            should.equal(catou.name, 'CatouBis');
        });
        it('should not throw if merge is recursif (default settings) even if the schema is enforced', function(){
            Cat = thinky.createModel('Cat', { id: Number, name: String }, {enforce: true});
            catou = new Cat({id: 1, name: 'Catou'});
            catou.merge({name: 'CatouTer'});
            should.equal(catou.id, 1);
            should.equal(catou.name, 'CatouTer');
        });
        it('should throw if schema is enforced -- extra field', function(){
            Cat = thinky.createModel('Cat', { id: Number, name: String }, {enforce: true});
            catou = new Cat({id: 1, name: 'Catou'});
            (function() { catou.merge({id: 2, name: 'CatouBis', extraField: 3});}).should.throw('An extra field `[extraField]` not defined in the schema was found.');
        });
        it('should throw if schema is enforced -- missing field', function(){
            Cat = thinky.createModel('Cat', { id: Number, name: String }, {enforce: true});
            catou = new Cat({id: 1, name: 'Catou'});
            (function() { catou.merge({name: 'catoubis'}, true);}).should.throw('Value for [id] must be defined')
        });
        it('should throw if schema is enforced -- wrong type field', function(){
            Cat = thinky.createModel('Cat', { id: Number, name: String }, {enforce: true});
            catou = new Cat({id: 1, name: 'Catou'});
            (function() { catou.merge({id: 'nonValidValue', name: 'CatouBis', extraField: 3});}).should.throw('Value for [id] must be a Number');
        });



    });
    describe('merge', function() {
        it('should emit the event `change`', function(done){
            Cat = thinky.createModel('Cat', { id: Number, name: String });
            catou = new Cat({id: 1, name: 'Catou'});
            listener = function() {
                catou.removeAllListeners('save');
                done();
            }
            catou.on('change', listener);
            catou.merge({name: 'CatouBis'});
        });
    });


    // Test against the database
    describe('save', function() {
        it('should add a field id -- Testing document', function(done){
            Cat = thinky.createModel('Cat', { id: String, name: String });
            catou = new Cat({name: 'Catou'});

            catou.save( function(error, result) {
                should.exist(result.id);
                done();
            })
        });
    });
    describe('save', function() {
        it('should not change the reference of the object', function(done){
            Cat = thinky.createModel('Cat', { id: String, name: String });
            catou = new Cat({name: 'Catou'});
            catou.save( function(error, result) {
                should.equal(catou, result);
                catouCopy = result;
                done();
            })
        });
    });
    describe('save', function() {
        it('should not change the reference of the object', function(done){
            Cat = thinky.createModel('Cat', { id: String, name: String });
            minou = new Cat({name: 'Minou'});
            minou.save( function(error, result) {
                should.equal(minou, result);
                minouCopy = result;
                done();
            })
        });
    });


    describe('save', function() {
        it('should update the document in the database', function(done){
            var value = 'Catouuuuu';
            catou.name = value;

            catou.save( function(error, result) {
                should.equal(result.name, value);
                done();
            })
        });
    });
    describe('save', function() {
        it('should update the document (in place)', function(done){
            var value = 'Catouuuuu';
            catou.name = value;

            catou.save( function(error, result) {
                should.equal(catou, result);

                done();
            })
        });
    });

    
    // Test listener
    describe('on', function() {
        it('should execute the callback when the even is emitted', function(done){
            Cat = thinky.createModel('Cat', { id: String, name: String });
            catou = new Cat({name: 'Catou'});
            listener = function() {
                done();
            }
            catou.on('testEvent', listener);
            catou.emit('testEvent');
        });
        it('should add a listener', function() {
            catou.listeners.should.have.length(1);
        });
    });
    describe('off', function() {
        it('should be the same as removeListener', function() {
            should(catou.off, catou.removeListener);
        });
    });
    describe('off', function() {
        it('should remove a listener', function() {
            catou.off('testEvent', listener);
            catou.listeners('testEvent').should.have.length(0);
        });
    });
    // TODO test that all methods from the EventEmitter have been copied
    
    // Test that events are properly fired
    describe('save', function() {
        it('should emit the event `save` on insert', function(done){
            Cat = thinky.createModel('Cat', { id: String, name: String });
            catou = new Cat({name: 'Catou'});
            listener = function() {
                catou.removeAllListeners('save');
                done();
            }
            catou.on('save', listener);
            catou.save();
        });
        it('should emit the event `save` on update', function(done) {
            listener = function() {
                catou.removeAllListeners('save');
                done();
            }
            catou.on('save', listener);
            catou.save();
        });
    });
    describe('merge', function() {
        it('should emit the event `change`', function(done){
            Cat = thinky.createModel('Cat', { id: String, name: String });
            catou = new Cat({name: 'Catou'});
            listener = function() {
                catou.removeAllListeners('save');
                done();
            }
            catou.on('change', listener);
            catou.merge({name: 'CatouBis'});
        });
    });
})
