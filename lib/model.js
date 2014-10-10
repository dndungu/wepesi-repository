"use strict";
var querystring = require('querystring');
module.exports = function(){
	return {
		init: function(sandbox){
			this.sandbox = sandbox;
			this.setup();
			this.user = sandbox.context.get('user');
			this.schema = new (require(__dirname + '/schema.js'));
			this.schema.init(sandbox);
            var storage = this.schema.getSchema().storage;
            this.storage = sandbox.context.get('storage').get(storage ? storage : "local");
            this.collection = this.storage.collection(this.schema.getSchema().name);
			this.validator = require(__dirname + '/validator.js');
            this.secure();
			return this;
		},
		setup: function(){
			var parameters = this.sandbox.context.get('parameters');
            if(!this.sandbox._id)
                this.sandbox._id = parameters._id;
            if(!this.sandbox.model)
                this.sandbox.model = parameters.model;
            if(!this.sandbox.operation)
                this.sandbox.operation = parameters._id ? "update" : "insert";
            if(!this.sandbox.path)
                this.sandbox.path = 'sites/' + this.sandbox.context.get('site').home + '/models/' + this.sandbox.model + '.json';
		},
		parse: function(then){
			var request = this.sandbox.context.get('request');
			var buffer = [];
			request.on("data", function(chunk){
				buffer.push(chunk.toString());
			});
			var self = this;
			var model = this.schema.getModel();
			var rules = this.schema.getValidationRules();
			request.on("end", function(){
				var json = request.headers['content-type'] == "application/json";
				var data = json ? JSON.parse(buffer.join()) : querystring.parse(buffer.join());
				self.data = self.generate(self.filter(data, model), model);
//				self.valid = self.validate(self.data, rules, model);
				then(self.data);
			});
			return this;
		},
		insert: function(then){
			var self = this;
			var insert = function(){
				self.collection.insert(self.data, function(error, items){
					return then(error, items);
				});
			};
			self.parse(function(){
				var schema = self.schema.getSchema();
				if(!schema.sequence)
					return insert();
				self.next(schema.name, function(error, next){
					self.data[0].sequence = next.sequence;
					insert();
				});
			});
		},
		update: function(then){
			var self = this;
			self.parse(function(){
				self.collection.find(self.query).toArray(function(error, items){
					if(error)
						return then(error, null);
					self.data[0].creation_time = items[0].creation_time;
					items[0]._pid = items[0]._id;
					items[0]._id = self.sandbox.context.get('storage').uuid();
					var trail = self.schema.getSchema().name + "_trail";
					self.storage.collection(trail).insert(items[0], function(error, items){
						if(error)
							then(error, null);
						self.collection.update(self.query, self.data[0], then);
					})				
				});
			});
		},
		filter: function(data, model){
			data = data instanceof Array ? data : [data];
			for(var i in data){
				for(var j in data[i]){
					if(model.hasOwnProperty(j))
						if(["string", "boolean", "number"].indexOf(typeof data[i][j]) == -1 && model[j])
							this.filter(data[i][j], model[j]);
					if(!model.hasOwnProperty(j))
						delete data[i][j];
				}
			}
			return data;
		},
		generate: function(data, model){
			for(var i in data){
				for(var j in model){
					if(model[j] === null)
						continue;
					var nested = ['string', 'number', 'boolean'].indexOf(typeof model[j]) === -1;
					if(nested)
						this.generate(data[i][j], model[j]);
					if(!nested && data[i][j] == undefined)
						data[i][j] = model[j];
				}
			}
			return data;
		},
		validate: function(data, rules, model){
			data = data instanceof Array ? data : [data];
			for(var i in data){
				for(var j in model){
					if(rules[j] instanceof Array && rules[j].indexOf('required') == -1)
						continue;
					var children = !(rules[j] instanceof Array);
					var value = data[i][j] ? data[i][j] : {};
					if(children)
						if(!this.validate(value, rules[j], model[j]))
							return false;
					if(children)
						continue;
					for(var k in rules[j]){
						if(this.validator.test(rules[j][k], data[i][j]) || (j == "_id" && this.sandbox.operation == "update"))
							continue;
						this.sandbox.context.log(4, j + ' has failed validation test, expecting ' + rules[j][k] + ' but received ' + data[i][j]);
						return false;
					}
				}
			}
			return true;
		},
		secure: function(){
			this.strip();
			this.restrict();
			this.allow = false;
			if(this.user.hasPermission(this.getPermissionString()))
				this.allow = true;
			return this;
		},
		restrict: function(){
			this.query = {};
			var permissions = {find: 0, update: 1, remove: 2};
			var author = this.user.get("_id");
			if(this.getPermissionMode() < permissions[this.sandbox.operation])
				this.query = {author : author};
			return this;
		},
        strip: function(){
            var fields = arguments[0] ? arguments[0] : this.schema.getSchema().fields;
            for(var i in fields){
                var field = fields[i];
                if(field.fields)
                    this.secureFields(field.fields);
                if(!field.permission)
                    continue;
                var permission = this.schema.permission.name + '.' + field.permission.name + '.' + this.sandbox.operation + '.permission';
                if(!this.user.hasPermission(permission))
                    delete fields[i];
            }
			return this;
        },
        getPermissionString: function(){
			var schema = this.schema.getSchema();
            var name = schema.permission && schema.permission.name ? schema.permission.name : null;
            return name ? name + '.' + this.sandbox.operation + '.permission' : 'public.permission';
        },
        getPermissionMode: function(){
			var schema = this.schema.getSchema();
            return schema.permission && schema.permission.mode ? schema.permission.mode : 3;
        },
		next: function(name, then){
			var schema = this.schema.getSchema();
			var storage = this.sandbox.context.get('storage').get(schema.sequence);
			storage.collection("counters").findAndModify(
				{ _id: name },
				[["_id", "asc"]],
				{ $inc: { sequence: 1 }},
				{upsert: true, "new": true},
				then
			);
			return this;
		}
	}
};
