"use strict";
var path = require('path');
module.exports = function(){
	return {
		init: function(sandbox){
			this.sandbox = sandbox;
			this.path = path.basename(this.sandbox.path);
			this.dir = path.dirname(this.sandbox.path);
			this.storage = sandbox.context.get('storage');
			this.user = sandbox.context.get('user');
			this.schema = this.require(this.path);
			this.inherit(this.schema);
			this.expand(this.schema);
		},
		require: function(model){
			try{
				var filename = this.dir + '/' + model;
				return this.sandbox.context.require(filename);
			}catch(error){
				throw new Error(error);
			}
		},
		inherit: function(schema){
			if(!schema.inherits)
				return;
			schema.inherits = typeof schema.inherits == "string" ? [schema.inherits] : schema.inherits;
			for(var i in schema.inherits){
				var ancestor = this.require(schema.inherits[i]);
				ancestor.inherits && this.inherit(ancestor);
				var j = new Number(ancestor.fields.length);
				while(j--){
					for(var k in schema.fields){
						if(ancestor.fields[j].name == schema.fields[k].name)
							continue;
						schema.fields.unshift(ancestor.fields[j]);
						break;
					}
				}
			}
		},
		expand: function(){
			var schema = arguments[0];
			for(var i in schema.fields){
				var field = schema.fields[i];
				if(!field.model || typeof field.model != 'string')
					continue;
				schema.fields[i].model = this.require(field.model);
				this.inherit(schema.fields[i].model);
			}
		},
		getSchema: function(){
			return this.schema;
		},
		getModel: function(){
			var schema = arguments[0] ? arguments[0] : this.schema;
			var model = {};
			for(var i in schema.fields){
				var field = schema.fields[i];
				var value = field.defaults ? field.defaults : null;
				if(field.generate)
					if(field.generate.operation == this.sandbox.operation)
						value = this.storage[field.generate.type]();
				if(field.name == "author")
					value = this.user.get("_id");
				if(field.name == "site")
					value = this.sandbox.context.get('site')._id;
				model[field.name] = field.model ? this.getModel(field.model) :  value;
			}
			return model;
		},
        getProjection: function(){
            var schema = arguments[0] ? arguments[0] : this.schema;
            var projection = {};
            for(var i in schema.fields){
                var field = schema.fields[i];
				if(field.model || this.user.hasPermission(this.getPermissionString(field)))
					projection[field.name] = field.model ? this.getProjection(field.model) : 1;
            }
            return projection;
        },
		getValidationRules: function(){
			var schema = arguments[0] ? arguments[0] : this.schema;
			var rules = {};
			for(var i in schema.fields){
				var field = schema.fields[i];
				rules[field.name] = field.model ? this.getValidationRules(field.model) : field.validation ? field.validation : [];
			}
			return rules;
		},
		getPermissionString: function(){
			var schema = arguments[0] ? arguments[0] : this.schema;
			var name = schema.permission && schema.permission.name ? schema.permission.name : null;
			return name ? name + '.' + this.sandbox.operation + '.permission' : 'public.permission';
		},
		getPermissionMode: function(){
			var schema = arguments[0] ? arguments[0] : this.schema;
			return schema.permission && schema.permission.mode ? schema.permission.mode : 3;
		}
	}	
};
